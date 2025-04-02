import { type Connection } from '@prisma/client'

import { prisma } from '#app/utils/db.server.ts'

export async function createConnection({
	userId,
	providerName,
	providerId,
}: {
	userId: Connection['userId']
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

export async function getUserConnections(userId: Connection['userId']) {
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

export async function checkUserHasConnection({
	userId,
	providerId,
}: {
	userId: Connection['userId']
	providerId: Connection['providerId']
}) {
	return prisma.connection.findFirst({
		select: { id: true },
		where: {
			userId: userId,
			providerId: providerId,
		},
	})
}

export async function deleteConnection({
	userId,
	connectionId,
}: {
	userId: Connection['userId']
	connectionId: Connection['id']
}) {
	return prisma.connection.delete({
		where: {
			id: connectionId,
			userId: userId,
		},
	})
}
