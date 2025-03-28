import {
	type Access,
	type Action,
	type Entity,
	type PermissionString,
} from '#types/permissions.ts'

import { type useUser } from './user.ts'

export function parsePermissionString(permissionString: PermissionString) {
	const [action, entity, access] = permissionString.split(':') as [
		Action,
		Entity,
		Access | undefined,
	]
	return {
		action,
		entity,
		access,
	}
}

export function userHasPermission(
	user: Pick<ReturnType<typeof useUser>, 'roles'> | null | undefined,
	permission: PermissionString,
) {
	if (!user) return false
	const { action, entity, access } = parsePermissionString(permission)
	return user.roles.some((role) =>
		role.permissions.some(
			(permission) =>
				permission.entity === entity &&
				permission.action === action &&
				(!access || access.includes(permission.access)),
		),
	)
}

export function userHasRole(
	user: Pick<ReturnType<typeof useUser>, 'roles'> | null,
	name: string,
) {
	if (!user) return false
	return user.roles.some((r) => r.name === name)
}

export function userHasRolePriority(
	user: Pick<ReturnType<typeof useUser>, 'roles'> | null,
	priority: number,
) {
	if (!user) return false
	return user.roles.some((r) => r.priority >= priority)
}
