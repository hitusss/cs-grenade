import { useEffect } from 'react'
import { data, Form, useRevalidator } from 'react-router'
import { parseWithZod } from '@conform-to/zod'
import { invariantResponse } from '@epic-web/invariant'
import { parseFormData } from '@mjackson/form-data-parser'
import { type SEOHandle } from '@nasa-gcn/remix-seo'
import { useEventSource } from 'remix-utils/sse/react'
import { z } from 'zod'

import {
	createTicketImage,
	createTicketMessage,
	getSimpleTicket,
	getTicket,
	updateTicketOpenStatus,
	updateTicketUpdatedAt,
	updateTicketUserMassagesAsSeen,
} from '#app/models/index.server.ts'
import { emitter } from '#app/utils/event.server.ts'
import { checkHoneypot } from '#app/utils/honeypot.server.ts'
import {
	uploadHandler,
	useDoubleCheck,
	useIsPending,
} from '#app/utils/misc.tsx'
import { notify } from '#app/utils/notifications.server.js'
import { requireUserWithPermission } from '#app/utils/permissions.server.ts'
import { getUserFullName, getUserImgSrc } from '#app/utils/user.ts'
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

export const handle: SEOHandle = {
	getSitemapEntries: () => null,
}

export async function loader({ request, params }: Route.LoaderArgs) {
	await requireUserWithPermission(request, 'read:support:any')

	const { id } = params

	invariantResponse(id, 'Id is required')

	const ticket = await getTicket(id)

	invariantResponse(ticket, 'Not found', { status: 404 })

	return data({ ticket })
}

export async function action({ request, params }: Route.ActionArgs) {
	const userId = await requireUserWithPermission(request, 'read:support:any')

	const { id } = params

	invariantResponse(id, 'Ticket id is required', { status: 400 })

	const ticket = await getSimpleTicket(id)

	invariantResponse(ticket, 'Not found', { status: 404 })
	invariantResponse(ticket.userId, 'Ticket author does not exist', {
		status: 400,
	})

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
			await requireUserWithPermission(request, 'update:support:any')
			const { message, images } = submission.value
			const msg = await createTicketMessage({
				message,
				ticketId: id,
				userId,
				isAdmin: true,
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

			await updateTicketUserMassagesAsSeen(id)

			await notify({
				userId: ticket.userId,
				title: 'Ticket Message',
				description: `New message in ticket: ${ticket.title}`,
				redirectTo: `/support/${id}`,
			})
			break
		}
		case 'close': {
			await requireUserWithPermission(request, 'update:support:any')
			await updateTicketOpenStatus({
				ticketId: id,
				open: false,
			})
			await notify({
				userId: ticket.userId,
				title: 'Ticket Closed',
				description: `Ticket closed: ${ticket.title}`,
				redirectTo: `/support/${id}`,
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

export default function AdminSupportTicketRoute({
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
		<>
			<div className="flex flex-wrap justify-between gap-2 border-b pb-6">
				<div>
					<div className="flex items-center gap-4">
						<SidebarTrigger />
						<h2>{loaderData.ticket.title}</h2>
					</div>
					<div className="mt-2 flex items-center gap-2 font-semibold">
						<img
							src={getUserImgSrc(loaderData.ticket.user?.image?.id)}
							className="size-6 rounded-full"
						/>
						{getUserFullName(loaderData.ticket.user)}
					</div>
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
			<MessageContainer messagesCount={loaderData.ticket.messages.length}>
				{loaderData.ticket.messages.map((msg) => (
					<Message
						key={msg.id}
						align={msg.isAdmin ? 'end' : 'start'}
						message={msg.message}
						images={msg.images}
						user={msg.user}
						date={new Date(msg.createdAt)}
					/>
				))}
			</MessageContainer>
			{loaderData.ticket.open && loaderData.ticket.user ? (
				<MessageForm result={actionData?.result} />
			) : null}
		</>
	)
}
