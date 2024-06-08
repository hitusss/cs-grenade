import { Link } from '@remix-run/react'

import { userHasPermission } from '#app/utils/permissions.ts'
import { useOptionalUser } from '#app/utils/user.ts'
import { Button } from '#app/components/ui/button.tsx'

export default function MapPage() {
	const user = useOptionalUser()
	const hasPermission = userHasPermission(user, 'create:destination')
	console.log(user, hasPermission)
	return (
		<>
			{user ? (
				<Button className="absolute bottom-0 right-0 z-10" asChild>
					<Link to="new">
						{hasPermission ? 'Create' : 'Request'} new destination
					</Link>
				</Button>
			) : null}
		</>
	)
}
