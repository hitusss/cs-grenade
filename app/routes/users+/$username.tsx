import {
	data,
	Form,
	Link,
	Outlet,
	useLoaderData,
	useLocation,
	useParams,
	type LoaderFunctionArgs,
} from 'react-router'
import { invariantResponse } from '@epic-web/invariant'

import { prisma } from '#app/utils/db.server.ts'
import {
	getUserDisplayName,
	getUserImgSrc,
	useOptionalUser,
} from '#app/utils/user.ts'
import { Button } from '#app/components/ui/button.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import {
	ErrorComponent,
	GeneralErrorBoundary,
} from '#app/components/error-boundary.tsx'

import { type Route } from './+types/$username.ts'

export const meta: Route.MetaFunction = ({ data, params }) => {
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

	return data({ user, userJoinedDisplay: user.createdAt.toLocaleDateString() })
}

export default function ProfileRoute() {
	const loaderData = useLoaderData<typeof loader>()
	const params = useParams()
	const location = useLocation()
	const loggedInUser = useOptionalUser()
	const isLoggedInUser = loaderData.user.id === loggedInUser?.id

	return (
		<main className="container mb-48 mt-36 flex flex-col items-center justify-center">
			<div className="container flex flex-col items-center rounded-lg border p-12">
				<div className="relative w-52">
					<div className="absolute -top-40">
						<div className="relative">
							<img
								src={getUserImgSrc(loaderData.user.image?.id)}
								alt={getUserDisplayName(loaderData.user)}
								className="h-52 w-52 rounded-full object-cover"
							/>
						</div>
					</div>
				</div>

				<div className="mt-16 flex flex-col items-center">
					<div className="flex flex-wrap items-center justify-center gap-4">
						<h1 className="text-center">
							{getUserDisplayName(loaderData.user)}
						</h1>
					</div>
					<p className="mt-2 text-center text-muted-foreground">
						Joined {loaderData.userJoinedDisplay}
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

				<div className="mt-8 grid max-w-full grid-cols-[repeat(auto-fit,minmax(8rem,12rem))] justify-center rounded-md bg-secondary/40 backdrop-blur-sm">
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
				<div className="container mt-2 grid rounded-lg border p-12">
					<Outlet />
				</div>
			) : null}
		</main>
	)
}

export function ErrorBoundary() {
	return (
		<GeneralErrorBoundary
			statusHandlers={{
				404: ({ params }) => (
					<ErrorComponent
						error={`No user with the username "${params.username}" exists`}
					/>
				),
			}}
		/>
	)
}
