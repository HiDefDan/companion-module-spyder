import { Regex } from '@companion-module/base'

export function compileActionDefinitions(self) {
	// Every action here goes through queueCmd, not sendCmd directly -- every
	// one of them (not just sra) could otherwise fire while a poll
	// response is still outstanding, and responses carry no sequence
	// number to recover from that. See the comment on queueCmd in spyder.js.
	const sendCmd = self.queueCmd

	// Live-discovered sources (RRL 6, polled in spyder.js) -- SRA addresses a
	// source by name, so the dropdown's values are names, not ids. Rebuilt on
	// every call, which spyder.js re-triggers (setActionDefinitions) whenever
	// the source list actually changes.
	const sourceChoices = Object.values(self.sources ?? {})
		.sort((a, b) => a.id - b.id)
		.map((src) => ({ id: src.name, label: src.name || `(unnamed, id ${src.id + 1})` }))
	if (sourceChoices.length === 0) {
		sourceChoices.push({ id: '', label: '(no sources discovered yet -- type a name, or wait for next poll)' })
	}

	// Live-discovered command keys (RRL 4, polled in spyder.js) -- choice
	// values are the raw (0-based) Register ID, matching what RSC/RRD/SCR
	// actually use on the wire; the label adds the human-numbered "Key N"
	// (id+1) to match the cKey_rID_N variable naming.
	const cmdKeyChoices = Object.values(self.reg ?? {})
		.sort((a, b) => a.id - b.id)
		.map((k) => ({ id: String(k.id), label: `${k.name || '(unnamed)'} (Key ${k.id + 1})` }))
	if (cmdKeyChoices.length === 0) {
		cmdKeyChoices.push({ id: '', label: '(no command keys discovered yet -- type a Register ID, or wait for next poll)' })
	}

	return {
		'sav': {
			name: 'Force Server Save',
			options: [],
			callback: async () => {
				await sendCmd('SAV')
			},
		},

		'recall_at_cue': {
			name: 'Recall Command Key at Cue (sets selected)',
			options: [
				{
					type: 'dropdown',
					label: 'Command Key',
					id: 'registerId',
					default: cmdKeyChoices[0].id,
					choices: cmdKeyChoices,
					allowCustom: true,
					regex: Regex.NUMBER,
				},
				{
					type: 'number',
					label: 'Cue (0 = Preview, 1 = Program, matching the Shotbox convention)',
					id: 'cue',
					default: Number(self.config.defaultCue) || 0,
					min: 0,
					max: 999,
				},
			],
			// Addressed by Register ID ('R'), matching the dropdown's values --
			// see the comment on cmdKeyChoices above.
			callback: async (action) => {
				const registerId = Number(action.options.registerId)
				const cue = Number(action.options.cue)
				await sendCmd(`RSC ${registerId} ${cue} R`)
				// Mirrors the Shotbox's "key turns red on recall" -- this is the
				// module's own local memory of what's current, not something
				// read back from Spyder (ASC itself has no script-ID argument,
				// it always acts on Spyder's own global "current script").
				self.lastRecalled = { registerId, cue }
				self.checkFeedbacks('is_selected_key')
			},
		},

		'cue_fwd': {
			name: 'Cue Advance (FWD)',
			options: [],
			callback: async () => {
				await sendCmd('ASC +1')
				if (self.lastRecalled) {
					const numCues = Number(self.reg?.[self.lastRecalled.registerId]?.numCues)
					const ceiling = isNaN(numCues) ? Infinity : numCues - 1
					self.lastRecalled.cue = Math.min(ceiling, self.lastRecalled.cue + 1)
					self.checkFeedbacks('is_selected_key')
				}
			},
		},

		'cue_rev': {
			name: 'Cue Back (REV)',
			options: [],
			callback: async () => {
				await sendCmd('ASC -1')
				if (self.lastRecalled) {
					self.lastRecalled.cue = Math.max(0, self.lastRecalled.cue - 1)
					self.checkFeedbacks('is_selected_key')
				}
			},
		},

		'rrl_refresh': {
			name: 'Refresh Sources / Command Keys Now',
			options: [
				{
					type: 'multidropdown',
					label: 'Register type(s) to refresh immediately',
					id: 'types',
					default: ['4', '6'],
					choices: [
						{ id: '4', label: 'Command Keys' },
						{ id: '6', label: 'Sources' },
					],
				},
			],
			callback: async (action) => {
				for (const type of action.options.types) {
					await self.queueCmd(`RRL ${type} -1`)
				}
				// Counts as a discovery tick, so the periodic poll doesn't
				// immediately redo the same fetch a moment later.
				self.lastDiscoveryAt = Date.now()
			},
		},

		'sra': {
			name: 'Source Apply (assign source to layer)',
			options: [
				{
					type: 'dropdown',
					label: 'Source Name',
					id: 'source',
					default: sourceChoices[0].id,
					choices: sourceChoices,
					allowCustom: true,
				},
				{
					type: 'textinput',
					label: 'Layer(s) (human-numbered, space delimited if more than one)',
					id: 'lay',
					default: '1',
					// Rejects 0, negatives, leading zeros, and other values that can
					// never be a real layer number. The live upper bound (this
					// Spyder's actual layer count) is checked separately in the
					// callback below, since regex can't see runtime state.
					regex: '/^\\s*[1-9]\\d*(\\s+[1-9]\\d*)*\\s*$/',
				},
			],
			callback: async (action, context) => {
				const source = (await context.parseVariablesInString(String(action.options.source)))
					.trim()
					.replace(/ /g, '%20')
				const humanLayers = String(action.options.lay)
					.trim()
					.split(/\s+/)
					.map(Number)
					.filter((n) => !isNaN(n))

				// self.layerCount (from RLC, polled at connect) is the live,
				// human-numbered usable layer count. Not known yet (e.g. right at
				// connect) just skips range-checking rather than blocking the action.
				let valid = humanLayers
				if (self.layerCount !== undefined) {
					valid = humanLayers.filter((n) => n >= 1 && n <= self.layerCount)
					const invalid = humanLayers.filter((n) => !valid.includes(n))
					if (invalid.length > 0) {
						self.log(
							'warn',
							`sra: layer(s) ${invalid.join(', ')} out of range (this Spyder has ${self.layerCount} layers) -- skipped`,
						)
					}
				}
				if (valid.length === 0) {
					self.log('warn', 'sra: no valid layers to apply source to -- not sending')
					return
				}

				const layers = valid.map((n) => String(n + 1)).join(' ')
				await sendCmd(`SRA ${source} ${layers}`)

				// Immediately confirm via RLS, rather than waiting for the next
				// (now much slower, DISCOVERY_INTERVAL_MS-gated) periodic layer
				// poll in spyder.js -- so 'layer_source_is' reflects this change
				// right away instead of up to a minute later.
				for (const n of valid) {
					await self.queueCmd(`RLS ${n + 1}`)
				}
			},
		},

		'asc': {
			name: 'Take (Advance Script Cue)',
			options: [
				{
					type: 'dropdown',
					label: 'Cues to advance / step Back',
					id: 'cueNum',
					default: '0',
					choices: [
						{ id: '-10', label: 'Step back 10 Cues' },
						{ id: '-1', label: 'Step back 1 Cue' },
						{ id: '0', label: 'None / Take' },
						{ id: '+1', label: 'Advance 1 Cue' },
						{ id: '+10', label: 'Advance 10 Cues' },
					],
				},
			],
			callback: async (action, context) => {
				const cue = action.options.cueNum
				await sendCmd('ASC' + (0 == cue ? '' : ' ' + cue))
			},
		},

		'bpr': {
			name: 'Basic Preset Recall (Index Nr)',
			options: [
				{
					type: 'textinput',
					label: 'Preset Index',
					id: 'idx',
					default: 1,
					regex: Regex.NUMBER,
				},
				{
					type: 'textinput',
					label: 'Duration (Optional)',
					id: 'dur',
					default: 1,
					regex: Regex.NUMBER,
				},
			],
			callback: async (action, context) => {
				const idx = action.options.idx
				const dur = action.options.dur
				await sendCmd(`BPR ${idx} ${dur}`)
			},
		},

		'rsc': {
			name: 'Recall Script Cue (Script, Cue)',
			options: [
				{
					type: 'textinput',
					label: 'Script ID/Register ID',
					id: 'sidx',
					default: 1,
					regex: Regex.NUMBER,
				},
				{
					type: 'textinput',
					label: 'Script Cue',
					id: 'cidx',
					default: 1,
					regex: Regex.NUMBER,
				},
				{
					type: 'dropdown',
					label: 'ID Type being recalled',
					id: 'type',
					default: 'S',
					choices: [
						{ id: 'S', label: 'ScriptID (default)' },
						{ id: 'R', label: 'RegisterID' },
					],
				},
			],
			callback: async (action, context) => {
				const sidx = action.options.sidx
				const cidx = action.options.cidx
				const type = action.options.type
				await sendCmd(`RSC ${sidx} ${cidx} ${type}`)
			},
		},

		'trn': {
			name: 'Transition layer(s)',
			options: [
				{
					type: 'dropdown',
					label: 'Transition Mix on/off',
					id: 'mix',
					default: '1',
					choices: [
						{ id: 1, label: 'Mix On' },
						{ id: 0, label: 'Mix Off' },
					],
				},
				{
					type: 'textinput',
					label: 'duration',
					id: 'dur',
					default: 60,
					regex: Regex.NUMBER,
				},
				{
					type: 'textinput',
					name: 'Layer(s) input multiple layers space delimited',
					id: 'lay',
					default: '',
				},
			],
			callback: async (action, context) => {
				const mix = action.options.mix
				const dur = action.options.dur
				const lay = action.options.lay
				await sendCmd(`TRN ${mix} ${dur} ${lay}`)
			},
		},

		'frz': {
			label: 'Freeze Layer(s)',
			options: [
				{
					type: 'dropdown',
					label: 'Freeze Layer on/off',
					id: 'frzonoff',
					default: '1',
					choices: [
						{ id: 1, label: 'Freeze On' },
						{ id: 0, label: 'Freeze Off' },
					],
				},
				{
					type: 'textinput',
					label: 'Layer(s) input multiple layers space delimited',
					id: 'lay',
					default: 1,
				},
			],
			callback: async (action, context) => {
				const onoff = action.options.frzonoff
				const lay = action.options.lay
				await sendCmd(`FRZ ${onoff} ${lay}`)
			},
		},

		'btr': {
			name: 'Background Transition',
			options: [
				{
					type: 'textinput',
					label: 'duration',
					id: 'dur',
					default: 60,
					regex: Regex.NUMBER,
				},
			],
			callback: async (action, context) => {
				const dur = action.options.dur
				await sendCmd(`BTR ${dur}`)
			},
		},

		'fkr': {
			name: 'Function Key Recall',
			options: [
				{
					type: 'textinput',
					label: 'Funktion key ID',
					id: 'fkrid',
					default: 1,
					regex: Regex.NUMBER,
				},
				{
					type: 'textinput',
					label: 'Layer(s) input multiple layers space delimited',
					id: 'lay',
					default: 1,
				},
			],
			callback: async (action, context) => {
				const fkrid = action.options.fkrid
				const lay = action.options.lay
				await sendCmd(`FKR ${fkrid} ${lay}`)
			},
		},

		'ofz': {
			name: 'Output Freeze',
			options: [
				{
					type: 'dropdown',
					label: 'Freeze Output on/off',
					id: 'frzonoff',
					default: '1',
					choices: [
						{ id: 1, label: 'Freeze On' },
						{ id: 0, label: 'Freeze Off' },
					],
				},
				{
					type: 'textinput',
					label: 'Output(s)input multiple outputs space delimited',
					id: 'output',
					default: 1,
				},
			],
			callback: async (action, context) => {
				const onoff = action.options.frzonoff
				const output = action.options.output
				await sendCmd(`OFZ ${onoff} ${output}`)
			},
		},

		'dmt': {
			name: 'Device Mixer Transition',
			options: [
				{
					type: 'textinput',
					label: 'duration',
					id: 'dur',
					default: 60,
					regex: Regex.NUMBER,
				},
				{
					type: 'textinput',
					label: 'Device(s)',
					id: 'dev',
					default: 1,
				},
			],
			callback: async (action, context) => {
				const dur = action.options.dur
				const dev = action.options.dev
				await sendCmd(`DMT ${dur} ${dev}`)
			},
		},
	}
}
