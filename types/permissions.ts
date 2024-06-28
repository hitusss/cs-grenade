export const entities = ['user', 'map', 'destination', 'grenade'] as const
export const actions = ['create', 'read', 'update', 'delete'] as const
export const accesses = ['own', 'any'] as const

export type Entity = (typeof entities)[number]
export type Action = (typeof actions)[number]
export type Access = (typeof accesses)[number]

export type PermissionString =
	| `${Action}:${Entity}`
	| `${Action}:${Entity}:${Access}`

export const roles = ['user', 'moderator', 'admin', 'superadmin'] as const
export type Role = (typeof roles)[number]
