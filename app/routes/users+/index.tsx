import { json, redirect, type LoaderFunctionArgs } from '@remix-run/node'
import { Link, useLoaderData } from '@remix-run/react'
import { z } from 'zod'

import { prisma } from '#app/utils/db.server.ts'
import { cn, useDelayedIsPending } from '#app/utils/misc.tsx'
import { getUserDisplayName, getUserImgSrc } from '#app/utils/user.ts'
import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import { ErrorList } from '#app/components/forms.tsx'
import { SearchBar } from '#app/components/search-bar.tsx'

const UserSearchResultSchema = z.object({
	id: z.string(),
	username: z.string(),
	name: z.string().nullable(),
	imageId: z.string().nullable(),
})

const UserSearchResultsSchema = z.array(UserSearchResultSchema)

export async function loader({ request }: LoaderFunctionArgs) {
	const searchTerm = new URL(request.url).searchParams.get('search')
	if (searchTerm === '') {
		return redirect('/users')
	}

	const like = `%${searchTerm ?? ''}%`
	const rawUsers = await prisma.$queryRaw`
		SELECT User.id, User.username, User.name, UserImage.id AS imageId
		FROM User
		LEFT JOIN UserImage ON User.id = UserImage.userId
		WHERE User.username LIKE ${like}
		OR User.name LIKE ${like}
		ORDER BY (
			SELECT Grenade.updatedAt
			FROM Grenade
			WHERE Grenade.userId = User.id
			ORDER BY Grenade.updatedAt DESC
			LIMIT 1
		) DESC
		LIMIT 50
	`

	const result = UserSearchResultsSchema.safeParse(rawUsers)
	if (!result.success) {
		return json({ status: 'error', error: result.error.message } as const, {
			status: 400,
		})
	}
	return json({ status: 'idle', users: result.data } as const)
}

export default function UsersRoute() {
	const data = useLoaderData<typeof loader>()
	const isPending = useDelayedIsPending({
		formMethod: 'GET',
		formAction: '/users',
	})

	if (data.status === 'error') {
		console.error(data.error)
	}

	return (
		<main className="container mb-48 mt-36 flex flex-col items-center justify-center gap-6">
			<h1>CS-Grenade Users</h1>
			<div className="w-full max-w-[700px]">
				<SearchBar status={data.status} autoFocus autoSubmit />
			</div>
			<div>
				{data.status === 'idle' ? (
					data.users.length ? (
						<ul
							className={cn(
								'flex w-full flex-wrap items-center justify-center gap-4 delay-200',
								{ 'opacity-50': isPending },
							)}
						>
							{data.users.map((user) => (
								<li key={user.id}>
									<Link
										to={user.username}
										className="flex h-36 w-44 flex-col items-center justify-center rounded-lg bg-muted px-5 py-3"
									>
										<img
											alt={getUserDisplayName(user)}
											src={getUserImgSrc(user.imageId)}
											className="h-16 w-16 rounded-full"
										/>
										{user.name ? (
											<span className="w-full overflow-hidden text-ellipsis whitespace-nowrap text-center text-lg">
												{user.name}
											</span>
										) : null}
										<span className="w-full overflow-hidden text-ellipsis text-center text-muted-foreground">
											{user.username}
										</span>
									</Link>
								</li>
							))}
						</ul>
					) : (
						<p>No users found</p>
					)
				) : data.status === 'error' ? (
					<ErrorList errors={['There was an error parsing the results']} />
				) : null}
			</div>
		</main>
	)
}

export function ErrorBoundary() {
	return <GeneralErrorBoundary />
}
