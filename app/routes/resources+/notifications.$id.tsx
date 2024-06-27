import { json, type ActionFunctionArgs } from '@remix-run/node'
import { invariantResponse } from '@epic-web/invariant'

import { requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'

export async function action({ request, params }: ActionFunctionArgs) {
	const userId = await requireUserId(request)

	invariantResponse(params.id, 'Notification id is required', { status: 400 })

	const formData = await request.formData()
	const intent = formData.get('intent')

	switch (intent) {
		case 'seen': {
			await prisma.notification.update({
				where: {
					id: params.id,
					userId,
				},
				data: {
					seen: true,
				},
			})
			break
		}
		case 'delete': {
			await prisma.notification.delete({
				where: {
					id: params.id,
					userId,
				},
			})
			break
		}
		default:
			break
	}

	return json({})
}
