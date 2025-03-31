import { type GrenadeImageChanges } from '@prisma/client'

import { type OptionalNullable } from '#types/utils.ts'
import { prisma } from '#app/utils/db.server.ts'

export async function createGrenadeImageChanges({
	grenadeId,
	grenadeImageId,
	contentType,
	blob,
	description,
	order,
	isDeleted,
}: OptionalNullable<{
	grenadeId: GrenadeImageChanges['grenadeId']
	grenadeImageId: GrenadeImageChanges['grenadeImageId']
	contentType: GrenadeImageChanges['contentType']
	blob: GrenadeImageChanges['blob']
	description: GrenadeImageChanges['description']
	order: GrenadeImageChanges['order']
	isDeleted?: GrenadeImageChanges['delete']
}>) {
	return prisma.grenadeImageChanges.create({
		data: {
			grenadeId,
			grenadeImageId,
			contentType,
			blob,
			description,
			order,
			delete: isDeleted,
		},
	})
}

export async function getGrenadeImageChanges(
	imageId: GrenadeImageChanges['id'],
) {
	return prisma.grenadeImageChanges.findUnique({
		where: { id: imageId },
		select: { contentType: true, blob: true },
	})
}
