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

	return {
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
