import { z } from 'zod'

export const DestinationSchema = z.object({
	intent: z.enum(['create', 'update']),
	x: z.string({
		invalid_type_error: 'Position should be a string',
		required_error: 'Position X is Required',
	}),
	y: z.string({
		invalid_type_error: 'Position should be a string',
		required_error: 'Position Y is Required',
	}),
	name: z
		.string({
			invalid_type_error: 'Name should be a string',
			required_error: 'Name is required',
		})
		.min(3, 'Name should be longer then 2 chars')
		.max(24, 'Name should be not longer then 24 chars'),
})

export const EditDestinationSchema = DestinationSchema.extend({
	intent: z.literal('edit'),
})

export const DeleteDestinationSchema = z.object({
	intent: z.literal('delete'),
})
