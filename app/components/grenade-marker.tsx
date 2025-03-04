import { useEffect, useRef } from 'react'
import { Link } from 'react-router'
import { Overlay } from 'ol'

import { cn } from '#app/utils/misc.tsx'

import { useMap } from './map.tsx'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip.tsx'

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
	className?: string
}

export function GrenadeMarker({
	to,
	destination,
	coords,
	name,
	highlight,
	disabled,
	className,
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
						className="group outline-hidden"
					>
						<span
							className={cn(
								'ring-offset-background animate-in zoom-in group-focus-visible:ring-ring block size-5 rounded-full border-2 transition-all duration-300 group-focus-visible:ring-2 group-focus-visible:ring-offset-2 group-focus-visible:outline-hidden',
								highlight ? 'bg-primary/75' : 'bg-destructive/75',
								disabled && 'cursor-default',
								className,
							)}
						/>
						<span className="sr-only">grenade: {name}</span>
					</Link>
				</TooltipTrigger>
				<TooltipContent className="bg-white text-black">{name}</TooltipContent>
			</Tooltip>
		</div>
	)
}
