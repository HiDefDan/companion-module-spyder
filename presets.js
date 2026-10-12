export function GetPresetDefinitions(self) {
	return {
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
}
