import {
	json,
	unstable_createMemoryUploadHandler,
	unstable_parseMultipartFormData,
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
	CancelEditGrenadeRequestSchema,
	DeleteGrenadeSchema,
	MAX_SIZE,
	UpdateGrenadeSchema,
} from '#app/utils/validators/grenade.ts'
import { Button } from '#app/components/ui/button.tsx'
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogTitle,
} from '#app/components/ui/dialog.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { GrenadeForm } from '#app/components/grenade-form.tsx'
import { MapBackButton } from '#app/components/map.tsx'

import { type MapHandle } from '../../../../_layout.tsx'
import {
	cancelEditGrenadeRequest,
	deleteGrenade,
	updateGrenade,
} from './grenade.server.ts'

const GrenadeSchema = z.discriminatedUnion('intent', [
	UpdateGrenadeSchema,
	DeleteGrenadeSchema,
	CancelEditGrenadeRequestSchema,
])

export const handle: MapHandle = {
	map: {
		currentDestination: true,
		currentGrenade: true,
		hideCurrentGrenade: true,
	},
}

export async function loader({ request, params }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)
	const userPermissions = await getUserPermissions(userId)

	const { grenade: grenadeId } = params

	invariantResponse(grenadeId, 'Grenade ID is required')

	const grenade = await prisma.grenade.findUnique({
		where: { id: grenadeId, verified: true },
		select: {
			id: true,
			name: true,
			description: true,
			x: true,
			y: true,
			images: {
				orderBy: {
					order: 'asc',
				},
				select: {
					id: true,
					description: true,
					order: true,
				},
			},
			grenadeChanges: {
				select: {
					id: true,
				},
			},
			userId: true,
		},
	})

	invariantResponse(grenade, 'Not found', { status: 404 })

	if (
		grenade.userId !== userId &&
		!userHasPermission(userPermissions, 'update:destination:any')
	) {
		throw unauthorized({
			message: 'You do not have permission to edit this destination',
		})
	}

	return json({ grenade })
}

export async function action({ request, params }: ActionFunctionArgs) {
	const userId = await requireUserId(request)

	const { grenade: grenadeId } = params

	invariantResponse(grenadeId, 'Grenade ID is required')

	const grenade = await prisma.grenade.findUnique({
		where: { id: grenadeId },
		select: {
			userId: true,
		},
	})

	invariantResponse(grenade, 'Not found', { status: 404 })

	const formData = await unstable_parseMultipartFormData(
		request,
		unstable_createMemoryUploadHandler({ maxPartSize: MAX_SIZE }),
	)
	checkHoneypot(formData)

	const submission = await parseWithZod(formData, {
		schema: GrenadeSchema.transform(async (data) => {
			if (data.intent === 'delete') return data
			if (data.intent === 'cancel-edit-request') return data
			return {
				intent: 'update',
				x: data.x,
				y: data.y,
				description: data.description,
				name: data.name,
				images: await Promise.all(
					data.images.map(async (imageData) =>
						imageData.type === 'new'
							? {
									type: imageData.type,
									data: {
										contentType: imageData.image.type,
										blob: Buffer.from(await imageData.image.arrayBuffer()),
										order: imageData.order,
										description: imageData.description,
									},
								}
							: {
									type: imageData.type,
									data: {
										id: imageData.id,
										contentType: imageData.image?.type,
										blob: imageData.image
											? Buffer.from(await imageData.image.arrayBuffer())
											: undefined,
										order: imageData.order,
										description: imageData.description,
									},
								},
					),
				),
			}
		}),
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

	const isOwn = grenade.userId === userId

	switch (submission.value.intent) {
		case 'update': {
			const { name, description, x, y, images } = submission.value
			return updateGrenade({
				userId,
				isOwn,
				id: grenadeId,
				name,
				description,
				x,
				y,
				images,
			})
		}
		case 'delete': {
			return deleteGrenade({
				userId,
				isOwn,
				id: grenadeId,
			})
		}
		case 'cancel-edit-request': {
			return cancelEditGrenadeRequest({
				isOwn,
				id: grenadeId,
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

export default function MapEditGrenadeRoute() {
	const data = useLoaderData<typeof loader>()
	const actionData = useActionData<typeof action>()
	const navigate = useNavigate()

	const user = useUser()
	const isUserDestination = data.grenade.userId === user.id
	const hasUpdateDestinationPermission = userHasPermission(
		user,
		'update:destination',
	)
	const hasDeleteDestinationPermission = userHasPermission(
		user,
		isUserDestination ? 'delete:destination' : 'delete:destination:any',
	)

	const deleteDC = useDoubleCheck()

	if (data.grenade.grenadeChanges) {
		return (
			<Dialog open onOpenChange={() => navigate('..')}>
				<DialogContent>
					<DialogTitle>Edit Grenade</DialogTitle>
					<p>
						This grenade has pending changes request. You can either cancel the
						request and then create new one.
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
			<GrenadeForm
				type="edit"
				title={
					hasUpdateDestinationPermission
						? 'Edit Grenade'
						: 'Request Grenade Changes'
				}
				defaultValue={{
					name: data.grenade.name,
					description: data.grenade.description,
					x: data.grenade.x,
					y: data.grenade.y,
					images: data.grenade.images.map((i) => ({
						id: i.id,
						description: i.description,
					})),
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
			</GrenadeForm>
		</>
	)
}
