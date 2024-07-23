import { useEffect, useState } from 'react'
import { json, type LoaderFunctionArgs } from '@remix-run/node'
import { Link, Outlet, useLocation } from '@remix-run/react'

import { cn } from '#app/utils/misc.tsx'
import { requireUserWithPermission } from '#app/utils/permissions.server.ts'
import { userHasPermission } from '#app/utils/permissions.ts'
import { useUser } from '#app/utils/user.js'
import { Button } from '#app/components/ui/button.tsx'
import { Icon } from '#app/components/ui/icon.tsx'

export async function loader({ request }: LoaderFunctionArgs) {
	await requireUserWithPermission(request, 'read:admin:any')
	return json({})
}

export default function AdminLayout() {
	const location = useLocation()
	const [isOpen, setIsOpen] = useState(false)

	const user = useUser()

	const hasReadUserAnyPermission = userHasPermission(user, 'read:user:any')
	const hasReadSupportAnyPermission = userHasPermission(
		user,
		'read:support:any',
	)
	const hasReadReviewDestinationRequestAnyPermission = userHasPermission(
		user,
		'read:review-destination-request:any',
	)
	const hasReadReviewGrenadeRequestAnyPermission = userHasPermission(
		user,
		'read:review-grenade-request:any',
	)
	const hasReadCacheAnyPermission = userHasPermission(user, 'read:cache:any')

	useEffect(() => {
		const lsValue = window.localStorage.getItem('admin-sidebar')
		if (!lsValue) return setIsOpen(true)
		setIsOpen(lsValue === 'true')
	}, [])

	useEffect(() => {
		window.localStorage.setItem('admin-sidebar', JSON.stringify(isOpen))
	}, [isOpen])

	return (
		<div className="container flex h-[90vh] py-4 lg:py-8">
			<div
				className={cn(
					'relative h-full max-w-72 border-r px-4 pt-12 transition-all',
					isOpen ? 'w-[calc(100%)]' : 'w-12',
				)}
			>
				<Button
					size="icon"
					className="absolute right-2 top-2"
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
						'flex h-full flex-col gap-4 transition-all',
						isOpen ? 'w-[calc(100%)] opacity-100' : 'hidden w-0 opacity-0',
					)}
					style={{
						transitionBehavior: 'allow-discrete',
					}}
				>
					<h1>Admin</h1>
					<ul className="mt-6 flex h-full flex-col justify-center gap-4 overflow-y-auto">
						{/* Users	 */}
						<SidebarGroup title="Users" permission={hasReadUserAnyPermission}>
							<SidebarLink
								to="users"
								isActive={location.pathname === '/admin/users'}
							>
								Users
							</SidebarLink>
						</SidebarGroup>
						{/* Content */}
						<SidebarGroup title="Content">
							<SidebarLink
								to="content/maps"
								isActive={location.pathname === '/admin/content/maps'}
							>
								Maps
							</SidebarLink>
							<SidebarLink
								to="content/destinations"
								isActive={location.pathname === '/admin/content/destinations'}
							>
								Destinations
							</SidebarLink>
							<SidebarLink
								to="content/grenades"
								isActive={location.pathname === '/admin/content/grenades'}
							>
								Grenades
							</SidebarLink>
						</SidebarGroup>
						{/* Support */}
						<SidebarGroup
							title="Support"
							permission={hasReadSupportAnyPermission}
						>
							<SidebarLink
								to="support"
								isActive={/\/admin\/support/.test(location.pathname)}
							>
								Support
							</SidebarLink>
						</SidebarGroup>
						{/* Requests */}
						<SidebarGroup
							title="Requests"
							permission={
								hasReadReviewDestinationRequestAnyPermission ||
								hasReadReviewGrenadeRequestAnyPermission
							}
						>
							<SidebarLink
								to="requests/destinations"
								isActive={location.pathname === '/admin/requests/destinations'}
								permission={hasReadReviewDestinationRequestAnyPermission}
							>
								Destinations
							</SidebarLink>
							<SidebarLink
								to="requests/destinations-changes"
								isActive={
									location.pathname === '/admin/requests/destinations-changes'
								}
								permission={hasReadReviewDestinationRequestAnyPermission}
							>
								Destinations Changes
							</SidebarLink>
							<SidebarLink
								to="requests/grenades"
								isActive={location.pathname === '/admin/requests/grenades'}
								permission={hasReadReviewGrenadeRequestAnyPermission}
							>
								Grenades
							</SidebarLink>
							<SidebarLink
								to="requests/grenades-changes"
								isActive={
									location.pathname === '/admin/requests/grenades-changes'
								}
								permission={hasReadReviewGrenadeRequestAnyPermission}
							>
								Grenades Changes
							</SidebarLink>
						</SidebarGroup>
						{/* Cache */}
						<SidebarGroup title="Cache" permission={hasReadCacheAnyPermission}>
							<SidebarLink
								to="cache"
								isActive={location.pathname === '/admin/cache'}
							>
								Cache
							</SidebarLink>
						</SidebarGroup>
					</ul>
				</aside>
			</div>
			<div className="grid h-full w-full flex-1 p-2 md:p-4 2xl:p-8">
				<div className="flex flex-col gap-8 overflow-hidden">
					<Outlet />
				</div>
			</div>
		</div>
	)
}

function SidebarGroup({
	permission = true,
	title,
	children,
}: {
	permission?: boolean
	title: string
	children: React.ReactNode
}) {
	if (!permission) return null
	return (
		<li>
			<p className="text-caption">{title}</p>
			<ul className="mt-1 space-y-2 px-1">{children}</ul>
		</li>
	)
}

function SidebarLink({
	permission = true,
	isActive = false,
	to,
	children,
}: {
	permission?: boolean
	isActive?: boolean
	to: string
	children: React.ReactNode
}) {
	if (!permission) return null
	return (
		<li>
			<Button
				variant={isActive ? 'default' : 'secondary'}
				className="w-full justify-start"
				asChild
			>
				<Link to={to}>{children}</Link>
			</Button>
		</li>
	)
}
