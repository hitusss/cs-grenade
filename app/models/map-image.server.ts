import { type MapImage } from '@prisma/client'

import { prisma } from '#app/utils/db.server.ts'

export async function createMapImage({
	mapName,
	contentType,
	blob,
}: {
	mapName: MapImage['mapName']
	contentType: MapImage['contentType']
	blob: MapImage['blob']
}) {
	return prisma.mapImage.create({
		data: {
			mapName,
			contentType,
			blob,
		},
	})
}

export async function getMapImage(imageId: MapImage['id']) {
	return prisma.mapImage.findUnique({
		where: { id: imageId },
		select: { contentType: true, blob: true },
	})
}

export async function deleteMapImageByMapName(mapName: MapImage['mapName']) {
	return prisma.mapImage.delete({
		where: { mapName },
	})
}
