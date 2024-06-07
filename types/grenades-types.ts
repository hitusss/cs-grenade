export const grenadeTypes = ['smoke', 'molotov', 'flashbang', 'he'] as const
export type GrenadeType = (typeof grenadeTypes)[number]

export const grenadeLabels: Record<GrenadeType, string> = {
	smoke: 'Smoke',
	molotov: 'Molotov',
	flashbang: 'Flashbang',
	he: 'HE Grenade',
}
