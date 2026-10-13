export function GetPresetDefinitions(self) {
	const presets = {
		force_server_save: {
			type: 'button',
			category: 'Utility',
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
			type: 'button',
			category: 'Script Cue',
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
			type: 'button',
			category: 'Script Cue',
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
			type: 'button',
			category: 'Utility',
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
		presets[`recall_key_${key.id}`] = {
			type: 'button',
			category: 'Command Keys',
			name: label,
			style: {
				text: `$(spyder:cKey_rID_${key.id + 1})`,
				size: 'auto',
				color: 0x000000,
				bgcolor: 0xffff80,
			},
			feedbacks: [
				{
					feedbackId: 'is_selected_key',
					options: { registerId: String(key.id) },
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

	return presets
}
