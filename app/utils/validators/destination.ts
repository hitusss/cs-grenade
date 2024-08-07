import { z } from 'zod'

export const DestinationSchema = z.object({
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

export const UpdateDestinationSchema = DestinationSchema.extend({
	intent: z.literal('update'),
})

export const DeleteDestinationSchema = z.object({
	intent: z.literal('delete'),
})

export const CancelEditDestinationRequestSchema = z.object({
	intent: z.literal('cancel-edit-request'),
})
