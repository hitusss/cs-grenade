import { data, Form, useSearchParams } from 'react-router'
import { invariantResponse } from '@epic-web/invariant'

import {
	deleteGrenade,
	getGrenade,
	getSimpleGrenade,
	updateGrenadeVerifiedStatus,
} from '#app/models/index.server.ts'
import { useIsPending } from '#app/utils/misc.tsx'
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
import { GrenadeMarker } from '#app/components/grenade-marker.tsx'
import { useLightbox } from '#app/components/lightbox.tsx'
import { MapBackButton, MapTitle } from '#app/components/map.tsx'

import { type MapHandle } from '../../../../../_layout.tsx'
import { type Route } from './+types/request.ts'

const DEFAULT_REDIRECT_TO = '/admin/requests/grenades'

export const handle: MapHandle = {
	map: {
		currentDestination: true,
		disableAllGrenades: true,
	},
}

export async function loader({ request, params }: Route.LoaderArgs) {
	await requireUserWithPermission(request, 'create:review-grenade-request:any')

	const { grenade: grenadeId } = params

	invariantResponse(grenadeId, 'Grenade is required')

	const grenade = await getGrenade({
		grenadeId,
		verified: false,
	})

	invariantResponse(grenade, 'Not fount', { status: 404 })

	return data({ grenade })
}

export async function action({ request, params }: Route.ActionArgs) {
	await requireUserWithPermission(request, 'create:review-grenade-request:any')

	const { grenade: grenadeId } = params

	invariantResponse(grenadeId, 'Grenade is required')

	const grenade = await getSimpleGrenade(grenadeId)

	invariantResponse(grenade, 'Not fount', { status: 404 })

	const searchParams = new URL(request.url).searchParams
	const redirectTo = searchParams.get('redirectTo') ?? DEFAULT_REDIRECT_TO

	if (grenade.verified) {
		return redirectWithToast(redirectTo, {
			type: 'error',
			title: 'Grenade already verified',
			description: ``,
		})
	}

	const formData = await request.formData()

	const intent = formData.get('intent')

	switch (intent) {
		case 'accept': {
			await updateGrenadeVerifiedStatus({
				grenadeId,
				verified: true,
			})
			if (grenade.userId) {
				await notify({
					userId: grenade.userId,
					title: 'Grenade request accepted',
					description: `Your grenade request for ${grenade.name} has been accepted`,
					redirectTo: `/map/${grenade.mapName}/${grenade.team}/${grenade.type}/${grenade.destinationId}/${grenadeId}`,
				})
			}
			break
		}
		case 'reject': {
			await deleteGrenade({ grenadeId })
			if (grenade.userId) {
				await notify({
					userId: grenade.userId,
					title: 'Grenade request rejected',
					description: `Your grenade request for ${grenade.name} has been rejected`,
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
		title: 'Grenade request reviewed',
		description: ``,
	})
}

export default function MapAdminGrenadeRequestRoute({
	loaderData,
}: Route.ComponentProps) {
	const [searchParams] = useSearchParams()

	const isPending = useIsPending()
	const { openLightbox } = useLightbox()

	const redirectTo = searchParams.get('redirectTo') ?? DEFAULT_REDIRECT_TO

	const grenadeImages = loaderData.grenade.images.map((image) => ({
		src: `/resources/grenade-images/${image.id}`,
		alt: image.description ?? undefined,
		caption: image.description ?? undefined,
	}))

	return (
		<>
			<MapBackButton to={redirectTo} />
			<MapTitle>{loaderData.grenade.name}</MapTitle>
			<GrenadeMarker
				to=""
				destination={{ x: loaderData.grenade.x, y: loaderData.grenade.y }}
				coords={{ x: loaderData.grenade.x, y: loaderData.grenade.y }}
				name={loaderData.grenade.name}
				highlight
				disabled
			/>

			<Dialog>
				<DialogTrigger asChild>
					<Button className="absolute right-0 bottom-0 z-10">
						Show content
					</Button>
				</DialogTrigger>
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
					<DialogFooter>
						<Form method="POST" className="flex gap-4">
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
