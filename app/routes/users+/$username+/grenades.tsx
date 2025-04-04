import { data, Link } from 'react-router'
import { invariant, invariantResponse } from '@epic-web/invariant'

import {
	grenadeLabels,
	isGrenadeType,
	type GrenadeType,
} from '#types/grenades-types.ts'
import { isTeamType, teamLabels, type TeamType } from '#types/teams.ts'
import {
	getFilteredUserGrenadeCount,
	getFilteredUserGrenadesWithPagination,
	getUserIdByUsername,
} from '#app/models/index.server.ts'
import { getUserId } from '#app/utils/auth.server.ts'
import { ContentCard } from '#app/components/content-card.tsx'
import { ContentFilter } from '#app/components/content-filter.tsx'
import { Pagination } from '#app/components/pagination.tsx'

import { type Route } from './+types/grenades.ts'

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

	invariant(team === undefined || isTeamType(team), 'Invalid team type')
	invariant(type === undefined || isGrenadeType(type), 'Invalid grenade type')

	const total = await getFilteredUserGrenadeCount({
		userId: user.id,
		query,
		verified: user.id === userId ? verified : true,
		mapName: map,
		team,
		type,
	})
	const grenades = await getFilteredUserGrenadesWithPagination({
		userId: user.id,
		query,
		verified: user.id === userId ? verified : true,
		mapName: map,
		team,
		type,
		page,
		perPage,
	})

	return data({ grenades, total, isOwn: user.id === userId })
}
export default function ProfileGrenadesRoute({
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
				{loaderData.grenades.map((g) => (
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
										img: `/img/grenades/${g.type}.png`,
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
			<Pagination total={loaderData.total} />
		</div>
	)
}
