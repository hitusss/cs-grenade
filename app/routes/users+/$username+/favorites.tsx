import { json, type LoaderFunctionArgs } from '@remix-run/node'
import { Link, useLoaderData } from '@remix-run/react'
import { invariantResponse } from '@epic-web/invariant'

import { grenadeLabels, type GrenadeType } from '#types/grenades-types.ts'
import { teamLabels, type TeamType } from '#types/teams.ts'
import { prisma } from '#app/utils/db.server.ts'
import { ContentCard } from '#app/components/content-card.tsx'
import { ContentFilter } from '#app/components/content-filter.tsx'
import { Pagination } from '#app/components/pagination.tsx'

export async function loader({ request, params }: LoaderFunctionArgs) {
	const { username } = params

	invariantResponse(username, 'Username is required')

	const searchParams = new URL(request.url).searchParams

	const page = Number(searchParams.get('page') ?? 1)
	const perPage = Number(searchParams.get('perPage') ?? 25)

	const map = searchParams.get('map') ?? undefined
	const team = searchParams.get('team') ?? undefined
	const type = searchParams.get('type') ?? undefined

	const total = await prisma.favorite.count({
		where: {
			user: {
				username,
			},
			grenade: {
				map: map ? { name: map } : undefined,
				team,
				type,
			},
		},
	})
	const favorites = await prisma.favorite.findMany({
		where: {
			user: {
				username,
			},
			grenade: {
				map: map ? { name: map } : undefined,
				team,
				type,
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
		skip: page * perPage - perPage,
		take: perPage,
	})

	return json({ favorites, total })
}
export default function UserFavoritesRoute() {
	const data = useLoaderData<typeof loader>()

	const favorites = data.favorites.map((f) => f.grenade)

	return (
		<div>
			<ContentFilter hideFilter={{ verified: true }} />
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
			<Pagination total={data.total} />
		</div>
	)
}
