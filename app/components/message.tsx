import { useEffect, useRef } from 'react'

import { cn } from '#app/utils/misc.tsx'
import { getUserDisplayName, getUserImgSrc } from '#app/utils/user.ts'

import { useLightbox } from './lightbox.tsx'

type MessageProps = {
	align?: 'start' | 'end'
	message: string
	images: {
		id: string
	}[]
	user: {
		id: string
		username: string
		name: string | null
		image: {
			id: string
		} | null
	} | null
	date?: Date
}

export function Message({
	align = 'start',
	message,
	images,
	user,
	date,
}: MessageProps) {
	const { openLightbox } = useLightbox()

	const ligthboxImages = images.map((img) => ({
		src: `/resources/ticket-images/${img.id}`,
	}))

	return (
		<div
			className={cn(
				'flex w-auto max-w-[95%] shrink-0 flex-col sm:max-w-[80%]',
				{
					'self-start': align === 'start',
					'self-end': align === 'end',
				},
			)}
		>
			<div className="flex gap-2">
				<img
					className={cn('size-7 self-end rounded-full object-cover', {
						'order-2': align === 'end',
					})}
					alt={getUserDisplayName(user)}
					src={getUserImgSrc(user?.image?.id)}
				/>
				<div className="flex-1 overflow-hidden drop-shadow-md">
					<p
						className={cn('px-2 text-sm font-semibold', {
							'text-end': align === 'end',
						})}
					>
						{getUserDisplayName(user)}
					</p>
					<div className="max-w-full break-words rounded-md bg-secondary px-6 py-3 text-secondary-foreground">
						{message}
						<ul className="mt-1 flex flex-wrap gap-2 px-1">
							{images.map((img, index) => (
								<li key={img.id}>
									<img
										src={`/resources/ticket-images/${img.id}`}
										alt=""
										className="size-16 object-cover"
										onClick={() =>
											openLightbox({
												index,
												images: ligthboxImages,
											})
										}
									/>
								</li>
							))}
						</ul>
					</div>
				</div>
			</div>
			{date ? (
				<span
					className={cn('mt-1 text-sm', {
						'self-end pr-12': align === 'end',
						'pl-12': align === 'start',
					})}
				>
					{date.toLocaleString()}
				</span>
			) : null}
		</div>
	)
}

export function MessageContainer({
	children,
	messagesCount,
}: {
	children: React.ReactNode
	messagesCount: number
}) {
	const messagesContainer = useRef<HTMLDivElement>(null)

	useEffect(() => {
		if (!messagesContainer.current) return
		messagesContainer.current.scrollTop = messagesContainer.current.scrollHeight
	}, [])

	useEffect(() => {
		if (!messagesContainer.current) return

		if (
			messagesContainer.current.scrollHeight -
				messagesContainer.current.clientHeight -
				messagesContainer.current.scrollTop <
			128
		) {
			messagesContainer.current.scrollTop =
				messagesContainer.current.scrollHeight
		}
	}, [messagesCount])

	return (
		<div
			ref={messagesContainer}
			className="flex flex-1 flex-col gap-2 overflow-y-auto overscroll-contain"
		>
			{children}
		</div>
	)
}
