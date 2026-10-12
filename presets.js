export function GetPresetDefinitions() {
	return {
		force_server_save: {
			type: 'button',
			category: 'Utility',
			name: 'Force Server Save',
			style: {
				text: 'Force\nServer Save',
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
