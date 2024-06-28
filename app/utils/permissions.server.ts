import { json } from '@remix-run/node'

import { type PermissionString, type Role } from '#types/permissions.ts'

import { requireUserId } from './auth.server.ts'
import { prisma } from './db.server.ts'
import { parsePermissionString } from './permissions.ts'

export function unauthorized({
	message,
	...rest
}: { message: string } & Record<string, unknown>) {
	return json(
		{
			error: 'Unauthorized',
			message,
			...rest,
		},
		{ status: 403 },
	)
}

export async function getUserPermissions(userId: string) {
	const user = await prisma.user.findUniqueOrThrow({
		where: { id: userId },
		select: {
			roles: {
				select: {
					name: true,
					permissions: {
						select: { entity: true, action: true, access: true },
					},
				},
			},
		},
	})

	return user
}

export async function requireUserWithPermission(
	request: Request,
	permission: PermissionString,
) {
	const userId = await requireUserId(request)
	const permissionData = parsePermissionString(permission)
	const user = await prisma.user.findFirst({
		select: { id: true },
		where: {
			id: userId,
			roles: {
				some: {
					permissions: {
						some: {
							...permissionData,
							access: permissionData.access
								? { in: permissionData.access }
								: undefined,
						},
					},
				},
			},
		},
	})
	if (!user) {
		throw unauthorized({
			message: `Unauthorized: required permissions: ${permission}`,
			requiredPermission: permissionData,
		})
	}
	return user.id
}

export async function requireUserWithRole(
	request: Request,
	roles: Role | Role[],
) {
	const userId = await requireUserId(request)
	const user = await prisma.user.findFirst({
		select: { id: true },
		where: {
			id: userId,
			roles: {
				some: { name: typeof roles === 'string' ? roles : { in: roles } },
			},
		},
	})
	if (!user) {
		throw unauthorized({
			message: `Unauthorized: required role: ${typeof roles === 'string' ? roles : roles.join(', ')}`,
			requiredRole: name,
		})
	}
	return user.id
}
