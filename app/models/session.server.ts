import { type Session, type User } from '@prisma/client'

import { prisma } from '#app/utils/db.server.ts'

export async function createUserSession({
	userId,
	expirationDate,
}: {
	userId: User['id']
	expirationDate: Session['expirationDate']
}) {
	return prisma.session.create({
		select: { id: true, expirationDate: true, userId: true },
		data: {
			expirationDate,
			userId,
		},
	})
}

export async function getSessionExpirationDate(sessionId: Session['id']) {
	return prisma.session.findUnique({
		select: { expirationDate: true },
		where: { id: sessionId },
	})
}

export async function getUserIdFromActiveSession(sessionId: Session['id']) {
	return prisma.session.findUnique({
		select: { user: { select: { id: true } } },
		where: { id: sessionId, expirationDate: { gt: new Date() } },
	})
}

export async function deleteSession(sessionId: Session['id']) {
	return prisma.session.delete({ where: { id: sessionId } })
}

export async function deleteUserSessionExceptOne({
	userId,
	sessionId,
}: {
	userId: User['id']
	sessionId: Session['id']
}) {
	return prisma.session.deleteMany({
		where: {
			userId,
			id: { not: sessionId },
		},
	})
}
