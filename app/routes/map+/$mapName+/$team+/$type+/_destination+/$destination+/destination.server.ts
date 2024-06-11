import { prisma } from '#app/utils/db.server.ts'
import {
	getUserPermissions,
	unauthorized,
} from '#app/utils/permissions.server.ts'
import { userHasPermission } from '#app/utils/permissions.ts'
import { redirectWithToast } from '#app/utils/toast.server.ts'

export async function updateDestination({
	userId,
	isOwn,
	id,
	name,
	x,
	y,
}: {
	userId: string
	isOwn: boolean
	id: string
	name: string
	x: string
	y: string
}) {
	const userPermissions = await getUserPermissions(userId)
	const hasPermission = userHasPermission(
		userPermissions,
		isOwn ? 'update:destination' : 'update:destination:any',
	)

	if (!isOwn && !hasPermission) {
		throw unauthorized({
			message: 'You do not have permission to edit this destination',
		})
	}

	if (hasPermission) {
		await prisma.destination.update({
			where: { id },
			data: {
				name,
				x,
				y,
			},
		})
	} else {
		await prisma.destinationChanges.create({
			data: {
				destinationId: id,
				name,
				x,
				y,
				userId,
			},
		})
	}

	return await redirectWithToast(`..`, {
		title: `Destination ${hasPermission ? 'updated' : 'changes requested'}`,
		description: ``,
		type: 'success',
	})
}

export async function deleteDestination({
	userId,
	isOwn,
	id,
}: {
	userId: string
	isOwn: boolean
	id: string
}) {
	const userPermissions = await getUserPermissions(userId)
	const hasPermission = userHasPermission(
		userPermissions,
		isOwn ? 'delete:destination' : 'delete:destination:any',
	)

	if (!hasPermission) {
		throw unauthorized({
			message: 'You do not have permission to delete this destination',
		})
	}

	await prisma.destination.delete({
		where: { id },
	})

	return await redirectWithToast(`..`, {
		title: `Destination deleted`,
		description: ``,
		type: 'success',
	})
}
