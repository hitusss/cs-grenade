import { useEffect, useRef } from 'react'
import { Link } from '@remix-run/react'
import { Overlay } from 'ol'

import { cn } from '#app/utils/misc.tsx'

import { useMap } from './map.tsx'
import {
	Tooltip,
	TooltipContent,
	TooltipPortal,
	TooltipTrigger,
} from './ui/tooltip.tsx'

type DestinationMarkerProps = {
	to: string
	coords: {
		x: string
		y: string
	}
	name: string
	count?: number
	highlight?: boolean
	disabled?: boolean
	className?: string
}

export function DestinationMarker({
	to,
	coords,
	name,
	count,
	highlight,
	disabled,
	className,
}: DestinationMarkerProps) {
	const { map } = useMap()
	const destinationRef = useRef<HTMLAnchorElement>(null)

	useEffect(() => {
		if (!map) return
		if (!destinationRef.current) return

		const element = destinationRef.current

		const overlay = new Overlay({
			element,
			position: [Number(coords.x), Number(coords.y)],
			positioning: 'center-center',
		})

		map.addOverlay(overlay)

		return () => {
			map.removeOverlay(overlay)
		}
	}, [coords.x, coords.y, map])

	return (
		<div>
			<Tooltip>
				<TooltipTrigger asChild>
					<Link
						ref={destinationRef}
						to={to}
						aria-hidden={disabled}
						tabIndex={disabled ? -1 : 0}
						onClick={(e) => disabled && e.preventDefault()}
						className="group outline-none"
					>
						<span
							className={cn(
								'grid size-7 place-items-center rounded-full border-2 p-1 text-sm leading-none ring-offset-background transition-all duration-300 animate-in zoom-in group-focus-visible:outline-none group-focus-visible:ring-2 group-focus-visible:ring-ring group-focus-visible:ring-offset-2',
								highlight
									? 'bg-primary/75 text-primary-foreground'
									: 'bg-white/75 text-black',
								disabled && 'cursor-default',
								className,
							)}
						>
							{count ? count : null}
						</span>
						<span className="sr-only">destination: {name}</span>
					</Link>
				</TooltipTrigger>
				<TooltipPortal>
					<TooltipContent className="bg-white text-black">
						{name}
					</TooltipContent>
				</TooltipPortal>
			</Tooltip>
		</div>
	)
}
