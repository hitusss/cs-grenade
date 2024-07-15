import {
	json,
	unstable_createMemoryUploadHandler,
	unstable_parseMultipartFormData,
	type ActionFunctionArgs,
} from '@remix-run/node'
import { Form, useActionData } from '@remix-run/react'
import {
	getFormProps,
	getInputProps,
	getTextareaProps,
	useForm,
} from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { HoneypotInputs } from 'remix-utils/honeypot/react'

import { requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { checkHoneypot } from '#app/utils/honeypot.server.ts'
import { useIsPending } from '#app/utils/misc.tsx'
import { redirectWithToast } from '#app/utils/toast.server.ts'
import { MAX_SIZE, NewTicketSchema } from '#app/utils/validators/support.ts'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import {
	ErrorList,
	Field,
	MultipleImageField,
	TextareaField,
} from '#app/components/forms.tsx'

export async function action({ request }: ActionFunctionArgs) {
	const userId = await requireUserId(request)
	const formData = await unstable_parseMultipartFormData(
		request,
		unstable_createMemoryUploadHandler({ maxPartSize: MAX_SIZE }),
	)
	checkHoneypot(formData)

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
		return json(
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

export default function SupportNewRoute() {
	const actionData = useActionData<typeof action>()

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
		<div className="grid grid-rows-[auto_1fr] justify-center gap-12">
			<h2>Create a new support ticket</h2>
			<Form method="POST" encType="multipart/form-data" {...getFormProps(form)}>
				<MultipleImageField.Provider
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
							status={isPending ? 'pending' : form.status ?? 'idle'}
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
