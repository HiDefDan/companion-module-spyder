// A small decorative keycap/bezel overlay for the per-command-key presets
// below -- nods to the nested-square keycap look in the ST420 Shotbox
// manual's keyboard layout diagram (a raised outer/inner bezel ring) plus
// a thin phosphor-green indicator strip for an LCD-panel feel, generated
// as SVG and rendered to this PNG rather than reusing anything from that
// manual. Transparent everywhere except the bezel strokes and strip, so
// the preset's own bgcolor (idle blue / selected orange) still shows
// through and text contrast is unaffected.
const KEYCAP_PNG64 =
	'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAJAAAACQCAYAAADnRuK4AAAABmJLR0QA/wD/AP+gvaeTAAANRklEQVR4nO3abXBU13kH8P9zdlfSSqsAAiQEBWKMsJCQhLQLkjE23Y6TOsQ1hBdN43hq4zSexi62G5KZOk3jxXHizuBJ60KSmXRaJ7XTEJn6rW5CEzob3NZIaFdvIGFA1BYUgUDWYKP31T1PP0h3WWSxq90jZJg8v0/37j3nOXf3/vfec+8uIIQQQgghhBBCiJsETXXB/wkdudVFllcz3UrgfCaVPdVjiMkj1pcZdE4RnyKtQqtWlf7vlNafiiK1tUfy4NR/TMAGAAumoqa4TghniPFmxIW9d5SVXTAvZyAUOjXDot4nwdgCIM10Z8S0GiZQjZ7hfqGqoOCjVIukHKC6cPMfAPguGDnXaDLM4A5F1KtBA6mOI1KnwG4GecC8GNf6ghN9wOCvVXnLalMZI6UA1YaanyDgqx/vz+9r0Os0Yh3cv//NdwOBgE6lvphagUBArV+/cblWtA7gjQRaHLudAUsRfXe1t/RnydZOOkC1oaZvE+hLVxehDg39/P63Xj8gobmxBQIB9bk/2vgZgvo6My+K3cbAT6p8Zc8lUy+pAI2deR6NHZMUvdx93r1r/fqCoYn6bN261dHY3p6TEaE57JA7sulAlr486OLu9sbGDwBM+IX+5S9Pps+Z1/80a2y+qi/RM8mciSYdoNpQk59AP4r2IbKY+NtVFWX7xrctKSmZZbHrMwSsY4KXAOdkxxFTh4EIAWEGHUxzWL9pamq6NL5NbbhlGwHfALMDAEA04mB+2Ocrq5vMGJMK0OjdVt+vwDzb3jdW+FZVRdm+YDDo9HhmVbDTybu+98NjbcfrNoN5GwDPJN+nmA6MAQbXlJcV/fTJJ79RyE4n91262Oj3+0dqwy3biPkvY1pfsPJyPrtm4cKENz+TOjOM3arPjr5AeMkOjzt75nMaKBzs73PfvnbFondPHL6smXlspzsZ9DaDT5FCN5Ga8DInphazTmeNOVBYqjTuBGE+CG6Hcjzkq7xje//g0OkMNwbcnpnHgsHgN6u8pS8eDrUsY/CmsRK5qqtnG4AfJhorYYAaGhrmjjA289g6gTq6u9zPA0DWzLnlbI0U9vb2zug821mUMzvHubSgwDpx4ng9LLWntTV0OOVPQUyVXcVlvtWs9faCZct8s3Jyck+f7sjJXzC/LdvjWZ6WNbMcQH3f5Q92Zn1q9u3MnA8ABHwlGArV+H2+7njFVaLRh7Xjfmak2+sa+vnYCfPA4GBm59nOIou1k0A8L2/evtaWhgclPDeO1ubQ4bYjDX+SPz9/HwBYrJ3nznYWDQ4Mue02fr9/UBPviemWmQnnFxPVThigsZ8nAAAM7tj/1usH7PVnd3//3YZww0I7PFmZ7l9Xb7lvJwCesJj4JPGWjffuzHRn/IZAbLF2hhvCC/9u1z8csxucbj/+GhGdtteJ1H2JisadRNfXtyzRxL+K7gHwQpWvLHpdLC6p+IpS6s8Kli3LzMvN21e95b6dfr9/JPn3JqZLMBh0vvLavwfOdZ7d3H7yZL9lWT9oO9r4T/b22nDLY8T8uL2uHWl/eHv58vevVS9ugA6Hm6qZ6TvRxpo3rV69shUYu1WH6w0CMkFoa21peBBy5rlZqKKSin8moBBAr8uhN9q3+PX1zSs04V/thqzwVxM9qokWijcKg5bay0QYev/9E+/a62PPeTJHV9QeSHhuJhpEu8eWPRFNd9sb3nvv+DEAw/a60rx0fOdYCeZAlG8vMdOZ6upqK7oF/PujG9ApE+abT1tLuA6MTgAA0zr79erqaguE/7PXGZgfr06iSXRmtBDz5dh+TFQ+OgC9ncR+ixuIVvivsUUvYrJAwIf2MhOy4tWIfwnTOuYvAByxl0pLS+cQ4BoboD2ZnRY3Dgfh1Nhi2jKvN/q3HK2vHGvo+P/zSngbPxHLcsyJFlCI+6BJ3LgszdFjlzbEc1OpkVKAlKLoAyilWf4sdpNygvrsZaIr05VkpBQgIWwSIGFEAiSMSICEEQmQMCIBEkYkQMKIBEgYkQAJIxIgYUQCJIxIgIQRCZAwIgESRiRAwogESBiRAAkjEiBhRAIkjEiAhBEJkDAiARJGJEDCiARIGJEACSMSIGFEAiSMSICEEQmQMCIBEkYkQMKIBEgYkQAJIxIgYUQCJIxIgIQRCZAwIgESRiRAwogESBiRAAkjEiBhRAIkjEiAhBEJkDAiARJGJEDCiARIGJEACSMSIGFEAiSMSICEEQmQMCIBEkYkQMKIBEgYkQAJIxIgYUQCJIxIgIQRCZAwIgESRiRAwogESBiRAAkjEiBhRAIkjEiAhBEJkDAiARJGJEDCiARIGJEACSMSIGFEAiSMSICEEQmQMCIBEkYkQMKIBEgYkQAJIxIgYUQCJIxIgIQRCZAwIgESRiRAwohzugbyhh5xZRfM2WwxlyiQa7rG/V2iwRGCaulrv/hq2PfjyHSMOS0B8oYecbkXznpjqKuvuLf1wgWOWDwd4/6uIZeDPCvyHnAvnPWgN/TIhukIUUoBYkY/aHTZImQmap9dMGfzUFdfcfO9L78R6e4fTmVMMTnpuZ60kn/70oasW3I2AfhFvLYj4CxlH0hQXyrjpTQHGnRxd7SAxtxE7S3mkt7WCxclPNff0IXe4d6jXRfZQaWJ2iq6cuy0TruQynhxA0RKxRzwK/OW8qVLexiIAIClcGviQcjFEUunsoMieRyx9KTmmUz2sRtubT10yX5ZqZi+CnG/9PEvYYzoaY2Isu3lV155xSpeUdEAQqUC7gLwPICk5jW3/fi+dcm0F/Edf+TNg0l2IQavIxAYFAIQ/YIzMCOmUdxLW9wAMfhc9ApJvLCmpsZRXV1tjQ1ykIBKMPKLy3yrWptDh5PZ+xTesJhCy0srKomRBwBEOnosampqHGD8XrShUmfj1Yl7CVPEp+xlZqR/ellxob2e5tS/Zoymk7XeDkRnYx+jwRFyOeSZ0zShNAdpcLw7MKWYHx9b7s1wqQP2hiVLCosApEUbgtvjjRV/DqRV6KoXRkail52mpqZLYP6pUoqW31boe+yJHc8Eg8EJz2gOoiOe4ty56bmetIm2i6mTnutJ8xTn5ZLFLRNtDwaDzsf+/GvP3la4vFwpRQB+Eg6HP7S3W4SrphYOuEIfKxLjmmcNW12o+T+B0VMagzv2v/X6PYFAQAPA1q2PetbcuaJhVk5OLoHY7U4/MDdnxhf9fv9IbA37OZD10VBx79EueQ50nZDLQVkr8vJc2WlHHMcyN/zWH7jqOASDQeeFng/3DgwM3g0APT09XY31hypeeumlPgAIBAJq/b2b9jN4MQAQqGO1r/SzccdMtFO1oeYnCHj0Sg9+vNK78j8A4HDj0VUDvX3PnT7dsdJi7QSAurq63T/a/bdPI2ZSBoyGKOuWnE3soFJ5En19aHCELGpWLWmvjg8PAPXV7Tu+U1m56jEAcJAaWbRocZMzPe2pO1aX1wNAXajx84D6frQH0e5Kb+meeGMmfJBoufBzZwR/irHrIkF9PRgMHvT7/YMAkOFOH8hfML/t3NnOIou18/y581uKSipuAdHutpZwnV1n7KnoL5Dg4ZaYestLK6qIeXvX+XMVwGh48hfMb8twpw+M6NGLQTAYzADUDrsPEYacNJLwWCUM0B1lZRcOh1pqGPwAADDzoqzs2U8DeKrv0sVGt2fmsWyPZ7lr0eKmcEN4YfvJk/0EFIL5B8UlFecBvE2Mdou4WynHYIqfgUiC1laGQ9Ec1lgK4C4w5gGEkydO9Pf09HR5y71nMtzpA2C0DfddagSAzOzZAYAX2DUY2FtRUXEx0ViT+ilDz3C/QB8NfA7Ms0eL86bacMuJKm/pi8Fg8JtZM+eWO9MZh/776DHNvBnghwDKBjAPQDUToECAlmeJ00GBwOM+agb6tdYvN9Yf+tnaO+8qikQiGO671Oj3+0dq65seBvgL0cbE3ZGB3t2TGSvhHMhW19ByO2v+RwIcoz3JYmBXlbf0xfFtV65cOTOi6W4wrWPAR4DMeT4ZwwDCIP5thksdiL3bstXVN38ZinaA2T6uIw7mh32+srrxbScy6QABQG246QFi+uurC9CrI8O9z6xZs2bgGt3UMq83J22I57JDZV+jjZhCZOnLw+l08UQ43INxNzO2YDCYMXbZ+sK43jsrfaX/Mumxkt252lDzUwQ8NK5KFxP+/nT78dfsJ9XixhQIBNQ9n990DxHvAGKeOAMg8IurfSv/Jpl6SQcIAOpCLfcz+FvRy1m0GHVowhsOzQffe+/4MQnTjaGmpsaxZElhkUVYR8AGZl50VQOiERA/W1lR9vNka6cUIAAIhZorrdEfUXOv0WQYoNMg9DLQn+o4InUEZBI4mxmLcK15KHG3crj+YtXK4qR+y4wZI3XvnDnjVl092xTwZQY8JrXENCMaZOa9I4OX96xdu/ZyymWmYl/eeac1x5Fu3T/h6VHcUAjUwYQ3HZy+1+e7rTtxj0T1ptihxmOfJh72EehW1pyviD6lr8M4IjEFsGb+iBSdY/CpNLjqKyqKOj7p/RJCCCGEEEIIIcQn4v8BoqWu6//dlGkAAAAASUVORK5CYII='

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
				color: 0xffffff,
				bgcolor: 0x000066,
				png64: KEYCAP_PNG64,
				pngalignment: 'center:center',
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
