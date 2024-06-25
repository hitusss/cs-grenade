import { useEffect, useState } from 'react'
import { Form } from '@remix-run/react'
import {
	getFormProps,
	getInputProps,
	getTextareaProps,
	useForm,
	type SubmissionResult,
} from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { type MapBrowserEvent } from 'ol'
import { HoneypotInputs } from 'remix-utils/honeypot/react'

import { GrenadeSchema } from '#app/utils/validators/grenade.ts'

import { ErrorList, Field, ImageField, TextareaField } from './forms.tsx'
import { GrenadeMarker } from './grenade-marker.tsx'
import { useMap } from './map.tsx'
import { Button } from './ui/button.tsx'
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from './ui/dialog.tsx'
import { Icon } from './ui/icon.tsx'
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from './ui/tooltip.tsx'

type GrenadeFormProps = {
	children: React.ReactNode
	title: string
	result?: SubmissionResult
} & (
	| {
			type: 'new'
			defaultValue?: undefined
	  }
	| {
			type: 'edit'
			defaultValue: {
				name: string
				description: string | null
				x: string
				y: string
				images: {
					id: string
					description: string | null
				}[]
			}
	  }
)

export function GrenadeForm({
	children,
	title,
	type,
	defaultValue,
	result,
}: GrenadeFormProps) {
	const [open, setOpen] = useState(type === 'new' ? false : true)
	const [coords, setCoords] = useState<{ x: string; y: string } | null>(
		type === 'new' ? null : { x: defaultValue.x, y: defaultValue.y },
	)

	const { map } = useMap()

	const [form, fields] = useForm({
		id: `${type}-grenade`,
		constraint: getZodConstraint(GrenadeSchema),
		lastResult: result,
		defaultValue:
			type === 'new'
				? {
						images: [
							{
								image: undefined,
								description: undefined,
							},
						],
					}
				: { ...defaultValue },
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: GrenadeSchema })
		},
		shouldRevalidate: 'onBlur',
	})

	const images = fields.images.getFieldList()

	useEffect(() => {
		if (!map) return

		const handler = (e: MapBrowserEvent<any>) => {
			setOpen(true)
			setCoords({
				x: Number(e.coordinate[0]).toFixed(2),
				y: Number(e.coordinate[1]).toFixed(2),
			})
		}

		map.on('click', handler)

		return () => {
			map.un('click', handler)
		}
	}, [map])

	return (
		<>
			{coords ? (
				<GrenadeMarker
					to=""
					destination={coords}
					coords={coords}
					name="Location"
					highlight
					disabled
				/>
			) : null}
			{coords && !open ? (
				<Button
					className="absolute bottom-0 left-1/2 z-10 -translate-x-1/2"
					onClick={() => setOpen(true)}
				>
					Open Form
				</Button>
			) : null}
			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent className="max-h-[90vh] max-w-2xl overflow-auto">
					<DialogHeader>
						<DialogTitle>{title}</DialogTitle>
					</DialogHeader>
					<Form
						method="POST"
						encType="multipart/form-data"
						{...getFormProps(form)}
					>
						<HoneypotInputs />
						<input
							{...getInputProps(fields.x, { type: 'hidden' })}
							value={coords?.x || undefined}
							readOnly
						/>
						<input
							{...getInputProps(fields.y, { type: 'hidden' })}
							value={coords?.y || undefined}
							readOnly
						/>
						<Field
							labelProps={{ children: 'Name' }}
							inputProps={{ ...getTextareaProps(fields.name), autoFocus: true }}
							errors={fields.name.errors}
						/>
						<TextareaField
							labelProps={{ children: 'Description' }}
							textareaProps={getTextareaProps(fields.description)}
							errors={fields.description.errors}
						/>

						<TooltipProvider>
							<ul className="w-full space-y-2 px-2">
								{images.map((image, index) => {
									const imageFields = image.getFieldset()
									return (
										<li key={image.key} className="flex items-start gap-2">
											<div className="grid gap-2">
												<Tooltip>
													<TooltipTrigger asChild>
														<Button
															variant="ghost"
															size="icon"
															{...form.reorder.getButtonProps({
																name: fields.images.name,
																from: index,
																to: index - 1,
															})}
															disabled={index === 0}
														>
															<Icon name="chevron-up" />
														</Button>
													</TooltipTrigger>
													<TooltipContent side="right">Move up</TooltipContent>
												</Tooltip>
												<Tooltip>
													<TooltipTrigger asChild>
														<Button
															variant="ghost"
															size="icon"
															{...form.reorder.getButtonProps({
																name: fields.images.name,
																from: index,
																to: index + 1,
															})}
															disabled={index === images.length - 1}
														>
															<Icon name="chevron-down" />
														</Button>
													</TooltipTrigger>
													<TooltipContent side="right">
														Move down
													</TooltipContent>
												</Tooltip>
											</div>
											<fieldset className="relative flex flex-1 flex-wrap items-end gap-4">
												<input
													{...getInputProps(imageFields.type, {
														type: 'hidden',
													})}
													value={imageFields.id.initialValue ? 'edit' : 'new'}
													readOnly
												/>
												<input
													{...getInputProps(imageFields.id, { type: 'hidden' })}
													readOnly
												/>
												<input
													{...getInputProps(imageFields.order, {
														type: 'hidden',
													})}
													value={index}
													readOnly
												/>
												<ImageField
													labelProps={{ children: 'Image' }}
													inputProps={getInputProps(imageFields.image, {
														type: 'file',
													})}
													errors={imageFields.id.errors}
													existingImage={
														imageFields.id.initialValue
															? `/resources/grenade-images/${imageFields.id.initialValue}`
															: undefined
													}
												/>
												<TextareaField
													labelProps={{ children: `Description` }}
													textareaProps={{
														...getTextareaProps(imageFields.description),
														rows: 4,
													}}
													errors={imageFields.description.errors}
													className="min-w-44 flex-1"
												/>
												<Tooltip>
													<TooltipTrigger asChild>
														<Button
															variant="ghost"
															size="icon"
															{...form.remove.getButtonProps({
																name: fields.images.name,
																index,
															})}
															disabled={images.length <= 1}
															className="absolute right-0 top-0 text-foreground-destructive"
														>
															<Icon name="x" />
														</Button>
													</TooltipTrigger>
													<TooltipContent side="left">
														Remove image
													</TooltipContent>
												</Tooltip>
											</fieldset>
										</li>
									)
								})}
							</ul>
						</TooltipProvider>

						<div className="border-t-2 py-4">
							<Button
								className="w-full"
								{...form.insert.getButtonProps({
									name: fields.images.name,
								})}
							>
								<Icon name="plus">Add more image</Icon>
							</Button>
						</div>

						<DialogFooter>{children}</DialogFooter>

						<ErrorList errors={fields.x.errors} />
						<ErrorList errors={fields.y.errors} />
						<ErrorList errors={form.errors} />
					</Form>
				</DialogContent>
			</Dialog>
		</>
	)
}
