import { json, type LoaderFunctionArgs } from '@remix-run/node'
import { Form, Link, useLoaderData } from '@remix-run/react'
import { invariantResponse } from '@epic-web/invariant'

import { getUserId, requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { useDoubleCheck } from '#app/utils/misc.tsx'
import { unauthorized } from '#app/utils/permissions.server.ts'
import { userHasPermission } from '#app/utils/permissions.ts'
import { redirectWithToast } from '#app/utils/toast.server.ts'
import { useOptionalUser } from '#app/utils/user.ts'
import { Button } from '#app/components/ui/button.tsx'
import { DestinationMarker } from '#app/components/destination-marker.tsx'
import { MapBackButton } from '#app/components/map.tsx'

import { type MapHandle } from '../../_layout.tsx'

export const handle: MapHandle = {
	map: {
		currentDestination: true,
	},
}

export async function loader({ request, params }: LoaderFunctionArgs) {
	const { destination: destinationId } = params

	const userId = await getUserId(request)

	const destination = await prisma.destination.findUnique({
		where: {
			id: destinationId,
		},
		select: {
			verified: true,
			userId: true,
			x: true,
			y: true,
		},
	})

	invariantResponse(destination, 'Not found', { status: 404 })

	if (!destination.verified && userId !== destination.userId) {
		throw unauthorized({
			message: 'You are not allowed to view this destination',
		})
	}

	return json({ destination })
}

export async function action({ request, params }: LoaderFunctionArgs) {
	const { destination: destinationId } = params
	const userId = await requireUserId(request)

	const destination = await prisma.destination.findUnique({
		where: {
			id: destinationId,
		},
		select: {
			userId: true,
		},
	})

	invariantResponse(destination, 'Not found', { status: 404 })
	if (destination.userId !== userId) {
		throw unauthorized({
			message: 'You are not allowed to perform this action',
		})
	}

	await prisma.destination.delete({
		where: {
			id: destinationId,
			verified: false,
		},
	})

	return await redirectWithToast(`..`, {
		title: `Destination request cancelled`,
		description: ``,
		type: 'success',
	})
}

export default function MapDestinationRoute() {
	const data = useLoaderData<typeof loader>()

	const cancelDC = useDoubleCheck()

	const user = useOptionalUser()
	const hasUpdateDestinationOwnPermission = userHasPermission(
		user,
		'update:destination:own',
	)
	const hasUpdateDestinationAnyPermission = userHasPermission(
		user,
		'update:destination:any',
	)

	const hasCreateGrenadePermission = userHasPermission(user, 'create:grenade')

	const isUserDestination = data.destination.userId === user?.id
	const canEdit =
		hasUpdateDestinationAnyPermission ||
		(isUserDestination && hasUpdateDestinationOwnPermission)

	return (
		<>
			<MapBackButton />
			{!data.destination.verified ? (
				<Form method="POST">
					<DestinationMarker
						to=""
						name=""
						coords={{ x: data.destination.x, y: data.destination.y }}
						highlight
						disabled
					/>
					<Button
						variant="destructive"
						{...cancelDC.getButtonProps({
							type: 'submit',
							name: 'intent',
							value: 'cancel',
						})}
						className="absolute bottom-0 right-0 z-10"
					>
						{cancelDC.doubleCheck ? 'Are you sure?' : 'Cancel request'}
					</Button>
				</Form>
			) : (
				<>
					{canEdit || isUserDestination ? (
						<Button className="absolute right-0 top-0 z-10" asChild>
							<Link to="edit">{canEdit ? 'Edit' : 'Request changes'}</Link>
						</Button>
					) : null}
					<Button className="absolute bottom-0 right-0 z-10" asChild>
						<Link to="new">
							{hasCreateGrenadePermission
								? 'Create grenade'
								: 'Request grenade'}
						</Link>
					</Button>
				</>
			)}
		</>
	)
}
