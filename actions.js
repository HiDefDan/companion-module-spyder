import { Regex } from '@companion-module/base'

export function compileActionDefinitions(self) {
	const sendCmd = self.sendCmd

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

	return {
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
