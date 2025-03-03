import { useEffect } from 'react'
import { data, Link, Outlet, useLocation, useRevalidator } from 'react-router'
import { useEventSource } from 'remix-utils/sse/react'

import { requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { useUser } from '#app/utils/user.ts'
import { Button } from '#app/components/ui/button.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import {
	Sidebar,
	SidebarContent,
	SidebarGroup,
	SidebarGroupAction,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarProvider,
	SidebarSeparator,
	SidebarTrigger,
} from '#app/components/ui/sidebar.tsx'

import { type Route } from './+types/_layout.ts'

export async function loader({ request }: Route.LoaderArgs) {
	const userId = await requireUserId(request)

	const tickets = await prisma.ticket.findMany({
		where: {
			userId,
		},
		select: {
			_count: {
				select: {
					messages: {
						where: {
							isAdmin: true,
							seen: false,
						},
					},
				},
			},
			id: true,
			title: true,
			open: true,
			updatedAt: true,
		},
		orderBy: {
			updatedAt: 'desc',
		},
	})

	return data({ tickets })
}

export default function SupportRoute({ loaderData }: Route.ComponentProps) {
	const location = useLocation()
	const { revalidate } = useRevalidator()

	const user = useUser()
	const shouldRevalidate = useEventSource(`/events/support/${user.id}`)

	useEffect(() => {
		void revalidate()
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [shouldRevalidate])

	return (
		<SidebarProvider className="container my-2 h-[90vh] min-h-[90vh] overflow-hidden rounded-lg border p-0 lg:my-4">
			<div className="relative">
				<Sidebar variant="floating" className="absolute top-0 h-full p-0">
					<SidebarHeader>
						<h1 className="text-center">Support</h1>
					</SidebarHeader>

					<SidebarSeparator />
					<SidebarContent>
						<SidebarGroup>
							<SidebarGroupLabel>Tickets</SidebarGroupLabel>
							<SidebarGroupAction asChild>
								<Link to="new">
									<Icon name="plus" />
									<span className="sr-only">Create new ticket</span>
								</Link>
							</SidebarGroupAction>
							<SidebarGroupContent>
								<SidebarMenu>
									{loaderData.tickets.map((ticket) => (
										<SidebarMenuItem key={ticket.id}>
											<SidebarMenuButton
												isActive={location.pathname === `/support/${ticket.id}`}
												className="h-auto"
												asChild
											>
												<Link to={`${ticket.id}`}>
													<div className="flex w-full flex-col gap-2 p-2">
														<div className="flex justify-between gap-2">
															<p className="text-caption">{ticket.title}</p>
															{ticket._count.messages > 0 ? (
																<span className="bg-destructive text-destructive-foreground mt-2 grid size-3 animate-pulse place-items-center rounded-full text-sm" />
															) : null}
														</div>
														<div className="text-right">
															<p>Last activity:</p>
															<p>
																{new Date(ticket.updatedAt).toLocaleString()}
															</p>
														</div>
													</div>
												</Link>
											</SidebarMenuButton>
										</SidebarMenuItem>
									))}
								</SidebarMenu>
							</SidebarGroupContent>
						</SidebarGroup>
					</SidebarContent>
				</Sidebar>
			</div>
			<main className="grid h-full w-full flex-1 p-2">
				{location.pathname === '/support' ? (
					<div className="relative grid h-full w-full place-content-center">
						<SidebarTrigger className="absolute top-4 left-2" />
						<p className="text-caption">
							Select any ticket to see the details.
						</p>
						<Button variant="link" asChild>
							<Link to="new">Or create a new ticket</Link>
						</Button>
					</div>
				) : null}
				<Outlet />
			</main>
		</SidebarProvider>
	)
}
