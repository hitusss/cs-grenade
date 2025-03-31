import { data, Form, Link, useNavigate } from 'react-router'
import { invariantResponse } from '@epic-web/invariant'

import {
	deleteGrenade,
	getGrenade,
	getGrenadeUserId,
} from '#app/models/index.server.ts'
import { getUserId, requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { useDoubleCheck, useIsPending } from '#app/utils/misc.tsx'
import { unauthorized } from '#app/utils/permissions.server.ts'
import { userHasPermission } from '#app/utils/permissions.ts'
import { redirectWithToast } from '#app/utils/toast.server.ts'
import { useOptionalUser } from '#app/utils/user.ts'
import { Button } from '#app/components/ui/button.tsx'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from '#app/components/ui/dialog.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '#app/components/ui/tooltip.tsx'
import { useLightbox } from '#app/components/lightbox.tsx'
import { ReportDialog } from '#app/routes/resources+/report.tsx'

import { type MapHandle } from '../../../../_layout.tsx'
import { type Route } from './+types/index.ts'

export const handle: MapHandle = {
	map: {
		currentDestination: true,
		currentGrenade: true,
	},
}

export async function loader({ request, params }: Route.LoaderArgs) {
	const { grenade: grenadeId } = params

	const userId = await getUserId(request)

	const grenade = await getGrenade({
		grenadeId,
		userId,
	})

	invariantResponse(grenade, 'Not found', { status: 404 })

	if (!grenade.verified && userId !== grenade.userId) {
		throw unauthorized({
			message: 'You are not allowed to view this grenade',
		})
	}

	return data({ grenade })
}

export async function action({ request, params }: Route.ActionArgs) {
	const { grenade: grenadeId } = params
	invariantResponse(grenadeId, 'Grenade is required')

	const userId = await requireUserId(request)

	const grenade = await getGrenadeUserId(grenadeId)

	invariantResponse(grenade, 'Not found', { status: 404 })

	const formData = await request.formData()
	const intent = formData.get('intent')

	switch (intent) {
		case 'cancel': {
			if (grenade.userId !== userId) {
				throw unauthorized({
					message: 'You are not allowed to perform this action',
				})
			}

			await deleteGrenade({
				grenadeId,
				verified: false,
			})

			return await redirectWithToast(`..`, {
				title: `Grenade request cancelled`,
				description: ``,
				type: 'success',
			})
		}
		case 'add-favorite': {
			await prisma.favorite.create({
				data: {
					grenadeId,
					userId,
				},
			})
			return redirectWithToast('.', {
				title: `Grenade added to favorite`,
				description: ``,
				type: `success`,
			})
		}
		case 'remove-favorite': {
			await prisma.favorite.deleteMany({
				where: {
					grenadeId,
					userId,
				},
			})
			return redirectWithToast('.', {
				title: `Grenade removed from favorite`,
				description: ``,
				type: `success`,
			})
		}
		default: {
			throw new Response(`Invalid intent "${intent}"`, { status: 400 })
		}
	}
}

export default function MapGrenadeRoute({ loaderData }: Route.ComponentProps) {
	const navigate = useNavigate()

	const isPending = useIsPending()
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

	const isUserGrenade = user?.id === loaderData.grenade.userId
	const canEdit =
		hasUpdateGrenadeAnyPermission ||
		(isUserGrenade && hasUpdateGrenadeOwnPermission)

	const grenadeImages = loaderData.grenade.images.map((image) => ({
		src: `/resources/grenade-images/${image.id}`,
		alt: image.description ?? undefined,
		caption: image.description ?? undefined,
	}))

	return (
		<Dialog open onOpenChange={() => !activeLightbox && navigate('..')}>
			<DialogContent className="max-h-[90vh] max-w-5xl overflow-auto">
				<DialogHeader>
					<DialogTitle>{loaderData.grenade.name}</DialogTitle>
				</DialogHeader>
				<p>{loaderData.grenade.description}</p>
				<ul className="flex flex-wrap gap-4">
					{loaderData.grenade.images.map((image, index) => (
						<li key={image.id} className="w-48 space-y-1 md:w-64">
							<img
								src={`/resources/grenade-images/${image.id}`}
								className="aspect-square cursor-pointer object-cover shadow-md"
								onClick={() => openLightbox({ index, images: grenadeImages })}
							/>
							<p>{image.description}</p>
						</li>
					))}
				</ul>
				<div className="flex flex-wrap items-center justify-between gap-2">
					<Form method="POST">
						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										variant={
											loaderData.grenade.favorites.length > 0
												? 'default'
												: 'outline'
										}
										size="icon"
										type="submit"
										name="intent"
										value={
											loaderData.grenade.favorites.length > 0
												? 'remove-favorite'
												: 'add-favorite'
										}
									>
										<Icon name="star" />
										<span className="sr-only">
											{loaderData.grenade.favorites.length > 0
												? 'Remove from favorite'
												: 'Add to favorite'}
										</span>
									</Button>
								</TooltipTrigger>
								<TooltipContent>
									{loaderData.grenade.favorites.length > 0
										? 'Remove from favorite'
										: 'Add to favorite'}
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>
					</Form>
					{!loaderData.grenade.verified ? (
						<Form method="POST">
							<StatusButton
								variant="destructive"
								{...cancelDC.getButtonProps({
									type: 'submit',
									name: 'intent',
									value: 'cancel',
								})}
								status={isPending ? 'pending' : 'idle'}
							>
								{cancelDC.doubleCheck ? 'Are you sure?' : 'Cancel request'}
							</StatusButton>
						</Form>
					) : null}
					{loaderData.grenade.verified && (isUserGrenade || canEdit) ? (
						<Button asChild>
							<Link to="edit">{canEdit ? 'Edit' : 'Request changes'}</Link>
						</Button>
					) : (
						<ReportDialog type="grenade" grenadeId={loaderData.grenade.id} />
					)}
				</div>
			</DialogContent>
		</Dialog>
	)
}
