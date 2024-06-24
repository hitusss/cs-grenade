import { json, type LoaderFunctionArgs } from '@remix-run/node'
import { Link, useLoaderData } from '@remix-run/react'
import { invariantResponse } from '@epic-web/invariant'

import { prisma } from '#app/utils/db.server.ts'
import { userHasPermission } from '#app/utils/permissions.ts'
import { useOptionalUser } from '#app/utils/user.ts'
import { Button } from '#app/components/ui/button.tsx'
import { MapBackButton } from '#app/components/map.tsx'

import { type MapHandle } from '../../_layout.tsx'

export const handle: MapHandle = {
	map: {
		currentDestination: true,
	},
}

export async function loader({ params }: LoaderFunctionArgs) {
	const { destination: destinationId } = params

	const destination = await prisma.destination.findUnique({
		where: {
			id: destinationId,
			verified: true,
		},
		select: {
			userId: true,
		},
	})

	invariantResponse(destination, 'Not found', { status: 404 })

	return json({ destination })
}

export default function DestinationRoute() {
	const data = useLoaderData<typeof loader>()

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
			{canEdit || isUserDestination ? (
				<Button className="absolute right-0 top-0 z-10" asChild>
					<Link to="edit">{canEdit ? 'Edit' : 'Request changes'}</Link>
				</Button>
			) : null}
			<Button className="absolute z-10 bottom-0 right-0" asChild>
				<Link to="new">
					{hasCreateGrenadePermission ? 'Create grenade' : 'Request grenade'}
				</Link>
			</Button>
		</>
	)
}
