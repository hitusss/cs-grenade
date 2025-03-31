import { type GrenadeImage } from '@prisma/client'

import { type OptionalNullable } from '#types/utils.ts'
import { prisma } from '#app/utils/db.server.ts'

export async function createGrenadeImage({
	contentType,
	blob,
	order,
	description,
	grenadeId,
}: OptionalNullable<{
	contentType: GrenadeImage['contentType']
	blob: GrenadeImage['blob']
	order: GrenadeImage['order']
	description: GrenadeImage['description']
	grenadeId: GrenadeImage['grenadeId']
}>) {
	return prisma.grenadeImage.create({
		data: {
			contentType,
			blob,
			order,
			description,
			grenadeId,
		},
	})
}

export async function getGrenadeImage(imageId: GrenadeImage['id']) {
	return prisma.grenadeImage.findUnique({
		where: { id: imageId },
		select: { contentType: true, blob: true },
	})
}

export async function updateGrenadeImage({
	imageId,
	contentType,
	blob,
	order,
	description,
}: {
	imageId: GrenadeImage['id']
	contentType?: GrenadeImage['contentType']
	blob?: GrenadeImage['blob']
	order?: GrenadeImage['order']
	description?: GrenadeImage['description']
}) {
	return prisma.grenadeImage.update({
		where: {
			id: imageId,
		},
		data: {
			contentType,
			blob,
			order,
			description,
		},
	})
}

export async function deleteGrenadeImage(imageId: GrenadeImage['id']) {
	return prisma.grenadeImage.delete({
		where: {
			id: imageId,
		},
	})
}
