import { data } from 'react-router'
import { invariantResponse } from '@epic-web/invariant'

import {
	deleteNotification,
	updateNotificationAsSeen,
} from '#app/models/index.server.ts'
import { requireUserId } from '#app/utils/auth.server.ts'

import { type Route } from './+types/notifications.$id.ts'

export async function action({ request, params }: Route.ActionArgs) {
	const userId = await requireUserId(request)

	invariantResponse(params.id, 'Notification id is required', { status: 400 })

	const formData = await request.formData()
	const intent = formData.get('intent')

	switch (intent) {
		case 'seen': {
			await updateNotificationAsSeen({ userId, notificationId: params.id })
			break
		}
		case 'delete': {
			await deleteNotification({ userId, notificationId: params.id })
			break
		}
		default:
			break
	}

	return data({})
}
