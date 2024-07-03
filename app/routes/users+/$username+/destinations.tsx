import { json, type LoaderFunctionArgs } from '@remix-run/node'
import { Link, useLoaderData } from '@remix-run/react'
import { invariantResponse } from '@epic-web/invariant'

import { grenadeLabels, type GrenadeType } from '#types/grenades-types.ts'
import { teamLabels, type TeamType } from '#types/teams.ts'
import { getUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { ContentCard } from '#app/components/content-card.tsx'
import { ContentFilter } from '#app/components/content-filter.tsx'
import { Pagination } from '#app/components/pagination.tsx'

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

	const searchParams = new URL(request.url).searchParams

	const page = Number(searchParams.get('page') ?? 1)
	const perPage = Number(searchParams.get('perPage') ?? 25)

	const map = searchParams.get('map') ?? undefined
	const team = searchParams.get('team') ?? undefined
	const type = searchParams.get('type') ?? undefined
	const spVerified = searchParams.get('verified')
	const verified =
		spVerified === 'true' ? true : spVerified === 'false' ? false : undefined

	const total = await prisma.destination.count({
		where: {
			userId: user.id,
			verified: user.id === userId ? verified : true,
			map: map ? { name: map } : undefined,
			team,
			type,
		},
	})
	const destinations = await prisma.destination.findMany({
		where: {
			userId: user.id,
			verified: user.id === userId ? verified : true,
			map: map ? { name: map } : undefined,
			team,
			type,
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
		skip: page * perPage - perPage,
		take: perPage,
	})

	return json({ destinations, total, isOwn: user.id === userId })
}
export default function UserDestinationsRoute() {
	const data = useLoaderData<typeof loader>()

	return (
		<div>
			<ContentFilter hideFilter={{ verified: !data.isOwn }} />
			<ul className="my-6 flex flex-wrap justify-center gap-4">
				{data.destinations.map((d) => (
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
			<Pagination total={data.total} />
		</div>
	)
}
