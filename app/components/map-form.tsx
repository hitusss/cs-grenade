import { Form } from '@remix-run/react'
import {
	getFormProps,
	getInputProps,
	useForm,
	type SubmissionResult,
} from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { HoneypotInputs } from 'remix-utils/honeypot/react'

import { useIsPending } from '#app/utils/misc.tsx'
import { EditMapSchema, NewMapSchema } from '#app/utils/validators/map.ts'

import { ErrorList, Field, ImageField } from './forms.tsx'
import { Button } from './ui/button.tsx'
import { StatusButton } from './ui/status-button.tsx'

type MapFormProps = {
	type: 'new' | 'edit'
	defaultValue?: {
		label?: string
		image?: string
		logo?: string
		radar?: string
	}
	result?: SubmissionResult
}

export function MapForm({ type, defaultValue, result }: MapFormProps) {
	const MapSchema = type === 'new' ? NewMapSchema : EditMapSchema

	const [form, fields] = useForm({
		id: `map-${type}`,
		constraint: getZodConstraint(MapSchema),
		lastResult: result,
		shouldRevalidate: 'onBlur',
		defaultValue: {
			label: defaultValue?.label,
		},
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: MapSchema })
		},
	})

	const isPending = useIsPending()

	return (
		<Form
			method="POST"
			encType="multipart/form-data"
			{...getFormProps(form)}
			className="mt-4"
		>
			<HoneypotInputs />
			<Field
				labelProps={{ children: 'Label' }}
				inputProps={getInputProps(fields.label, { type: 'text' })}
				errors={fields.label.errors}
			/>
			<div className="flex flex-wrap gap-8">
				<ImageField
					labelProps={{ children: 'Image' }}
					inputProps={getInputProps(fields.image, { type: 'file' })}
					errors={fields.image.errors}
					size="lg"
					existingImage={
						defaultValue?.image
							? `/resources/map-images/${defaultValue.image}`
							: undefined
					}
				/>
				<ImageField
					labelProps={{ children: 'Logo' }}
					inputProps={getInputProps(fields.logo, { type: 'file' })}
					errors={fields.logo.errors}
					size="lg"
					existingImage={
						defaultValue?.logo
							? `/resources/map-logos/${defaultValue.logo}`
							: undefined
					}
				/>
				<ImageField
					labelProps={{ children: 'Radar' }}
					inputProps={{
						...getInputProps(fields.radar, {
							type: 'file',
						}),
						accept: 'image/svg+xml',
					}}
					errors={fields.radar.errors}
					size="lg"
					existingImage={
						defaultValue?.radar
							? `/resources/map-radars/${defaultValue.radar}`
							: undefined
					}
				/>
			</div>
			<div className="flex gap-4 mt-4 [&>*]:flex-1">
				<StatusButton
					type="submit"
					status={isPending ? 'pending' : form.status ?? 'idle'}
					disabled={isPending}
				>
					{type === 'new' ? 'Create' : 'Update'} map
				</StatusButton>
				{type === 'edit' ? (
					<Button variant="destructive" type="reset">
						Reset
					</Button>
				) : null}
			</div>

			<ErrorList errors={form.errors} />
		</Form>
	)
}
