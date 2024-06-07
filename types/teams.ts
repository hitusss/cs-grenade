export const teams = ['t', 'ct'] as const
export type TeamType = (typeof teams)[number]

export const TeamLabels: Record<TeamType, string> = {
	t: 'Terrorist',
	ct: 'Counter Terrorist',
} as const
