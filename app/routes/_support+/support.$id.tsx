import { useEffect, useRef } from 'react'
import {
	json,
	unstable_createMemoryUploadHandler,
	unstable_parseMultipartFormData,
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
} from '@remix-run/node'
import { Form, useActionData, useLoaderData } from '@remix-run/react'
import {
	getFormProps,
	getInputProps,
	getTextareaProps,
	useForm,
} from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { invariantResponse } from '@epic-web/invariant'
import { HoneypotInputs } from 'remix-utils/honeypot/react'
import { z } from 'zod'

import { requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { checkHoneypot } from '#app/utils/honeypot.server.ts'
import { useDoubleCheck, useIsPending } from '#app/utils/misc.tsx'
import { unauthorized } from '#app/utils/permissions.server.ts'
import { useUser } from '#app/utils/user.ts'
import { MAX_SIZE, TicketMessageSchema } from '#app/utils/validators/support.ts'
import { Button } from '#app/components/ui/button.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '#app/components/ui/tooltip.tsx'
import {
	ErrorList,
	MultipleImageField,
	TextareaField,
} from '#app/components/forms.tsx'
import { Message } from '#app/components/message.tsx'

import { emitter } from '../events.$.tsx'

const NewTicketMessageSchema = TicketMessageSchema.merge(
	z.object({
		intent: z.literal('new-message'),
	}),
)

const TicketCloseSchema = z.object({
	intent: z.literal('close'),
})

const TicketSchema = z.discriminatedUnion('intent', [
	NewTicketMessageSchema,
	TicketCloseSchema,
])

export async function loader({ request, params }: LoaderFunctionArgs) {
	const { id } = params

	invariantResponse(id, 'Support ticket ID is required', { status: 400 })

	const userId = await requireUserId(request)

	const ticket = await prisma.ticket.findUnique({
		where: {
			id,
		},
		select: {
			id: true,
			title: true,
			open: true,
			messages: {
				select: {
					id: true,
					message: true,
					images: {
						orderBy: {
							order: 'asc',
						},
						select: { id: true },
					},
					seen: true,
					user: {
						select: {
							id: true,
							username: true,
							name: true,
							image: {
								select: {
									id: true,
								},
							},
						},
					},
					createdAt: true,
				},
			},
			userId: true,
		},
	})

	invariantResponse(ticket, 'Not found', { status: 404 })

	if (ticket.userId !== userId) {
		throw unauthorized({
			message: 'You are not authorized to view this ticket',
		})
	}

	const updated = await prisma.ticketMessage.updateMany({
		where: {
			ticketId: ticket.id,
			userId: {
				not: userId,
			},
			seen: false,
		},
		data: {
			seen: true,
		},
	})
	if (updated.count > 0) {
		emitter.emit(`support/${userId}`)
	}

	return json({ ticket })
}

export async function action({ request, params }: ActionFunctionArgs) {
	const { id } = params

	invariantResponse(id, 'Ticket id is required', { status: 400 })

	const userId = await requireUserId(request)

	const ticket = await prisma.ticket.findUnique({
		where: {
			id,
		},
		select: { id: true, title: true, userId: true },
	})

	invariantResponse(ticket, 'Not found', { status: 404 })

	if (userId !== ticket.userId) {
		throw unauthorized({
			message: 'You are not authorized to perform this action',
		})
	}

	const formData = await unstable_parseMultipartFormData(
		request,
		unstable_createMemoryUploadHandler({ maxPartSize: MAX_SIZE }),
	)
	checkHoneypot(formData)

	const submission = await parseWithZod(formData, {
		schema: TicketSchema.transform(async (data) => {
			if (data.intent === 'new-message') {
				return {
					intent: data.intent,
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
			}
			return data
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

	switch (submission.value.intent) {
		case 'new-message': {
			const { message, images } = submission.value
			const msg = await prisma.ticketMessage.create({
				data: {
					message,
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

			await prisma.ticket.update({
				where: { id: ticket.id },
				data: {
					updatedAt: new Date(),
				},
			})
			break
		}
		case 'close': {
			await prisma.ticket.update({
				where: { id },
				data: { open: false },
			})
			break
		}
	}

	return json(
		{ result: submission.reply({ resetForm: true }) },
		{
			status: 200,
		},
	)
}

export default function SupportRoute() {
	const data = useLoaderData<typeof loader>()
	const actionData = useActionData<typeof action>()
	const messagesContainer = useRef<HTMLDivElement>(null)
	const sendRef = useRef<HTMLButtonElement>(null)

	const [form, fields] = useForm({
		id: 'new-message',
		constraint: getZodConstraint(TicketMessageSchema),
		lastResult: actionData?.result,
		shouldRevalidate: 'onBlur',
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: TicketMessageSchema })
		},
	})

	const user = useUser()

	const closeDC = useDoubleCheck()
	const isPending = useIsPending()

	useEffect(() => {
		if (!messagesContainer.current) return
		messagesContainer.current.scrollTop = messagesContainer.current.scrollHeight
	}, [])

	useEffect(() => {
		if (!messagesContainer.current) return

		if (
			messagesContainer.current.scrollHeight -
				messagesContainer.current.clientHeight -
				messagesContainer.current.scrollTop <
			128
		) {
			messagesContainer.current.scrollTop =
				messagesContainer.current.scrollHeight
		}
	}, [data.ticket.messages.length])

	return (
		<div className="flex h-full w-full flex-col gap-12 overflow-hidden">
			<div className="flex flex-wrap items-center justify-between gap-6 border-b px-2 py-4">
				<h2>{data.ticket.title}</h2>
				{data.ticket.open ? (
					<Form method="POST" encType="multipart/form-data">
						<Button
							variant="destructive"
							{...closeDC.getButtonProps({
								type: 'submit',
								name: 'intent',
								value: 'close',
							})}
							disabled={isPending}
						>
							{closeDC.doubleCheck ? 'Are you sure?' : 'Close'}
						</Button>
					</Form>
				) : null}
			</div>
			<div className="flex flex-1 flex-col gap-6 overflow-hidden px-1 md:px-4">
				<div
					id="asd"
					ref={messagesContainer}
					className="flex flex-1 flex-col gap-2 overflow-y-auto overscroll-contain"
				>
					{data.ticket.messages.map((msg) => (
						<Message
							key={msg.id}
							align={msg.user.id === user.id ? 'end' : 'start'}
							message={msg.message}
							images={msg.images}
							user={msg.user}
							date={new Date(msg.createdAt)}
						/>
					))}
				</div>

				{data.ticket.open ? (
					<Form
						method="POST"
						encType="multipart/form-data"
						{...getFormProps(form)}
						className="w-full"
					>
						<MultipleImageField.Provider
							inputProps={{
								...getInputProps(fields.images, { type: 'file' }),
								required: false,
								defaultValue: undefined,
							}}
							errors={fields.images.errors}
						>
							<div className="flex w-full gap-2">
								<HoneypotInputs />

								<TextareaField
									labelProps={{}}
									textareaProps={{
										...getTextareaProps(fields.message),
										autoFocus: true,
										placeholder: 'Type here...',
										className: 'resize-none min-h-[52px]',
										onKeyDown: (e) => {
											if (e.key === 'Enter' && !e.shiftKey) {
												e.preventDefault()
												sendRef.current?.click()
											}
										},
									}}
									errors={fields.message.errors}
									className="flex-1"
								/>

								<div className="flex gap-2 py-2">
									<MultipleImageField.Input />

									<TooltipProvider>
										<Tooltip>
											<TooltipTrigger asChild>
												<Button
													size="icon"
													type="submit"
													name="intent"
													value="new-message"
													disabled={isPending}
													ref={sendRef}
												>
													<Icon name="send" />
												</Button>
											</TooltipTrigger>
											<TooltipContent>Send message</TooltipContent>
										</Tooltip>
									</TooltipProvider>
								</div>
							</div>
							<MultipleImageField.Display />

							<ErrorList errors={form.errors} />
						</MultipleImageField.Provider>
					</Form>
				) : null}
			</div>
		</div>
	)
}
