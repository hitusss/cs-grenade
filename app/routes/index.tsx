import { Link, useRouteLoaderData } from 'react-router'

import { userHasPermission } from '#app/utils/permissions.ts'
import { useOptionalUser } from '#app/utils/user.ts'
import { Button } from '#app/components/ui/button.tsx'
import MapsList from '#app/components/maps-list.tsx'
import { type loader as rootLoader } from '#app/root.tsx'

export default function IndexRoute() {
	const data = useRouteLoaderData<typeof rootLoader>('root')

	const user = useOptionalUser()
	const hasCreateMapPermission = userHasPermission(user, 'create:map')

	const activeMaps =
		data?.maps
			.filter((map) => map.isActive)
			.map((map) => ({
				name: map.name,
				label: map.label,
				isActive: true,
				imageId: map.image?.id,
				logoId: map.logo?.id,
			})) || []
	const inactiveMaps =
		data?.maps
			.filter((map) => !map.isActive)
			.map((map) => ({
				name: map.name,
				label: map.label,
				isActive: false,
				imageId: map.image?.id,
				logoId: map.logo?.id,
			})) || []

	return (
		<main className="container py-8">
			<div className="flex items-center justify-between">
				<h1>Maps</h1>
				{hasCreateMapPermission ? (
					<Button asChild>
						<Link to="/map/new">Create map</Link>
					</Button>
				) : null}
			</div>
			<MapsList maps={activeMaps} />

			{inactiveMaps.length > 0 ? (
				<>
					<h2 className="mt-12">Inactive maps</h2>
					<MapsList maps={inactiveMaps} />
				</>
			) : null}
		</main>
	)
}
