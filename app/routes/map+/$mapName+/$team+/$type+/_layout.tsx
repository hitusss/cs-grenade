import { useEffect, useRef } from 'react'
import {
	json,
	type LoaderFunctionArgs,
	type MetaFunction,
} from '@remix-run/node'
import { Outlet, useLoaderData, useMatches } from '@remix-run/react'
import { invariantResponse } from '@epic-web/invariant'
import { type SEOHandle } from '@nasa-gcn/remix-seo'
import { serverOnly$ } from 'vite-env-only/macros'
import { z } from 'zod'

import { grenadeLabels, grenadeTypes } from '#types/grenades-types.ts'
import { teamLabels, teams } from '#types/teams.ts'
import { prisma } from '#app/utils/db.server.ts'
import { getSocialMetas } from '#app/utils/seo.ts'
import { DestinationMarker } from '#app/components/destination-marker.tsx'
import { GrenadeMarker } from '#app/components/grenade-marker.tsx'
import { MapNav } from '#app/components/map-nav.tsx'
import { Map } from '#app/components/map.tsx'
import { type loader as rootLoader } from '#app/root.tsx'

export const MapHandle = z
	.object({
		map: z.object({
			currentDestination: z.boolean().optional(),
			hideCurrentDestination: z.boolean().optional(),
			disableAllDestinations: z.boolean().optional(),
			hideAllGrenades: z.boolean().optional(),
			currentGrenade: z.boolean().optional(),
			hideCurrentGrenade: z.boolean().optional(),
			disableAllGrenades: z.boolean().optional(),
		}),
	})
	.superRefine(({ map }, ctx) => {
		if (map.hideCurrentDestination && !map.currentDestination) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "You can't hide current destination if you haven't set one",
				fatal: true,
			})
			return z.NEVER
		}
		if (map.currentGrenade && !map.currentDestination) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message:
					"You can't have a current grenade if you haven't set current destination",
				fatal: true,
			})
			return z.NEVER
		}
		if (map.hideCurrentGrenade && !map.currentGrenade) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "You can't hide current grenade if you haven't set one",
				fatal: true,
			})
			return z.NEVER
		}
	})
export type MapHandle = z.infer<typeof MapHandle>

const MapHandleMatch = z
	.object({
		handle: MapHandle.optional(),
		params: z.object({
			destination: z.string().optional(),
			grenade: z.string().optional(),
		}),
	})
	.superRefine(({ handle, params }, ctx) => {
		if (!handle) return
		if (handle.map.currentDestination && !params.destination) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message:
					"You can't have a current destination if you arn't on destination route",
				fatal: true,
			})
			return z.NEVER
		}
		if (handle.map.currentGrenade && !params.grenade) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message:
					"You can't have a current grenade if you aren't on grenade route",
				fatal: true,
			})
			return z.NEVER
		}
	})
	.transform(({ handle, params }) => {
		if (!handle) return undefined
		return {
			...handle.map,
			currentDestination: handle.map.currentDestination
				? params.destination
				: undefined,
			currentGrenade: handle.map?.currentGrenade ? params.grenade : undefined,
		}
	})

export const meta: MetaFunction<
	typeof loader,
	{
		root: typeof rootLoader
	}
> = ({ data, matches }) => {
	const rootData = matches.find((m) => m.id === 'root')

	if (!data || !rootData) {
		return getSocialMetas({
			url: '',
			title: 'Error - CSGrenade',
		})
	}

	return getSocialMetas({
		url: `${rootData.data.requestInfo.origin}${rootData.data.requestInfo.path}`,
		title: `${data.map.label} - CSGrenade`,
		image: {
			title: `${data.map.label} - CSGrenade`,
			map: data.mapName,
		},
	})
}

export const handle = serverOnly$({
	getSitemapEntries: async () => {
		const maps = await prisma.map.findMany({
			select: {
				name: true,
			},
		})
		return maps.map((map) => ({
			route: `/map/${map.name}/${teams[0]}/${grenadeTypes[0]}`,
			priority: 0.7,
		}))
	},
} satisfies SEOHandle)

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
			destinations: {
				where: {
					team,
					type,
					verified: true,
				},
				select: {
					id: true,
					name: true,
					x: true,
					y: true,
					grenades: {
						where: {
							team,
							type,
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

	return json({ mapName, team, type, map })
}

export default function MapLayout() {
	const data = useLoaderData<typeof loader>()
	const matches = useMatches()
	const containerRef = useRef<HTMLDivElement>(null)

	const result = MapHandleMatch.safeParse(matches.at(-1))
	if (!result.success) throw new Error(result.error.errors[0]?.message)
	const mapHandle = result.data
	const currentDestination = mapHandle?.currentDestination
		? data.map.destinations.find((d) => d.id === mapHandle.currentDestination)
		: undefined

	useEffect(() => {
		if (!containerRef.current) return
		containerRef.current.scrollIntoView({ block: 'center' })
	}, [])

	return (
		<div
			ref={containerRef}
			className="grid place-items-center duration-500 animate-in fade-in zoom-in"
		>
			<div className="grid gap-6">
				<h1>{data.map.label}</h1>
				<div className="flex w-full flex-wrap items-center justify-start gap-6">
					<MapNav
						label="Team"
						items={teams.map((t) => ({
							value: t,
							to: `/map/${data.mapName}/${t}/${data.type}`,
							label: teamLabels[t],
							img: `/img/teams/${t}.png`,
						}))}
						currentValue={data.team}
					/>
					<MapNav
						label="Grenade"
						items={grenadeTypes.map((g) => ({
							value: g,
							to: `/map/${data.mapName}/${data.team}/${g}`,
							label: grenadeLabels[g],
							img: `/img/grenades/${g}.png`,
						}))}
						currentValue={data.type}
					/>
				</div>
				<Map imageId={data.map.radar?.id}>
					{data.map.destinations
						.filter((d) =>
							currentDestination
								? mapHandle?.hideCurrentDestination
									? d.id !== currentDestination.id
									: d.id === currentDestination.id
								: true,
						)
						.map((d) => (
							<DestinationMarker
								key={d.id}
								to={d.id}
								name={d.name}
								count={d.grenades.length}
								coords={{ x: d.x, y: d.y }}
								disabled={
									mapHandle?.disableAllDestinations ||
									d.id === currentDestination?.id
								}
								highlight={d.id === currentDestination?.id}
							/>
						))}
					{mapHandle?.hideAllGrenades
						? null
						: currentDestination?.grenades
								.filter((g) =>
									mapHandle?.currentGrenade
										? mapHandle?.hideCurrentGrenade
											? g.id !== mapHandle.currentGrenade
											: g.id === mapHandle.currentGrenade
										: true,
								)
								.map((g) => (
									<GrenadeMarker
										key={g.id}
										to={`${currentDestination.id}/${g.id}`}
										name={g.name}
										destination={{
											x: currentDestination.x,
											y: currentDestination.y,
										}}
										coords={{
											x: g.x,
											y: g.y,
										}}
										disabled={
											mapHandle?.disableAllGrenades ||
											g.id === mapHandle?.currentGrenade
										}
										highlight={g.id === mapHandle?.currentGrenade}
									/>
								))}
					<Outlet />
				</Map>
			</div>
		</div>
	)
}
