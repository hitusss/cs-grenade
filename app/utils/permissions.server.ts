import { data } from 'react-router'

import { type PermissionString } from '#types/permissions.ts'
import {
	checkUserPermission,
	checkUserRole,
	checkUserRolePriority,
} from '#app/models/index.server.ts'

import { requireUserId } from './auth.server.ts'
import { parsePermissionString } from './permissions.ts'

export function unauthorized({
	message,
	...rest
}: { message: string } & Record<string, unknown>) {
	return data(
		{
			error: 'Unauthorized',
			message,
			...rest,
		},
		{ status: 403 },
	)
}

export async function requireUserWithPermission(
	request: Request,
	permission: PermissionString,
) {
	const userId = await requireUserId(request)
	const permissionData = parsePermissionString(permission)
	const user = await checkUserPermission({
		userId,
		permission: permissionData,
	})
	if (!user) {
		throw unauthorized({
			message: `Unauthorized: required permissions: ${permission}`,
			requiredPermission: permissionData,
		})
	}
	return user.id
}

export async function requireUserWithRole(request: Request, name: string) {
	const userId = await requireUserId(request)
	const user = await checkUserRole({
		userId,
		role: name,
	})
	if (!user) {
		throw unauthorized({
			message: `Unauthorized: required role: ${name}`,
			requiredRole: name,
		})
	}
	return user.id
}

export async function requireUserWithRolePriority(
	request: Request,
	priority: number,
) {
	const userId = await requireUserId(request)
	const user = await checkUserRolePriority({
		userId,
		rolePriority: priority,
	})
	if (!user) {
		throw unauthorized({
			message: `Unauthorized: required role priority: ${priority}`,
			requiredRolePriority: priority,
		})
	}
	return user.id
}
