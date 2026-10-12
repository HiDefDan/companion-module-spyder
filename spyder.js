import { combineRgb, Regex, UDPHelper } from '@companion-module/base'
import { runEntrypoint, InstanceBase, InstanceStatus } from '@companion-module/base'
import { compileActionDefinitions } from './actions.js'
import { GetFeedbackDefinitions } from './feedbacks.js'
import { GetPresetDefinitions } from './presets.js'

const Upgradereg = []

// Sources and command keys change rarely (someone editing in Spyder
// Studio), unlike layer-source state which can change on every cue. Rather
// than re-fetching both full lists (plus RRD+SCR per command key) on every
// poll tick -- competing with the RLS layer checks that actually drive
// visible feedback latency -- they're only refetched on this slower,
// wall-clock-based interval (independent of the poll-interval config, so
// a fast feedback-latency setting doesn't also speed this up).
const DISCOVERY_INTERVAL_MS = 60000

// From the manual's "Command processor responses" table (page 10) -- the
// first character of every response. 6 (Checksum) is documented as
// reserved/unused; there's no sequence number or echo of the original
// command anywhere in a response, so matching a response back to the
// request that caused it relies entirely on send/receive ordering (see
// the comment on the single-outstanding-command discipline in queueCmd).
const RESULT_CODE_NAMES = {
	0: 'Success',
	1: 'Empty',
	2: 'Header (invalid command)',
	3: 'Argument count',
	4: 'Argument value',
	5: 'Execution',
	6: 'Checksum (reserved)',
}

// Full command names from the manual, keyed by mnemonic (the first token
// of the command text), for log readability only -- never used to build
// or send anything.
const COMMAND_NAMES = {
	RLC: 'Request Layer Count',
	RRL: 'Request Register List',
	RRD: 'Request Register Detail',
	SCR: 'Script Cue Request',
	RLS: 'Request Layer Source',
	SRA: 'Source Apply',
	ASC: 'Advance Script Cue',
	BPR: 'Basic Preset Recall',
	RSC: 'Recall Script Cue',
	TRN: 'Transition Layers',
	FRZ: 'Freeze Layer',
	BTR: 'Transition Background',
	FKR: 'Function Key Recall',
	OFZ: 'Freeze Output',
	DMT: 'Device Mixer Transition',
	SAV: 'Force Server Save',
}

// Makes %20-escaped argument values readable: splits on the protocol's
// real delimiter (a literal space) and wraps any token that contained an
// escaped space in quotes once decoded, so 'CAM%20MV1%20(OC)' reads as
// '"CAM MV1 (OC)"' -- one argument, not three. Display only, never used
// to build or send anything.
function humanizeArgs(text) {
	return text
		.split(' ')
		.map((tok) => (tok.includes('%20') ? `"${tok.replace(/%20/g, ' ')}"` : tok))
		.join(' ')
}

// "Request Layer Source (RLS 6)" if the mnemonic is known, else just the
// humanized command text.
function describeCmd(cmd) {
	const mnemonic = cmd.split(' ')[0]
	const fullName = COMMAND_NAMES[mnemonic]
	const readable = humanizeArgs(cmd)
	return fullName ? `${fullName} (${readable})` : readable
}

// Named-field summary of a response body, for the five commands this
// module sends itself (the ones with a structured payload beyond the
// bare result code -- RLC/RLS/RRL/RRD/SCR). Everything else (one-shot
// action commands like SRA/ASC/...) has a bare '<Result Code>' response
// per the manual, nothing more to show, so it falls back to the
// %20-decoded body as-is. cmds is the request's tokens (already parsed
// by the caller); mirrors the real parsing elsewhere in this file, but
// kept separate since this is purely for display and allowed to be a
// little more forgiving of unexpected shapes.
function describeResponseBody(cmds, resultCode, msg) {
	if (resultCode === '1') {
		// 'Empty' -- the data requested isn't available right now. No
		// structured payload to decode per the manual, beyond RLS's own
		// documented meaning for it.
		return cmds[0] === 'RLS' ? 'no source assigned' : 'no data available'
	}
	if (resultCode !== '0') {
		return humanizeArgs(msg) // an error response -- nothing structured to decode
	}
	const body = msg.slice(2)
	const parts = body.length ? body.split(' ') : []
	switch (cmds[0]) {
		case 'RLC': {
			const logical = parseInt(parts[0])
			return isNaN(logical) ? humanizeArgs(msg) : `${logical} layers reported (${logical - 2} usable, excl. 2 background)`
		}
		case 'RLS':
			return `source="${decodeURIComponent(parts[0] ?? '')}" (sourceId=${parts[1] ?? '?'})`
		case 'RRL': {
			const count = parts[0]
			const items = []
			for (let i = 1; i < parts.length; i += 2) {
				items.push(`${parts[i]}=${decodeURIComponent(parts[i + 1] ?? '')}`)
			}
			return `${count} register(s): ${items.join(', ')}`
		}
		case 'RRD': {
			const [scriptId, relative, numCues] = parts
			return `scriptId=${scriptId}, relative=${relative === '1' ? 'yes' : 'no'}, numCues=${numCues}`
		}
		case 'SCR':
			return `active=${parts[0] === '1' ? 'yes' : 'no'}`
		default:
			return humanizeArgs(msg)
	}
}

