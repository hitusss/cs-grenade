import { type Password, type User } from '@prisma/client'

import { prisma } from '#app/utils/db.server.ts'

export async function updateUserPassowrd({
	userId,
	passwordHash,
}: {
	userId: Password['userId']
	passwordHash: Password['hash']
}) {
	return prisma.user.update({
		select: { username: true },
		where: { id: userId },
		data: {
			password: {
				update: {
					hash: passwordHash,
				},
			},
		},
	})
}

export async function updateUserPassowrdByUsername({
	username,
	passwordHash,
}: {
	username: User['username']
	passwordHash: Password['hash']
}) {
	return prisma.user.update({
		select: { username: true },
		where: { username },
		data: {
			password: {
				update: {
					hash: passwordHash,
				},
			},
		},
	})
}
