import { data, Link } from 'react-router'
import { invariant, invariantResponse } from '@epic-web/invariant'

import {
	grenadeLabels,
	isGrenadeType,
	type GrenadeType,
} from '#types/grenades-types.ts'
import { isTeamType, teamLabels, type TeamType } from '#types/teams.ts'
import {
	getFilteredUserDestinationCount,
	getFiltereUserDestinationsWithPagination,
	getUserIdByUsername,
} from '#app/models/index.server.ts'
import { getUserId } from '#app/utils/auth.server.ts'
import { ContentCard } from '#app/components/content-card.tsx'
import { ContentFilter } from '#app/components/content-filter.tsx'
import { Pagination } from '#app/components/pagination.tsx'

import { type Route } from './+types/destinations.ts'

export async function loader({ request, params }: Route.LoaderArgs) {
	const { username } = params
	invariantResponse(username, 'Username is required')
	const user = await getUserIdByUsername(username)
	invariantResponse(user, 'Not found', { status: 404 })

	const userId = await getUserId(request)

	const searchParams = new URL(request.url).searchParams

	const page = Number(searchParams.get('page') ?? 1)
	const perPage = Number(searchParams.get('perPage') ?? 25)

	const query = searchParams.get('query') ?? undefined
	const map = searchParams.get('map') ?? undefined
	const team = searchParams.get('team') ?? undefined
	const type = searchParams.get('type') ?? undefined
	const spVerified = searchParams.get('verified')
	const verified =
		spVerified === 'true' ? true : spVerified === 'false' ? false : undefined

	invariant(team === undefined || isTeamType(team), 'Invalid team')
	invariant(type === undefined || isGrenadeType(type), 'Invalid grenade type')

	const total = await getFilteredUserDestinationCount({
		userId: user.id,
		query,
		verified: user.id === userId ? verified : true,
		mapName: map,
		team,
		type,
	})
	const destinations = await getFiltereUserDestinationsWithPagination({
		userId: user.id,
		query,
		verified: user.id === userId ? verified : true,
		mapName: map,
		team,
		type,
		page,
		perPage,
	})

	return data({ destinations, total, isOwn: user.id === userId })
}
export default function ProfileDestinationsRoute({
	loaderData,
}: Route.ComponentProps) {
	return (
		<div>
			<ContentFilter
				queryFilter
				mapFilter
				teamFilter
				typeFilter
				verifiedFilter={loaderData.isOwn}
			/>
			<ul className="my-6 flex flex-wrap justify-center gap-4">
				{loaderData.destinations.map((d) => (
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
										img: `/img/grenades/${d.type}.png`,
										value: grenadeLabels[d.type as GrenadeType],
									},
								]}
							/>
						</Link>
					</li>
				))}
			</ul>
			<Pagination total={loaderData.total} />
		</div>
	)
}
