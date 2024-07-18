export const entities = [
	'admin',
	'user',
	'cache',
	'support',
	'map',
	'destination',
	'grenade',
	'review-destination-request',
	'review-grenade-request',
] as const
export const actions = ['create', 'read', 'update', 'delete'] as const
export const accesses = ['own', 'any'] as const

export type Entity = (typeof entities)[number]
export type Action = (typeof actions)[number]
export type Access = (typeof accesses)[number]

export type PermissionString =
	| `${Action}:${Entity}`
	| `${Action}:${Entity}:${Access}`
