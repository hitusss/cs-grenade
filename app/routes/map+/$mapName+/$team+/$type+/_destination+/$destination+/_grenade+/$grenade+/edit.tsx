import { data, Form, Link, useNavigate } from 'react-router'
import { parseWithZod } from '@conform-to/zod'
import { invariantResponse } from '@epic-web/invariant'
import { parseFormData } from '@mjackson/form-data-parser'
import { z } from 'zod'

import { requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { checkHoneypot } from '#app/utils/honeypot.server.ts'
import {
	uploadHandler,
	useDoubleCheck,
	useIsPending,
} from '#app/utils/misc.tsx'
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
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { GrenadeForm } from '#app/components/grenade-form.tsx'
import { MapBackButton } from '#app/components/map.tsx'

import { type MapHandle } from '../../../../_layout.tsx'
import { type Route } from './+types/edit.ts'
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
		disableAllGrenades: true,
		hideCurrentGrenade: true,
	},
}

export async function loader({ request, params }: Route.LoaderArgs) {
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
		!userHasPermission(userPermissions, 'update:grenade:any')
	) {
		throw unauthorized({
			message: 'You do not have permission to edit this grenade',
		})
	}

	return data({ grenade })
}

export async function action({ request, params }: Route.ActionArgs) {
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

	const formData = await parseFormData(
		request,
		uploadHandler({ maxPartSize: MAX_SIZE }),
	)
	await checkHoneypot(formData)

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
		return data(
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

export default function MapEditGrenadeRoute({
	loaderData,
	actionData,
}: Route.ComponentProps) {
	const navigate = useNavigate()

	const isPending = useIsPending()

	const user = useUser()
	const isUserGrenade = loaderData.grenade.userId === user.id
	const hasUpdateGrenadePermission = userHasPermission(user, 'update:grenade')
	const hasDeleteGrenadePermission = userHasPermission(
		user,
		isUserGrenade ? 'delete:grenade' : 'delete:grenade:any',
	)

	const deleteDC = useDoubleCheck()

	if (loaderData.grenade.grenadeChanges) {
		return (
			<Dialog open onOpenChange={() => navigate('..')}>
				<DialogContent>
					<DialogTitle>Edit Grenade</DialogTitle>
					<p>
						This grenade has pending changes request. You can either cancel the
						request and then create new one.
					</p>
					<Form method="POST" encType="multipart/form-data">
						<DialogFooter>
							<Button variant="destructive" type="button" asChild>
								<Link to="..">Back</Link>
							</Button>
							{hasDeleteGrenadePermission ? (
								<StatusButton
									variant="destructive"
									{...deleteDC.getButtonProps({
										type: 'submit',
										name: 'intent',
										value: 'delete',
									})}
									status={
										isPending
											? 'pending'
											: (actionData?.result.status ?? 'idle')
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
			<GrenadeForm
				type="edit"
				title={
					hasUpdateGrenadePermission
						? 'Edit Grenade'
						: 'Request Grenade Changes'
				}
				defaultValue={{
					name: loaderData.grenade.name,
					description: loaderData.grenade.description,
					x: loaderData.grenade.x,
					y: loaderData.grenade.y,
					images: loaderData.grenade.images.map((i) => ({
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
				{hasDeleteGrenadePermission ? (
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
					{hasUpdateGrenadePermission ? 'Update' : 'Request changes'}
				</StatusButton>
			</GrenadeForm>
		</>
	)
}
