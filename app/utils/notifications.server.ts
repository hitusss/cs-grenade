import { createNotification } from '#app/models/index.server.ts'

import { emitter } from './event.server.ts'

export async function notify({
	userId,
	title,
	description,
	redirectTo,
}: {
	userId: string
	title: string
	description?: string
	redirectTo?: string
}) {
	await createNotification({
		userId,
		title,
		description,
		redirectTo,
	})

	emitter.emit(`notifications/${userId}`)
}
