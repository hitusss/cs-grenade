import {
	type Connection,
	type Password,
	type Prisma,
	type Session,
	type User,
	type UserImage,
} from '@prisma/client'

import { type OptionalNullable } from '#types/utils.ts'
import { prisma } from '#app/utils/db.server.ts'

export async function createUser({
	email,
	username,
	name,
	passwordHash,
	sessionExpirationDate,
}: {
	email: User['email']
	username: User['username']
	name: User['name']
	passwordHash: Password['hash']
	sessionExpirationDate: Session['expirationDate']
}) {
	return prisma.session.create({
		data: {
			expirationDate: sessionExpirationDate,
			user: {
				create: {
					email,
					username,
					name,
					roles: { connect: { name: 'user' } },
					password: {
						create: {
							hash: passwordHash,
						},
					},
				},
			},
		},
		select: { id: true, expirationDate: true },
	})
}

export async function createUserWithConnection({
	email,
	username,
	name,
	providerId,
	providerName,
	image,
	sessionExpirationDate,
}: {
	email: User['email']
	username: User['username']
	name: User['name']
	providerId: Connection['providerId']
	providerName: Connection['providerName']
	image?: Pick<UserImage, 'contentType' | 'blob'>
	sessionExpirationDate: Session['expirationDate']
}) {
	return prisma.session.create({
		data: {
			expirationDate: sessionExpirationDate,
			user: {
				create: {
					email,
					username,
					name,
					roles: { connect: { name: 'user' } },
					connections: { create: { providerId, providerName } },
					image: image ? { create: image } : undefined,
				},
			},
		},
		select: { id: true, expirationDate: true },
	})
}

export async function getUserCount() {
	return prisma.user.count()
}

export async function getUser(userId: User['id']) {
	return prisma.user.findUnique({
		where: { id: userId },
		select: {
			id: true,
			name: true,
			username: true,
			createdAt: true,
			image: { select: { id: true } },
		},
	})
}

export async function getUserByUsername(username: User['username']) {
	return prisma.user.findUnique({
		where: { username },
		select: {
			id: true,
			name: true,
			username: true,
			createdAt: true,
			image: { select: { id: true } },
		},
	})
}

export async function getUserWithPassword(userId: User['id']) {
	return prisma.user.findUnique({
		where: { id: userId },
		select: { id: true, password: { select: { hash: true } } },
	})
}

export async function getUserWithPasswordByUsername(username: User['id']) {
	return prisma.user.findUnique({
		where: { username },
		select: { id: true, password: { select: { hash: true } } },
	})
}

export async function getUserWithPermissions(userId: User['id']) {
	return prisma.user.findUnique({
		where: {
			id: userId,
		},
		select: {
			id: true,
			name: true,
			username: true,
			createdAt: true,
			image: { select: { id: true } },
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

export async function getUserWithActiveSessionCount(userId: User['id']) {
	return prisma.user.findUnique({
		where: {
			id: userId,
		},
		select: {
			id: true,
			name: true,
			username: true,
			email: true,
			createdAt: true,
			image: {
				select: { id: true },
			},
			_count: {
				select: {
					sessions: {
						where: {
							expirationDate: { gt: new Date() },
						},
					},
				},
			},
		},
	})
}

export async function getUserEmail(userId: User['id']) {
	return prisma.user.findUnique({
		where: { id: userId },
		select: { email: true },
	})
}

export async function getUserIdByUsername(username: User['username']) {
	return prisma.user.findUnique({
		where: { username },
		select: { id: true },
	})
}

export async function getUserIdByEmail(email: User['email']) {
	return prisma.user.findUnique({
		where: { email },
		select: { id: true },
	})
}

export async function getFilteredUserCount({
	query,
	role,
}: {
	query?: string | null
	role?: string | null
}) {
	return await prisma.user.count({
		where: {
			OR: query
				? [
						{
							email: {
								contains: query,
							},
						},
						{
							username: {
								contains: query,
							},
						},
						{
							name: {
								contains: query,
							},
						},
					]
				: undefined,
			roles: role ? { some: { name: role } } : undefined,
		},
	})
}

export async function getFilteredUsersWithPagginations({
	query,
	role,
	orderBy,
	page,
	perPage,
}: {
	query?: string | null
	role?: string | null
	orderBy?: Record<string, Prisma.SortOrder>
	page: number
	perPage: number
}) {
	return prisma.user.findMany({
		where: {
			OR: query
				? [
						{
							email: {
								contains: query,
							},
						},
						{
							username: {
								contains: query,
							},
						},
						{
							name: {
								contains: query,
							},
						},
					]
				: undefined,
			roles: role ? { some: { name: role } } : undefined,
		},
		select: {
			id: true,
			email: true,
			username: true,
			name: true,
			image: {
				select: {
					id: true,
				},
			},
			roles: {
				select: {
					name: true,
				},
			},
		},
		orderBy,
		skip: page * perPage - perPage,
		take: perPage,
	})
}

export async function getUsernameAndEmailByUsernameOrEmail(
	usernameOrEmail: User['username'] | User['email'],
) {
	return prisma.user.findFirst({
		where: {
			OR: [{ email: usernameOrEmail }, { username: usernameOrEmail }],
		},
		select: { username: true, email: true },
	})
}

export async function getUserPasswordAndConnectionCount(userId: User['id']) {
	return prisma.user.findUnique({
		where: { id: userId },
		select: {
			password: { select: { userId: true } },
			_count: { select: { connections: true } },
		},
	})
}

export async function updateUsernameAndName({
	userId,
	name,
	username,
}: OptionalNullable<{
	userId: User['id']
	username: User['username']
	name: User['name']
}>) {
	return prisma.user.update({
		where: { id: userId },
		data: {
			username,
			name,
		},
	})
}

export async function updateUserEmail({
	userId,
	email,
}: {
	userId: User['id']
	email: User['email']
}) {
	return await prisma.user.update({
		where: { id: userId },
		data: { email },
	})
}

export async function deteteUser(userId: User['id']) {
	return prisma.user.delete({ where: { id: userId } })
}

export async function getUserIdByUsernameOrEmail(
	usernameOrEmail: User['username'] | User['email'],
) {
	return prisma.user.findFirst({
		where: {
			OR: [{ email: usernameOrEmail }, { username: usernameOrEmail }],
		},
		select: { id: true },
	})
}
