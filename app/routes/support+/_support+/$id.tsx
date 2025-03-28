import { useEffect } from 'react'
import { data, Form, useRevalidator } from 'react-router'
import { parseWithZod } from '@conform-to/zod'
import { invariantResponse } from '@epic-web/invariant'
import { parseFormData } from '@mjackson/form-data-parser'
import { useEventSource } from 'remix-utils/sse/react'
import { z } from 'zod'

import {
	createTicketImage,
	createTicketMessage,
	getSimpleTicket,
	getTicket,
	updateTicketAdminMassagesAsSeen,
	updateTicketOpenStatus,
	updateTicketUpdatedAt,
} from '#app/models/index.server.ts'
import { requireUserId } from '#app/utils/auth.server.ts'
import { emitter } from '#app/utils/event.server.ts'
import { checkHoneypot } from '#app/utils/honeypot.server.ts'
import {
	uploadHandler,
	useDoubleCheck,
	useIsPending,
} from '#app/utils/misc.tsx'
import { unauthorized } from '#app/utils/permissions.server.ts'
import { MAX_SIZE, TicketMessageSchema } from '#app/utils/validators/support.ts'
import { Button } from '#app/components/ui/button.tsx'
import { SidebarTrigger } from '#app/components/ui/sidebar.tsx'
import { MessageForm } from '#app/components/message-form.tsx'
import { Message, MessageContainer } from '#app/components/message.tsx'

import { type Route } from './+types/$id.ts'

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

export async function loader({ request, params }: Route.LoaderArgs) {
	const { id } = params

	invariantResponse(id, 'Support ticket ID is required', { status: 400 })

	const userId = await requireUserId(request)

	const ticket = await getTicket(id)

	invariantResponse(ticket, 'Not found', { status: 404 })

	if (ticket.userId !== userId) {
		throw unauthorized({
			message: 'You are not authorized to view this ticket',
		})
	}

	const updated = await updateTicketAdminMassagesAsSeen({
		ticketId: ticket.id,
		userId,
	})
	if (updated.count > 0) {
		emitter.emit(`support/${userId}`)
	}

	return data({ ticket })
}

export async function action({ request, params }: Route.ActionArgs) {
	const { id } = params

	invariantResponse(id, 'Ticket id is required', { status: 400 })

	const userId = await requireUserId(request)

	const ticket = await getSimpleTicket(id)
	invariantResponse(ticket, 'Not found', { status: 404 })

	if (userId !== ticket.userId) {
		throw unauthorized({
			message: 'You are not authorized to perform this action',
		})
	}

	const formData = await parseFormData(
		request,
		uploadHandler({ maxPartSize: MAX_SIZE }),
	)
	await checkHoneypot(formData)

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
		return data(
			{ result: submission.reply() },
			{
				status: submission.status === 'error' ? 400 : 200,
			},
		)
	}

	switch (submission.value.intent) {
		case 'new-message': {
			const { message, images } = submission.value
			const msg = await createTicketMessage({
				message,
				ticketId: ticket.id,
				userId,
			})

			if (images) {
				await Promise.all(
					images.map(
						async (img) =>
							await createTicketImage({
								...img,
								ticketMessageId: msg.id,
							}),
					),
				)
			}

			await updateTicketUpdatedAt(id)
			break
		}
		case 'close': {
			await updateTicketOpenStatus({
				ticketId: id,
				open: false,
			})
			break
		}
	}

	emitter.emit(`support/${ticket.userId}`)
	emitter.emit(`support/ticket/${id}`)

	return data(
		{ result: submission.reply({ resetForm: true }) },
		{
			status: 200,
		},
	)
}

export default function SupportTicketRoute({
	loaderData,
	actionData,
}: Route.ComponentProps) {
	const { revalidate } = useRevalidator()
	const shouldRevalidate = useEventSource(
		`/events/support/ticket/${loaderData.ticket.id}`,
	)

	const closeDC = useDoubleCheck()
	const isPending = useIsPending()

	useEffect(() => {
		void revalidate()
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [shouldRevalidate])

	return (
		<div className="flex h-full w-full flex-col gap-12 overflow-hidden">
			<div className="flex flex-wrap items-center justify-between gap-6 border-b px-2 py-4">
				<div className="flex items-center gap-2">
					<SidebarTrigger />
					<h2>{loaderData.ticket.title}</h2>
				</div>
				{loaderData.ticket.open ? (
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
				<MessageContainer messagesCount={loaderData.ticket.messages.length}>
					{loaderData.ticket.messages.map((msg) => (
						<Message
							key={msg.id}
							align={msg.isAdmin ? 'start' : 'end'}
							message={msg.message}
							images={msg.images}
							user={msg.user}
							date={new Date(msg.createdAt)}
						/>
					))}
				</MessageContainer>
				{loaderData.ticket.open ? (
					<MessageForm result={actionData?.result} />
				) : null}
			</div>
		</div>
	)
}
