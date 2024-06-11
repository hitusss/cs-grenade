import { useEffect, useRef } from 'react'
import { json, type LoaderFunctionArgs } from '@remix-run/node'
import { Link, Outlet, useLoaderData } from '@remix-run/react'
import { invariantResponse } from '@epic-web/invariant'

import { prisma } from '#app/utils/db.server.ts'
import { userHasPermission } from '#app/utils/permissions.ts'
import { useOptionalUser } from '#app/utils/user.ts'
import { Button } from '#app/components/ui/button.tsx'
import { MapNav } from '#app/components/map-nav.tsx'
import { Map } from '#app/components/map.tsx'

import { grenadeLabels, grenadeTypes } from '#types/grenades-types.ts'
import { teamLabels, teams } from '#types/teams.ts'

export async function loader({ params }: LoaderFunctionArgs) {
	const { mapName, team, type } = params

	invariantResponse(mapName, 'Map name is required')
	invariantResponse(team, 'Team is required')
	invariantResponse(type, 'Grenade type is required')

	const map = await prisma.map.findUnique({
		where: {
			name: mapName,
		},
		select: {
			label: true,
			radar: { select: { id: true } },
		},
	})

	invariantResponse(map, 'Not Found', { status: 404 })

	return json({ mapName, team, type, map })
}

export default function MapLayout() {
	const { mapName, team, type, map } = useLoaderData<typeof loader>()
	const containerRef = useRef<HTMLDivElement>(null)

	const user = useOptionalUser()
	const canEditMap = userHasPermission(user, 'update:map')

	useEffect(() => {
		if (!containerRef.current) return
		containerRef.current.scrollIntoView()
	}, [])

	return (
		<div
			ref={containerRef}
			className="grid animate-in fade-in zoom-in duration-500 place-items-center"
		>
			<div className="grid gap-6">
				<h1>{map.label}</h1>
				<div className="flex gap-6 flex-wrap w-full items-center justify-start">
					<MapNav
						label="Team"
						items={teams.map(t => ({
							value: t,
							to: `/map/${mapName}/${t}/${type}`,
							label: teamLabels[t],
							img: `/img/teams/${t}.png`,
						}))}
						currentValue={team}
					/>
					<MapNav
						label="Grenade"
						items={grenadeTypes.map(g => ({
							value: g,
							to: `/map/${mapName}/${team}/${g}`,
							label: grenadeLabels[g],
							img: `/img/grenades/${g}.png`,
						}))}
						currentValue={type}
					/>

					{canEditMap ? (
						<Button asChild className="ml-auto self-end">
							<Link to={`/map/${mapName}/edit`}>Edit Map</Link>
						</Button>
					) : null}
				</div>
				<Map imageId={map.radar?.id}>
					<Outlet />
				</Map>
			</div>
		</div>
	)
}
