import { z } from 'zod'

export const ReportSchema = z.object({
	message: z
		.string({
			invalid_type_error: 'Message should be a string',
			required_error: 'Message is required',
		})
		.min(3, 'Message should be longer then 2 chars')
		.max(1280, 'Message should be not longer then 1280 chars'),
	destinationId: z.string().optional(),
	grenadeId: z.string().optional(),
})
