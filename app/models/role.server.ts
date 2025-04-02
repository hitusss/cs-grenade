import { type Role, type User } from '@prisma/client'

import { prisma } from '#app/utils/db.server.ts'

export async function getRoles() {
	return prisma.role.findMany({
		select: {
			name: true,
			priority: true,
		},
	})
}

export async function getRolePriority(roleName: Role['name']) {
	return prisma.role.findUnique({
		where: {
			name: roleName,
		},
		select: {
			priority: true,
		},
	})
}

export async function checkUserRole({
	userId,
	role,
}: {
	userId: User['id']
	role: Role['name']
}) {
	return prisma.user.findFirst({
		select: { id: true },
		where: {
			id: userId,
			roles: {
				some: { name: role },
			},
		},
	})
}

export async function checkUserRolePriority({
	userId,
	rolePriority,
}: {
	userId: User['id']
	rolePriority: Role['priority']
}) {
	return prisma.user.findFirst({
		select: { id: true },
		where: {
			id: userId,
			roles: {
				some: {
					priority: {
						gte: rolePriority,
					},
				},
			},
		},
	})
}

export async function addUserRole({
	userId,
	role,
}: {
	userId: User['id']
	role: Role['name']
}) {
	return prisma.user.update({
		where: { id: userId },
		data: {
			roles: {
				connect: {
					name: role,
				},
			},
		},
	})
}

export async function removeUserRole({
	userId,
	role,
}: {
	userId: User['id']
	role: Role['name']
}) {
	return prisma.user.update({
		where: { id: userId },
		data: {
			roles: {
				disconnect: {
					name: role,
				},
			},
		},
	})
}
