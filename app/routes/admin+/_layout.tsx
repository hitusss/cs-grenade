import { json, type LoaderFunctionArgs } from '@remix-run/node'
import { Link, Outlet, useLocation } from '@remix-run/react'
import { type SEOHandle } from '@nasa-gcn/remix-seo'

import { requireUserWithPermission } from '#app/utils/permissions.server.ts'
import { userHasPermission } from '#app/utils/permissions.ts'
import { useUser } from '#app/utils/user.js'
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from '#app/components/ui/collapsible.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import {
	Sidebar,
	SidebarContent,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
	SidebarProvider,
	SidebarRail,
	SidebarSeparator,
} from '#app/components/ui/sidebar.tsx'

type NavGroup = {
	title: string
	items: NavItem[]
}

type NavItem = {
	title: string
	to: string
	isActive?: boolean
	permission?: boolean
}

export const handle: SEOHandle = {
	getSitemapEntries: () => null,
}

export async function loader({ request }: LoaderFunctionArgs) {
	await requireUserWithPermission(request, 'read:admin:any')
	return json({})
}

export default function AdminLayout() {
	const location = useLocation()

	const user = useUser()

	const hasReadUserAnyPermission = userHasPermission(user, 'read:user:any')
	const hasReadSupportAnyPermission = userHasPermission(
		user,
		'read:support:any',
	)
	const hasReadReportAnyPermission = userHasPermission(user, 'read:report:any')
	const hasReadReviewDestinationRequestAnyPermission = userHasPermission(
		user,
		'read:review-destination-request:any',
	)
	const hasReadReviewGrenadeRequestAnyPermission = userHasPermission(
		user,
		'read:review-grenade-request:any',
	)
	const hasReadCacheAnyPermission = userHasPermission(user, 'read:cache:any')

	const nav: NavGroup[] = [
		{
			title: 'Users',
			items: [
				{
					title: 'Users',
					to: 'users',
					isActive: location.pathname === '/admin/users',
					permission: hasReadUserAnyPermission,
				},
			],
		},
		{
			title: 'Content',
			items: [
				{
					title: 'Maps',
					to: 'content/maps',
					isActive: location.pathname === '/admin/content/maps',
				},
				{
					title: 'Destinations',
					to: 'content/destinations',
					isActive: location.pathname === '/admin/content/destinations',
				},
				{
					title: 'Grenades',
					to: 'content/grenades',
					isActive: location.pathname === '/admin/content/grenades',
				},
			],
		},
		{
			title: 'Support',
			items: [
				{
					title: 'Support',
					to: 'support',
					isActive: /\/admin\/support/.test(location.pathname),
					permission: hasReadSupportAnyPermission,
				},
			],
		},
		{
			title: 'Reports',
			items: [
				{
					title: 'Destinations',
					to: 'reports/destinations',
					isActive: location.pathname === '/amidn/reports/destinations',
					permission: hasReadReportAnyPermission,
				},
				{
					title: 'Grenades',
					to: 'reports/grenades',
					isActive: location.pathname === '/amidn/reports/grenades',
					permission: hasReadReportAnyPermission,
				},
			],
		},
		{
			title: 'Requests',
			items: [
				{
					title: 'Destinations',
					to: 'requests/destinations',
					isActive: location.pathname === '/admin/requests/destinations',
					permission: hasReadReviewDestinationRequestAnyPermission,
				},
				{
					title: 'Destinations Changes',
					to: 'requests/destinations-changes',
					isActive:
						location.pathname === '/admin/requests/destinations-changes',
					permission: hasReadReviewDestinationRequestAnyPermission,
				},
				{
					title: 'Grenades',
					to: 'requests/grenades',
					isActive: location.pathname === '/admin/requests/grenades',
					permission: hasReadReviewGrenadeRequestAnyPermission,
				},
				{
					title: 'Grenades Changes',
					to: 'requests/grenades-changes',
					isActive: location.pathname === '/admin/requests/grenades-changes',
					permission: hasReadReviewGrenadeRequestAnyPermission,
				},
			],
		},
		{
			title: 'Cache',
			items: [
				{
					title: 'Cache',
					to: 'cache',
					isActive: location.pathname === '/admin/cache',
					permission: hasReadCacheAnyPermission,
				},
			],
		},
	]

	return (
		<SidebarProvider className="container my-2 h-[90vh] min-h-[90vh] overflow-hidden rounded-lg border p-0 lg:my-4">
			<div className="relative">
				<Sidebar variant="floating" className="absolute top-0 h-full p-0">
					<SidebarHeader>
						<h1 className="text-center">Admin</h1>
					</SidebarHeader>
					<SidebarSeparator />
					<SidebarContent className="mt-6">
						<SidebarMenu>
							{nav.map((group) => (
								<SidebarNavGroup key={group.title} group={group} />
							))}
						</SidebarMenu>
					</SidebarContent>
					<SidebarRail />
				</Sidebar>
			</div>
			<main className="flex h-full w-full flex-col gap-4 p-4 md:p-8">
				<Outlet />
			</main>
		</SidebarProvider>
	)
}

function SidebarNavGroup({ group }: { group: NavGroup }) {
	const filteredItems = group.items.filter((i) =>
		i.permission !== undefined ? i.permission : true,
	)

	if (filteredItems.length === 0) {
		return null
	}

	return (
		<Collapsible defaultOpen className="group/collapsible" asChild>
			<SidebarMenuItem>
				<CollapsibleTrigger asChild>
					<SidebarMenuButton tooltip={group.title}>
						{group.title}
						<Icon
							name="chevron-right"
							className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90"
						/>
					</SidebarMenuButton>
				</CollapsibleTrigger>
				<CollapsibleContent>
					<SidebarMenuSub>
						{filteredItems.map((item) => (
							<SidebarMenuSubItem key={item.to}>
								<SidebarMenuSubButton isActive={item.isActive} asChild>
									<Link to={item.to}>{item.title}</Link>
								</SidebarMenuSubButton>
							</SidebarMenuSubItem>
						))}
					</SidebarMenuSub>
				</CollapsibleContent>
			</SidebarMenuItem>
		</Collapsible>
	)
}
