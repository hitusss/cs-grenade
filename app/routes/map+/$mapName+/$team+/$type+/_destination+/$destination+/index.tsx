import { json, type LoaderFunctionArgs } from '@remix-run/node'
import { Link, useLoaderData } from '@remix-run/react'
import { invariantResponse } from '@epic-web/invariant'

import { prisma } from '#app/utils/db.server.ts'
import { userHasPermission } from '#app/utils/permissions.ts'
import { useOptionalUser } from '#app/utils/user.ts'
import { Button } from '#app/components/ui/button.tsx'
import { DestinationMarker } from '#app/components/destination-marker.tsx'
import { GrenadeMarker } from '#app/components/grenade-marker.tsx'
import { MapBackButton, MapTitle } from '#app/components/map.tsx'

export async function loader({ params }: LoaderFunctionArgs) {
	const { destination: destinationId } = params

	const destination = await prisma.destination.findUnique({
		where: {
			id: destinationId,
		},
		select: {
			userId: true,
			name: true,
			x: true,
			y: true,
			grenades: {
				where: {
					verified: true,
				},
				select: {
					id: true,
					name: true,
					x: true,
					y: true,
				},
			},
		},
	})

	invariantResponse(destination, 'Not found', { status: 404 })

	return json({ destination })
}

export default function DestinationPage() {
	const loaderData = useLoaderData<typeof loader>()

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

	const isUserDestination = loaderData.destination.userId === user?.id
	const canEdit =
		hasUpdateDestinationAnyPermission ||
		(isUserDestination && hasUpdateDestinationOwnPermission)

	return (
		<>
			<MapTitle>{loaderData.destination.name}</MapTitle>
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
			<DestinationMarker
				to=""
				coords={{ x: loaderData.destination.x, y: loaderData.destination.y }}
				name={loaderData.destination.name}
				highlight
				disabled
			/>
			{loaderData.destination.grenades.map(g => (
				<GrenadeMarker
					key={g.id}
					to={g.id}
					destination={{
						x: loaderData.destination.x,
						y: loaderData.destination.y,
					}}
					coords={{
						x: g.x,
						y: g.y,
					}}
					name={g.name}
				/>
			))}
		</>
	)
}
