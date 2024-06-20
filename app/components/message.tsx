import { cn } from '#app/utils/misc.tsx'
import { getUserImgSrc } from '#app/utils/user.js'

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
		image: {
			id: string
		} | null
	}
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
			className={cn('flex max-w-[80%] shrink-0 flex-col', {
				'self-end': align === 'end',
			})}
		>
			<div className="flex gap-2">
				<img
					className={cn('size-7 self-end rounded-full object-cover', {
						'order-2': align === 'end',
					})}
					alt={user.username}
					src={getUserImgSrc(user.image?.id)}
				/>
				<div className="flex-1 overflow-hidden drop-shadow-md">
					<p
						className={cn('px-2 text-body-xs font-semibold', {
							'text-end': align === 'end',
						})}
					>
						{user.username}
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
					className={cn('mt-1 text-body-xs', {
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
