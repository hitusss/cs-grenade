import * as React from 'react'
import { useSpinDelay } from 'spin-delay'

import { cn } from '#app/utils/misc.tsx'

import { Button } from './button.tsx'
import { Icon } from './icon.tsx'
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from './tooltip.tsx'

function StatusButton({
	message,
	status,
	className,
	children,
	spinDelay,
	...props
}: React.ComponentProps<typeof Button> & {
	status: 'pending' | 'success' | 'error' | 'idle'
	message?: string | null
	spinDelay?: Parameters<typeof useSpinDelay>[1]
}) {
	const delayedPending = useSpinDelay(status === 'pending', {
		delay: 400,
		minDuration: 300,
		...spinDelay,
	})
	const companion = {
		pending: delayedPending ? (
			<div
				role="status"
				className="inline-flex h-6 w-6 items-center justify-center"
			>
				<Icon name="refresh-cw" className="animate-spin" title="loading" />
			</div>
		) : null,
		success: (
			<div
				role="status"
				className="inline-flex h-6 w-6 items-center justify-center"
			>
				<Icon name="check" title="success" />
			</div>
		),
		error: (
			<div
				role="status"
				className="bg-destructive inline-flex h-6 w-6 items-center justify-center rounded-full"
			>
				<Icon name="x" className="text-destructive-foreground" title="error" />
			</div>
		),
		idle: null,
	}[status]

	return (
		<Button className={cn('flex justify-center gap-4', className)} {...props}>
			<div>{children}</div>
			{message ? (
				<TooltipProvider>
					<Tooltip>
						<TooltipTrigger>{companion}</TooltipTrigger>
						<TooltipContent>{message}</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			) : (
				companion
			)}
		</Button>
	)
}

export { StatusButton }
