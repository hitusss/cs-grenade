import { type Grenade, type Prisma } from '@prisma/client'

import { type GrenadeType } from '#types/grenades-types.ts'
import { type TeamType } from '#types/teams.ts'
import { type OptionalNullable } from '#types/utils.ts'
import { prisma } from '#app/utils/db.server.ts'

export async function createGrenade({
	verified,
	x,
	y,
	name,
	description,
	mapName,
	destinationId,
	team,
	type,
	userId,
}: OptionalNullable<{
	verified: Grenade['verified']
	x: Grenade['x']
	y: Grenade['y']
	name: Grenade['name']
	description: Grenade['description']
	mapName: Grenade['mapName']
	destinationId: Grenade['destinationId']
	team: TeamType
	type: GrenadeType
	userId: Grenade['userId']
}>) {
	return prisma.grenade.create({
		data: {
			verified,
			x,
			y,
			name,
			description,
			mapName,
			destinationId,
			team,
			type,
			userId,
		},
	})
}

export async function getSimpleGrenade(grenadeId: Grenade['id']) {
	return prisma.grenade.findUnique({
		where: {
			id: grenadeId,
		},
		select: {
			name: true,
			mapName: true,
			team: true,
			type: true,
			destinationId: true,
			userId: true,
			verified: true,
		},
	})
}

export async function getGrenade({
	grenadeId,
	verified,
	userId,
}: {
	grenadeId: Grenade['id']
	verified?: Grenade['verified']
	userId?: Grenade['userId']
}) {
	return prisma.grenade.findUnique({
		where: {
			id: grenadeId,
			verified,
		},
		select: {
			id: true,
			verified: true,
			name: true,
			description: true,
			x: true,
			y: true,
			images: {
				orderBy: {
					order: 'asc',
				},
				select: {
					id: true,
					description: true,
					order: true,
				},
			},
			favorites: userId
				? {
						where: {
							userId,
						},
						select: {
							id: true,
						},
					}
				: undefined,
			userId: true,
		},
	})
}

export async function getGrenadeWithChangesId({
	grenadeId,
	verified,
}: {
	grenadeId: Grenade['id']
	verified?: Grenade['verified']
}) {
	return prisma.grenade.findUnique({
		where: {
			id: grenadeId,
			verified,
		},
		select: {
			id: true,
			name: true,
			description: true,
			x: true,
			y: true,
			images: {
				orderBy: {
					order: 'asc',
				},
				select: {
					id: true,
					description: true,
					order: true,
				},
			},
			grenadeChanges: {
				select: {
					id: true,
				},
			},
			userId: true,
		},
	})
}

export async function getGrenadeUserId(grenadeId: Grenade['id']) {
	return prisma.grenade.findUnique({
		where: {
			id: grenadeId,
		},
		select: {
			userId: true,
		},
	})
}

export async function getFilteredUserGrenadeCount({
	userId,
	query,
	verified,
	mapName,
	team,
	type,
}: {
	userId: Grenade['userId']
	query?: Grenade['name']
	verified?: Grenade['verified']
	mapName?: Grenade['mapName']
	team?: TeamType
	type?: GrenadeType
}) {
	return prisma.grenade.count({
		where: {
			userId,
			name: {
				contains: query,
			},
			verified,
			mapName,
			team,
			type,
		},
	})
}

