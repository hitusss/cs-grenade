import { type Ticket, type User } from '@prisma/client'

import { prisma } from '#app/utils/db.server.ts'

export async function createTicket({
	title,
	userId,
}: {
	title: Ticket['title']
	userId: User['id']
}) {
	return prisma.ticket.create({
		data: {
			title,
			userId,
		},
		select: {
			id: true,
		},
	})
}

export async function getTicketCount() {
	return prisma.ticket.count()
}

export async function getTicket(ticketId: Ticket['id']) {
	return prisma.ticket.findUnique({
		where: {
			id: ticketId,
		},
		select: {
			id: true,
			title: true,
			open: true,
			messages: {
				select: {
					id: true,
					message: true,
					images: {
						orderBy: {
							order: 'asc',
						},
						select: { id: true },
					},
					isAdmin: true,
					seen: true,
					user: {
						select: {
							id: true,
							username: true,
							name: true,
							image: {
								select: {
									id: true,
								},
							},
						},
					},
					createdAt: true,
				},
			},
			userId: true,
			user: {
				select: {
					id: true,
					username: true,
					name: true,
					image: {
						select: {
							id: true,
						},
					},
				},
			},
		},
	})
}

export async function getSimpleTicket(ticketId: Ticket['id']) {
	return prisma.ticket.findUnique({
		where: {
			id: ticketId,
		},
		select: { id: true, title: true, userId: true },
	})
}

export async function getUserTickets(userId: User['id']) {
	return prisma.ticket.findMany({
		where: {
			userId,
		},
		select: {
			_count: {
				select: {
					messages: {
						where: {
							isAdmin: true,
							seen: false,
						},
					},
				},
			},
			id: true,
			title: true,
			open: true,
			updatedAt: true,
		},
		orderBy: {
			updatedAt: 'desc',
		},
	})
}

export async function getAdminTickets({
	query,
	orderBy,
	page,
	perPage,
}: {
	query?: string | null
	orderBy?: string[]
	page: number
	perPage: number
}) {
	return prisma.$queryRawUnsafe(
		`
			SELECT
				Ticket.id,
				Ticket.title,
				Ticket.open,
				Ticket.updatedAt,
				Ticket.createdAt,
				User.name,
				User.username,
				UserImage.id AS userImageId,
				(
					SELECT COUNT(*)
					FROM TicketMessage
					WHERE TicketMessage.ticketId = Ticket.id
					AND TicketMessage.isAdmin = false
					AND TicketMessage.seen = false
				) AS messages
			FROM Ticket
			LEFT JOIN User ON Ticket.userId = User.id
			LEFT JOIN UserImage ON User.id = UserImage.userId
			${orderBy && orderBy.length > 0 ? `ORDER BY ${orderBy.join(', ')}` : ''}
			WHERE Ticket.title LIKE $1
			LIMIT $2
			OFFSET $3;
		`,
		`%${query}%`,
		perPage,
		page * perPage - perPage,
	)
}

export async function updateTicketUpdatedAt(ticketId: Ticket['id']) {
	return prisma.ticket.update({
		where: { id: ticketId },
		data: {
			updatedAt: new Date(),
		},
	})
}

export async function updateTicketOpenStatus({
	ticketId,
	open,
}: {
	ticketId: Ticket['id']
	open: Ticket['open']
}) {
	return prisma.ticket.update({
		where: { id: ticketId },
		data: { open },
	})
}
