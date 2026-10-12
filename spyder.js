import { combineRgb, Regex, UDPHelper } from '@companion-module/base'
import { runEntrypoint, InstanceBase, InstanceStatus } from '@companion-module/base'
import { compileActionDefinitions } from './actions.js'
import { GetFeedbackDefinitions } from './feedbacks.js'

const Upgradereg = []

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

// Parses a human-friendly layer list like "1-3, 10, 15-18" into a flat,
// deduped array of numbers. Malformed tokens are silently skipped rather
// than throwing, so a typo just omits that layer instead of breaking poll.
function parseLayerList(raw) {
	const out = []
	for (const token of String(raw ?? '').split(/[\s,]+/)) {
		const t = token.trim()
		if (!t) continue
		const range = t.match(/^(\d+)-(\d+)$/)
		if (range) {
			let [a, b] = [Number(range[1]), Number(range[2])]
			if (a > b) [a, b] = [b, a]
			for (let n = a; n <= b; n++) out.push(n)
		} else if (/^\d+$/.test(t)) {
			out.push(Number(t))
		}
	}
	return [...new Set(out)]
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
	}

	cueCmd = async (cmd) => {
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
		//this.log('info', `Sending ${cmd} to ${this.config.host}`)

		if (this.udp !== undefined) {
			const packet = buildPacket(cmd)
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
		this.updateStatus(InstanceStatus.Disconnected, 'Closed')
		if (this.udp !== undefined) {
			this.udp.destroy()
		}
	}

	start(msg) {
		this.updateStatus(InstanceStatus.Connecting, msg)
		this.setActionDefinitions(compileActionDefinitions(this))
		this.setFeedbackDefinitions(GetFeedbackDefinitions(this))
		this.pending = []
		this.nextCmd = []
		this.status = {}
		this.layerSource = {} // keyed by protocol layer id (human layer + 1)
		this.watchedLayers = parseLayerList(this.config.watchLayers).map((humanLayer) => String(humanLayer + 1))
		this.pollRateMs = Number(this.config.pollRateMs) || 2500
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
					this.updateStatus(InstanceStatus.UnknownError, err.message)
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
				if (cmd == undefined || cmd.cmd.includes('NaN')) {
					return // unexpected response
				}

				// this.log('info', `Rcvd: ${this.nextCmd.length}:(${cmd.cmd}) ${msg}`)

				const cmds = cmd.cmd.split(' ')

				switch (msg.slice(0, 1)) {
					case '0': // all good
						this.updateStatus(InstanceStatus.Ok, 'Connected')
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
										}

										for (let s in this.reg) {
											await this.cueCmd(`RRD 4 ${this.reg[s].id}`)
											await this.cueCmd(`SCR ${this.reg[s].id} R`)
										}
										break
									}
									case '6': {
										// Sources. SRA addresses a source by name, not by ID, so this
										// is purely for discovery: feeds src_<N> variables and the
										// live dropdown choices on the 'sra' action.
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

									// "Layers to monitor" was parsed at start(), before this
									// response could possibly have arrived, so it couldn't be
									// bounds-checked yet -- prune it now against the real count.
									const before = this.watchedLayers.length
									this.watchedLayers = this.watchedLayers.filter(
										(protocolLayer) => Number(protocolLayer) - 1 <= this.layerCount,
									)
									const dropped = before - this.watchedLayers.length
									if (dropped > 0) {
										this.log(
											'warn',
											`"Layers to monitor" had ${dropped} layer(s) beyond this Spyder's ${this.layerCount} layers -- dropped`,
										)
									}
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
					await this.cueCmd(this.nextCmd.shift())
				}
			})

			this.udp.on('listening', async () => {
				this.updateStatus(InstanceStatus.Ok, 'UDP Listening')
				// send a simple query (how many layers)
				await this.cueCmd('RLC')
				await this.cueCmd('RBL')
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
				await this.cueCmd(this.nextCmd.shift())
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
			// queue a layer-source read-back for each watched layer, plus the
			// source-list poll, then fall through to the register-names poll
			for (const layer of this.watchedLayers) {
				this.nextCmd.push(`RLS ${layer}`)
			}
			this.nextCmd.push('RRL 6 -1')
			const cmd = 'RRL 4 -1'
			await this.cueCmd(cmd)
			this.lastCount = 0
			this.saveLast = cmd
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
				type: 'textinput',
				id: 'watchLayers',
				label:
					'Layers to poll for live source, required by the "Layer source is" feedback -- listing a layer ' +
					'here only starts polling it, it does not show feedback by itself (human-numbered, e.g. "1-3, 10, 15-18")',
				width: 12,
				default: '',
				// Rejects 0, negatives, leading zeros and other garbage that can
				// never be a real layer number -- the live upper bound (this
				// Spyder's actual layer count) can't be checked here since regex
				// is static, so that's enforced separately once RLC answers.
				regex: '/^\\s*$|^\\s*[1-9]\\d*(?:-[1-9]\\d*)?(?:(?:\\s*,\\s*|\\s+)[1-9]\\d*(?:-[1-9]\\d*)?)*\\s*$/',
			},
			{
				type: 'number',
				id: 'pollRateMs',
				label: 'Poll interval (ms) -- register/source/layer-source polling',
				width: 6,
				default: 2500,
				min: 500,
				max: 30000,
			},
		]
	}
}

runEntrypoint(SpyderInstance, Upgradereg)
