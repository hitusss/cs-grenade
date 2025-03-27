import { type UserImage } from '@prisma/client'

import { prisma } from '#app/utils/db.server.ts'

export async function getUserImage(imageId: UserImage['id']) {
	return prisma.userImage.findUnique({
		where: { id: imageId },
		select: { contentType: true, blob: true },
	})
}

export async function updateUserImage({
	userId,
	image,
}: {
	userId: UserImage['userId']
	image: Pick<UserImage, 'contentType' | 'blob'>
}) {
	return prisma.user.update({
		where: { id: userId },
		data: { image: { create: image } },
	})
}

export async function deleteUserImage(userId: UserImage['userId']) {
	return prisma.userImage.deleteMany({ where: { userId } })
}
