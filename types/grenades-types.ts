export const GRENADE_TYPES = ['smoke', 'molotov', 'flashbang', 'he'] as const
export type GrenadeType = (typeof GRENADE_TYPES)[number]

export const GRENADE_LABELS: Record<GrenadeType, string> = {
	smoke: 'Smoke',
	molotov: 'Molotov',
	flashbang: 'Flashbang',
	he: 'HE Grenade',
}