// Fixed 10-byte UDP header the Spyder protocol requires in front of every
// command: ASCII "spyder" + four 0x00 bytes.
const HEADER_BYTES = Buffer.from([0x73, 0x70, 0x79, 0x64, 0x65, 0x72, 0x00, 0x00, 0x00, 0x00])

// Builds the exact byte buffer to put on the wire for a command string,
// rather than handing a JS string to the socket and leaving Node to pick an
// encoding. The command text is pure ASCII (including any literal '%20'
// sequences an action has already substituted for in-value spaces), so a
// single-byte-per-char Buffer is always correct here -- this also means
// what gets logged as hex is byte-for-byte what hits the wire.
function buildPacket(cmd) {
	return Buffer.concat([HEADER_BYTES, Buffer.from(cmd, 'latin1')])
}

// Updates `store` (an object keyed by register id) from a full
// `RRL <type> -1` response's parsed id/name pairs. '-1' as the page number
// means the response is the complete, authoritative list, so anything
// previously tracked that doesn't come back this time has been deleted on
// the Spyder and is pruned here too. Mutates `store` in place; returns the
// set of ids that were added or renamed, and the set that were removed, so
// the caller can decide what to flush (variable values/defs, actions, etc).
function syncRegisterStore(store, ids, names, makeEntry) {
	const seenIds = new Set()
	const changedIds = new Set()
	const removedIds = new Set()
	for (let i = 0; i < ids.length; i++) {
		const id = ids[i]
		const name = names[i]
		seenIds.add(id)
		let entry = store[id]
		if (entry === undefined) {
			entry = makeEntry(id)
			store[id] = entry
		}
		if (entry.name !== name) {
			entry.name = name
			changedIds.add(id)
		}
	}
	for (const key of Object.keys(store)) {
		if (!seenIds.has(Number(key))) {
			delete store[key]
			removedIds.add(Number(key))
		}
	}
	return { changedIds, removedIds }
}

class SpyderInstance extends InstanceBase {
	constructor(internal) {
		// super-constructor
		super(internal)

		this.devMode = process.env.DEVELOPER
		this.hasError = false
		this.lastStatus = undefined
		this.lastStatusMessage = undefined
	}

	// Only actually calls updateStatus (and so only logs) on a real
	// transition. Every successful response was previously re-asserting
	// 'Ok'/'Connected' on its own, which with several responses per poll
	// cycle made the connection debug log mostly noise.
	setStatus = (status, message) => {
		if (status !== this.lastStatus || message !== this.lastStatusMessage) {
			this.lastStatus = status
			this.lastStatusMessage = message
			this.updateStatus(status, message)
		}
	}

	// Only ever lets one command be outstanding at a time -- the protocol
	// gives responses no sequence number or echo of the request, so the
	// only way a response can be reliably matched to its request is if
	// there's never more than one candidate for it to match against. Call
	// this (not sendCmd directly) from anywhere that might run while
	// something else could already be in flight.
	queueCmd = async (cmd) => {
		if (cmd !== undefined) {
			if (this.pending.length) {
				this.nextCmd.push(cmd)
			} else {
				await this.sendCmd(cmd)
			}
		}
	}

	sendCmd = async (cmd) => {
		const now = Date.now()
		let c = cmd.split(' ')
		if (c[2] != '-1') {
			c = c.slice(0, 3)
		} else {
			c = c.slice(0, 2)
		}
		c = c.join(' ')

		if (this.udp !== undefined) {
			const packet = buildPacket(cmd)
			this.log('info', `Sending: ${describeCmd(cmd)}`)
			this.log('debug', `Sending hex: ${packet.toString('hex')}`)
			await this.udp.send(packet)
			// save cmd for to store with next incoming response
			this.pending.push({ cmd: c, sent: now })
			this.lastCmd = cmd
		}
	}

