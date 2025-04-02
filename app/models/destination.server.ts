import { type Destination, type Prisma } from '@prisma/client'

import { type GrenadeType } from '#types/grenades-types.ts'
import { type TeamType } from '#types/teams.ts'
import { prisma } from '#app/utils/db.server.ts'

export async function createDestination({
	verified,
	x,
	y,
	name,
	mapName,
	team,
	type,
	userId,
}: {
	verified: Destination['verified']
	x: Destination['x']
	y: Destination['y']
	name: Destination['name']
	mapName: Destination['mapName']
	team: TeamType
	type: GrenadeType
	userId: Destination['userId']
}) {
	return prisma.destination.create({
		data: {
			verified,
			x,
			y,
			name,
			mapName,
			team,
			type,
			userId,
		},
	})
}

export async function getSimpleDestination({
	destinationId,
	verified,
}: {
	destinationId: Destination['id']
	verified?: Destination['verified']
}) {
	return prisma.destination.findUnique({
		where: {
			id: destinationId,
			verified,
		},
		select: {
			id: true,
			x: true,
			y: true,
			name: true,
		},
	})
}

export async function getDestination(destinationId: Destination['id']) {
	return prisma.destination.findUnique({
		where: {
			id: destinationId,
		},
		select: {
			id: true,
			x: true,
			y: true,
			name: true,
			mapName: true,
			team: true,
			type: true,
			verified: true,
			userId: true,
		},
	})
}

export async function getDestinationWithChangesId({
	destinationId,
	verified,
}: {
	destinationId: Destination['id']
	verified?: Destination['verified']
}) {
	return prisma.destination.findUnique({
		where: { id: destinationId, verified },
		select: {
			id: true,
			x: true,
			y: true,
			name: true,
			mapName: true,
			team: true,
			type: true,
			verified: true,
			userId: true,
			destinationChanges: {
				select: {
					id: true,
				},
			},
		},
	})
}

export async function getDestinationUserId(destinationId: Destination['id']) {
	return prisma.destination.findUnique({
		where: {
			id: destinationId,
		},
		select: {
			userId: true,
		},
	})
}

export async function getFilteredUserDestinationCount({
	userId,
	query,
	verified,
	mapName,
	team,
	type,
}: {
	userId: Destination['userId']
	query?: Destination['name']
	verified?: Destination['verified']
	mapName?: Destination['mapName']
	team?: TeamType
	type?: GrenadeType
}) {
	return prisma.destination.count({
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

export async function getFiltereUserDestinationsWithPagination({
	userId,
	query,
	verified,
	mapName,
	team,
	type,
	page,
	perPage,
}: {
	userId: Destination['userId']
	query?: Destination['name']
	verified?: Destination['verified']
	mapName?: Destination['mapName']
	team?: TeamType
	type?: GrenadeType
	page: number
	perPage: number
}) {
	return prisma.destination.findMany({
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

export async function getFilteredDestinationCount({
	query,
	verified,
	mapName,
	team,
	type,
}: {
	query?: Destination['name']
	verified?: Destination['verified']
	mapName?: Destination['mapName']
	team?: TeamType
	type?: GrenadeType
}) {
	return prisma.destination.count({
		where: {
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

export async function getFiltereDestinationsWithPagination({
	query,
	verified,
	mapName,
	team,
	type,
	orderBy,
	page,
	perPage,
}: {
	query?: Destination['name']
	verified?: Destination['verified']
	mapName?: Destination['mapName']
	team?: TeamType
	type?: GrenadeType
	orderBy?: Record<string, Prisma.SortOrder | Record<string, Prisma.SortOrder>>
	page: number
	perPage: number
}) {
	return prisma.destination.findMany({
		where: {
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
		skip: page * perPage - perPage,
		take: perPage,
	})
}

export async function getFilteredDestinationWithReportsCount({
	query,
	verified,
	mapName,
	team,
	type,
}: {
	query?: Destination['name']
	verified?: Destination['verified']
	mapName?: Destination['mapName']
	team?: TeamType
	type?: GrenadeType
}) {
	return prisma.destination.count({
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
			verified,
			mapName,
			team,
			type,
		},
	})
}

export async function getFiltereDestinationsWithReportsWithPagination({
	query,
	verified,
	mapName,
	team,
	type,
	orderBy,
	page,
	perPage,
}: {
	query?: Destination['name']
	verified?: Destination['verified']
	mapName?: Destination['mapName']
	team?: TeamType
	type?: GrenadeType
	orderBy?: Record<string, Prisma.SortOrder | Record<string, Prisma.SortOrder>>
	page: number
	perPage: number
}) {
	return prisma.destination.findMany({
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
			verified,
			mapName,
			team,
			type,
		},
		select: {
			id: true,
			name: true,
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

export async function getFilteredDestinationWithChangesCount({
	query,
	mapName,
	team,
	type,
}: {
	query?: Destination['name']
	mapName?: Destination['mapName']
	team?: TeamType
	type?: GrenadeType
}) {
	return prisma.destination.count({
		where: {
			destinationChanges: {
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
		},
	})
}

export async function getFiltereDestinationsWithChangesWithPagination({
	query,
	mapName,
	team,
	type,
	orderBy,
	page,
	perPage,
}: {
	query?: Destination['name']
	mapName?: Destination['mapName']
	team?: TeamType
	type?: GrenadeType
	orderBy?: Record<string, Prisma.SortOrder | Record<string, Prisma.SortOrder>>
	page: number
	perPage: number
}) {
	return prisma.destination.findMany({
		where: {
			destinationChanges: {
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
		},
		select: {
			id: true,
			name: true,
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

export async function updateDestinationNameAndPosition({
	destinationId,
	name,
	x,
	y,
}: {
	destinationId: Destination['id']
	name: Destination['name']
	x: Destination['x']
	y: Destination['y']
}) {
	return prisma.destination.update({
		where: { id: destinationId },
		data: {
			name,
			x,
			y,
		},
	})
}

export async function updateDestinationVerifiedStatus({
	destinationId,
	verified,
}: {
	destinationId: Destination['id']
	verified: Destination['verified']
}) {
	return prisma.destination.update({
		where: { id: destinationId },
		data: { verified },
	})
}

export async function deleteDestination({
	destinationId,
	verified,
}: {
	destinationId: Destination['id']
	verified?: Destination['verified']
}) {
	return prisma.destination.delete({
		where: { id: destinationId, verified },
		select: { name: true, userId: true },
	})
}
