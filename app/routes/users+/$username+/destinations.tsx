import { json, type LoaderFunctionArgs } from '@remix-run/node'
import { Link, useLoaderData } from '@remix-run/react'
import { invariantResponse } from '@epic-web/invariant'

import { getUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { ContentCard } from '#app/components/content-card.tsx'
import {
	ContentFilter,
	useContentFiler,
} from '#app/components/content-filter.tsx'

import { grenadeLabels, type GrenadeType } from '#types/grenades-types.ts'
import { teamLabels, type TeamType } from '#types/teams.ts'

export async function loader({ request, params }: LoaderFunctionArgs) {
	const { username } = params
	invariantResponse(username, 'Username is required')
	const user = await prisma.user.findUnique({
		where: {
			username,
		},
		select: { id: true },
	})
	invariantResponse(user, 'Not found', { status: 404 })

	const userId = await getUserId(request)

	const destinations = await prisma.destination.findMany({
		where: {
			userId: user.id,
			verified: user.id === userId ? undefined : true,
		},
		select: {
			id: true,
			name: true,
			verified: true,
			map: {
				select: {
					name: true,
					label: true,
					logo: {
						select: {
							id: true,
						},
					},
				},
			},
			type: true,
			team: true,
		},
	})

	return json({ destinations, isOwn: user.id === userId })
}
export default function UserDestinationsRoute() {
	const data = useLoaderData<typeof loader>()

	const { state, dispatch } = useContentFiler()

	const destinations = data.destinations.filter((d) => {
		if (Boolean(state.map) && d.map.label !== state.map) {
			return false
		}
		if (Boolean(state.team) && d.team !== state.team) {
			return false
		}
		if (Boolean(state.grenade) && d.type !== state.grenade) {
			return false
		}
		if (Boolean(state.verified) && d.verified !== Boolean(state.verified)) {
			return false
		}
		return true
	})

	return (
		<div>
			<ContentFilter
				state={state}
				dispatch={dispatch}
				hideFilter={{ verified: !data.isOwn }}
			/>

			<ul className="flex gap-4 flex-wrap mt-6">
				{destinations.map((d) => (
					<li key={d.id}>
						<Link to={`/map/${d.map.name}/${d.team}/${d.type}/${d.id}`}>
							<ContentCard
								name={d.name}
								fields={[
									{
										label: 'Map',
										img: `/resources/map-logos/${d.map.logo?.id}`,
										value: d.map.label,
									},
									{
										label: 'Team',
										img: `/img/teams/${d.team}.png`,
										value: teamLabels[d.team as TeamType],
									},
									{
										label: 'Type',
										value: grenadeLabels[d.type as GrenadeType],
									},
								]}
							/>
						</Link>
					</li>
				))}
			</ul>
		</div>
	)
}