	// layer is a protocol layer id (string); name is '' when no source is
	// currently assigned to that layer.
	setLayerSource = (layer, name) => {
		if (this.layerSource[layer] !== name) {
			this.layerSource[layer] = name
			this.checkFeedbacks('layer_source_is')
		}
	}

	// humanLayer is the layer number as entered by the user (1-based,
	// matching Spyder Studio's own numbering); converts to the protocol id
	// (+1) this module tracks responses under.
	getLayerSource = (humanLayer) => {
		return this.layerSource[String(Number(humanLayer) + 1)] ?? ''
	}

	// 'HH:MM' (local time, Companion host's clock) of the last SAV that got
	// a Success response, or undefined if there hasn't been one this
	// connection -- see the 'SAV' case in the data handler.
	getLastSaveTime = () => {
		if (!this.lastSaveAt) return undefined
		const pad = (n) => String(n).padStart(2, '0')
		return `${pad(this.lastSaveAt.getHours())}:${pad(this.lastSaveAt.getMinutes())}`
	}

	async init(config) {
		this.hasError = false
		this.config = config

		this.start('Initializing')
	}

	async configUpdated(config) {
		await this.destroy()
		this.config = config
		this.start('Restarting')
	}

	// When module gets deleted
	async destroy() {
		this.setStatus(InstanceStatus.Disconnected, 'Closed')
		if (this.udp !== undefined) {
			this.udp.destroy()
		}
	}

	start(msg) {
		this.setStatus(InstanceStatus.Connecting, msg)
		this.setActionDefinitions(compileActionDefinitions(this))
		this.setFeedbackDefinitions(GetFeedbackDefinitions(this))
		this.setPresetDefinitions(GetPresetDefinitions(this))
		this.pending = []
		this.nextCmd = []
		this.status = {}
		this.layerSource = {} // keyed by protocol layer id (human layer + 1)
		this.lastRecalled = undefined // {registerId, cue} -- set by recall_at_cue, read by is_selected_key/cue_fwd/cue_rev
		this.watchedLayers = [] // populated once RLC answers -- see the 'RLC' case below
		this.pollRateMs = Number(this.config.pollRateMs) || 2500
		this.lastDiscoveryAt = 0 // far enough in the past that the first poll() is always a discovery tick
		this.init_udp()
	}

