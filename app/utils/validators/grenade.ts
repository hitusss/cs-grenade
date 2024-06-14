import { z } from 'zod'

export const MAX_SIZE = 1024 * 1024 * 2 // 2MB

export const NewImageSchema = z.object({
	type: z.literal('new'),
	order: z.string(),
	image: z
		.instanceof(File, {
			message: 'Image is required',
		})
		.refine(
			file => ['image/jpeg', 'image/png'].includes(file.type),
			'Image should be a PNG or JPG',
		)
		.refine(file => file.size > 0, 'Image is required')
		.refine(file => file.size <= MAX_SIZE, 'Image size must be less than 2MB'),
	description: z
		.string({
			invalid_type_error: 'Description should be a string',
		})
		.max(148, 'Description should be not longer then 148 chars')
		.optional(),
})

export const EditImageSchema = z.object({
	type: z.literal('edit'),
	id: z.string(),
	order: z.string(),
	image: z
		.instanceof(File, {
			message: 'Image is required',
		})
		.refine(
			file => ['image/jpeg', 'image/png'].includes(file.type),
			'Image should be a PNG or JPG',
		)
		.refine(file => file.size > 0, 'Image is required')
		.refine(file => file.size <= MAX_SIZE, 'Image size must be less than 2MB')
		.optional(),
	description: z
		.string({
			invalid_type_error: 'Description should be a string',
		})
		.max(148, 'Description should be not longer then 148 chars')
		.optional(),
})

export const ImageSchema = z.discriminatedUnion('type', [
	NewImageSchema,
	EditImageSchema,
])

export const GrenadeSchema = z.object({
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
	description: z
		.string({
			invalid_type_error: 'Description should be a string',
		})
		.max(148, 'Description should be not longer then 148 chars')
		.optional(),
	images: z
		.array(ImageSchema)
		.min(1, 'Grenade should contains at least 1 image'),
})

export const EditGrenadeSchema = GrenadeSchema.merge(
	z.object({ intent: z.literal('edit') }),
)

export const DeleteGrenadeSchema = z.object({
	intent: z.literal('delete'),
})

export const CancelEditGrenadeRequestSchema = z.object({
	intent: z.literal('cancel-edit-request'),
})
