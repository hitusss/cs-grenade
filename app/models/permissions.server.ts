import { type Permission, type User } from '@prisma/client'

import { prisma } from '#app/utils/db.server.ts'

export async function getUserPermissions(userId: User['id']) {
	return prisma.user.findUniqueOrThrow({
		where: { id: userId },
		select: {
			roles: {
				select: {
					name: true,
					priority: true,
					permissions: {
						select: { entity: true, action: true, access: true },
					},
				},
			},
		},
	})
}

export async function checkUserPermission({
	userId,
	permission,
}: {
	userId: User['id']
	permission: Partial<Pick<Permission, 'action' | 'entity' | 'access'>>
}) {
	return prisma.user.findFirst({
		select: { id: true },
		where: {
			id: userId,
			roles: {
				some: {
					permissions: {
						some: {
							...permission,
							access: permission.access ? permission.access : undefined,
						},
					},
				},
			},
		},
	})
}
