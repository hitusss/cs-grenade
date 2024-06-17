import { Link } from '@remix-run/react'

import { userHasPermission } from '#app/utils/permissions.ts'
import { useOptionalUser } from '#app/utils/user.ts'
import { Button } from '#app/components/ui/button.tsx'

export default function MapRoute() {
	const user = useOptionalUser()
	const hasCreateDestinationPermission = userHasPermission(
		user,
		'create:destination',
	)

	return (
		<>
			{user ? (
				<Button className="absolute bottom-0 right-0 z-10" asChild>
					<Link to="new">
						{hasCreateDestinationPermission ? 'Create' : 'Request'} new
						destination
					</Link>
				</Button>
			) : null}
		</>
	)
}
