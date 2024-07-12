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

type GrenadeMarkerProps = {
	to: string
	destination: {
		x: string
		y: string
	}
	coords: {
		x: string
		y: string
	}
	name: string
	highlight?: boolean
	disabled?: boolean
}

export function GrenadeMarker({
	to,
	destination,
	coords,
	name,
	highlight,
	disabled,
}: GrenadeMarkerProps) {
	const { map } = useMap()
	const grenadeRef = useRef<HTMLAnchorElement>(null)

	useEffect(() => {
		if (!map) return
		if (!grenadeRef.current) return

		const element = grenadeRef.current

		const overlay = new Overlay({
			element,
			position: [Number(destination.x), Number(destination.y)],
			positioning: 'center-center',
			className: 'transition-all duration-300 ease-in-out',
		})

		map.addOverlay(overlay)
		setTimeout(() => {
			overlay.setPosition([Number(coords.x), Number(coords.y)])

			setTimeout(() => {
				// @ts-expect-error - element exists on overlay but not in types
				overlay.element.classList.remove('transition-all', 'duration-300')
			}, 300)
		}, 100)

		return () => {
			map.removeOverlay(overlay)
		}
	}, [coords.x, coords.y, destination.x, destination.y, map])

	return (
		<div>
			<Tooltip>
				<TooltipTrigger asChild>
					<Link
						ref={grenadeRef}
						to={to}
						aria-hidden={disabled}
						tabIndex={disabled ? -1 : 0}
						onClick={(e) => disabled && e.preventDefault()}
						className="group outline-none"
					>
						<span
							className={cn(
								'block size-5 rounded-full border-2 ring-offset-background transition-all duration-300 animate-in zoom-in group-focus-visible:outline-none group-focus-visible:ring-2 group-focus-visible:ring-ring group-focus-visible:ring-offset-2',
								highlight ? 'bg-primary/75' : 'bg-destructive/75',
								disabled && 'cursor-default',
							)}
						/>
						<span className="sr-only">{name}</span>
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
