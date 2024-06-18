import { Link } from '@remix-run/react'

import { cn } from '#app/utils/misc.tsx'

import { grenadeTypes } from '#types/grenades-types.ts'
import { teams } from '#types/teams.ts'

import { Card, CardTitle } from './ui/card.tsx'

export default function MapsList({
	maps,
}: {
	maps: Array<{
		name: string
		label: string
		isActive: boolean
		imageId?: string
		logoId?: string
	}>
}) {
	return (
		<ul className="flex flex-wrap mt-6 gap-6 px-8">
			{maps.map((map) => (
				<li key={map.name}>
					<Link
						to={`/map/${map.name}/${teams[0]}/${grenadeTypes[0]}`}
						className="group"
					>
						<Card
							size="base"
							className={cn(
								'relative isolate overflow-hidden',
								!map.isActive && 'grayscale-[0.75]',
							)}
						>
							<img
								src={`/resources/map-images/${map.imageId}`}
								className="absolute h-full w-full object-cover -z-10 brightness-75 duration-500 transition-all group-hover:blur-sm group-hover:brightness-50 group-hover:scale-150"
							/>
							<img
								src={`/resources/map-logos/${map.logoId}`}
								className="transition-all duration-500 group-hover:scale-75"
							/>
							<CardTitle className="text-center text-white transition-all duration-500 group-hover:scale-125 group-hover:-translate-y-1/2">
								{map.label}
							</CardTitle>
						</Card>
					</Link>
				</li>
			))}
		</ul>
	)
}
