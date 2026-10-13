export function GetPresetDefinitions(self) {
	const presets = {
		// All four of these are 'layered' (not 'simple') purely for the
		// font -- same reason as the per-key presets below. Each is just a
		// bg box + a mono label element; only force_server_save also has a
		// feedback wired in.
		force_server_save: {
			type: 'layered',
			name: 'Force Server Save',
			elements: [
				{ id: 'bg', type: 'box', color: 0x660000 },
				{
					id: 'label',
					type: 'text',
					text: `${self.label}\nSAVE`,
					font: 'companion-mono',
					fontsize: 100,
					fontsizeAllowShrink: true,
					color: 0xffffff,
					halign: 'center',
					valign: 'center',
				},
			],
			feedbacks: [
				{
					feedbackId: 'sav_last_time',
					options: {},
					// sav_last_time is `type: 'advanced'`: the actual text shown
					// (idle vs "...\nlast:HH:MM") comes from its callback at
					// runtime, same as on a 'simple' preset/hand-added feedback.
					// This styleOverrides entry's job is only to declare which
					// element/property that callback is allowed to touch (must
					// match `affectedProperties: ['text']` in feedbacks.js) so
					// Companion attaches the feedback to the button at all --
					// an empty/missing styleOverrides here drops the feedback
					// entirely, same failure mode as is_selected_key below. The
					// literal override value is a placeholder, not what's shown.
					styleOverrides: [
						{ elementId: 'label', elementProperty: 'text', override: { value: `${self.label}\nSAVE`, isExpression: false } },
					],
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
			type: 'layered',
			name: 'Cue Back (REV)',
			elements: [
				{ id: 'bg', type: 'box', color: 0x330000 },
				{
					id: 'label',
					type: 'text',
					text: '<<<\nREV',
					font: 'companion-mono',
					fontsize: 100,
					fontsizeAllowShrink: true,
					color: 0xffffff,
					halign: 'center',
					valign: 'center',
				},
			],
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
			type: 'layered',
			name: 'Cue Advance (FWD)',
			elements: [
				{ id: 'bg', type: 'box', color: 0x003300 },
				{
					id: 'label',
					type: 'text',
					text: '>>>\nFWD',
					font: 'companion-mono',
					fontsize: 100,
					fontsizeAllowShrink: true,
					color: 0xffffff,
					halign: 'center',
					valign: 'center',
				},
			],
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
			type: 'layered',
			name: 'Refresh Sources & Command Keys Now',
			elements: [
				{ id: 'bg', type: 'box', color: 0x000000 },
				{
					id: 'label',
					type: 'text',
					text: 'Refresh\nSrc + Keys',
					font: 'companion-mono',
					fontsize: 100,
					fontsizeAllowShrink: true,
					color: 0xffffff,
					halign: 'center',
					valign: 'center',
				},
			],
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
					// black/mono in both states. Unlike most of this codebase's
					// CompanionGraphicsElementValue fields, a plain (unwrapped)
					// override value here gets silently dropped -- Companion's
					// own preset-conversion code filters styleOverrides entries
					// on an isExpression check before anything else runs, so the
					// full {value, isExpression} wrapper is required.
					styleOverrides: [{ elementId: 'bg', elementProperty: 'color', override: { value: 0xff9f40, isExpression: false } }],
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
