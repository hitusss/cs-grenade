import { json, type LoaderFunctionArgs } from '@remix-run/node'
import { Link, useLoaderData } from '@remix-run/react'
import { invariantResponse } from '@epic-web/invariant'

import { grenadeLabels, type GrenadeType } from '#types/grenades-types.ts'
import { teamLabels, type TeamType } from '#types/teams.ts'
import { getUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { ContentCard } from '#app/components/content-card.tsx'
import {
	ContentFilter,
	useContentFiler,
} from '#app/components/content-filter.tsx'

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

	const grenades = await prisma.grenade.findMany({
		where: {
			userId: user.id,
			verified: user.id === userId ? undefined : true,
		},
		select: {
			id: true,
			name: true,
			verified: true,
			destination: {
				select: {
					id: true,
					name: true,
				},
			},
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

	return json({ grenades, isOwn: user.id === userId })
}
export default function UserGrenadesRoute() {
	const data = useLoaderData<typeof loader>()

	const { state, dispatch } = useContentFiler()

	const grenades = data.grenades.filter((g) => {
		if (Boolean(state.map) && g.map.label !== state.map) {
			return false
		}
		if (Boolean(state.team) && g.team !== state.team) {
			return false
		}
		if (Boolean(state.grenade) && g.type !== state.grenade) {
			return false
		}
		if (Boolean(state.verified) && g.verified !== Boolean(state.verified)) {
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

			<ul className="mt-6 flex flex-wrap gap-4">
				{grenades.map((g) => (
					<li key={g.id}>
						<Link
							to={`/map/${g.map.name}/${g.team}/${g.type}/${g.destination.id}/${g.id}`}
						>
							<ContentCard
								name={g.name}
								fields={[
									{
										label: 'Map',
										img: `/resources/map-logos/${g.map.logo?.id}`,
										value: g.map.label,
									},
									{
										label: 'Team',
										img: `/img/teams/${g.team}.png`,
										value: teamLabels[g.team as TeamType],
									},
									{
										label: 'Type',
										value: grenadeLabels[g.type as GrenadeType],
									},
									{
										label: 'Destination',
										value: g.destination.name,
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