export async function getFilteredUserGrenadesWithPagination({
	userId,
	query,
	verified,
	mapName,
	team,
	type,
	page,
	perPage,
}: {
	userId: Grenade['userId']
	query?: Grenade['name']
	verified?: Grenade['verified']
	mapName?: Grenade['mapName']
	team?: TeamType
	type?: GrenadeType
	page: number
	perPage: number
}) {
	return prisma.grenade.findMany({
		where: {
			userId,
			name: {
				contains: query,
			},
			verified,
			mapName,
			team,
			type,
		},
		select: {
			id: true,
			name: true,
			verified: true,
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
		skip: page * perPage - perPage,
		take: perPage,
	})
}

export async function getFilteredGrenadeCount({
	verified,
	query,
	mapName,
	team,
	type,
}: {
	verified?: Grenade['verified']
	query?: Grenade['name']
	mapName?: Grenade['mapName']
	team?: TeamType
	type?: GrenadeType
}) {
	return prisma.grenade.count({
		where: {
			verified,
			name: { contains: query },
			mapName,
			team,
			type,
		},
	})
}

export async function getFilteredGrenadesWithPagination({
	verified,
	query,
	mapName,
	team,
	type,
	orderBy,
	page,
	perPage,
}: {
	verified?: Grenade['verified']
	query?: Grenade['name']
	mapName?: Grenade['mapName']
	team?: TeamType
	type?: GrenadeType
	orderBy?: Record<string, Prisma.SortOrder | Record<string, Prisma.SortOrder>>
	page: number
	perPage: number
}) {
	return prisma.grenade.findMany({
		where: {
			verified,
			name: { contains: query },
			mapName,
			team,
			type,
		},
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
			team: true,
			type: true,
			verified: true,
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
		take: perPage,
		skip: page * perPage - perPage,
	})
}

export async function getFilteredGrenadeWithChangesCount({
	query,
	verified,
	mapName,
	team,
	type,
}: {
	query?: Grenade['name']
	verified?: Grenade['verified']
	mapName?: Grenade['mapName']
	team?: TeamType
	type?: GrenadeType
}) {
	return prisma.grenade.count({
		where: {
			grenadeChanges: {
				id: {
					not: undefined,
				},
			},
			name: {
				contains: query,
			},
			mapName,
			team,
			type,
			verified,
		},
	})
}

export async function getFilteredGrenadesWithChangesWithPagination({
	query,
	verified,
	mapName,
	team,
	type,
	orderBy,
	page,
	perPage,
}: {
	query?: Grenade['name']
	verified?: Grenade['verified']
	mapName?: Grenade['mapName']
	team?: TeamType
	type?: GrenadeType
	orderBy?: Record<string, Prisma.SortOrder | Record<string, Prisma.SortOrder>>
	page: number
	perPage: number
}) {
	return prisma.grenade.findMany({
		where: {
			reports: {
				some: {
					id: {
						not: undefined,
					},
				},
			},
			name: {
				contains: query,
			},
			mapName,
			team,
			type,
			verified,
		},
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
			team: true,
			type: true,
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

export async function getFilteredGrenadeWithReportsCount({
	query,
	verified,
	mapName,
	team,
	type,
}: {
	query?: Grenade['name']
	verified?: Grenade['verified']
	mapName?: Grenade['mapName']
	team?: TeamType
	type?: GrenadeType
}) {
	return prisma.grenade.count({
		where: {
			reports: {
				some: {
					id: {
						not: undefined,
					},
				},
			},
			name: {
				contains: query,
			},
			mapName,
			team,
			type,
			verified,
		},
	})
}

export async function getFilteredGrenadesWithReportsWithPagination({
	query,
	verified,
	mapName,
	team,
	type,
	orderBy,
	page,
	perPage,
}: {
	query?: Grenade['name']
	verified?: Grenade['verified']
	mapName?: Grenade['mapName']
	team?: TeamType
	type?: GrenadeType
	orderBy?: Record<string, Prisma.SortOrder | Record<string, Prisma.SortOrder>>
	page: number
	perPage: number
}) {
	return prisma.grenade.findMany({
		where: {
			reports: {
				some: {
					id: {
						not: undefined,
					},
				},
			},
			name: {
				contains: query,
			},
			mapName,
			team,
			type,
			verified,
		},
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
			team: true,
			type: true,
			verified: true,
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
			reports: {
				select: {
					id: true,
					message: true,
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
			},
		},
		orderBy,
		skip: page * perPage - perPage,
		take: perPage,
	})
}

export async function updateGrenadeNameDesctiptionAndPosition({
	grenadeId,
	name,
	description,
	x,
	y,
}: OptionalNullable<{
	grenadeId: Grenade['id']
	name: Grenade['name']
	description: Grenade['description']
	x: Grenade['x']
	y: Grenade['y']
}>) {
	return prisma.grenade.update({
		where: {
			id: grenadeId,
		},
		data: {
			name,
			description,
			x,
			y,
		},
		select: {
			images: {
				select: {
					id: true,
				},
			},
		},
	})
}

export async function updateGrenadeVerifiedStatus({
	grenadeId,
	verified,
}: {
	grenadeId: Grenade['id']
	verified: Grenade['verified']
}) {
	return prisma.grenade.update({
		where: {
			id: grenadeId,
		},
		data: {
			verified,
		},
	})
}

export async function deleteGrenade({
	grenadeId,
	verified,
}: {
	grenadeId: Grenade['id']
	verified?: Grenade['verified']
}) {
	return prisma.grenade.delete({
		where: {
			id: grenadeId,
			verified,
		},
	})
}
