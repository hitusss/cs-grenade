import { type GrenadeChanges } from '@prisma/client'

import { type OptionalNullable } from '#types/utils.ts'
import { prisma } from '#app/utils/db.server.ts'

export async function createGrendeChanges({
	grenadeId,
	userId,
	name,
	description,
	x,
	y,
}: OptionalNullable<{
	grenadeId: GrenadeChanges['grenadeId']
	userId: GrenadeChanges['userId']
	name: GrenadeChanges['name']
	description: GrenadeChanges['description']
	x: GrenadeChanges['x']
	y: GrenadeChanges['y']
}>) {
	return prisma.grenadeChanges.create({
		data: {
			grenadeId,
			userId,
			name,
			description,
			x,
			y,
		},
		select: {
			id: true,
		},
	})
}

export async function getGrenadeChangesByGrenadeId(
	grenadeId: GrenadeChanges['grenadeId'],
) {
	return prisma.grenadeChanges.findUnique({
		where: {
			grenadeId,
		},
		select: {
			name: true,
			description: true,
			x: true,
			y: true,
			grenadeImageChanges: {
				orderBy: {
					order: 'asc',
				},
				select: {
					id: true,
					contentType: true,
					blob: true,
					delete: true,
					order: true,
					description: true,
					grenadeImageId: true,
				},
			},
		},
	})
}

export async function deleteGrendeChangesByGrenadeId(
	grenadeId: GrenadeChanges['grenadeId'],
) {
	return prisma.grenadeChanges.delete({
		where: {
			grenadeId,
		},
	})
}
