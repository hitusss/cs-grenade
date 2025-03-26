import { data, Form, Link } from 'react-router'
import { invariantResponse } from '@epic-web/invariant'

import {
	deleteDestination,
	getDestination,
	getDestinationUserId,
} from '#app/models/index.server.ts'
import { getUserId, requireUserId } from '#app/utils/auth.server.ts'
import { useDoubleCheck, useIsPending } from '#app/utils/misc.tsx'
import { unauthorized } from '#app/utils/permissions.server.ts'
import { userHasPermission } from '#app/utils/permissions.ts'
import { redirectWithToast } from '#app/utils/toast.server.ts'
import { useOptionalUser } from '#app/utils/user.ts'
import { Button } from '#app/components/ui/button.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { DestinationMarker } from '#app/components/destination-marker.tsx'
import { MapBackButton } from '#app/components/map.tsx'
import { ReportDialog } from '#app/routes/resources+/report.tsx'

import { type MapHandle } from '../../_layout.tsx'
import { type Route } from './+types/index.ts'

export const handle: MapHandle = {
	map: {
		currentDestination: true,
	},
}

export async function loader({ request, params }: Route.LoaderArgs) {
	const { destination: destinationId } = params

	const userId = await getUserId(request)

	const destination = await getDestination(destinationId)

	invariantResponse(destination, 'Not found', { status: 404 })

	if (!destination.verified && userId !== destination.userId) {
		throw unauthorized({
			message: 'You are not allowed to view this destination',
		})
	}

	return data({ destination })
}

export async function action({ request, params }: Route.ActionArgs) {
	const { destination: destinationId } = params
	const userId = await requireUserId(request)

	const destination = await getDestinationUserId(destinationId)

	invariantResponse(destination, 'Not found', { status: 404 })
	if (destination.userId !== userId) {
		throw unauthorized({
			message: 'You are not allowed to perform this action',
		})
	}

	await deleteDestination({ destinationId, verified: false })

	return await redirectWithToast(`..`, {
		title: `Destination request cancelled`,
		description: ``,
		type: 'success',
	})
}

export default function MapDestinationRoute({
	loaderData,
}: Route.ComponentProps) {
	const isPending = useIsPending()
	const cancelDC = useDoubleCheck()

	const user = useOptionalUser()
	const hasUpdateDestinationOwnPermission = userHasPermission(
		user,
		'update:destination:own',
	)
	const hasUpdateDestinationAnyPermission = userHasPermission(
		user,
		'update:destination:any',
	)

	const hasCreateGrenadePermission = userHasPermission(user, 'create:grenade')

	const isUserDestination = loaderData.destination.userId === user?.id
	const canEdit =
		hasUpdateDestinationAnyPermission ||
		(isUserDestination && hasUpdateDestinationOwnPermission)

	return (
		<>
			<MapBackButton />
			{!loaderData.destination.verified ? (
				<Form method="POST">
					<DestinationMarker
						to=""
						name=""
						coords={{
							x: loaderData.destination.x,
							y: loaderData.destination.y,
						}}
						highlight
						disabled
					/>
					<StatusButton
						variant="destructive"
						{...cancelDC.getButtonProps({
							type: 'submit',
							name: 'intent',
							value: 'cancel',
						})}
						className="absolute right-0 bottom-0 z-10"
						status={isPending ? 'pending' : 'idle'}
					>
						{cancelDC.doubleCheck ? 'Are you sure?' : 'Cancel request'}
					</StatusButton>
				</Form>
			) : (
				<>
					{canEdit || isUserDestination ? (
						<Button className="absolute top-0 right-0 z-10" asChild>
							<Link to="edit">{canEdit ? 'Edit' : 'Request changes'}</Link>
						</Button>
					) : (
						<ReportDialog
							type="destination"
							destinationId={loaderData.destination.id}
							className="absolute top-0 right-0 z-10"
						/>
					)}
					<Button className="absolute right-0 bottom-0 z-10" asChild>
						<Link to="new">
							{hasCreateGrenadePermission
								? 'Create grenade'
								: 'Request grenade'}
						</Link>
					</Button>
				</>
			)}
		</>
	)
}
