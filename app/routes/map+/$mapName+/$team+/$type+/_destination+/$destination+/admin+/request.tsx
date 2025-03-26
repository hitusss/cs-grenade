import { data, Form, useSearchParams } from 'react-router'
import { invariantResponse } from '@epic-web/invariant'

import {
	deleteDestination,
	getDestination,
	getSimpleDestination,
	updateDestinationVerifiedStatus,
} from '#app/models/index.server.ts'
import { useIsPending } from '#app/utils/misc.tsx'
import { notify } from '#app/utils/notifications.server.ts'
import { requireUserWithPermission } from '#app/utils/permissions.server.ts'
import { redirectWithToast } from '#app/utils/toast.server.ts'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { DestinationMarker } from '#app/components/destination-marker.tsx'
import { MapBackButton, MapTitle } from '#app/components/map.tsx'

import { type MapHandle } from '../../../_layout.tsx'
import { type Route } from './+types/request.ts'

const DEFAULT_REDIRECT_TO = '/admin/requests/destinations'

export const handle: MapHandle = {
	map: {
		disableAllDestinations: true,
	},
}

export async function loader({ request, params }: Route.LoaderArgs) {
	await requireUserWithPermission(
		request,
		'create:review-destination-request:any',
	)

	const { destination: destinationId } = params

	invariantResponse(destinationId, 'Destination is required')

	const destination = await getSimpleDestination({
		destinationId,
		verified: false,
	})

	invariantResponse(destination, 'Not fount', { status: 404 })

	return data({ destination })
}

export async function action({ request, params }: Route.ActionArgs) {
	await requireUserWithPermission(
		request,
		'create:review-destination-request:any',
	)

	const { destination: destinationId } = params

	invariantResponse(destinationId, 'Destination is required')

	const destination = await getDestination(destinationId)

	invariantResponse(destination, 'Not fount', { status: 404 })

	const searchParams = new URL(request.url).searchParams
	const redirectTo = searchParams.get('redirectTo') ?? DEFAULT_REDIRECT_TO

	if (destination.verified) {
		return redirectWithToast(redirectTo, {
			type: 'error',
			title: 'Destination already verified',
			description: ``,
		})
	}

	const formData = await request.formData()

	const intent = formData.get('intent')

	switch (intent) {
		case 'accept': {
			await updateDestinationVerifiedStatus({
				destinationId,
				verified: true,
			})
			if (destination.userId) {
				await notify({
					userId: destination.userId,
					title: 'Destination request accepted',
					description: `Your destination request for ${destination.name} has been accepted`,
					redirectTo: `/map/${destination.mapName}/${destination.team}/${destination.type}/${destinationId}`,
				})
			}
			break
		}
		case 'reject': {
			await deleteDestination({ destinationId })
			if (destination.userId) {
				await notify({
					userId: destination.userId,
					title: 'Destination request rejected',
					description: `Your destination request for ${destination.name} has been rejected`,
				})
			}
			break
		}
		default: {
			throw new Response('Invalid intent', { status: 400 })
		}
	}

	return redirectWithToast(redirectTo, {
		type: 'success',
		title: 'Destination request reviewed',
		description: ``,
	})
}

export default function MapAdminDestinationRequestRoute({
	loaderData,
}: Route.ComponentProps) {
	const [searchParams] = useSearchParams()

	const isPending = useIsPending()

	const redirectTo = searchParams.get('redirectTo') ?? DEFAULT_REDIRECT_TO

	return (
		<>
			<MapBackButton to={redirectTo} />
			<MapTitle>{loaderData.destination.name}</MapTitle>
			<DestinationMarker
				to=""
				name={loaderData.destination.name}
				coords={{ x: loaderData.destination.x, y: loaderData.destination.y }}
				highlight
				disabled
			/>
			<Form method="POST" className="absolute right-0 bottom-0 z-10 flex">
				<StatusButton
					type="submit"
					name="intent"
					value="reject"
					variant="destructive"
					status={isPending ? 'pending' : 'idle'}
				>
					Reject
				</StatusButton>
				<StatusButton
					type="submit"
					name="intent"
					value="accept"
					status={isPending ? 'pending' : 'idle'}
				>
					Accept
				</StatusButton>
			</Form>
		</>
	)
}
