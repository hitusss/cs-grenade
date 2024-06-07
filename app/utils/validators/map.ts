import { z } from 'zod'

export const MAX_SIZE = 1024 * 1024 * 2 // 2MB

export const NewMapSchema = z.object({
	label: z
		.string({
			invalid_type_error: 'Label should be a string',
			required_error: 'Label is required',
		})
		.min(3, 'Label should be longer then 2 chars')
		.max(24, 'Label should be not longer then 24 chars'),
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
	logo: z
		.instanceof(File, {
			message: 'Logo is required',
		})
		.refine(
			file => ['image/jpeg', 'image/png'].includes(file.type),
			'Logo should be a PNG or JPG',
		)
		.refine(file => file.size > 0, 'Logo is required')
		.refine(file => file.size <= MAX_SIZE, 'Logo size must be less than 2MB'),
	radar: z
		.instanceof(File, {
			message: 'Radar is required',
		})
		.refine(file => file.type === 'image/svg+xml', 'Radar should be a SVG')
		.refine(file => file.size > 0, 'Radar is required')
		.refine(file => file.size <= MAX_SIZE, 'Radar size must be less than 2MB'),
})

export const EditMapSchema = NewMapSchema.partial({
	image: true,
	logo: true,
	radar: true,
})
