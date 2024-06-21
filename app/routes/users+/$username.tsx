import { json, type LoaderFunctionArgs } from '@remix-run/node'
import {
	Form,
	Link,
	Outlet,
	useLoaderData,
	useLocation,
	useParams,
	type MetaFunction,
} from '@remix-run/react'
import { invariantResponse } from '@epic-web/invariant'

import { prisma } from '#app/utils/db.server.ts'
import { getUserImgSrc, useOptionalUser } from '#app/utils/user.ts'
import { Button } from '#app/components/ui/button.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'

export const meta: MetaFunction<typeof loader> = ({ data, params }) => {
	const displayName = data?.user.name ?? params.username
	return [
		{ title: `${displayName} | CS-Grenade` },
		{
			name: 'description',
			content: `Profile of ${displayName} on CS-Grenade`,
		},
	]
}

export async function loader({ params }: LoaderFunctionArgs) {
	const user = await prisma.user.findFirst({
		select: {
			id: true,
			name: true,
			username: true,
			createdAt: true,
			image: { select: { id: true } },
		},
		where: {
			username: params.username,
		},
	})

	invariantResponse(user, 'User not found', { status: 404 })

	return json({ user, userJoinedDisplay: user.createdAt.toLocaleDateString() })
}

export default function ProfileRoute() {
	const data = useLoaderData<typeof loader>()
	const params = useParams()
	const location = useLocation()
	const user = data.user
	const userDisplayName = user.name ?? user.username
	const loggedInUser = useOptionalUser()
	const isLoggedInUser = data.user.id === loggedInUser?.id

	return (
		<div className="container mb-48 mt-36 flex flex-col items-center justify-center">
			<div className="container flex flex-col items-center border rounded-lg p-12">
				<div className="relative w-52">
					<div className="absolute -top-40">
						<div className="relative">
							<img
								src={getUserImgSrc(data.user.image?.id)}
								alt={userDisplayName}
								className="h-52 w-52 rounded-full object-cover"
							/>
						</div>
					</div>
				</div>

				<div className="flex flex-col items-center mt-16">
					<div className="flex flex-wrap items-center justify-center gap-4">
						<h1 className="text-center">{userDisplayName}</h1>
					</div>
					<p className="mt-2 text-center text-muted-foreground">
						Joined {data.userJoinedDisplay}
					</p>
					{isLoggedInUser ? (
						<Form action="/logout" method="POST" className="mt-3">
							<Button type="submit" variant="link">
								<Icon name="log-out" className="scale-125 max-md:scale-150">
									Logout
								</Icon>
							</Button>
						</Form>
					) : null}
					<div className="mt-10 flex gap-4">
						{isLoggedInUser ? (
							<>
								<Button asChild>
									<Link to="/settings/profile" prefetch="intent">
										Edit profile
									</Link>
								</Button>
							</>
						) : null}
					</div>
				</div>

				<div className="mt-8 grid max-w-full grid-cols-[repeat(auto-fit,_minmax(8rem,_12rem))] justify-center rounded-md bg-secondary/40 backdrop-blur">
					<Button
						variant={
							location.pathname.endsWith('favorites') ? 'default' : 'ghost'
						}
						asChild
					>
						<Link to="favorites" prefetch="intent">
							Favorites
						</Link>
					</Button>

					<Button
						variant={
							location.pathname.endsWith('grenades') ? 'default' : 'ghost'
						}
						asChild
					>
						<Link to="grenades" prefetch="intent">
							Grenades
						</Link>
					</Button>

					<Button
						variant={
							location.pathname.endsWith('destinations') ? 'default' : 'ghost'
						}
						asChild
					>
						<Link to="destinations" prefetch="intent">
							Destinations
						</Link>
					</Button>
				</div>
			</div>

			{!location.pathname.endsWith(params.username as string) ? (
				<div className="container grid border rounded-lg p-12 mt-2">
					<Outlet />
				</div>
			) : null}
		</div>
	)
}

export function ErrorBoundary() {
	return (
		<GeneralErrorBoundary
			statusHandlers={{
				404: ({ params }) => (
					<p>No user with the username "{params.username}" exists</p>
				),
			}}
		/>
	)
}
