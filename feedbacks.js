import { combineRgb, Regex } from '@companion-module/base'

export function GetFeedbackDefinitions(self) {
	// Live-discovered sources (RRL 6, polled in spyder.js) -- same list and
	// same allowCustom fallback as the 'sra' action's dropdown. Rebuilt on
	// every call, which spyder.js re-triggers (setFeedbackDefinitions)
	// whenever the source list actually changes.
	const sourceChoices = Object.values(self.sources ?? {})
		.sort((a, b) => a.id - b.id)
		.map((src) => ({ id: src.name, label: src.name || `(unnamed, id ${src.id + 1})` }))
	if (sourceChoices.length === 0) {
		sourceChoices.push({ id: '', label: '(no sources discovered yet -- type a name, or wait for next poll)' })
	}

	// Live-discovered command keys (RRL 4) -- same id/label convention as
	// the 'recall_at_cue' action's dropdown in actions.js.
	const cmdKeyChoices = Object.values(self.reg ?? {})
		.sort((a, b) => a.id - b.id)
		.map((k) => ({ id: String(k.id), label: `${k.name || '(unnamed)'} (Key ${k.id + 1})` }))
	if (cmdKeyChoices.length === 0) {
		cmdKeyChoices.push({ id: '', label: '(no command keys discovered yet -- type a Register ID, or wait for next poll)' })
	}

	return {
		is_selected_key: {
			type: 'boolean',
			name: 'Is Selected Command Key',
			description:
				'Highlights when this is the Command Key last recalled via "Recall Command Key at Cue". ' +
				'Local memory only, not read back from Spyder.',
			defaultStyle: {
				bgcolor: combineRgb(200, 0, 0),
				color: 16777215,
			},
			options: [
				{
					type: 'dropdown',
					label: 'Command Key',
					id: 'registerId',
					default: cmdKeyChoices[0].id,
					choices: cmdKeyChoices,
					allowCustom: true,
				},
			],
			callback: (fb) => {
				return self.lastRecalled !== undefined && String(self.lastRecalled.registerId) === String(fb.options.registerId)
			},
		},

		sav_last_time: {
			type: 'advanced',
			name: 'Last Save Time',
			description: 'Appends the HH:MM of the last successful Force Server Save to the button text. No override until the first save this connection.',
			options: [],
			callback: () => {
				const hhmm = self.getLastSaveTime()
				return hhmm ? { text: `${self.label}\nSAVE\nlast:${hhmm}` } : {}
			},
		},

		layer_source_is: {
			type: 'boolean',
			name: 'Layer source is',
			description: 'Change button state when a live-monitored layer\'s currently-applied source matches a name (requires the layer to be listed in "Layers to poll for live source" in connection config)',
			defaultStyle: {
				bgcolor: combineRgb(0, 128, 0),
				color: 16777215,
			},
			options: [
				{
					type: 'textinput',
					label: 'Layer (human-numbered)',
					id: 'layer',
					default: 1,
					regex: Regex.NUMBER,
				},
				{
					type: 'dropdown',
					label: 'Source Name',
					id: 'source',
					default: sourceChoices[0].id,
					choices: sourceChoices,
					allowCustom: true,
				},
			],
			callback: (fb) => {
				return self.getLayerSource(fb.options.layer) === fb.options.source
			},
		},

		inp_ok: {
			type: 'boolean',
			name: 'Script Active',
			description: 'Change button state when Script is Active',
			defaultStyle: {
				bgcolor: combineRgb(128, 0, 0),
				color: 16777215,
			},
			options: [
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
				{
					type: 'textinput',
					label: 'Script ID/Register ID',
					id: 'sidx',
					default: 1,
					regex: Regex.NUMBER,
				},
			],
			callback: (fb) => {
				let id = fb.options.sidx
				const reg = fb.options.type == 'R' ? self.reg[id-1] : self.reg[self.script2reg[id]]
				return reg?.active
			},
		},
	}
}
