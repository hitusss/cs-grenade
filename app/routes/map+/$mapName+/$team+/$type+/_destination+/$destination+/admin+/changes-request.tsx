import {
	json,
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
} from '@remix-run/node'
import { Form, useLoaderData, useSearchParams } from '@remix-run/react'
import { invariantResponse } from '@epic-web/invariant'

import { prisma } from '#app/utils/db.server.ts'
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
	DialogTrigger,
} from '#app/components/ui/dialog.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { DestinationMarker } from '#app/components/destination-marker.tsx'
import { DiffView } from '#app/components/diff.tsx'
import { MapBackButton } from '#app/components/map.tsx'

import { type MapHandle } from '../../../_layout.tsx'

const DEFAULT_REDIRECT_TO = '/admin/requests/destinations-changes'

export const handle: MapHandle = {
	map: {
		currentDestination: true,
		disableAllDestinations: true,
		hideCurrentDestination: true,
	},
}

export async function loader({ request, params }: LoaderFunctionArgs) {
	await requireUserWithPermission(
		request,
		'update:review-destination-request:any',
	)

	const { destination: destinationId } = params

	invariantResponse(destinationId, 'Destination is required')

	const destination = await prisma.destination.findUnique({
		where: {
			id: destinationId,
		},
		select: {
			name: true,
			x: true,
			y: true,
			destinationChanges: {},
		},
	})

	invariantResponse(destination, 'Not fount', { status: 404 })

	const destinationChanges = await prisma.destinationChanges.findUnique({
		where: {
			destinationId,
		},
		select: {
			name: true,
			x: true,
			y: true,
		},
	})

	invariantResponse(destinationChanges, 'Not fount', {
		status: 404,
	})

	return json({ destination, destinationChanges })
}

export async function action({ request, params }: ActionFunctionArgs) {
	await requireUserWithPermission(
		request,
		'update:review-destination-request:any',
	)

	const { destination: destinationId } = params

	invariantResponse(destinationId, 'Destination is required')

	const destination = await prisma.destination.findUnique({
		where: {
			id: destinationId,
		},
		select: {
			name: true,
			mapName: true,
			team: true,
			type: true,
			userId: true,
		},
	})

	invariantResponse(destination, 'Not fount', { status: 404 })

	const searchParams = new URL(request.url).searchParams
	const redirectTo = searchParams.get('redirectTo') ?? DEFAULT_REDIRECT_TO

	const formData = await request.formData()

	const intent = formData.get('intent')

	switch (intent) {
		case 'accept': {
			const destinationChanges = await prisma.destinationChanges.findUnique({
				where: {
					destinationId,
				},
				select: {
					name: true,
					x: true,
					y: true,
				},
			})
			if (!destinationChanges) {
				return redirectWithToast(redirectTo, {
					type: 'error',
					title: 'Destination changes already reviewed',
					description: ``,
				})
			}
			await prisma.destination.update({
				where: {
					id: destinationId,
				},
				data: destinationChanges,
			})
			await prisma.destinationChanges.delete({ where: { destinationId } })
			await notify({
				userId: destination.userId,
				title: 'Destination changes request accepted',
				description: `Your destination changes request for ${destination.name} has been accepted`,
				redirectTo: `/map/${destination.mapName}/${destination.team}/${destination.type}/${destinationId}`,
			})
			break
		}
		case 'reject': {
			await prisma.destinationChanges.delete({
				where: {
					destinationId,
				},
			})
			await notify({
				userId: destination.userId,
				title: 'Destination changes request rejected',
				description: `Your destination changes request for ${destination.name} has been rejected`,
			})
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

export default function MapAdminDestinationChangesRequestRoute() {
	const data = useLoaderData<typeof loader>()
	const [searchParams] = useSearchParams()

	const isPending = useIsPending()

	const redirectTo = searchParams.get('redirectTo') ?? DEFAULT_REDIRECT_TO

	const hasChangedPosition =
		data.destination.x !== data.destinationChanges.x ||
		data.destination.y !== data.destinationChanges.y
	const hasChangedName = data.destination.name !== data.destinationChanges.name

	return (
		<>
			<MapBackButton to={redirectTo} />
			<DestinationMarker
				to=""
				coords={{
					x: data.destination.x,
					y: data.destination.y,
				}}
				name={data.destination.name}
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
						x: data.destinationChanges.x,
						y: data.destinationChanges.y,
					}}
					name={data.destinationChanges.name}
					disabled
					className={'border-diff-green bg-diff-green/50'}
				/>
			) : null}
			<Dialog>
				<DialogTrigger asChild>
					<Button className="absolute bottom-0 right-0 z-10">
						Open content
					</Button>
				</DialogTrigger>
				<DialogContent>
					<DialogHeader>
						<h3>Destination changes request</h3>
					</DialogHeader>
					<DiffView
						name="Name"
						oldValue={data.destination.name}
						newValue={hasChangedName ? data.destination.name : undefined}
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
