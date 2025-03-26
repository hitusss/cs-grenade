import { data, Form, useSearchParams } from 'react-router'
import { invariantResponse } from '@epic-web/invariant'

import {
	deletedDestinationChangesByDestinationId,
	getDestination,
	getDestinationChangesByDestinationId,
	getSimpleDestination,
	updateDestinationNameAndPosition,
} from '#app/models/index.server.ts'
import { cn, useIsPending } from '#app/utils/misc.tsx'
import { notify } from '#app/utils/notifications.server.ts'
import { requireUserWithPermission } from '#app/utils/permissions.server.ts'
import { redirectWithToast } from '#app/utils/toast.server.ts'
import { Button } from '#app/components/ui/button.tsx'
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '#app/components/ui/dialog.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { DestinationMarker } from '#app/components/destination-marker.tsx'
import { DiffView } from '#app/components/diff.tsx'
import { MapBackButton } from '#app/components/map.tsx'

import { type MapHandle } from '../../../_layout.tsx'
import { type Route } from './+types/changes-request.ts'

const DEFAULT_REDIRECT_TO = '/admin/requests/destinations-changes'

export const handle: MapHandle = {
	map: {
		currentDestination: true,
		disableAllDestinations: true,
		hideCurrentDestination: true,
	},
}

export async function loader({ request, params }: Route.LoaderArgs) {
	await requireUserWithPermission(
		request,
		'update:review-destination-request:any',
	)

	const { destination: destinationId } = params

	invariantResponse(destinationId, 'Destination is required')

	const destination = await getSimpleDestination({ destinationId })

	invariantResponse(destination, 'Not fount', { status: 404 })

	const destinationChanges =
		await getDestinationChangesByDestinationId(destinationId)

	invariantResponse(destinationChanges, 'Not fount', {
		status: 404,
	})

	return data({ destination, destinationChanges })
}

export async function action({ request, params }: Route.ActionArgs) {
	await requireUserWithPermission(
		request,
		'update:review-destination-request:any',
	)

	const { destination: destinationId } = params

	invariantResponse(destinationId, 'Destination is required')

	const destination = await getDestination(destinationId)

	invariantResponse(destination, 'Not fount', { status: 404 })

	const searchParams = new URL(request.url).searchParams
	const redirectTo = searchParams.get('redirectTo') ?? DEFAULT_REDIRECT_TO

	const formData = await request.formData()

	const intent = formData.get('intent')

	switch (intent) {
		case 'accept': {
			const destinationChanges =
				await getDestinationChangesByDestinationId(destinationId)
			if (!destinationChanges) {
				return redirectWithToast(redirectTo, {
					type: 'error',
					title: 'Destination changes already reviewed',
					description: ``,
				})
			}
			await updateDestinationNameAndPosition({
				destinationId,
				...destinationChanges,
			})
			await deletedDestinationChangesByDestinationId(destinationId)
			if (destination.userId) {
				await notify({
					userId: destination.userId,
					title: 'Destination changes request accepted',
					description: `Your destination changes request for ${destination.name} has been accepted`,
					redirectTo: `/map/${destination.mapName}/${destination.team}/${destination.type}/${destinationId}`,
				})
			}
			break
		}
		case 'reject': {
			await deletedDestinationChangesByDestinationId(destinationId)
			if (destination.userId) {
				await notify({
					userId: destination.userId,
					title: 'Destination changes request rejected',
					description: `Your destination changes request for ${destination.name} has been rejected`,
				})
			}
			break
		}
		default: {
			throw new Response('Invalid intent', { status: 400 })
		}
	}

	return redirectWithToast(redirectTo, {
		type: 'success',
		title: 'Destination changes request reviewed',
		description: ``,
	})
}

export default function MapAdminDestinationChangesRequestRoute({
	loaderData,
}: Route.ComponentProps) {
	const [searchParams] = useSearchParams()

	const isPending = useIsPending()

	const redirectTo = searchParams.get('redirectTo') ?? DEFAULT_REDIRECT_TO

	const hasChangedPosition =
		loaderData.destination.x !== loaderData.destinationChanges.x ||
		loaderData.destination.y !== loaderData.destinationChanges.y
	const hasChangedName =
		loaderData.destination.name !== loaderData.destinationChanges.name

	return (
		<>
			<MapBackButton to={redirectTo} />
			<DestinationMarker
				to=""
				coords={{
					x: loaderData.destination.x,
					y: loaderData.destination.y,
				}}
				name={loaderData.destination.name}
				highlight={!hasChangedPosition}
				disabled
				className={cn({
					'border-diff-red bg-diff-red/50': hasChangedPosition,
				})}
			/>
			{hasChangedPosition ? (
				<DestinationMarker
					to=""
					coords={{
						x: loaderData.destinationChanges.x,
						y: loaderData.destinationChanges.y,
					}}
					name={loaderData.destinationChanges.name}
					disabled
					className={'border-diff-green bg-diff-green/50'}
				/>
			) : null}
			<Dialog>
				<DialogTrigger asChild>
					<Button className="absolute right-0 bottom-0 z-10">
						Open content
					</Button>
				</DialogTrigger>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Destination changes request</DialogTitle>
					</DialogHeader>
					<DiffView
						name="Name"
						oldValue={loaderData.destination.name}
						newValue={hasChangedName ? loaderData.destination.name : undefined}
					/>
					<DialogFooter>
						<Form method="POST" className="flex items-center gap-2">
							<StatusButton
								type="submit"
								name="intent"
								value="reject"
								variant="destructive"
								status={isPending ? 'pending' : 'idle'}
							>
								Reject
							</StatusButton>
							<StatusButton
								type="submit"
								name="intent"
								value="accept"
								status={isPending ? 'pending' : 'idle'}
							>
								Accept
							</StatusButton>
						</Form>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	)
}
