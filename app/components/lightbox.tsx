import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useRef,
	useState,
} from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'

import { Button } from './ui/button.tsx'
import { Icon } from './ui/icon.tsx'

type ImageType = {
	src: string
	alt?: string
	caption?: string
}

type LightboxType =
	| {
			index: number
			images: ImageType[]
	  }
	| undefined

type LightboxContextType = {
	activeLightbox: LightboxType | undefined
	openLightbox: (lightbox: LightboxType) => void
	closeLightbox: () => void
}

const LightboxContext = createContext<LightboxContextType | undefined>(
	undefined,
)

export function LightboxProvider({ children }: { children: React.ReactNode }) {
	const [activeLightbox, setActiveLightbox] = useState<
		LightboxType | undefined
	>(undefined)

	const openLightbox = useCallback((lightbox: LightboxType) => {
		setActiveLightbox(lightbox)
	}, [])

	const closeLightbox = useCallback(() => {
		setActiveLightbox(undefined)
	}, [])

	return (
		<LightboxContext.Provider
			value={{
				activeLightbox,
				openLightbox,
				closeLightbox,
			}}
		>
			{children}
		</LightboxContext.Provider>
	)
}

export function useLightbox() {
	const context = useContext(LightboxContext)
	if (!context)
		throw new Error('useLigthbox musth be used inside LightboxProvider')
	return context
}

export function Lightbox() {
	const { activeLightbox } = useLightbox()

	if (!activeLightbox) {
		return null
	}

	return (
		<LightboxInner
			index={activeLightbox.index}
			images={activeLightbox.images}
		/>
	)
}

function LightboxInner({
	index,
	images,
}: {
	index: number
	images: ImageType[]
}) {
	const lightboxRef = useRef<HTMLDivElement>(null)
	const { closeLightbox } = useLightbox()
	const [activeIndex, setActiveIndex] = useState<number>(index)

	const canGoLeft = activeIndex > 0
	const canGoRight = activeIndex < images.length - 1
	const goLeft = useCallback(() => {
		if (canGoLeft) {
			setActiveIndex((prev) => prev - 1)
		}
	}, [canGoLeft])
	const goRight = useCallback(() => {
		if (canGoRight) {
			setActiveIndex((prev) => prev + 1)
		}
	}, [canGoRight])

	const onKeyDown = useCallback(
		(e: KeyboardEvent) => {
			if (e.key === 'ArrowLeft') {
				goLeft()
			} else if (e.key === 'ArrowRight') {
				goRight()
			}
		},
		[goLeft, goRight],
	)

	const onMouseDown = useCallback(
		(e: MouseEvent) => {
			if (!lightboxRef.current) return
			if (lightboxRef.current === e.target) {
				closeLightbox()
			}
		},
		[closeLightbox],
	)

	useEffect(() => {
		window.addEventListener('keydown', onKeyDown)
		window.addEventListener('mousedown', onMouseDown)
		return () => {
			window.removeEventListener('keydown', onKeyDown)
			window.removeEventListener('mousedown', onMouseDown)
		}
	}, [onKeyDown, onMouseDown])

	return (
		<DialogPrimitive.Dialog open={true} onOpenChange={closeLightbox}>
			<DialogPrimitive.Portal>
				<DialogPrimitive.DialogOverlay className="fixed inset-0 z-50 justify-between bg-black/40 backdrop-blur data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
				<DialogPrimitive.DialogContent
					ref={lightboxRef}
					className="fixed left-1/2 top-1/2 z-50 flex h-full w-full -translate-x-1/2 -translate-y-1/2 items-center justify-between gap-4 p-4 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]"
				>
					{images.length > 1 ? (
						<Button
							size="icon"
							disabled={!canGoLeft}
							onClick={goLeft}
							className="shrink-0 rounded-full"
						>
							<Icon name="chevron-left" />
							<span className="sr-only">previous image</span>
						</Button>
					) : (
						<div />
					)}
					<div className="flex h-full w-full flex-col items-center justify-center gap-2 py-6 lg:py-12">
						<img
							src={images[activeIndex]?.src}
							alt={images[activeIndex]?.alt}
							className="max-h-full max-w-full object-contain"
						/>
						{images[activeIndex]?.caption ? (
							<p className="text-center text-caption">
								{images[activeIndex]?.caption}
							</p>
						) : null}
					</div>

					{images.length > 1 ? (
						<Button
							size="icon"
							disabled={!canGoRight}
							onClick={goRight}
							className="shrink-0 rounded-full"
						>
							<Icon name="chevron-right" />
							<span className="sr-only">next image</span>
						</Button>
					) : (
						<div />
					)}
					<DialogPrimitive.Close asChild>
						<Button
							variant="destructive"
							size="icon"
							className="absolute right-4 top-4 col-start-2 col-end-3 rounded-full"
						>
							<Icon name="x" />
							<span className="sr-only">close</span>
						</Button>
					</DialogPrimitive.Close>
				</DialogPrimitive.DialogContent>
			</DialogPrimitive.Portal>
		</DialogPrimitive.Dialog>
	)
}
