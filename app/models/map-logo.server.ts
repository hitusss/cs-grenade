import { type Map, type MapLogo } from '@prisma/client'

import { prisma } from '#app/utils/db.server.ts'

export async function createMapLogo({
	mapName,
	contentType,
	blob,
}: {
	mapName: Map['name']
	contentType: MapLogo['contentType']
	blob: MapLogo['blob']
}) {
	return prisma.mapLogo.create({
		data: {
			mapName,
			contentType,
			blob,
		},
	})
}

export async function getMapLogo(imageId: MapLogo['id']) {
	return prisma.mapLogo.findUnique({
		where: { id: imageId },
		select: { contentType: true, blob: true },
	})
}

export async function getMapLogoIdByMapName(mapName: Map['name']) {
	return prisma.mapLogo.findFirst({
		where: {
			mapName,
		},
		select: {
			id: true,
		},
	})
}

export async function getMapLogosIds(take: number) {
	return prisma.mapLogo.findMany({
		select: {
			id: true,
		},
		take,
	})
}

export async function deleteMapLogoByMapName(mapName: Map['name']) {
	return prisma.mapLogo.delete({
		where: { mapName },
	})
}
