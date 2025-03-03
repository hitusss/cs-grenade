import { data, Form } from 'react-router'
import {
	getFormProps,
	getInputProps,
	getTextareaProps,
	useForm,
} from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { parseFormData } from '@mjackson/form-data-parser'
import { type SEOHandle } from '@nasa-gcn/remix-seo'
import { HoneypotInputs } from 'remix-utils/honeypot/react'

import { requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { checkHoneypot } from '#app/utils/honeypot.server.ts'
import { uploadHandler, useIsPending } from '#app/utils/misc.tsx'
import { redirectWithToast } from '#app/utils/toast.server.ts'
import { MAX_SIZE, NewTicketSchema } from '#app/utils/validators/support.ts'
import { SidebarTrigger } from '#app/components/ui/sidebar.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import {
	ErrorList,
	Field,
	MultipleImageField,
	TextareaField,
} from '#app/components/forms.tsx'

import { type Route } from './+types/new.ts'

export const handle: SEOHandle = {
	getSitemapEntries: () => null,
}

export async function action({ request }: Route.ActionArgs) {
	const userId = await requireUserId(request)
	const formData = await parseFormData(
		request,
		uploadHandler({ maxPartSize: MAX_SIZE }),
	)
	await checkHoneypot(formData)

	const submission = await parseWithZod(formData, {
		schema: NewTicketSchema.transform(async (data) => {
			return {
				title: data.title,
				message: data.message,
				images:
					data.images &&
					(await Promise.all(
						data.images.map(async (imageData, index) => ({
							contentType: imageData.type,
							blob: Buffer.from(await imageData.arrayBuffer()),
							order: String(index),
						})),
					)),
			}
		}),
		async: true,
	})
	if (submission.status !== 'success') {
		return data(
			{ result: submission.reply() },
			{
				status: submission.status === 'error' ? 400 : 200,
			},
		)
	}

	const { title, message, images } = submission.value

	const ticket = await prisma.ticket.create({
		data: {
			title,
			userId,
		},
		select: {
			id: true,
		},
	})

	const msg = await prisma.ticketMessage.create({
		data: {
			message: message,
			ticketId: ticket.id,
			userId,
		},
		select: {
			id: true,
		},
	})

	if (images) {
		await Promise.all(
			images.map(
				async (img) =>
					await prisma.ticketImage.create({
						data: {
							...img,
							ticketMessageId: msg.id,
						},
					}),
			),
		)
	}

	return await redirectWithToast(`/support/${ticket.id}`, {
		title: 'Ticket created',
		description: ``,
		type: 'success',
	})
}

export default function SupportNewRoute({ actionData }: Route.ComponentProps) {
	const [form, fields] = useForm({
		id: 'new-ticket',
		constraint: getZodConstraint(NewTicketSchema),
		lastResult: actionData?.result,
		shouldRevalidate: 'onBlur',
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: NewTicketSchema })
		},
	})

	const isPending = useIsPending()

	return (
		<div className="relative grid grid-rows-[auto_1fr] justify-center gap-12 py-2">
			<SidebarTrigger className="absolute top-4 left-2" />
			<h2>Create a new support ticket</h2>
			<Form method="POST" encType="multipart/form-data" {...getFormProps(form)}>
				<MultipleImageField.Provider
					key={fields.images.key}
					inputProps={{
						...getInputProps(fields.images, { type: 'file' }),
						required: false,
						defaultValue: undefined,
					}}
					errors={fields.images.errors}
				>
					<HoneypotInputs />
					<Field
						labelProps={{ children: 'Title' }}
						inputProps={{
							...getInputProps(fields.title, { type: 'text' }),
							autoFocus: true,
						}}
						errors={fields.title.errors}
					/>

					<TextareaField
						labelProps={{ children: 'Message' }}
						textareaProps={{
							...getTextareaProps(fields.message),
							className: 'h-48 resize-none',
						}}
						errors={fields.message.errors}
					/>
					<MultipleImageField.Display />

					<div className="mt-4 flex justify-end gap-2">
						<MultipleImageField.Input size="icon" />
						<StatusButton
							type="submit"
							status={isPending ? 'pending' : (form.status ?? 'idle')}
							disabled={isPending}
						>
							Create ticket
						</StatusButton>
						<ErrorList errors={form.errors} />
					</div>
				</MultipleImageField.Provider>
			</Form>
		</div>
	)
}
