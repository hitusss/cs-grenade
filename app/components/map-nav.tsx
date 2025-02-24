import { Link } from 'react-router'

import { Button } from './ui/button.tsx'
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from './ui/tooltip.tsx'

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
		<nav aria-label={label}>
			<p className="pl-2 text-caption">{label}</p>
			<TooltipProvider>
				<ul className="flex gap-2 rounded-md border p-2">
					{items.map((i) => (
						<li key={i.value}>
							<Tooltip>
								<TooltipTrigger asChild>
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
								</TooltipTrigger>
								<TooltipContent side="bottom">{i.label}</TooltipContent>
							</Tooltip>
						</li>
					))}
				</ul>
			</TooltipProvider>
		</nav>
	)
}
