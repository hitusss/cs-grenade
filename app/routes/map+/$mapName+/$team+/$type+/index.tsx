import { json, type LoaderFunctionArgs } from '@remix-run/node'
import { Link, useLoaderData } from '@remix-run/react'
import { invariantResponse } from '@epic-web/invariant'

import { prisma } from '#app/utils/db.server.ts'
import { userHasPermission } from '#app/utils/permissions.ts'
import { useOptionalUser } from '#app/utils/user.ts'
import { Button } from '#app/components/ui/button.tsx'
import { DestinationMarker } from '#app/components/destination-marker.tsx'

export async function loader({ params }: LoaderFunctionArgs) {
	const { mapName, team, type } = params

	invariantResponse(mapName, 'Map name is required')
	invariantResponse(team, 'Team is required')
	invariantResponse(type, 'Grenade type is required')

	const destinations = await prisma.destination.findMany({
		where: {
			type,
			team,
			verified: true,
		},
		select: {
			id: true,
			x: true,
			y: true,
			name: true,
			grenades: {
				where: {
					verified: true,
				},
				select: {
					id: true,
				},
			},
		},
	})

	return json({ destinations })
}

export default function MapPage() {
	const loaderData = useLoaderData<typeof loader>()

	const user = useOptionalUser()
	const hasPermission = userHasPermission(user, 'create:destination')

	return (
		<>
			{user ? (
				<Button className="absolute bottom-0 right-0 z-10" asChild>
					<Link to="new">
						{hasPermission ? 'Create' : 'Request'} new destination
					</Link>
				</Button>
			) : null}
			{loaderData.destinations.map(d => (
				<DestinationMarker
					key={d.id}
					to={d.id}
					coords={{
						x: d.x,
						y: d.y,
					}}
					name={d.name}
					count={d.grenades.length}
				/>
			))}
		</>
	)
}
