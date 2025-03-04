import { useEffect, useRef } from 'react'
import { Link } from 'react-router'
import { Overlay } from 'ol'

import { cn } from '#app/utils/misc.tsx'

import { useMap } from './map.tsx'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip.tsx'

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
						className="group outline-hidden"
					>
						<span
							className={cn(
								'ring-offset-background animate-in zoom-in group-focus-visible:ring-ring grid size-7 place-items-center rounded-full border-2 p-1 text-sm leading-none transition-all duration-300 group-focus-visible:ring-2 group-focus-visible:ring-offset-2 group-focus-visible:outline-hidden',
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
				<TooltipContent className="bg-white text-black">{name}</TooltipContent>
			</Tooltip>
		</div>
	)
}
