import { data, Link } from 'react-router'
import { invariant, invariantResponse } from '@epic-web/invariant'

import {
	grenadeLabels,
	isGrenadeType,
	type GrenadeType,
} from '#types/grenades-types.ts'
import { isTeamType, teamLabels, type TeamType } from '#types/teams.ts'
import {
	getFilteredUserFavoriteCount,
	getFilteredUserFavoritesWithPagination,
} from '#app/models/index.server.ts'
import { ContentCard } from '#app/components/content-card.tsx'
import { ContentFilter } from '#app/components/content-filter.tsx'
import { Pagination } from '#app/components/pagination.tsx'

import { type Route } from './+types/favorites.ts'

export async function loader({ request, params }: Route.LoaderArgs) {
	const { username } = params

	invariantResponse(username, 'Username is required')

	const searchParams = new URL(request.url).searchParams

	const page = Number(searchParams.get('page') ?? 1)
	const perPage = Number(searchParams.get('perPage') ?? 25)

	const query = searchParams.get('query') ?? undefined
	const map = searchParams.get('map') ?? undefined
	const team = searchParams.get('team') ?? undefined
	const type = searchParams.get('type') ?? undefined

	invariant(team === undefined || isTeamType(team), 'Invalid team type')
	invariant(type === undefined || isGrenadeType(type), 'Invalid grenade type')

	const total = await getFilteredUserFavoriteCount({
		username,
		query,
		mapName: map,
		team,
		type,
	})
	const favorites = await getFilteredUserFavoritesWithPagination({
		username,
		query,
		mapName: map,
		team,
		type,
		page,
		perPage,
	})

	return data({ favorites, total })
}
export default function ProfileFavoritesRoute({
	loaderData,
}: Route.ComponentProps) {
	const favorites = loaderData.favorites.map((f) => f.grenade)

	return (
		<div>
			<ContentFilter queryFilter mapFilter teamFilter typeFilter />
			<ul className="my-6 flex flex-wrap justify-center gap-4">
				{favorites.map((f) => (
					<li key={f.id}>
						<Link
							to={`/map/${f.map.name}/${f.team}/${f.type}/${f.destination.id}/${f.id}`}
						>
							<ContentCard
								name={f.name}
								fields={[
									{
										label: 'Map',
										img: `/resources/map-logos/${f.map.logo?.id}`,
										value: f.map.label,
									},
									{
										label: 'Team',
										img: `/img/teams/${f.team}.png`,
										value: teamLabels[f.team as TeamType],
									},
									{
										label: 'Type',
										img: `/img/grenades/${f.type}.png`,
										value: grenadeLabels[f.type as GrenadeType],
									},
									{
										label: 'Destination',
										value: f.destination.name,
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
