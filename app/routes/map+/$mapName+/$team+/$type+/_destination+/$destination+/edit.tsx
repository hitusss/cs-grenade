import {
	json,
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
} from '@remix-run/node'
import {
	Form,
	Link,
	useActionData,
	useLoaderData,
	useNavigate,
} from '@remix-run/react'
import { parseWithZod } from '@conform-to/zod'
import { invariantResponse } from '@epic-web/invariant'
import { z } from 'zod'

import { requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { checkHoneypot } from '#app/utils/honeypot.server.ts'
import { useDoubleCheck } from '#app/utils/misc.tsx'
import {
	getUserPermissions,
	unauthorized,
} from '#app/utils/permissions.server.ts'
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
import { DestinationForm } from '#app/components/destination-form.tsx'
import { MapBackButton } from '#app/components/map.tsx'

import { type MapHandle } from '../../_layout.tsx'
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

export async function loader({ request, params }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)
	const userPermissions = await getUserPermissions(userId)

	const { destination: destinationId } = params

	invariantResponse(destinationId, 'Destination ID is required')

	const destination = await prisma.destination.findUnique({
		where: { id: destinationId, verified: true },
		select: {
			id: true,
			name: true,
			x: true,
			y: true,
			userId: true,
			destinationChanges: {
				select: { id: true },
			},
		},
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

	return json({ destination })
}

export async function action({ request, params }: ActionFunctionArgs) {
	const userId = await requireUserId(request)

	const { destination: destinationId } = params

	invariantResponse(destinationId, 'Destination ID is required')

	const destination = await prisma.destination.findUnique({
		where: { id: destinationId },
		select: {
			userId: true,
		},
	})

	invariantResponse(destination, 'Not found', { status: 404 })

	const formData = await request.formData()
	checkHoneypot(formData)

	const submission = await parseWithZod(formData, {
		schema: DestinationSchema,
		async: true,
	})
	if (submission.status !== 'success') {
		return json(
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
			return json(
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

export default function MapEditDestinationRoute() {
	const data = useLoaderData<typeof loader>()
	const actionData = useActionData<typeof action>()
	const navigate = useNavigate()

	const user = useUser()
	const isUserDestination = data.destination.userId === user.id
	const hasUpdateDestinationPermission = userHasPermission(
		user,
		'update:destination',
	)
	const hasDeleteDestinationPermission = userHasPermission(
		user,
		isUserDestination ? 'delete:destination' : 'delete:destination:any',
	)

	const deleteDC = useDoubleCheck()

	if (data.destination.destinationChanges) {
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
							<Button
								variant="destructive"
								type="submit"
								name="intent"
								value="cancel-edit-request"
							>
								Cancel Request
							</Button>
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
					name: data.destination.name,
					x: data.destination.x,
					y: data.destination.y,
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
				<Button type="submit" name="intent" value="update">
					{hasUpdateDestinationPermission ? 'Update' : 'Request changes'}
				</Button>
			</DestinationForm>
		</>
	)
}
