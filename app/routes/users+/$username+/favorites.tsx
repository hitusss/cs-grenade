import { json, type LoaderFunctionArgs } from '@remix-run/node'
import { Link, useLoaderData } from '@remix-run/react'
import { invariantResponse } from '@epic-web/invariant'

import { grenadeLabels, type GrenadeType } from '#types/grenades-types.ts'
import { teamLabels, type TeamType } from '#types/teams.ts'
import { prisma } from '#app/utils/db.server.ts'
import { ContentCard } from '#app/components/content-card.tsx'
import {
	ContentFilter,
	useContentFiler,
} from '#app/components/content-filter.tsx'

export async function loader({ params }: LoaderFunctionArgs) {
	const { username } = params

	invariantResponse(username, 'Username is required')

	const favorites = await prisma.favorite.findMany({
		where: {
			user: {
				username,
			},
		},
		select: {
			grenade: {
				select: {
					id: true,
					name: true,
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
			},
		},
	})

	return json({ favorites })
}
export default function UserFavoritesRoute() {
	const data = useLoaderData<typeof loader>()

	const { state, dispatch } = useContentFiler()

	const favorites = data.favorites
		.filter((f) => {
			if (Boolean(state.map) && f.grenade.map.label !== state.map) {
				return false
			}
			if (Boolean(state.team) && f.grenade.team !== state.team) {
				return false
			}
			if (Boolean(state.grenade) && f.grenade.type !== state.grenade) {
				return false
			}
			return true
		})
		.map((f) => f.grenade)

	return (
		<div>
			<ContentFilter
				state={state}
				dispatch={dispatch}
				hideFilter={{ verified: true }}
			/>
			<ul className="mt-6 flex flex-wrap gap-4">
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
		</div>
	)
}
