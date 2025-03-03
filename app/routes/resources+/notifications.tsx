import { useEffect, useRef } from 'react'
import { data, Link, useFetcher, useSubmit } from 'react-router'
import { useEventSource } from 'remix-utils/sse/react'

import { getUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { cn } from '#app/utils/misc.tsx'
import { useUser } from '#app/utils/user.ts'
import { Button } from '#app/components/ui/button.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '#app/components/ui/popover.tsx'

import { type Route } from './+types/notifications.ts'

export async function loader({ request }: Route.LoaderArgs) {
	const userId = await getUserId(request)
	if (!userId) {
		return data({ notifications: [] })
	}
	const notifications = await prisma.notification.findMany({
		where: {
			userId,
		},
		select: {
			id: true,
			title: true,
			description: true,
			redirectTo: true,
			seen: true,
			createdAt: true,
		},
		orderBy: {
			createdAt: 'desc',
		},
	})
	return data({ notifications })
}

export function Notifications() {
	const fetcher = useFetcher<typeof loader>()
	const user = useUser()
	const shouldRevalidate = useEventSource(`/events/notifications/${user.id}`)

	useEffect(() => {
		void fetcher.load('/resources/notifications')
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [shouldRevalidate])

	if (!fetcher.data) return null

	const notifications = fetcher.data.notifications

	const notificationCount = notifications.filter((n) => !n.seen).length

	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					className="relative"
					aria-label={`Notifications ${notificationCount > 0 ? `(${notificationCount} unread)` : ''}`}
				>
					<Icon name="bell" />
					{notificationCount > 0 ? (
						<span
							className="bg-destructive text-destructive-foreground absolute top-0 right-0 grid size-5 place-items-center rounded-full text-xs"
							aria-hidden="true"
						>
							{notificationCount >= 10 ? '9+' : notificationCount}
						</span>
					) : null}
				</Button>
			</PopoverTrigger>
			<PopoverContent
				className="w-screen max-w-xl p-0"
				aria-label="Notifications"
			>
				<ul
					className="flex max-h-[50vh] min-h-[25vh] flex-col gap-1 overflow-y-auto p-1"
					aria-live="polite"
				>
					{notifications.length > 0 ? (
						notifications.map((notification) => (
							<Notification
								key={notification.id}
								id={notification.id}
								title={notification.title}
								description={notification.description}
								redirectTo={notification.redirectTo}
								seen={notification.seen}
								createdAt={notification.createdAt}
							/>
						))
					) : (
						<div className="text-muted-foreground grid flex-1 place-items-center text-xl">
							You don't have any notification
						</div>
					)}
				</ul>
			</PopoverContent>
		</Popover>
	)
}

function Notification({
	id,
	title,
	description,
	redirectTo,
	seen,
	createdAt,
}: {
	id: string
	title: string
	description: string | null
	redirectTo: string | null
	seen: boolean
	createdAt: Date
}) {
	const submit = useSubmit()
	const ref = useRef<HTMLLIElement>(null)
	const date = new Date(createdAt)

	useEffect(() => {
		if (seen) return
		if (!ref.current) return
		const notificationElement = ref.current

		const observer = new IntersectionObserver(
			(e) => {
				if (e[0]?.isIntersecting) {
					observer.unobserve(notificationElement)
					void submit(
						{
							intent: 'seen',
						},
						{
							method: 'POST',
							action: `/resources/notifications/${id}`,
							navigate: false,
						},
					)
				}
			},
			{
				threshold: 1.0,
			},
		)
		observer.observe(notificationElement)
		return () => observer.unobserve(notificationElement)
	}, [id, redirectTo, seen, submit])

	return (
		<li
			ref={ref}
			className={cn(
				'relative isolate rounded-md px-5 py-3 shadow-md select-none',
				seen
					? 'bg-muted text-muted-foreground'
					: 'bg-background text-foreground',
			)}
			aria-label={`${title} ${seen ? '(read)' : '(unread)'}`}
		>
			<p className="text-caption">{title}</p>
			<p>{description}</p>
			{redirectTo ? (
				<Button variant="link" asChild className="px-0">
					<Link to={redirectTo}>
						<Icon name="arrow-left" className="scale-125">
							Go to {title}
						</Icon>
					</Link>
				</Button>
			) : null}
			<p className="mt-2 text-right text-sm">{date.toLocaleString()}</p>

			<Button
				size="icon"
				variant="ghost"
				className="absolute top-1 right-1 z-10"
				onClick={() => {
					void submit(
						{
							intent: 'delete',
						},
						{
							method: 'POST',
							action: `/resources/notifications/${id}`,
							navigate: false,
						},
					)
				}}
			>
				<Icon name="trash" />
				<span className="sr-only">delete notification</span>
			</Button>
		</li>
	)
}
