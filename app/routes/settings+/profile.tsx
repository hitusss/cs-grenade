import { data, Link, Outlet, useMatches } from 'react-router'
import { invariantResponse } from '@epic-web/invariant'
import { type SEOHandle } from '@nasa-gcn/remix-seo'
import { z } from 'zod'

import { getUser } from '#app/models/index.server.ts'
import { requireUserId } from '#app/utils/auth.server.ts'
import { cn } from '#app/utils/misc.tsx'
import { useUser } from '#app/utils/user.ts'
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbSeparator,
} from '#app/components/ui/breadcrumb.tsx'
import { Icon } from '#app/components/ui/icon.tsx'

import { type Route } from './+types/profile.ts'

export const BreadcrumbHandle = z.object({ breadcrumb: z.any() })
export type BreadcrumbHandle = z.infer<typeof BreadcrumbHandle>

export const handle: BreadcrumbHandle & SEOHandle = {
	breadcrumb: <Icon name="file-text">Edit Profile</Icon>,
	getSitemapEntries: () => null,
}

export async function loader({ request }: Route.LoaderArgs) {
	const userId = await requireUserId(request)
	const user = await getUser(userId)
	invariantResponse(user, 'User not found', { status: 404 })
	return data({})
}

const BreadcrumbHandleMatch = z.object({
	handle: BreadcrumbHandle,
})

export default function SettingsProfileRoute() {
	const user = useUser()
	const matches = useMatches()
	const breadcrumbs = matches
		.map((m) => {
			const result = BreadcrumbHandleMatch.safeParse(m)
			if (!result.success || !result.data.handle.breadcrumb) return null
			return (
				<Link key={m.id} to={m.pathname} className="flex items-center">
					{result.data.handle.breadcrumb}
				</Link>
			)
		})
		.filter(Boolean)

	return (
		<div className="m-auto mt-16 mb-24 max-w-3xl">
			<div className="container">
				<Breadcrumb>
					<BreadcrumbList>
						<BreadcrumbItem>
							<BreadcrumbLink asChild>
								<Link
									className="text-muted-foreground"
									to={`/users/${user.username}`}
								>
									Profile
								</Link>
							</BreadcrumbLink>
						</BreadcrumbItem>
						{breadcrumbs.map((breadcrumb, i, arr) => (
							<>
								<BreadcrumbSeparator />
								<BreadcrumbItem>
									<BreadcrumbLink
										className={cn({
											'text-foreground': i === arr.length - 1,
										})}
										asChild
									>
										{breadcrumb}
									</BreadcrumbLink>
								</BreadcrumbItem>
							</>
						))}
					</BreadcrumbList>
				</Breadcrumb>
			</div>
			<main className="bg-muted mx-auto mt-16 px-6 py-8 md:container md:rounded-3xl">
				<Outlet />
			</main>
		</div>
	)
}
