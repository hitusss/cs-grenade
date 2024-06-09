import { json } from '@remix-run/node'

import { type PermissionString } from '#types/permissions.js'

import { requireUserId } from './auth.server.ts'
import { prisma } from './db.server.ts'
import { parsePermissionString } from './permissions.ts'

export function throwUnauthorized({
	message,
	...rest
}: { message: string } & Record<string, unknown>) {
	throw json(
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
		return throwUnauthorized({
			message: `Unauthorized: required permissions: ${permission}`,
			requiredPermission: permissionData,
		})
	}
	return user.id
}

export async function requireUserWithRole(request: Request, name: string) {
	const userId = await requireUserId(request)
	const user = await prisma.user.findFirst({
		select: { id: true },
		where: { id: userId, roles: { some: { name } } },
	})
	if (!user) {
		return throwUnauthorized({
			message: `Unauthorized: required role: ${name}`,
			requiredRole: name,
		})
	}
	return user.id
}
