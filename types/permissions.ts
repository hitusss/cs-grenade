export const entities = [
	'user',
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

export const roles = [
	'user',
	'userplus',
	'moderator',
	'admin',
	'superadmin',
] as const
export type Role = (typeof roles)[number]
