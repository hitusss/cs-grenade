import { invariantResponse } from '@epic-web/invariant'

import {
	createDestinationChanges,
	deletedDestinationChangesByDestinationId,
	deleteDestination as deleteDestinationDb,
	getDestinationWithChangesId,
	getUserPermissions,
	updateDestinationNameAndPosition,
} from '#app/models/index.server.ts'
import { notify } from '#app/utils/notifications.server.ts'
import { unauthorized } from '#app/utils/permissions.server.ts'
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

	const prevDestination = await getDestinationWithChangesId({
		destinationId: id,
	})

	invariantResponse(prevDestination, 'Not found', { status: 404 })

	if (hasUpdateDestinationPermission) {
		await updateDestinationNameAndPosition({
			destinationId: id,
			name,
			x,
			y,
		})
		if (!isOwn && prevDestination.userId) {
			await notify({
				userId: prevDestination.userId,
				title: 'Destination updated',
				description: `Admin has updated your destination: ${prevDestination.name}`,
				redirectTo: `/map/${prevDestination.mapName}/${prevDestination.team}/${prevDestination.type}/${id}`,
			})
		}
	} else {
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
		await createDestinationChanges({
			destinationId: id,
			name,
			x,
			y,
			userId,
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

	const deletedDestination = await deleteDestinationDb({ destinationId: id })

	if (!isOwn && deletedDestination.userId) {
		await notify({
			userId: deletedDestination.userId,
			title: 'Destination deleted',
			description: `Admin has deleted your destination: ${deletedDestination.name}`,
		})
	}

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

	await deletedDestinationChangesByDestinationId(id)

	return await redirectWithToast(`..`, {
		title: `Destination changes cancelled`,
		description: ``,
		type: 'success',
	})
}
