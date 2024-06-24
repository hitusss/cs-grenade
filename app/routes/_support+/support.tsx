import { useEffect, useLayoutEffect, useState } from 'react'
import { json, type LoaderFunctionArgs } from '@remix-run/node'
import { Link, Outlet, useLoaderData, useLocation } from '@remix-run/react'

import { requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { cn } from '#app/utils/misc.tsx'
import { Button } from '#app/components/ui/button.tsx'
import { Icon } from '#app/components/ui/icon.tsx'

export async function loader({ request }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)

	const tickets = await prisma.ticket.findMany({
		where: {
			userId,
		},
		select: {
			id: true,
			title: true,
			open: true,
			messages: {
				where: {
					userId: {
						not: userId,
					},
					seen: false,
				},
				select: {
					id: true,
				},
			},
			updatedAt: true,
		},
		orderBy: {
			updatedAt: 'desc',
		},
	})

	return json({ tickets })
}

export default function MainSupportRoute() {
	const data = useLoaderData<typeof loader>()
	const location = useLocation()

	const [isOpen, setIsOpen] = useState(false)

	useLayoutEffect(() => {
		const lsValue = window.localStorage.getItem('support-sidebar')
		if (!lsValue) return setIsOpen(true)
		setIsOpen(lsValue === 'true')
	}, [])

	useEffect(() => {
		window.localStorage.setItem('support-sidebar', JSON.stringify(isOpen))
	}, [isOpen])

	return (
		<div className="container flex h-[90vh] py-4 lg:py-8">
			<div
				className={cn(
					'max-w-96 h-full px-4 border-r relative transition-all pt-12',
					isOpen ? 'w-[calc(100%)]' : 'w-12',
				)}
			>
				<Button
					size="icon"
					className="absolute top-2 right-2"
					onClick={() => setIsOpen((prev) => !prev)}
				>
					<Icon
						name="chevron-left"
						className={cn('transition', isOpen ? 'rotate-0' : 'rotate-180')}
					/>
					<span className="sr-only">{isOpen ? 'Close' : 'Open'} sidebar</span>
				</Button>
				<aside
					className={cn(
						'flex flex-col h-full gap-4 transition-all',
						isOpen ? 'w-[calc(100%)] opacity-100' : 'w-0 opacity-0 hidden',
					)}
					style={{
						transitionBehavior: 'allow-discrete',
					}}
				>
					<h1>Support</h1>
					<p className="text-caption mt-12">Tickets</p>
					<Button className="w-full" asChild>
						<Link to="new">
							<Icon name="plus"> New ticket </Icon>
						</Link>
					</Button>
					<ul className="flex flex-col gap-2 overflow-y-auto py-2">
						{data.tickets.map((ticket) => (
							<li key={ticket.id}>
								<Button
									variant={ticket.open ? 'default' : 'secondary'}
									className="w-full justify-start h-auto"
									asChild
								>
									<Link to={`${ticket.id}`}>
										<div className="flex flex-col gap-2 p-2 w-full">
											<div className="flex gap-2 justify-between">
												<p className="text-caption">{ticket.title}</p>
												{ticket.messages.length > 0 ? (
													<span className="mt-2 grid size-3 animate-pulse place-items-center rounded-full bg-destructive text-body-xs text-destructive-foreground" />
												) : null}
											</div>
											<div className="text-right">
												<p>Last activity:</p>
												<p>{new Date(ticket.updatedAt).toLocaleString()}</p>
											</div>
										</div>
									</Link>
								</Button>
							</li>
						))}
					</ul>
				</aside>
			</div>
			<div className="flex-1 w-full h-full grid">
				{location.pathname === '/support' ? (
					<div className="grid place-content-center w-full h-full">
						<p className="text-caption">
							Select any ticket to see the details.
						</p>
						<Button variant="link" asChild>
							<Link to="new">Or create a new ticket</Link>
						</Button>
					</div>
				) : null}
				<Outlet />
			</div>
		</div>
	)
}
