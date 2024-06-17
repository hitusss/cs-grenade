import {
	json,
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
} from '@remix-run/node'
import { Link, useActionData } from '@remix-run/react'
import { parseWithZod } from '@conform-to/zod'
import { invariantResponse } from '@epic-web/invariant'

import { requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { checkHoneypot } from '#app/utils/honeypot.server.ts'
import { getUserPermissions } from '#app/utils/permissions.server.ts'
import { userHasPermission } from '#app/utils/permissions.ts'
import { redirectWithToast } from '#app/utils/toast.server.ts'
import { useUser } from '#app/utils/user.ts'
import { GrenadeSchema } from '#app/utils/validators/grenade.ts'
import { Button } from '#app/components/ui/button.tsx'
import { GrenadeForm } from '#app/components/grenade-form.tsx'
import { MapBackButton, MapTitle } from '#app/components/map.tsx'

import { type MapHandle } from '../../../_layout.tsx'

export const handle: MapHandle = {
	map: {
		currentDestination: true,
		disableAllGrenades: true,
	},
}

export async function loader({ request }: LoaderFunctionArgs) {
	await requireUserId(request)
	return json({})
}

export async function action({ request, params }: ActionFunctionArgs) {
	const userId = await requireUserId(request)
	const userPermissions = await getUserPermissions(userId)
	const hasCreateGrenadePermission = userHasPermission(
		userPermissions,
		'create:grenade',
	)

	const { mapName, team, type, destination } = params

	invariantResponse(mapName, 'Map is required', { status: 400 })
	invariantResponse(team, 'Team is required', { status: 400 })
	invariantResponse(type, 'Grenade type is required', { status: 400 })
	invariantResponse(destination, 'Destination is required', { status: 400 })

	const formData = await request.formData()
	checkHoneypot(formData)

	const submission = await parseWithZod(formData, {
		schema: GrenadeSchema.transform(async data => {
			return {
				x: data.x,
				y: data.y,
				description: data.description,
				name: data.name,
				images: await Promise.all(
					data.images.map(async imageData =>
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

	const { x, y, name, description, images } = submission.value

	const grenade = await prisma.grenade.create({
		data: {
			verified: hasCreateGrenadePermission,
			x,
			y,
			name,
			description,
			mapName,
			destinationId: destination,
			team,
			type,
			userId,
		},
	})

	await Promise.all(
		images.map(async img => {
			if (img.type === 'edit') return
			await prisma.grenadeImage.create({
				data: {
					...img.data,
					grenadeId: grenade.id,
				},
			})
		}),
	)

	return await redirectWithToast(`..`, {
		title: `Grenade ${hasCreateGrenadePermission ? 'created' : 'requested'}`,
		description: ``,
		type: 'success',
	})
}

export default function NewGrenadeRoute() {
	const actionData = useActionData<typeof action>()

	const user = useUser()
	const hasCreateGrenadePermission = userHasPermission(user, 'create:grenade')

	return (
		<>
			<MapBackButton />
			<MapTitle>Select location to add grenade</MapTitle>
			<GrenadeForm
				type="new"
				title={
					hasCreateGrenadePermission ? 'Create Grenade' : 'Request Grenade'
				}
				result={actionData?.result}
			>
				<Button variant="ghost" type="reset">
					Reset
				</Button>
				<Button variant="destructive" type="button" asChild>
					<Link to="..">Cancel</Link>
				</Button>
				<Button type="submit">
					{hasCreateGrenadePermission ? 'Create' : 'Request'}
				</Button>
			</GrenadeForm>
		</>
	)
}
