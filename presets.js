export function GetPresetDefinitions(self) {
	const presets = {
		force_server_save: {
			type: 'simple',
			name: 'Force Server Save',
			style: {
				text: `${self.label}\nSAVE`,
				size: 'auto',
				color: 0xffffff,
				bgcolor: 0x660000,
			},
			feedbacks: [
				{
					feedbackId: 'sav_last_time',
					options: {},
				},
			],
			steps: [
				{
					down: [
						{
							actionId: 'sav',
							options: {},
						},
					],
					up: [],
				},
			],
		},

		cue_rev: {
			type: 'simple',
			name: 'Cue Back (REV)',
			style: {
				text: '<<<\nREV',
				size: 'auto',
				color: 0xffffff,
				bgcolor: 0x330000,
			},
			feedbacks: [],
			steps: [
				{
					down: [
						{
							actionId: 'cue_rev',
							options: {},
						},
					],
					up: [],
				},
			],
		},

		cue_fwd: {
			type: 'simple',
			name: 'Cue Advance (FWD)',
			style: {
				text: '>>>\nFWD',
				size: 'auto',
				color: 0xffffff,
				bgcolor: 0x003300,
			},
			feedbacks: [],
			steps: [
				{
					down: [
						{
							actionId: 'cue_fwd',
							options: {},
						},
					],
					up: [],
				},
			],
		},

		rrl_refresh_both: {
			type: 'simple',
			name: 'Refresh Sources & Command Keys Now',
			style: {
				text: 'Refresh\nSrc + Keys',
				size: 'auto',
				color: 0xffffff,
				bgcolor: 0x000000,
			},
			feedbacks: [],
			steps: [
				{
					down: [
						{
							actionId: 'rrl_refresh',
							options: { types: ['4', '6'] },
						},
					],
					up: [],
				},
			],
		},
	}

	const commandKeyIds = []

	// One preset per currently-discovered command key -- mirrors the
	// ST420 Shotbox's "Read CMD Keys" auto-populate, but kept live: this
	// is regenerated (spyder.js calls setPresetDefinitions again)
	// whenever the command-key list changes, not just at connect. A
	// button already dragged from an earlier version of one of these
	// does NOT auto-update or auto-disappear if its key's RegisterID is
	// later reused for a different key -- Companion presets are just
	// templates; a placed button is an independent copy from that point
	// on. A rename alone, though, reaches already-placed buttons too:
	// the button text is the live `cKey_rID_<RegisterID>` variable, not
	// a literal string baked in at drop time.
	for (const key of Object.values(self.reg ?? {})) {
		const label = key.name || `(unnamed, Key ${key.id + 1})`
		const presetId = `recall_key_${key.id}`
		commandKeyIds.push(presetId)
		presets[presetId] = {
			// 'layered' instead of 'simple' -- the only way to get font
			// control (a plain 'simple' CompanionButtonStyleProps.style has
			// no font field at all). Hand-authoring elements/styleOverrides
			// here instead of the flat style/style-on-feedback shape used
			// elsewhere in this file.
			type: 'layered',
			name: label,
			elements: [
				{ id: 'bg', type: 'box', color: 0xffff80 },
				{
					id: 'label',
					type: 'text',
					text: `$(spyder:cKey_rID_${key.id + 1})`,
					font: 'companion-mono',
					fontsize: 100,
					fontsizeAllowShrink: true,
					color: 0x000000,
					halign: 'center',
					valign: 'center',
				},
			],
			feedbacks: [
				{
					feedbackId: 'is_selected_key',
					options: { registerId: String(key.id) },
					// Layered presets use styleOverrides (targeting specific
					// element ids above) instead of the flat `style` the
					// 'simple' presets elsewhere in this file use -- same
					// underlying reason as those: a feedback attached inside
					// a preset doesn't get is_selected_key's own defaultStyle
					// (feedbacks.js) auto-applied, so it's declared explicitly
					// here too. Only overrides the background -- text stays
					// black/mono in both states.
					styleOverrides: [{ elementId: 'bg', elementProperty: 'color', override: 0xff9f40 }],
				},
			],
			steps: [
				{
					down: [
						{
							actionId: 'recall_at_cue',
							options: { registerId: String(key.id), cue: Number(self.config?.defaultCue) || 0 },
						},
					],
					up: [],
				},
			],
		}
	}

	// API v2 replaced each preset's own `category` field with a separate
	// "structure" of sections passed alongside the presets themselves to
	// setPresetDefinitions(structure, presets).
	const structure = [
		{ id: 'utility', name: 'Utility', definitions: ['force_server_save', 'rrl_refresh_both'] },
		{ id: 'script_cue', name: 'Script Cue', definitions: ['cue_rev', 'cue_fwd'] },
		{ id: 'command_keys', name: 'Command Keys', definitions: commandKeyIds },
	]

	return { structure, presets }
}
