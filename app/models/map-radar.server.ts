import { type Map, type MapRadar } from '@prisma/client'

import { prisma } from '#app/utils/db.server.ts'

export async function createMapRadar({
	mapName,
	contentType,
	blob,
}: {
	mapName: Map['name']
	contentType: MapRadar['contentType']
	blob: MapRadar['blob']
}) {
	return prisma.mapRadar.create({
		data: {
			mapName,
			contentType,
			blob,
		},
	})
}

export async function getMapRadar(imageId: MapRadar['id']) {
	return prisma.mapRadar.findUnique({
		where: { id: imageId },
		select: { contentType: true, blob: true },
	})
}

export async function deleteMapRadarByMapName(mapName: Map['name']) {
	return prisma.mapRadar.delete({
		where: { mapName },
	})
}
