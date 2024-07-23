import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useRef,
	useState,
} from 'react'
import { Link } from '@remix-run/react'
import { TooltipProvider } from '@radix-ui/react-tooltip'
import { Map as OlMap, View } from 'ol'
import { getCenter } from 'ol/extent'
import ImageLayer from 'ol/layer/Image'
import Projection from 'ol/proj/Projection'
import Static from 'ol/source/ImageStatic'

import { Button } from './ui/button.tsx'
import { Icon } from './ui/icon.tsx'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip.tsx'

type MapContextType = {
	map: OlMap | undefined
}

const MapContext = createContext<MapContextType | undefined>(undefined)

export function Map({
	children,
	imageId,
}: {
	children?: React.ReactNode
	imageId: string | undefined | null
}) {
	const [map, setMap] = useState<OlMap>()
	const mapRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		if (!mapRef.current) return

		const BASE_EXTENT = 2048

		const extent = [0, 0, BASE_EXTENT, BASE_EXTENT]
		const projection = new Projection({
			code: 'map-image',
			units: 'pixels',
			extent: [-BASE_EXTENT, -BASE_EXTENT, BASE_EXTENT, BASE_EXTENT],
		})

		const map = new OlMap({
			target: mapRef.current,
			layers: [
				new ImageLayer({
					source: new Static({
						url: `/img/map-background.png`,
						projection: projection,
						imageExtent: extent,
					}),
					opacity: 0.95,
				}),
				new ImageLayer({
					source: new Static({
						url: `/resources/map-radars/${imageId}`,
						projection: projection,
						imageExtent: [96, 96, BASE_EXTENT - 96, BASE_EXTENT - 96],
					}),
				}),
			],
			overlays: [],
			view: new View({
				projection: projection,
				center: getCenter(extent),
				zoom: 1,
				maxZoom: 4.5,
				extent: extent,
			}),
		})

		setMap(map)

		return () => {
			map.setTarget(undefined)
			setMap(undefined)
		}
	}, [imageId])

	return (
		<MapContext.Provider
			value={{
				map,
			}}
		>
			<TooltipProvider delayDuration={0}>
				<div
					ref={mapRef}
					className="relative isolate aspect-square w-full rounded-xl border-8 border-primary bg-primary sm:h-[75vw] sm:max-h-[75vh] sm:w-[75vh] sm:max-w-[75vw] [&_a]:rounded-none [&_a]:shadow-none [&_button]:rounded-none [&_button]:shadow-none"
				>
					{children}
				</div>
			</TooltipProvider>
		</MapContext.Provider>
	)
}

export function useMap() {
	const context = useContext(MapContext)
	if (!context)
		throw new Error('useMap must be used within a MapContext.Provider')
	return context
}

export function MapBackButton({ to = '..' }: { to?: string }) {
	const ref = useRef<HTMLAnchorElement>(null)

	const handleKeyDown = useCallback((e: KeyboardEvent) => {
		if (e.code === 'Escape') {
			ref.current?.click()
		}
	}, [])

	useEffect(() => {
		if (!ref.current) return
		document.addEventListener('keydown', handleKeyDown)
		return () => {
			document.removeEventListener('keydown', handleKeyDown)
		}
	}, [handleKeyDown])

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Button size="icon" className="absolute bottom-0 left-0 z-10" asChild>
					<Link to={to} ref={ref}>
						<Icon name="chevron-left" />
						<span className="sr-only">Back</span>
					</Link>
				</Button>
			</TooltipTrigger>
			<TooltipContent>Back</TooltipContent>
		</Tooltip>
	)
}

export function MapTitle({ children }: { children: React.ReactNode }) {
	return (
		<div className="absolute left-1/2 top-0 z-10 -translate-x-1/2 bg-primary px-4 py-2 text-primary-foreground">
			<h2 className="text-center text-h5">{children}</h2>
		</div>
	)
}