	init_udp() {
		if (this.config.host !== undefined) {
			this.udp = new UDPHelper(this.config.host, 11116)

			// this.udp.on('status_change', (status, message) => {
			// 	this.updateStatus(status, message)
			// })

			this.udp.on('error', (error) => {
				if (!this.hasError) {
					this.log('debug', `Network error ${err}`)
					this.setStatus(InstanceStatus.UnknownError, err.message)
					this.log('error', 'Network error: ' + err.message)
					this.hasError = true
				}
				if (this.pollTimer) {
					clearInterval(this.pollTimer)
					delete this.pollTimer
				}
			})

			this.udp.on('data', async (data) => {
				let msg = data.toString()
				let cmd = this.pending.shift()
				if (cmd == undefined) {
					// Nothing was outstanding to match this to -- a stale/late
					// response after a resend assumed it lost, most likely. See
					// the comment on queueCmd re: why this shouldn't normally happen.
					this.log('warn', `Received a response with nothing pending to match it to -- discarding: ${msg}`)
					return
				}
				if (cmd.cmd.includes('NaN')) {
					this.log('warn', `Discarding malformed pending entry '${cmd.cmd}' matched to response: ${msg}`)
					return
				}

				const cmds = cmd.cmd.split(' ')
				const resultCode = msg.slice(0, 1)
				const resultName = RESULT_CODE_NAMES[resultCode] ?? `Unknown code ${resultCode}`
				this.log(
					resultCode === '0' || resultCode === '1' ? 'info' : 'warn',
					`Received for ${describeCmd(cmd.cmd)}: ${resultName} -- ${describeResponseBody(cmds, resultCode, msg)}`,
				)

				switch (msg.slice(0, 1)) {
					case '0': // all good
						this.setStatus(InstanceStatus.Ok, 'Connected')
						// TODO: expected data responses would be decoded and saved here
						this.status[cmd.cmd] = {
							resp: msg.slice(2),
							lag: Date.now() - cmd.sent,
						}
						let newReg = false
						let newNames = false

						switch (cmds[0]) {
							case 'RRL': {
								// Shared parse: '<Count> <ID1> <Name1> <ID2> <Name2>...'. '-1' as the
								// page number (always used here) means this is the complete,
								// authoritative list for the register type, not a partial page.
								const r = msg.slice(2).split(' ')
								const count = r.shift()
								const ids = []
								const names = []
								for (let i = 0; i < count; i++) {
									ids.push(parseInt(r[i * 2]))
									names.push(decodeURIComponent(r[i * 2 + 1]))
								}

								switch (cmds[1]) {
									case '4': {
										// Command keys. Keyed by Register ID -- see the comment on
										// `script2reg` below for why Script ID isn't used here too.
										const { changedIds, removedIds } = syncRegisterStore(this.reg, ids, names, (id) => ({
											id,
											active: false,
											scriptId: null,
											name: '',
										}))
										for (const id of changedIds) {
											this.variableValues[`cKey_rID_${id + 1}`] = this.reg[id].name
											newNames = true
										}
										if (changedIds.size || removedIds.size) {
											newReg = true // description text embeds the name; refresh defs too
											// Feeds recall_at_cue's/is_selected_key's "Command Key"
											// dropdown choices, same as sources below.
											this.setActionDefinitions(compileActionDefinitions(this))
											this.setFeedbackDefinitions(GetFeedbackDefinitions(this))
											this.setPresetDefinitions(GetPresetDefinitions(this))
											this.log(
												'info',
												`Command key list changed (+${changedIds.size} added/renamed, -${removedIds.size} removed) -- ` +
													`per-key presets regenerated (${Object.keys(this.reg).length} total). Buttons already ` +
													`placed from an older version of one of these do NOT auto-update or auto-remove -- ` +
													`re-drag them from the Presets tab if needed.`,
											)
										}

										for (let s in this.reg) {
											await this.queueCmd(`RRD 4 ${this.reg[s].id}`)
											await this.queueCmd(`SCR ${this.reg[s].id} R`)
										}
										break
									}
									case '6': {
										// Sources. SRA addresses a source by name, not by ID, so this
										// is purely for discovery: feeds src_<N> variables and the
										// live dropdown choices on the 'sra' action and the
										// 'layer_source_is' feedback.
										const { changedIds, removedIds } = syncRegisterStore(this.sources, ids, names, (id) => ({
											id,
											name: '',
										}))
										for (const id of changedIds) {
											this.variableValues[`src_${id + 1}`] = this.sources[id].name
											newNames = true
										}
										if (changedIds.size || removedIds.size) {
											newReg = true
											this.setActionDefinitions(compileActionDefinitions(this))
											this.setFeedbackDefinitions(GetFeedbackDefinitions(this))
										}
										break
									}
								}
								break
							}
							case 'SCR':
								let nv = !!(msg.split(' ')[1] == 1)
								let rr = cmds[2] == 'R' ? cmds[1] : this.script2reg[cmds[1]]
								if (nv != this.reg[rr].active) {
									this.reg[rr].active = nv
									this.checkFeedbacks('inp_ok')
								}
								break
							case 'RLS':
								this.setLayerSource(cmds[1], decodeURIComponent(msg.slice(2).split(' ')[0] || ''))
								break
							case 'RLC': {
								// Response includes the Spyder's 2 background layers; the
								// manual says applications should subtract them, so this
								// becomes the human-numbered (1-based) usable layer count.
								const logical = parseInt(msg.split(' ')[1])
								if (!isNaN(logical)) {
									this.layerCount = logical - 2
									// Poll every real layer for live source feedback -- the
									// measured traffic from this is negligible even at a large
									// layer count, so there's no reason to make this opt-in.
									this.watchedLayers = Array.from({ length: this.layerCount }, (_, i) => String(i + 2))
								}
								break
							}
							case 'RRD':
								const val = msg.split(' ')
								if (val.length != 4 || cmds[2] == 'NaN') {
									return // bad response
								}
								let id = parseInt(val[1])

								this.reg[cmds[2]].scriptId = id
								this.reg[cmds[2]].relative = !!val[2]
								this.reg[cmds[2]].numCues = val[3]
								// Register ID and Script ID both address the same command key; we
								// keep this map so a feedback/action can address it by either ID
								// type, but only ever expose one variable per key -- cKey_rID_<RegisterID>,
								// set above from the RRL 4 response -- rather than a second,
								// duplicate variable keyed by Script ID.
								this.script2reg[val[1]] = cmds[2]

								break
							case 'SAV':
								this.lastSaveAt = new Date()
								this.checkFeedbacks('sav_last_time')
								break
						}
						if (newReg) {
							// Rebuilt (not incrementally pushed) from both stores so a
							// rename/add/delete in either stays in sync, and a command key's
							// description reads "Command Key: <name>" (the term the user
							// actually sees in Spyder Studio, not the internal "Register").
							this.variableDefs = [
								...Object.values(this.reg).map((reg) => ({
									name: `Command Key: ${reg.name || '(unnamed)'}`,
									variableId: `cKey_rID_${reg.id + 1}`,
								})),
								...Object.values(this.sources).map((src) => ({
									name: `Source: ${src.name || '(unnamed)'}`,
									variableId: `src_${src.id + 1}`,
								})),
							]
							this.setVariableDefinitions(this.variableDefs)
						}
						if (newNames) {
							this.setVariableValues(this.variableValues)
							this.variableValues = {}
						}

						break
					case '1': // Empty -- e.g. RLS on a layer with no source currently assigned
						if (cmds[0] === 'RLS') {
							this.setLayerSource(cmds[1], '')
						}
						break
				}
				if (this.nextCmd.length) {
					await this.queueCmd(this.nextCmd.shift())
				}
			})

			this.udp.on('listening', async () => {
				this.setStatus(InstanceStatus.Ok, 'UDP Listening')
				// send a simple query (how many layers)
				await this.queueCmd('RLC')
				this.reg = {}
				this.script2reg = {}
				this.sources = {} // keyed by source register id; feeds src_<N> variables and the sra action's dropdown
				this.variableDefs = []
				this.variableValues = {}
				this.poll()
				this.pollTimer = setInterval(async () => await this.poll(), this.pollRateMs)
			})
		}
	}

