import { data, Form, useSearchParams } from 'react-router'
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
	DialogTitle,
	DialogTrigger,
} from '#app/components/ui/dialog.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { DiffView } from '#app/components/diff.tsx'
import { GrenadeMarker } from '#app/components/grenade-marker.tsx'
import { useLightbox } from '#app/components/lightbox.tsx'
import { MapBackButton } from '#app/components/map.tsx'

import { type MapHandle } from '../../../../../_layout.tsx'
import { type Route } from './+types/changes-request.ts'

const DEFAULT_REDIRECT_TO = '/admin/requests/grenades-changes'

export const handle: MapHandle = {
	map: {
		currentDestination: true,
		currentGrenade: true,
		disableAllGrenades: true,
		hideCurrentGrenade: true,
	},
}

export async function loader({ request, params }: Route.LoaderArgs) {
	await requireUserWithPermission(request, 'update:review-grenade-request:any')

	const { grenade: grenadeId } = params

	invariantResponse(grenadeId, 'Grenade is required')

	const grenade = await prisma.grenade.findUnique({
		where: {
			id: grenadeId,
		},
		select: {
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
					order: true,
					description: true,
				},
			},
		},
	})

	invariantResponse(grenade, 'Not fount', { status: 404 })

	const grenadeChanges = await prisma.grenadeChanges.findUnique({
		where: {
			grenadeId,
		},
		select: {
			name: true,
			description: true,
			x: true,
			y: true,
			grenadeImageChanges: {
				orderBy: {
					order: 'asc',
				},
				select: {
					id: true,
					contentType: true,
					delete: true,
					order: true,
					description: true,
					grenadeImageId: true,
				},
			},
		},
	})

	invariantResponse(grenadeChanges, 'Not fount', {
		status: 404,
	})

	return data({
		grenade,
		grenadeChanges,
	})
}

