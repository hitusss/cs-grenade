export const TEAMS = ['t', 'ct'] as const
export type TeamType = (typeof TEAMS)[number]

export const TEAM_LABELS: Record<TeamType, string> = {
	t: 'Terrorist',
	ct: 'Counter Terrorist',
} as const
