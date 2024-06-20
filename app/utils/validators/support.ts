import { z } from 'zod'

export const MAX_SIZE = 1024 * 1024 * 2 // 2MB

export const TicketMessageSchema = z.object({
	message: z
		.string({
			invalid_type_error: 'Message should be a string',
			required_error: 'Message is required',
		})
		.min(3, 'Message should be longer then 2 chars')
		.max(1280, 'Message should be not longer then 1280 chars'),
	images: z
		.array(
			z.instanceof(File, {
				message: 'Image is required',
			}),
		)
		.max(5, `You can't add more then 5 images`)
		.refine(
			(files) =>
				files &&
				files.every((file) =>
					file.size > 0
						? ['image/jpeg', 'image/png'].includes(file.type)
						: true,
				),
			'Image should be a PNG or JPG',
		)
		.refine(
			(files) => files && files.every((file) => file.size <= MAX_SIZE),
			'Image size must be less than 2MB',
		),
})

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
	.and(TicketMessageSchema)
