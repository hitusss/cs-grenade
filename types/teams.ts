export const teams = ['t', 'ct'] as const
export type TeamType = (typeof teams)[number]

export const teamLabels: Record<TeamType, string> = {
	t: 'Terrorist',
	ct: 'Counter Terrorist',
} as const
