import { z } from 'zod'

import { MAX_SIZE, MessageSchema } from './message.ts'

export const NewTicketSchema = z
	.object({
		title: z
			.string({
				invalid_type_error: 'Title should be a string',
				required_error: 'Title is required',
			})
			.min(3, 'Title should be longer then 2 chars')
			.max(24, 'Title should be not longer then 24 chars'),
	})
	.and(MessageSchema)

export { MessageSchema as TicketMessageSchema, MAX_SIZE }
