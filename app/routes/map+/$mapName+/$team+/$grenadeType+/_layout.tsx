import { json, redirect, type LoaderFunctionArgs } from '@remix-run/node'
import { Outlet, useLoaderData } from '@remix-run/react'
import { invariantResponse } from '@epic-web/invariant'

import { prisma } from '#app/utils/db.server.ts'

import { grenadeTypes } from '#types/grenades-types.ts'
import { teams } from '#types/teams.ts'

export async function loader({ params }: LoaderFunctionArgs) {
	let { mapName, team, grenadeType } = params

	let shouldRedirect = false
	if (!team || teams.includes(team) === false) {
		shouldRedirect = true
		team = teams[0]
	}

	if (!grenadeType || grenadeTypes.includes(grenadeType) === false) {
		shouldRedirect = true
		grenadeType = grenadeTypes[0]
	}

	if (shouldRedirect) {
		return redirect(`/map/${mapName}/${team}/${grenadeType}`)
	}

	const map = await prisma.map.findUnique({
		where: {
			name: mapName,
		},
		select: {
			label: true,
			radar: { select: { id: true } },
			destinations: {
				where: {
					type: grenadeType,
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
							name: true,
							x: true,
							y: true,
						},
					},
				},
			},
		},
	})

	invariantResponse(map, 'Not Found', { status: 404 })

	return json({ mapName, map })
}

export default function MapLayout() {
	const { mapName, map } = useLoaderData<typeof loader>()
	return (
		<div>
			<h1>{map.label}</h1>
			<pre>{JSON.stringify(map, null, 2)}</pre>
			<Outlet />
		</div>
	)
}
