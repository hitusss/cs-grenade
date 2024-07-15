import {
	json,
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
} from '@remix-run/node'
import { Form, useLoaderData, useSearchParams } from '@remix-run/react'
import { invariantResponse } from '@epic-web/invariant'

import { prisma } from '#app/utils/db.server.ts'
import { notify } from '#app/utils/notifications.server.ts'
import { requireUserWithPermission } from '#app/utils/permissions.server.ts'
import { redirectWithToast } from '#app/utils/toast.server.ts'
import { Button } from '#app/components/ui/button.tsx'
import { DestinationMarker } from '#app/components/destination-marker.tsx'
import { MapBackButton, MapTitle } from '#app/components/map.tsx'

import { type MapHandle } from '../../../_layout.tsx'

const DEFAULT_REDIRECT_TO = '/admin/requests/destinations'

export const handle: MapHandle = {
	map: {
		disableAllDestinations: true,
	},
}

export async function loader({ request, params }: LoaderFunctionArgs) {
	await requireUserWithPermission(
		request,
		'create:review-destination-request:any',
	)

	const { destination: destinationId } = params

	invariantResponse(destinationId, 'Destination is required')

	const destination = await prisma.destination.findUnique({
		where: {
			id: destinationId,
			verified: false,
		},
		select: {
			name: true,
			x: true,
			y: true,
		},
	})

	invariantResponse(destination, 'Not fount', { status: 404 })

	return json({ destination })
}

export async function action({ request, params }: ActionFunctionArgs) {
	await requireUserWithPermission(
		request,
		'create:review-destination-request:any',
	)

	const { destination: destinationId } = params

	invariantResponse(destinationId, 'Destination is required')

	const destination = await prisma.destination.findUnique({
		where: {
			id: destinationId,
		},
		select: {
			name: true,
			mapName: true,
			team: true,
			type: true,
			verified: true,
			userId: true,
		},
	})

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
			await prisma.destination.update({
				where: {
					id: destinationId,
				},
				data: {
					verified: true,
				},
			})
			await notify({
				userId: destination.userId,
				title: 'Destination request accepted',
				description: `Your destination request for ${destination.name} has been accepted`,
				redirectTo: `/map/${destination.mapName}/${destination.team}/${destination.type}/${destinationId}`,
			})
			break
		}
		case 'reject': {
			await prisma.destination.delete({
				where: {
					id: destinationId,
				},
			})
			await notify({
				userId: destination.userId,
				title: 'Destination request rejected',
				description: `Your destination request for ${destination.name} has been rejected`,
			})
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

export default function MapAdminDestinationRequestRoute() {
	const data = useLoaderData<typeof loader>()
	const [searchParams] = useSearchParams()

	const redirectTo = searchParams.get('redirectTo') ?? DEFAULT_REDIRECT_TO

	return (
		<>
			<MapBackButton to={redirectTo} />
			<MapTitle>{data.destination.name}</MapTitle>
			<DestinationMarker
				to=""
				name={data.destination.name}
				coords={{ x: data.destination.x, y: data.destination.y }}
				highlight
				disabled
			/>
			<Form method="POST" className="absolute bottom-0 right-0 z-10">
				<Button
					type="submit"
					name="intent"
					value="reject"
					variant="destructive"
				>
					Reject
				</Button>
				<Button type="submit" name="intent" value="accept">
					Accept
				</Button>
			</Form>
		</>
	)
}
