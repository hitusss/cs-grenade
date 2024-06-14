import { invariantResponse } from '@epic-web/invariant'

import { prisma } from '#app/utils/db.server.ts'
import {
	getUserPermissions,
	unauthorized,
} from '#app/utils/permissions.server.ts'
import { userHasPermission } from '#app/utils/permissions.ts'
import { redirectWithToast } from '#app/utils/toast.server.ts'

type GrenadeType = {
	id: string
	name: string
	description?: string
	x: string
	y: string
	images: (
		| {
				type: 'new'
				data: {
					id?: undefined
					contentType: string
					blob: Buffer
					description?: string
					order: string
				}
		  }
		| {
				type: 'edit'
				data: {
					id: string
					contentType?: string
					blob?: Buffer
					description?: string
					order: string
				}
		  }
	)[]
}

export async function editGrenade({
	userId,
	isOwn,
	id,
	name,
	description,
	x,
	y,
	images,
}: {
	userId: string
	isOwn: boolean
} & GrenadeType) {
	const userPermissions = await getUserPermissions(userId)
	const hasUpdateGrenadePermission = userHasPermission(
		userPermissions,
		isOwn ? 'update:grenade' : 'update:grenade:any',
	)

	if (!isOwn && !hasUpdateGrenadePermission) {
		throw unauthorized({
			message: 'You do not have permission to edit this grenade',
		})
	}

	if (hasUpdateGrenadePermission) {
		return await updateGrenade({
			id,
			name,
			description,
			x,
			y,
			images,
		})
	} else {
		return await requestGrenadeChanges({
			userId,
			id,
			name,
			description,
			x,
			y,
			images,
		})
	}
}

async function updateGrenade({
	id,
	name,
	description,
	x,
	y,
	images,
}: GrenadeType) {
	const grenade = await prisma.grenade.update({
		where: {
			id,
		},
		data: {
			name,
			description,
			x,
			y,
		},
		select: {
			images: {
				select: {
					id: true,
				},
			},
		},
	})

	await Promise.all(
		grenade.images
			.filter(
				img =>
					images.findIndex(i =>
						i.type === 'new' ? false : i.data.id === img.id,
					) === -1,
			)
			.map(async img => {
				await prisma.grenadeImage.delete({
					where: {
						id: img.id,
					},
				})
			}),
	)

	await Promise.all(
		images.map(async ({ type, data }) => {
			if (type === 'new') {
				await prisma.grenadeImage.create({
					data: {
						...data,
						grenadeId: id,
					},
				})
			} else {
				const keys = Object.keys(data) as Array<keyof typeof data>
				keys.forEach(k => {
					if (!data[k]) delete data[k]
				})
				await prisma.grenadeImage.update({
					where: {
						id: data.id,
					},
					data,
				})
			}
		}),
	)

	return await redirectWithToast(`..`, {
		title: 'Grenade updated',
		description: ``,
		type: 'success',
	})
}

async function requestGrenadeChanges({
	userId,
	id,
	name,
	description,
	x,
	y,
	images,
}: { userId: string } & GrenadeType) {
	const prevGrenade = await prisma.grenade.findUnique({
		where: {
			id,
		},
		select: {
			name: true,
			description: true,
			x: true,
			y: true,
			images: {
				select: {
					id: true,
					order: true,
					description: true,
				},
			},
			grenadeChanges: {
				select: {
					id: true,
				},
			},
		},
	})

	invariantResponse(prevGrenade, 'Not found', { status: 404 })
	invariantResponse(
		prevGrenade.grenadeChanges,
		'You have pending changes to this grenade',
		{ status: 400 },
	)

	const newImages = images.filter(i => i.type === 'new').map(i => i.data)
	const editedImages = images
		.filter(({ type, data }) => {
			if (type === 'new') return false
			const prevImage = prevGrenade.images.find(img => img.id === data.id)

			const imageChanged = Boolean(data.blob)
			const orderChanged = data.order !== prevImage?.order
			const descriptionChanged =
				prevImage?.description === null
					? data.description
					: data.description !== prevImage?.description

			return imageChanged || orderChanged || descriptionChanged
		})
		.map(i => i.data)
	const deletedImages = prevGrenade.images
		.filter(
			img =>
				images.findIndex(i => i.type === 'edit' && i.data.id === img.id) === -1,
		)
		.map(img => img.id)

	if (
		name === prevGrenade.name &&
		description === prevGrenade.description &&
		x === prevGrenade.x &&
		y === prevGrenade.y &&
		newImages.length < 1 &&
		editedImages.length < 1 &&
		deletedImages.length < 1
	) {
		return await redirectWithToast(`..`, {
			title: 'There are no changes to save.',
			description: ``,
			type: 'message',
		})
	}

	const grenadeChanges = await prisma.grenadeChanges.create({
		data: {
			grenadeId: id,
			userId,
			name,
			description,
			x,
			y,
		},
		select: {
			id: true,
		},
	})

	await Promise.all([
		...newImages.map(async img => {
			return await prisma.grenadeImageChanges.create({
				data: {
					...img,
					grenadeId: grenadeChanges.id,
				},
			})
		}),
		...editedImages.map(async img => {
			return await prisma.grenadeImageChanges.create({
				data: {
					...img,
					grenadeId: grenadeChanges.id,
					grenadeImageId: img.id,
				},
			})
		}),
		...deletedImages.map(async imgId => {
			return await prisma.grenadeImageChanges.create({
				data: {
					delete: true,
					grenadeId: grenadeChanges.id,
					grenadeImageId: imgId,
				},
			})
		}),
	])

	return await redirectWithToast(`..`, {
		title: 'Grenade changes requested',
		description: ``,
		type: 'success',
	})
}

export async function deleteGrenade({
	userId,
	isOwn,
	id,
}: {
	userId: string
	isOwn: boolean
	id: string
}) {
	const userPermissions = await getUserPermissions(userId)
	const hasDeleteGrenadePermission = userHasPermission(
		userPermissions,
		isOwn ? 'delete:grenade' : 'delete:grenade:any',
	)

	if (!hasDeleteGrenadePermission) {
		throw unauthorized({
			message: 'You do not have permission to delete this grenade',
		})
	}

	await prisma.grenade.delete({
		where: {
			id,
		},
	})

	return await redirectWithToast(`..`, {
		title: `Grenade deleted`,
		description: ``,
		type: 'success',
	})
}

export async function cancelEditGrenadeRequest({
	isOwn,
	id,
}: {
	isOwn: boolean
	id: string
}) {
	if (!isOwn) {
		throw unauthorized({
			message: 'You do not have permission to cancel this request',
		})
	}

	await prisma.grenadeChanges.delete({
		where: {
			grenadeId: id,
		},
	})

	return await redirectWithToast(`..`, {
		title: `Grenade changes cancelled`,
		description: ``,
		type: 'success',
	})
}
