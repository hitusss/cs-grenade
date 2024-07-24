import { useEffect, useRef } from 'react'
import { json, type LoaderFunctionArgs } from '@remix-run/node'
import { Link, useFetcher, useSubmit } from '@remix-run/react'
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

export async function loader({ request }: LoaderFunctionArgs) {
	const userId = await getUserId(request)
	if (!userId) {
		return json({ notifications: [] })
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
	return json({ notifications })
}

export function Notifications() {
	const fetcher = useFetcher<typeof loader>()
	const user = useUser()
	const shouldRevalidate = useEventSource(`/events/notifications/${user.id}`)

	useEffect(() => {
		fetcher.load('/resources/notifications')
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [shouldRevalidate])

	if (!fetcher.data) return null

	const notifications = fetcher.data.notifications

	const notificationCount = notifications.filter((n) => !n.seen).length

	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button variant="ghost" size="icon" className="relative">
					<Icon name="bell" />
					{notificationCount > 0 ? (
						<span className="absolute right-0 top-0 grid size-5 place-items-center rounded-full bg-destructive text-body-2xs text-destructive-foreground">
							{notificationCount >= 10 ? '9+' : notificationCount}
						</span>
					) : null}
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-screen max-w-xl p-0">
				<ul className="flex max-h-[50vh] min-h-[25vh] flex-col gap-1 overflow-y-auto p-1">
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
						<div className="grid flex-1 place-items-center text-body-lg text-muted-foreground">
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
	createdAt: string
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
					submit(
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
				'relative isolate select-none rounded-md px-5 py-3 shadow-md',
				seen
					? 'bg-muted text-muted-foreground'
					: 'bg-background text-foreground',
			)}
		>
			<p className="text-caption">{title}</p>
			<p className="text-body-sm">{description}</p>
			{redirectTo ? (
				<Button variant="link" asChild className="px-0">
					<Link to={redirectTo}>
						<Icon name="arrow-left" className="scale-125">
							Go to {title}
						</Icon>
					</Link>
				</Button>
			) : null}
			<p className="mt-2 text-right text-body-xs">{date.toLocaleString()}</p>

			<Button
				size="icon"
				variant="ghost"
				className="absolute right-1 top-1 z-10"
				onClick={() => {
					submit(
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
