import { useEffect, useState } from 'react'
import { Form } from '@remix-run/react'
import {
	getFormProps,
	getInputProps,
	useForm,
	type SubmissionResult,
} from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { type MapBrowserEvent } from 'ol'
import { HoneypotInputs } from 'remix-utils/honeypot/react'

import { DestinationSchema } from '#app/utils/validators/destination.ts'
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '#app/components/ui/dialog.tsx'
import { ErrorList, Field } from '#app/components/forms.tsx'
import { useMap } from '#app/components/map.tsx'

import { DestinationMarker } from './destination-marker.tsx'
import { Button } from './ui/button.tsx'
import { Icon } from './ui/icon.tsx'

type DestinationFormProps = {
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
				x: string
				y: string
			}
	  }
)

export function DestinationForm({
	children,
	title,
	type,
	defaultValue,
	result,
}: DestinationFormProps) {
	const [open, setOpen] = useState(type === 'new' ? false : true)
	const [coords, setCoords] = useState<{ x: string; y: string } | null>(
		type === 'new' ? null : { x: defaultValue.x, y: defaultValue.y },
	)

	const { map } = useMap()

	const [form, fields] = useForm({
		id: `${type}-destination`,
		constraint: getZodConstraint(DestinationSchema),
		lastResult: result,
		shouldRevalidate: 'onBlur',
		defaultValue,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: DestinationSchema })
		},
	})

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
				<DestinationMarker
					to=""
					coords={{ x: coords.x, y: coords.y }}
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
				<DialogContent className="sm:max-w-[425px]">
					<DialogHeader>
						<DialogTitle>{title}</DialogTitle>
					</DialogHeader>
					<Form method="POST" {...getFormProps(form)} className="grid gap-4">
						<HoneypotInputs />
						<input
							{...getInputProps(fields.x, {
								type: 'hidden',
							})}
							value={coords?.x || undefined}
							readOnly
						/>
						<input
							{...getInputProps(fields.y, {
								type: 'hidden',
							})}
							value={coords?.y || undefined}
							readOnly
						/>
						<Field
							labelProps={{ children: 'Name' }}
							inputProps={{
								...getInputProps(fields.name, { type: 'text' }),
								autoFocus: true,
							}}
							errors={fields.name.errors}
						/>
						<Button
							variant="ghost"
							type="button"
							className="ml-auto"
							onClick={() => setOpen(false)}
						>
							<Icon name="pencil">Change location</Icon>
						</Button>

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
