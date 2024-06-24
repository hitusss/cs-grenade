import { json, type LoaderFunctionArgs } from '@remix-run/node'
import { Form, Link, useLoaderData, useNavigate } from '@remix-run/react'
import { invariantResponse } from '@epic-web/invariant'

import { getUserId, requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { useDoubleCheck } from '#app/utils/misc.tsx'
import { unauthorized } from '#app/utils/permissions.server.ts'
import { userHasPermission } from '#app/utils/permissions.ts'
import { redirectWithToast } from '#app/utils/toast.server.ts'
import { useOptionalUser } from '#app/utils/user.ts'
import { Button } from '#app/components/ui/button.tsx'
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
} from '#app/components/ui/dialog.tsx'
import { useLightbox } from '#app/components/lightbox.tsx'

import { type MapHandle } from '../../../../_layout.tsx'

export const handle: MapHandle = {
	map: {
		currentDestination: true,
	},
}

export async function loader({ request, params }: LoaderFunctionArgs) {
	const { grenade: grenadeId } = params

	const userId = await getUserId(request)

	const grenade = await prisma.grenade.findUnique({
		where: {
			id: grenadeId,
		},
		select: {
			verified: true,
			name: true,
			description: true,
			images: {
				orderBy: {
					order: 'asc',
				},
				select: {
					id: true,
					description: true,
				},
			},
			favorites: userId
				? {
						where: {
							userId,
						},
						select: {
							id: true,
						},
					}
				: undefined,
			userId: true,
		},
	})

	invariantResponse(grenade, 'Not found', { status: 404 })

	if (!grenade.verified && userId !== grenade.userId) {
		throw unauthorized({
			message: 'You are not allowed to view this grenade',
		})
	}

	return json({ grenade })
}

export async function action({ request, params }: LoaderFunctionArgs) {
	const { grenade: grenadeId } = params
	const userId = await requireUserId(request)

	const grenade = await prisma.grenade.findUnique({
		where: {
			id: grenadeId,
		},
		select: {
			userId: true,
		},
	})

	invariantResponse(grenade, 'Not found', { status: 404 })
	if (grenade.userId !== userId) {
		throw unauthorized({
			message: 'You are not allowed to perform this action',
		})
	}

	await prisma.grenade.delete({
		where: {
			id: grenadeId,
			verified: false,
		},
	})

	return await redirectWithToast(`..`, {
		title: `Grenade request cancelled`,
		description: ``,
		type: 'success',
	})
}

export default function GrenadeRoute() {
	const data = useLoaderData<typeof loader>()
	const navigate = useNavigate()

	const cancelDC = useDoubleCheck()

	const { activeLightbox, openLightbox } = useLightbox()

	const user = useOptionalUser()
	const hasUpdateGrenadeOwnPermission = userHasPermission(
		user,
		'update:grenade:own',
	)
	const hasUpdateGrenadeAnyPermission = userHasPermission(
		user,
		'update:grenade:any',
	)

	const isUserGrenade = user?.id === data.grenade.userId
	const canEdit =
		hasUpdateGrenadeAnyPermission ||
		(isUserGrenade && hasUpdateGrenadeOwnPermission)

	const grenadeImages = data.grenade.images.map((image) => ({
		src: `/resources/grenade-images/${image.id}`,
		alt: image.description ?? undefined,
		caption: image.description ?? undefined,
	}))

	return (
		<Dialog open onOpenChange={() => !activeLightbox && navigate(-1)}>
			<DialogContent className="max-w-5xl max-h-[90vh] overflow-auto">
				<DialogHeader>{data.grenade.name}</DialogHeader>
				<p>{data.grenade.description}</p>
				<ul className="flex flex-wrap gap-4">
					{data.grenade.images.map((image, index) => (
						<li key={image.id} className="w-48 md:w-64 space-y-1">
							<img
								src={`/resources/grenade-images/${image.id}`}
								className="aspect-square object-cover cursor-pointer shadow-md"
								onClick={() => openLightbox({ index, images: grenadeImages })}
							/>
							<p>{image.description}</p>
						</li>
					))}
				</ul>
				<DialogFooter>
					{!data.grenade.verified ? (
						<Form method="POST">
							<Button
								variant="destructive"
								{...cancelDC.getButtonProps({
									type: 'submit',
									name: 'intent',
									value: 'cancel',
								})}
							>
								{cancelDC.doubleCheck ? 'Are you sure?' : 'Cancel request'}
							</Button>
						</Form>
					) : null}
					{data.grenade.verified && canEdit ? (
						<Button>
							<Link to="edit">Edit</Link>
						</Button>
					) : null}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
