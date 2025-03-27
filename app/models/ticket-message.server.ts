import { type TicketMessage } from '@prisma/client'

import { prisma } from '#app/utils/db.server.ts'

export function createTicketMessage({
	message,
	ticketId,
	userId,
	isAdmin = false,
}: {
	message: TicketMessage['message']
	ticketId: TicketMessage['ticketId']
	userId: TicketMessage['userId']
	isAdmin?: TicketMessage['isAdmin']
}) {
	return prisma.ticketMessage.create({
		data: {
			message,
			ticketId,
			userId,
			isAdmin,
		},
		select: {
			id: true,
		},
	})
}

export async function updateTicketAdminMassagesAsSeen({
	ticketId,
	userId,
}: {
	ticketId: TicketMessage['ticketId']
	userId: TicketMessage['userId']
}) {
	return prisma.ticketMessage.updateMany({
		where: {
			ticketId: ticketId,
			userId: {
				not: userId,
			},
			seen: false,
		},
		data: {
			seen: true,
		},
	})
}

export async function updateTicketUserMassagesAsSeen(
	ticketId: TicketMessage['ticketId'],
) {
	return prisma.ticketMessage.updateMany({
		where: {
			ticketId,
			isAdmin: false,
			seen: false,
		},
		data: {
			seen: true,
		},
	})
}
