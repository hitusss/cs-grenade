import { type DestinationChanges } from '@prisma/client'

import { prisma } from '#app/utils/db.server.ts'

export async function createDestinationChanges({
	destinationId,
	name,
	x,
	y,
	userId,
}: {
	destinationId: DestinationChanges['destinationId']
	name: DestinationChanges['name']
	x: DestinationChanges['x']
	y: DestinationChanges['y']
	userId: DestinationChanges['userId']
}) {
	return prisma.destinationChanges.create({
		data: {
			destinationId,
			name,
			x,
			y,
			userId,
		},
	})
}

export async function getDestinationChangesByDestinationId(
	destinationId: DestinationChanges['destinationId'],
) {
	return prisma.destinationChanges.findUnique({
		where: {
			destinationId,
		},
		select: {
			name: true,
			x: true,
			y: true,
		},
	})
}

export async function deletedDestinationChangesByDestinationId(
	destinationId: DestinationChanges['destinationId'],
) {
	return prisma.destinationChanges.deleteMany({
		where: {
			destinationId,
		},
	})
}
