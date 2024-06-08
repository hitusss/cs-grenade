import { Link } from '@remix-run/react'

import { Button } from './ui/button.tsx'

export function MapNav({
	label,
	items,
	currentValue,
}: {
	label: string
	items: Array<{
		value: string
		to: string
		label: string
		img: string
	}>
	currentValue: string
}) {
	return (
		<nav>
			<p className="text-caption pl-2">{label}</p>
			<ul className="flex gap-2 p-2 border rounded-md">
				{items.map(i => (
					<li key={i.value}>
						<Button
							asChild
							variant={i.value === currentValue ? 'default' : 'secondary'}
							size="icon"
						>
							<Link to={i.to}>
								<img src={i.img} alt={i.label} className="size-7" />
								<span className="sr-only">{i.label}</span>
							</Link>
						</Button>
					</li>
				))}
			</ul>
		</nav>
	)
}