export async function action({ request, params }: Route.ActionArgs) {
	await requireUserWithPermission(request, 'update:review-grenade-request:any')

	const { grenade: grenadeId } = params

	invariantResponse(grenadeId, 'Grenade is required')

	const grenade = await prisma.grenade.findUnique({
		where: {
			id: grenadeId,
		},
		select: {
			name: true,
			destinationId: true,
			mapName: true,
			team: true,
			type: true,
			userId: true,
		},
	})

	invariantResponse(grenade, 'Not fount', { status: 404 })

	const searchParams = new URL(request.url).searchParams
	const redirectTo = searchParams.get('redirectTo') ?? DEFAULT_REDIRECT_TO

	const formData = await request.formData()

	const intent = formData.get('intent')

	switch (intent) {
		case 'accept': {
			const grenadeChanges = await prisma.grenadeChanges.findUnique({
				where: {
					grenadeId,
				},
				select: {
					name: true,
					description: true,
					x: true,
					y: true,
					grenadeImageChanges: {
						orderBy: {
							order: 'asc',
						},
						select: {
							blob: true,
							contentType: true,
							delete: true,
							order: true,
							description: true,
							grenadeImageId: true,
						},
					},
				},
			})

			if (!grenadeChanges) {
				return redirectWithToast(redirectTo, {
					type: 'error',
					title: 'Grenade changes already reviewed',
					description: ``,
				})
			}

			await prisma.grenade.update({
				where: {
					id: grenadeId,
				},
				data: {
					name: grenadeChanges.name,
					description: grenadeChanges.description ?? undefined,
					x: grenadeChanges.x,
					y: grenadeChanges.y,
				},
			})
			await Promise.all(
				grenadeChanges.grenadeImageChanges.map(async (img) => {
					if (!img.grenadeImageId) {
						if (!img.contentType || !img.blob || !img.order) return
						await prisma.grenadeImage.create({
							data: {
								contentType: img.contentType,
								blob: img.blob,
								description: img.description,
								order: img.order,
								grenadeId,
							},
						})
					} else if (img.delete) {
						await prisma.grenadeImage.delete({
							where: {
								id: img.grenadeImageId,
							},
						})
					} else {
						const imageData: {
							contentType?: string
							blob?: Uint8Array
							description?: string
							order?: string
						} = {}
						if (img.contentType && img.blob) {
							imageData.contentType = img.contentType
							imageData.blob = img.blob
						}
						if (img.description) imageData.description = img.description
						if (img.order) imageData.order = img.order
						if (imageData.contentType && imageData.blob) {
							const deletedImage = await prisma.grenadeImage.delete({
								where: {
									id: img.grenadeImageId,
								},
								select: {
									contentType: true,
									blob: true,
									description: true,
									order: true,
								},
							})
							if (!imageData.order) {
								imageData.order = deletedImage.order
							}
							await prisma.grenadeImage.create({
								data: {
									contentType: imageData.contentType,
									blob: imageData.blob,
									order: imageData.order,
									description: imageData.description,
									grenadeId,
								},
							})
						} else {
							await prisma.grenadeImage.update({
								where: {
									id: img.grenadeImageId,
								},
								data: imageData,
							})
						}
					}
				}),
			)

			await prisma.grenadeChanges.delete({ where: { grenadeId } })
			if (grenade.userId) {
				await notify({
					userId: grenade.userId,
					title: 'Grenade changes request accepted',
					description: `Your grenade changes request for ${grenade.name} has been accepted`,
					redirectTo: `/map/${grenade.mapName}/${grenade.team}/${grenade.type}/${grenade.destinationId}/${grenadeId}`,
				})
			}
			break
		}
		case 'reject': {
			await prisma.grenadeChanges.delete({ where: { grenadeId } })
			if (grenade.userId) {
				await notify({
					userId: grenade.userId,
					title: 'Grenade changes request rejected',
					description: `Your grenade changes request for ${grenade.name} has been rejected`,
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
		title: 'Grenade changes request reviewed',
		description: ``,
	})
}

export default function MapAdminGrenadeChangesRequestRoute({
	loaderData,
}: Route.ComponentProps) {
	const [searchParams] = useSearchParams()

	const isPending = useIsPending()

	const redirectTo = searchParams.get('redirectTo') ?? DEFAULT_REDIRECT_TO

	const hasChangedPosition =
		loaderData.grenade.x !== loaderData.grenadeChanges.x ||
		loaderData.grenade.y !== loaderData.grenadeChanges.y
	const hasChangedName =
		loaderData.grenade.name !== loaderData.grenadeChanges.name
	const hasChangedDescription =
		loaderData.grenade.description !== loaderData.grenadeChanges.description
	const hasDeletedDescription = loaderData.grenadeChanges.description === null

	const imagesLength = loaderData.grenade.images.reduce(
		(acc, img) => (img.order ? (+img.order > acc ? +img.order : acc) : acc),
		0,
	)
	const imagesChangesLength =
		loaderData.grenadeChanges.grenadeImageChanges?.reduce(
			(acc, img) => (img.order ? (+img.order > acc ? +img.order : acc) : acc),
			0,
		) || 0

	return (
		<>
			<MapBackButton to={redirectTo} />
			<GrenadeMarker
				to=""
				destination={{
					x: loaderData.grenade.x,
					y: loaderData.grenade.y,
				}}
				coords={{
					x: loaderData.grenade.x,
					y: loaderData.grenade.y,
				}}
				name={loaderData.grenade.name}
				highlight={!hasChangedPosition}
				disabled
				className={cn({
					'border-diff-red bg-diff-red/50': hasChangedPosition,
				})}
			/>
			{hasChangedPosition ? (
				<GrenadeMarker
					to=""
					destination={{
						x: loaderData.grenadeChanges.x,
						y: loaderData.grenadeChanges.y,
					}}
					coords={{
						x: loaderData.grenadeChanges.x,
						y: loaderData.grenadeChanges.y,
					}}
					name={loaderData.grenadeChanges.name}
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
				<DialogContent className="max-h-[90vh] max-w-5xl overflow-auto">
					<DialogHeader>
						<DialogTitle>Grenade changes request</DialogTitle>
					</DialogHeader>
					<DiffView
						name="Name"
						oldValue={loaderData.grenade.name}
						newValue={
							hasChangedName ? loaderData.grenadeChanges.name : undefined
						}
					/>
					<DiffView
						name="Description"
						oldValue={loaderData.grenade.description}
						newValue={
							hasChangedDescription
								? loaderData.grenadeChanges.description
								: undefined
						}
						deleted={hasDeletedDescription}
					/>

					{new Array(Math.max(imagesLength, imagesChangesLength) + 1)
						.fill(null)
						.map((_, i) => (
							<ImageDiffView
								key={i}
								index={i}
								image={loaderData.grenade.images[i]}
								imagesChanges={loaderData.grenadeChanges.grenadeImageChanges}
							/>
						))}

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

function ImageDiffView({
	index,
	image,
	imagesChanges,
}: {
	index: number
	image?: { id: string; description: string | null; order: string }
	imagesChanges?: {
		id: string
		description: string | null
		contentType: string | null
		order: string | null
		grenadeImageId: string | null
		delete: boolean
	}[]
}) {
	const { openLightbox } = useLightbox()

	const changes =
		imagesChanges?.find((img) => img.order && +img.order === index) ||
		imagesChanges?.find((img) => img.grenadeImageId === image?.id && img.delete)

	return (
		<DiffView
			name={`Image ${index + 1}`}
			oldValue={
				image ? (
					<div className="w-32">
						<img
							src={`/resources/grenade-images/${image.id}`}
							alt=""
							className="size-32 object-cover"
							onClick={() =>
								openLightbox({
									index: 0,
									images: [{ src: `/resources/grenade-images/${image.id}` }],
								})
							}
						/>
						<p className="text-sm">{image.description}</p>
					</div>
				) : undefined
			}
			newValue={
				changes && !changes.delete ? (
					<div className="w-32">
						<img
							src={
								changes.contentType
									? `/resources/grenade-changes-images/${changes.id}`
									: `/resources/grenade-images/${changes.grenadeImageId}`
							}
							alt=""
							className="size-32 object-cover"
							onClick={() =>
								openLightbox({
									index: 0,
									images: [
										{
											src: changes.contentType
												? `/resources/grenade-changes-images/${changes.id}`
												: `/resources/grenade-images/${changes.grenadeImageId}`,
										},
									],
								})
							}
						/>
						<p className="text-sm">{changes.description}</p>
					</div>
				) : undefined
			}
			deleted={changes?.delete}
		/>
	)
}
