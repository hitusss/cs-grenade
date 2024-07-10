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
import { type SEOHandle } from '@nasa-gcn/remix-seo'
import { useEventSource } from 'remix-utils/sse/react'
import { z } from 'zod'

import { prisma } from '#app/utils/db.server.ts'
import { emitter } from '#app/utils/event.server.ts'
import { checkHoneypot } from '#app/utils/honeypot.server.ts'
import { useDoubleCheck, useIsPending } from '#app/utils/misc.tsx'
import { notify } from '#app/utils/notifications.server.js'
import { requireUserWithRole } from '#app/utils/permissions.server.ts'
import { getUserImgSrc } from '#app/utils/user.ts'
import { MAX_SIZE, TicketMessageSchema } from '#app/utils/validators/support.ts'
import { Button } from '#app/components/ui/button.tsx'
import { MessageForm } from '#app/components/message-form.tsx'
import { Message, MessageContainer } from '#app/components/message.tsx'

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

export async function loader({ request, params }: LoaderFunctionArgs) {
	await requireUserWithRole(request, ['moderator', 'admin', 'superadmin'])

	const { id } = params

	invariantResponse(id, 'Id is required')

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
			user: {
				select: {
					username: true,
					name: true,
					image: {
						select: {
							id: true,
						},
					},
				},
			},
		},
	})

	invariantResponse(ticket, 'Not found', { status: 404 })

	return json({ ticket })
}

export async function action({ request, params }: ActionFunctionArgs) {
	const userId = await requireUserWithRole(request, [
		'moderator',
		'admin',
		'superadmin',
	])

	const { id } = params

	invariantResponse(id, 'Ticket id is required', { status: 400 })

	const ticket = await prisma.ticket.findUnique({
		where: { id },
		select: { title: true, userId: true },
	})

	invariantResponse(ticket, 'Not found', { status: 404 })

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
					ticketId: id,
					userId,
					isAdmin: true,
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
				where: { id },
				data: {
					updatedAt: new Date(),
				},
			})

			await prisma.ticketMessage.updateMany({
				where: {
					ticketId: id,
					isAdmin: false,
					seen: false,
				},
				data: {
					seen: true,
				},
			})

			notify({
				userId: ticket.userId,
				title: 'Ticket Message',
				description: `New message in ticket: ${ticket.title}`,
				redirectTo: `/support/${id}`,
			})
			break
		}
		case 'close': {
			await prisma.ticket.update({
				where: { id },
				data: { open: false },
			})
			notify({
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

	return json(
		{ result: submission.reply({ resetForm: true }) },
		{
			status: 200,
		},
	)
}

export default function SupportTicketAdminRoute() {
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
		<>
			<div className="flex flex-wrap justify-between gap-2 border-b pb-6">
				<div>
					<h1>{data.ticket.title}</h1>
					<div className="mt-2 flex items-center gap-2 font-semibold">
						<img
							src={getUserImgSrc(data.ticket.user.image?.id)}
							className="size-6 rounded-full"
						/>
						{data.ticket.user.name
							? `${data.ticket.user.name} (${data.ticket.user.username})`
							: data.ticket.user.username}
					</div>
				</div>

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
			<MessageContainer messagesCount={data.ticket.messages.length}>
				{data.ticket.messages.map((msg) => (
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
			{data.ticket.open ? <MessageForm result={actionData?.result} /> : null}
		</>
	)
}
