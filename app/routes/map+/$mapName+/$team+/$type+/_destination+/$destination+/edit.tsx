import { data, Form, Link, useNavigate } from 'react-router'
import { parseWithZod } from '@conform-to/zod'
import { invariantResponse } from '@epic-web/invariant'
import { z } from 'zod'

import {
	getDestinationUserId,
	getDestinationWithChangesId,
	getUserPermissions,
} from '#app/models/index.server.ts'
import { requireUserId } from '#app/utils/auth.server.ts'
import { checkHoneypot } from '#app/utils/honeypot.server.ts'
import { useDoubleCheck, useIsPending } from '#app/utils/misc.tsx'
import { unauthorized } from '#app/utils/permissions.server.ts'
import { userHasPermission } from '#app/utils/permissions.ts'
import { useUser } from '#app/utils/user.ts'
import {
	CancelEditDestinationRequestSchema,
	DeleteDestinationSchema,
	UpdateDestinationSchema,
} from '#app/utils/validators/destination.ts'
import { Button } from '#app/components/ui/button.tsx'
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogTitle,
} from '#app/components/ui/dialog.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { DestinationForm } from '#app/components/destination-form.tsx'
import { MapBackButton } from '#app/components/map.tsx'

import { type MapHandle } from '../../_layout.tsx'
import { type Route } from './+types/edit.ts'
import {
	cancelEditDestinationRequest,
	deleteDestination,
	updateDestination,
} from './destination.server.ts'

const DestinationSchema = z.discriminatedUnion('intent', [
	UpdateDestinationSchema,
	DeleteDestinationSchema,
	CancelEditDestinationRequestSchema,
])

export const handle: MapHandle = {
	map: {
		currentDestination: true,
		disableAllDestinations: true,
		hideCurrentDestination: true,
		hideAllGrenades: true,
	},
}

export async function loader({ request, params }: Route.LoaderArgs) {
	const userId = await requireUserId(request)
	const userPermissions = await getUserPermissions(userId)

	const { destination: destinationId } = params

	invariantResponse(destinationId, 'Destination ID is required')

	const destination = await getDestinationWithChangesId({
		destinationId,
		verified: true,
	})

	invariantResponse(destination, 'Not found', { status: 404 })

	if (
		destination.userId !== userId &&
		!userHasPermission(userPermissions, 'update:destination:any')
	) {
		throw unauthorized({
			message: 'You do not have permission to edit this destination',
		})
	}

	return data({ destination })
}

export async function action({ request, params }: Route.ActionArgs) {
	const userId = await requireUserId(request)

	const { destination: destinationId } = params

	invariantResponse(destinationId, 'Destination ID is required')

	const destination = await getDestinationUserId(destinationId)

	invariantResponse(destination, 'Not found', { status: 404 })

	const formData = await request.formData()
	await checkHoneypot(formData)

	const submission = await parseWithZod(formData, {
		schema: DestinationSchema,
		async: true,
	})
	if (submission.status !== 'success') {
		return data(
			{ result: submission.reply() },
			{
				status: submission.status === 'error' ? 400 : 200,
			},
		)
	}

	const isOwn = destination.userId === userId

	switch (submission.value.intent) {
		case 'update': {
			const { name, x, y } = submission.value
			return updateDestination({
				userId,
				isOwn,
				id: destinationId,
				name,
				x,
				y,
			})
		}
		case 'delete': {
			return deleteDestination({
				userId,
				isOwn,
				id: destinationId,
			})
		}

		case 'cancel-edit-request': {
			return cancelEditDestinationRequest({
				isOwn,
				id: destinationId,
			})
		}
		default: {
			return data(
				{
					result: submission.reply({
						formErrors: ['Invalid intent'],
					}),
				},
				{
					status: 400,
				},
			)
		}
	}
}

export default function MapEditDestinationRoute({
	loaderData,
	actionData,
}: Route.ComponentProps) {
	const navigate = useNavigate()

	const isPending = useIsPending()

	const user = useUser()
	const isUserDestination = loaderData.destination.userId === user.id
	const hasUpdateDestinationPermission = userHasPermission(
		user,
		'update:destination',
	)
	const hasDeleteDestinationPermission = userHasPermission(
		user,
		isUserDestination ? 'delete:destination' : 'delete:destination:any',
	)

	const deleteDC = useDoubleCheck()

	if (loaderData.destination.destinationChanges) {
		return (
			<Dialog open onOpenChange={() => navigate('..')}>
				<DialogContent>
					<DialogTitle>Edit Destination</DialogTitle>
					<p>
						This destination has pending changes request. You can either cancel
						the request and then create new one.
					</p>
					<Form method="POST">
						<DialogFooter>
							<Button variant="destructive" type="button" asChild>
								<Link to="..">Back</Link>
							</Button>
							{hasDeleteDestinationPermission ? (
								<Button
									variant="destructive"
									{...deleteDC.getButtonProps({
										type: 'submit',
										name: 'intent',
										value: 'delete',
									})}
								>
									{deleteDC.doubleCheck ? (
										'Are you sure?'
									) : (
										<Icon name="trash">Delete</Icon>
									)}
								</Button>
							) : null}
							<StatusButton
								variant="destructive"
								type="submit"
								name="intent"
								value="cancel-edit-request"
								status={
									isPending ? 'pending' : (actionData?.result.status ?? 'idle')
								}
							>
								Cancel Request
							</StatusButton>
						</DialogFooter>
					</Form>
				</DialogContent>
			</Dialog>
		)
	}

	return (
		<>
			<MapBackButton />
			<DestinationForm
				title={
					hasUpdateDestinationPermission
						? 'Edit Destination'
						: 'Request Destination Changes'
				}
				type="edit"
				defaultValue={{
					name: loaderData.destination.name,
					x: loaderData.destination.x,
					y: loaderData.destination.y,
				}}
				result={actionData?.result}
			>
				<Button variant="ghost" type="reset">
					Reset
				</Button>
				<Button variant="destructive" type="button" asChild>
					<Link to="..">Back</Link>
				</Button>
				{hasDeleteDestinationPermission ? (
					<StatusButton
						variant="destructive"
						{...deleteDC.getButtonProps({
							type: 'submit',
							name: 'intent',
							value: 'delete',
						})}
						status={
							isPending ? 'pending' : (actionData?.result.status ?? 'idle')
						}
					>
						{deleteDC.doubleCheck ? (
							'Are you sure?'
						) : (
							<Icon name="trash">Delete</Icon>
						)}
					</StatusButton>
				) : null}
				<StatusButton
					type="submit"
					name="intent"
					value="update"
					status={isPending ? 'pending' : (actionData?.result.status ?? 'idle')}
				>
					{hasUpdateDestinationPermission ? 'Update' : 'Request changes'}
				</StatusButton>
			</DestinationForm>
		</>
	)
}
