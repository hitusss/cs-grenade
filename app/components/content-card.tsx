import { cn } from '#app/utils/misc.tsx'

import { Card, CardFooter, CardHeader } from './ui/card.tsx'

type ContentCardProps = {
	name: string
	verified?: boolean
	fields: {
		label: string
		img?: string
		value: string
	}[]
}

export function ContentCard({
	name,
	verified = true,
	fields,
}: ContentCardProps) {
	return (
		<Card
			variant={verified ? 'default' : 'muted'}
			size="lg"
			className="flex flex-col justify-between break-words"
		>
			<CardHeader>
				<p className="text-body-sm">Name</p>
				<p className="text-h5">{name}</p>
				{verified ? null : (
					<p className="text-body-sm font-thin italic">Waiting for accept</p>
				)}
			</CardHeader>
			<CardFooter className="flex-col items-start">
				{fields.map((f) => (
					<div
						key={f.label}
						className="flex w-full flex-wrap items-center justify-between gap-1"
					>
						<p className="text-body-xs">{f.label}</p>
						<div className="flex items-center gap-1">
							{f.img ? (
								<img
									src={f.img}
									alt=""
									className={cn('size-4', !verified && 'opacity-75')}
								/>
							) : null}
							<p className="text-body-xs font-semibold">{f.value}</p>
						</div>
					</div>
				))}
			</CardFooter>
		</Card>
	)
}
