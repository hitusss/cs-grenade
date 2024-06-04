export const modes = ['system', 'light', 'dark'] as const
export type Mode = (typeof modes)[number]

export const colors = [
	'yellow',
	'orange',
	'red',
	'rose',
	'violet',
	'blue',
	'green',
] as const
export type Color = (typeof colors)[number]

export type Theme = {
	mode: Mode
	color: Color
}
