import { useEffect } from 'react'
import {
	json,
	unstable_createMemoryUploadHandler,
	unstable_parseMultipartFormData,
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
} from '@remix-run/node'
import {
	Form,
	useActionData,
	useLoaderData,
	useRevalidator,
} from '@remix-run/react'
import { parseWithZod } from '@conform-to/zod'
import { invariantResponse } from '@epic-web/invariant'
import { useEventSource } from 'remix-utils/sse/react'
import { z } from 'zod'

import { requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { checkHoneypot } from '#app/utils/honeypot.server.ts'
import { useDoubleCheck, useIsPending } from '#app/utils/misc.tsx'
import { unauthorized } from '#app/utils/permissions.server.ts'
import { MAX_SIZE, TicketMessageSchema } from '#app/utils/validators/support.ts'
import { Button } from '#app/components/ui/button.tsx'
import { MessageForm } from '#app/components/message-form.tsx'
import { Message, MessageContainer } from '#app/components/message.tsx'

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
					isAdmin: true,
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

	emitter.emit(`support/${ticket.userId}`)
	emitter.emit(`support/ticket/${id}`)

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
	const { revalidate } = useRevalidator()
	const shouldRevalidate = useEventSource(
		`/events/support/ticket/${data.ticket.id}`,
	)

	const closeDC = useDoubleCheck()
	const isPending = useIsPending()

	useEffect(() => {
		revalidate()
	}, [shouldRevalidate])

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
				<MessageContainer messagesCount={data.ticket.messages.length}>
					{data.ticket.messages.map((msg) => (
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
				{data.ticket.open ? <MessageForm result={actionData?.result} /> : null}
			</div>
		</div>
	)
}
