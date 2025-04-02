import { data, Link, redirect } from 'react-router'
import { z } from 'zod'

import { getFilteredUsersOrderedByLastGrenadeUpdate } from '#app/models/user.server.ts'
import { cn, useDelayedIsPending } from '#app/utils/misc.tsx'
import { getUserDisplayName, getUserImgSrc } from '#app/utils/user.ts'
import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import { ErrorList } from '#app/components/forms.tsx'
import { SearchBar } from '#app/components/search-bar.tsx'

import { type Route } from './+types/index.ts'

const UserSearchResultSchema = z.object({
	id: z.string(),
	username: z.string(),
	name: z.string().nullable(),
	imageId: z.string().nullable(),
})

const UserSearchResultsSchema = z.array(UserSearchResultSchema)

export async function loader({ request }: Route.LoaderArgs) {
	const searchTerm = new URL(request.url).searchParams.get('search')
	if (searchTerm === '') {
		return redirect('/users')
	}

	const query = searchTerm ?? ''
	const rawUsers = await getFilteredUsersOrderedByLastGrenadeUpdate(query)
	const result = UserSearchResultsSchema.safeParse(rawUsers)
	if (!result.success) {
		return data({ status: 'error', error: result.error.message } as const, {
			status: 400,
		})
	}
	return data({ status: 'idle', users: result.data } as const)
}

export default function UsersRoute({ loaderData }: Route.ComponentProps) {
	const isPending = useDelayedIsPending({
		formMethod: 'GET',
		formAction: '/users',
	})

	if (loaderData.status === 'error') {
		console.error(loaderData.error)
	}

	return (
		<main className="container mt-36 mb-48 flex flex-col items-center justify-center gap-6">
			<h1>CS-Grenade Users</h1>
			<div className="w-full max-w-[700px]">
				<SearchBar status={loaderData.status} autoFocus autoSubmit />
			</div>
			<div>
				{loaderData.status === 'idle' ? (
					loaderData.users.length ? (
						<ul
							className={cn(
								'flex w-full flex-wrap items-center justify-center gap-4 delay-200',
								{ 'opacity-50': isPending },
							)}
						>
							{loaderData.users.map((user) => (
								<li key={user.id}>
									<Link
										to={user.username}
										className="bg-muted flex h-36 w-44 flex-col items-center justify-center rounded-lg px-5 py-3"
									>
										<img
											alt={getUserDisplayName(user)}
											src={getUserImgSrc(user.imageId)}
											className="h-16 w-16 rounded-full"
										/>
										{user.name ? (
											<span className="w-full overflow-hidden text-center text-lg text-ellipsis whitespace-nowrap">
												{user.name}
											</span>
										) : null}
										<span className="text-muted-foreground w-full overflow-hidden text-center text-ellipsis">
											{user.username}
										</span>
									</Link>
								</li>
							))}
						</ul>
					) : (
						<p>No users found</p>
					)
				) : loaderData.status === 'error' ? (
					<ErrorList errors={['There was an error parsing the results']} />
				) : null}
			</div>
		</main>
	)
}

export function ErrorBoundary() {
	return <GeneralErrorBoundary />
}
