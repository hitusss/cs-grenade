import {
	type Map,
	type MapImage,
	type MapLogo,
	type MapRadar,
	type Prisma,
} from '@prisma/client'

import { type GrenadeType } from '#types/grenades-types.ts'
import { type TeamType } from '#types/teams.ts'
import { prisma } from '#app/utils/db.server.ts'

export async function createMap({
	name,
	label,
	image,
	logo,
	radar,
	userId,
}: {
	name: Map['name']
	label: Map['label']
	image: Pick<MapImage, 'contentType' | 'blob'>
	logo: Pick<MapLogo, 'contentType' | 'blob'>
	radar: Pick<MapRadar, 'contentType' | 'blob'>
	userId: Map['userId']
}) {
	return prisma.map.create({
		data: {
			name,
			label,
			image: {
				create: image,
			},
			logo: {
				create: logo,
			},
			radar: {
				create: radar,
			},
			userId,
		},
	})
}

export async function getMapCount() {
	return prisma.map.count({})
}

export async function getMaps() {
	return prisma.map.findMany({
		select: {
			name: true,
			label: true,
			isActive: true,
			image: {
				select: {
					id: true,
				},
			},
			logo: {
				select: {
					id: true,
				},
			},
		},
		orderBy: {
			name: 'asc',
		},
	})
}

export async function getMapsWithPagination({
	orderBy,
	page,
	perPage,
}: {
	orderBy?: Record<string, Prisma.SortOrder | Record<string, string>>
	page: number
	perPage: number
}) {
	return prisma.map.findMany({
		select: {
			name: true,
			label: true,
			isActive: true,
			logo: {
				select: {
					id: true,
				},
			},
			user: {
				select: {
					name: true,
					username: true,
					image: {
						select: {
							id: true,
						},
					},
				},
			},
		},
		orderBy,
		skip: page * perPage - perPage,
		take: perPage,
	})
}

export async function getMapsNames() {
	return prisma.map.findMany({
		select: {
			name: true,
		},
	})
}

export async function getMap(mapName: Map['name']) {
	return prisma.map.findUnique({
		where: { name: mapName },
		select: {
			label: true,
			image: {
				select: {
					id: true,
				},
			},
			logo: {
				select: {
					id: true,
				},
			},
			radar: {
				select: {
					id: true,
				},
			},
		},
	})
}

export async function getMapWithContent({
	mapName,
	team,
	type,
}: {
	mapName: Map['name']
	team: TeamType
	type: GrenadeType
}) {
	return prisma.map.findUnique({
		where: {
			name: mapName,
		},
		select: {
			label: true,
			radar: { select: { id: true } },
			destinations: {
				where: {
					team,
					type,
					verified: true,
				},
				select: {
					id: true,
					name: true,
					x: true,
					y: true,
					grenades: {
						where: {
							team,
							type,
							verified: true,
						},
						select: {
							id: true,
							name: true,
							x: true,
							y: true,
						},
					},
				},
			},
		},
	})
}

export async function updateMapNameAndLabel({
	name,
	newName,
	newLabel,
}: {
	name: Map['name']
	newName: Map['name']
	newLabel: Map['label']
}) {
	return prisma.map.update({
		where: { name },
		data: {
			name: newName,
			label: newLabel,
		},
	})
}

export async function updateMapActiveState({
	name,
	isActive,
}: {
	name: Map['name']
	isActive: Map['isActive']
}) {
	return prisma.map.update({
		where: { name: name },
		data: { isActive },
	})
}
