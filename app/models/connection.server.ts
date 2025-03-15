import { type Connection, type User } from '@prisma/client'

import { prisma } from '#app/utils/db.server.ts'

export async function createConnection({
	userId,
	providerName,
	providerId,
}: {
	userId: User['id']
	providerName: Connection['providerName']
	providerId: Connection['providerId']
}) {
	return prisma.connection.create({
		data: {
			providerName,
			providerId,
			userId,
		},
	})
}

export async function getUserConnections(userId: User['id']) {
	return prisma.connection.findMany({
		where: { userId },
		select: { id: true, providerName: true, providerId: true, createdAt: true },
	})
}

export async function getUserIdFromConnection({
	providerName,
	providerId,
}: {
	providerName: Connection['providerName']
	providerId: Connection['providerId']
}) {
	return prisma.connection.findUnique({
		select: { userId: true },
		where: {
			providerName_providerId: {
				providerName,
				providerId,
			},
		},
	})
}

export async function deleteConnection({
	userId,
	connectionId,
}: {
	userId: User['id']
	connectionId: Connection['id']
}) {
	return prisma.connection.delete({
		where: {
			id: connectionId,
			userId: userId,
		},
	})
}
