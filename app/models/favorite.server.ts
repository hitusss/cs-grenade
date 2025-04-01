import { type Favorite, type Grenade, type User } from '@prisma/client'

import { type GrenadeType } from '#types/grenades-types.ts'
import { type TeamType } from '#types/teams.ts'
import { prisma } from '#app/utils/db.server.ts'

export async function createFavorite({
	grenadeId,
	userId,
}: {
	grenadeId: Favorite['grenadeId']
	userId: Favorite['userId']
}) {
	return prisma.favorite.create({
		data: {
			grenadeId,
			userId,
		},
	})
}

export async function getFilteredUserFavoriteCount({
	username,
	query,
	mapName,
	team,
	type,
}: {
	username: User['username']
	query?: Grenade['name']
	mapName?: Grenade['mapName']
	team?: TeamType
	type?: GrenadeType
}) {
	return prisma.favorite.count({
		where: {
			user: {
				username,
			},
			grenade: {
				name: {
					contains: query,
				},
				mapName,
				team,
				type,
			},
		},
	})
}

export async function getFilteredUserFavoritesWithPagination({
	username,
	query,
	mapName,
	team,
	type,
	page,
	perPage,
}: {
	username: User['username']
	query?: Grenade['name']
	mapName?: Grenade['mapName']
	team?: TeamType
	type?: GrenadeType
	page: number
	perPage: number
}) {
	return prisma.favorite.findMany({
		where: {
			user: {
				username,
			},
			grenade: {
				name: {
					contains: query,
				},
				mapName,
				team,
				type,
			},
		},
		select: {
			grenade: {
				select: {
					id: true,
					name: true,
					destination: {
						select: {
							id: true,
							name: true,
						},
					},
					map: {
						select: {
							name: true,
							label: true,
							logo: {
								select: {
									id: true,
								},
							},
						},
					},
					type: true,
					team: true,
				},
			},
		},
		skip: page * perPage - perPage,
		take: perPage,
	})
}

export async function deleteFavorite({
	grenadeId,
	userId,
}: {
	grenadeId: Favorite['grenadeId']
	userId: Favorite['userId']
}) {
	return prisma.favorite.deleteMany({
		where: {
			grenadeId,
			userId,
		},
	})
}
