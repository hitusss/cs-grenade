import { type TicketImage } from '@prisma/client'

import { prisma } from '#app/utils/db.server.ts'

export async function createTicketImage({
	contentType,
	blob,
	order,
	ticketMessageId,
}: {
	contentType: TicketImage['contentType']
	blob: TicketImage['blob']
	order: TicketImage['order']
	ticketMessageId: TicketImage['ticketMessageId']
}) {
	return prisma.ticketImage.create({
		data: {
			contentType,
			blob,
			order,
			ticketMessageId,
		},
	})
}

export async function getTicketImage(imageId: TicketImage['id']) {
	return prisma.ticketImage.findUnique({
		where: { id: imageId },
		select: { contentType: true, blob: true },
	})
}