	async poll() {
		if (this.nextCmd.length) {
			// command queue not empty
			if (!this.pending.length) {
				// no commands outstanding
				await this.queueCmd(this.nextCmd.shift())
				this.saveLast = this.lastCmd
				this.lastCount = 0
			} else {
				// count how many times 'pending' is the same
				// after a few ticks, we must have missed a response
				// resend the command
				if (this.saveLast == this.lastCmd) {
					if (this.lastCount++ >= 2) {
						// no response 5s, re-send
						this.pending.shift()
						await this.sendCmd(this.saveLast)
						this.lastCount = 0
					}
				} else {
					this.saveLast = this.lastCmd
					this.lastCount = 0
				}
			}
		} else {
			// Layer-source checks (RLS) now only happen on this same slow
			// discovery cadence -- a periodic drift-correction safety net for
			// changes made outside this module (Spyder console, a script,
			// FKR...) -- or immediately after an 'sra' action targets a
			// specific layer (see actions.js). Polling every real layer every
			// tick was the dominant source of traffic and log noise for
			// comparatively little benefit: the common case (a change made
			// through this module) already gets instant feedback from the
			// sra-triggered check, so it doesn't need the fast path too.
			const now = Date.now()
			const isDiscoveryTick = now - this.lastDiscoveryAt >= DISCOVERY_INTERVAL_MS

			if (isDiscoveryTick) {
				this.lastDiscoveryAt = now
				for (const layer of this.watchedLayers) {
					this.nextCmd.push(`RLS ${layer}`)
				}
				this.nextCmd.push('RRL 6 -1')
				const cmd = 'RRL 4 -1'
				await this.queueCmd(cmd)
				this.lastCount = 0
				this.saveLast = cmd
			}
			// else: not a discovery tick -- nothing to poll this time around.
		}
	}
	// Return config fields for web config
	getConfigFields() {
		return [
			{
				type: 'textinput',
				id: 'host',
				label: 'Target IP',
				width: 6,
				regex: Regex.IP,
			},
			{
				type: 'number',
				id: 'pollRateMs',
				label: 'Poll interval (ms) -- affects feedback latency',
				width: 6,
				default: 2500,
				min: 500,
				max: 30000,
			},
			{
				type: 'number',
				id: 'defaultCue',
				label: 'Default recall cue (0 = Preview, 1 = Program, matching the Shotbox convention)',
				width: 6,
				default: 0,
				min: 0,
				max: 999,
			},
		]
	}
}

runEntrypoint(SpyderInstance, Upgradereg)
