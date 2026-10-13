export function GetPresetDefinitions(self) {
	const presets = {
		// All four of these are 'layered' (not 'simple') purely for the
		// font -- same reason as the per-key presets below. Each is just a
		// bg box + a mono label element.
		force_server_save: {
			type: 'layered',
			name: 'Force Server Save',
			elements: [
				{ id: 'bg', type: 'box', color: 0x660000 },
				{
					id: 'label',
					type: 'text',
					// $(spyder:LastSave) (blank until the first successful SAV
					// this connection) instead of wiring sav_last_time's
					// advanced feedback into this preset -- an advanced
					// feedback's styleOverrides only declares which
					// element/property its callback may touch, and whether that
					// actually drives a layered preset's rendered text at
					// runtime wasn't reliably working. A live variable sidesteps
					// that entirely, the same mechanism already proven by the
					// per-key presets' cKey_rID_<id> text below.
					text: `${self.label}\nSAVE\n$(spyder:LastSave)`,
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

		select_prev: {
			type: 'layered',
			name: 'Select Target Layer: Prev',
			elements: [
				{ id: 'bg', type: 'box', color: 0x330033 },
				{
					id: 'label',
					type: 'text',
					text: '<<<\nLAYER',
					font: 'companion-mono',
					fontsize: 100,
					fontsizeAllowShrink: true,
					color: 0xffffff,
					halign: 'center',
					valign: 'center',
				},
			],
			feedbacks: [],
			steps: [{ down: [{ actionId: 'select_prev', options: {} }], up: [] }],
		},

		select_next: {
			type: 'layered',
			name: 'Select Target Layer: Next',
			elements: [
				{ id: 'bg', type: 'box', color: 0x003333 },
				{
					id: 'label',
					type: 'text',
					text: 'LAYER\n>>>',
					font: 'companion-mono',
					fontsize: 100,
					fontsizeAllowShrink: true,
					color: 0xffffff,
					halign: 'center',
					valign: 'center',
				},
			],
			feedbacks: [],
			steps: [{ down: [{ actionId: 'select_next', options: {} }], up: [] }],
		},

		// Live display of the current "select target" -- layer number, its
		// current source (word-wrapped by spyder.js's wrapSourceName, not
		// scrolled -- see companion-expression-text-no-live-refresh memory,
		// Companion doesn't re-render a time-expression text element live),
		// and its last-known X,Y position. Four independent text elements
		// (not one \n-joined element) so each line gets its own font
		// size/weight/color and shrinks independently -- a single block would
		// shrink the short layer-number line just to fit the source-name wrap.
		layer_select_display: {
			type: 'layered',
			name: 'Selected Layer Display',
			elements: [
				{ id: 'bg', type: 'box', color: 0x202020 },
				{
					id: 'layerNum',
					type: 'text',
					x: 0,
					y: 0,
					width: 100,
					height: 20,
					text: '$(spyder:selLayerNum)',
					font: 'companion-mono',
					weight: 'bold',
					fontsize: 100,
					fontsizeAllowShrink: true,
					color: 0xffffff,
					halign: 'center',
					valign: 'center',
				},
				{
					id: 'srcLine1',
					type: 'text',
					x: 0,
					y: 20,
					width: 100,
					height: 27,
					text: '$(spyder:selLayerSrcLine1)',
					font: 'companion-mono',
					fontsize: 100,
					fontsizeAllowShrink: true,
					color: 0xffffff,
					halign: 'center',
					valign: 'center',
				},
				{
					id: 'srcLine2',
					type: 'text',
					x: 0,
					y: 47,
					width: 100,
					height: 27,
					text: '$(spyder:selLayerSrcLine2)',
					font: 'companion-mono',
					fontsize: 100,
					fontsizeAllowShrink: true,
					color: 0xffffff,
					halign: 'center',
					valign: 'center',
				},
				{
					id: 'pos',
					type: 'text',
					x: 0,
					y: 74,
					width: 100,
					height: 26,
					text: '$(spyder:selLayerPos)',
					font: 'companion-mono',
					fontsize: 85,
					fontsizeAllowShrink: true,
					color: 0xaaaaaa,
					halign: 'center',
					valign: 'center',
				},
			],
			feedbacks: [],
			steps: [{ down: [], up: [] }],
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
		{
			id: 'layer_positioning',
			name: 'Layer Positioning',
			definitions: ['select_prev', 'select_next', 'layer_select_display'],
		},
	]

	return { structure, presets }
}
