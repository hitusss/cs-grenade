export const entities = [
	'user',
	'support',
	'report',
	'map',
	'destination',
	'grenade',
	'admin',
	'cache',
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
