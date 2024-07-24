import { invariantResponse } from '@epic-web/invariant'

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
	const hasUpdateDestinationPermission = userHasPermission(
		userPermissions,
		isOwn ? 'update:destination' : 'update:destination:any',
	)

	if (!isOwn && !hasUpdateDestinationPermission) {
		throw unauthorized({
			message: 'You do not have permission to edit this destination',
		})
	}

	if (hasUpdateDestinationPermission) {
		await prisma.destination.update({
			where: { id },
			data: {
				name,
				x,
				y,
			},
		})
	} else {
		const prevDestination = await prisma.destination.findUnique({
			where: { id },
			select: {
				name: true,
				x: true,
				y: true,
				destinationChanges: {
					select: {
						id: true,
					},
				},
			},
		})

		invariantResponse(prevDestination, 'Not found', { status: 404 })
		invariantResponse(
			!prevDestination.destinationChanges,
			'You have pending changes to this destination',
			{ status: 400 },
		)

		if (
			name === prevDestination?.name &&
			x === prevDestination?.x &&
			y === prevDestination?.y
		) {
			return await redirectWithToast(`..`, {
				title: `There isn't any changes to save`,
				description: ``,
				type: 'error',
			})
		}
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
		title: `Destination ${hasUpdateDestinationPermission ? 'updated' : 'changes requested'}`,
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
	const hasDeleteDestinationPermission = userHasPermission(
		userPermissions,
		isOwn ? 'delete:destination' : 'delete:destination:any',
	)

	if (!hasDeleteDestinationPermission) {
		throw unauthorized({
			message: 'You do not have permission to delete this destination',
		})
	}

	await prisma.destination.delete({
		where: { id },
	})

	return await redirectWithToast(`../..`, {
		title: `Destination deleted`,
		description: ``,
		type: 'success',
	})
}

export async function cancelEditDestinationRequest({
	isOwn,
	id,
}: {
	isOwn: boolean
	id: string
}) {
	if (!isOwn) {
		throw unauthorized({
			message: 'You do not have permission to cancel this request',
		})
	}

	await prisma.destinationChanges.delete({
		where: {
			destinationId: id,
		},
	})

	return await redirectWithToast(`..`, {
		title: `Destination changes cancelled`,
		description: ``,
		type: 'success',
	})
}
