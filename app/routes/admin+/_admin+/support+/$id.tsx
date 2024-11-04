import { useEffect } from 'react'
import {
	json,
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
import { parseFormData } from '@mjackson/form-data-parser'
import { type SEOHandle } from '@nasa-gcn/remix-seo'
import { useEventSource } from 'remix-utils/sse/react'
import { z } from 'zod'

import { prisma } from '#app/utils/db.server.ts'
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
	await requireUserWithPermission(request, 'read:support:any')

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
	const userId = await requireUserWithPermission(request, 'read:support:any')

	const { id } = params

	invariantResponse(id, 'Ticket id is required', { status: 400 })

	const ticket = await prisma.ticket.findUnique({
		where: { id },
		select: { title: true, userId: true },
	})

	invariantResponse(ticket, 'Not found', { status: 404 })
	invariantResponse(ticket.userId, 'Ticket author does not exist', {
		status: 400,
	})

	const formData = await parseFormData(
		request,
		uploadHandler({ maxPartSize: MAX_SIZE }),
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
			await requireUserWithPermission(request, 'update:support:any')
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
			await prisma.ticket.update({
				where: { id },
				data: { open: false },
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

	return json(
		{ result: submission.reply({ resetForm: true }) },
		{
			status: 200,
		},
	)
}

export default function AdminSupportTicketRoute() {
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
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [shouldRevalidate])

	return (
		<>
			<div className="flex flex-wrap justify-between gap-2 border-b pb-6">
				<div>
					<div className="flex items-center gap-4">
						<SidebarTrigger />
						<h2>{data.ticket.title}</h2>
					</div>
					<div className="mt-2 flex items-center gap-2 font-semibold">
						<img
							src={getUserImgSrc(data.ticket.user?.image?.id)}
							className="size-6 rounded-full"
						/>
						{getUserFullName(data.ticket.user)}
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
			{data.ticket.open && data.ticket.user ? (
				<MessageForm result={actionData?.result} />
			) : null}
		</>
	)
}
