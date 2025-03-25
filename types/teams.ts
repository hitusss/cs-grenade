export const teams = ['t', 'ct'] as const
export type TeamType = (typeof teams)[number]

export const teamLabels: Record<TeamType, string> = {
	t: 'Terrorist',
	ct: 'Counter Terrorist',
} as const

export function isTeamType(team: string): team is TeamType {
	return teams.some((t) => t === team)
}
