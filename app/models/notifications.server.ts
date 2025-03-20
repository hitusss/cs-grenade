import { type Notification, type User } from '@prisma/client'

import { type OptionalNullable } from '#types/utils.ts'
import { prisma } from '#app/utils/db.server.ts'

export async function createNotification({
	userId,
	title,
	description,
	redirectTo,
}: OptionalNullable<{
	userId: User['id']
	title: Notification['title']
	description: Notification['description']
	redirectTo: Notification['redirectTo']
}>) {
	return prisma.notification.create({
		data: {
			userId,
			title,
			description,
			redirectTo,
		},
	})
}

export async function getNotifications(userId: User['id']) {
	return prisma.notification.findMany({
		where: {
			userId,
		},
		select: {
			id: true,
			title: true,
			description: true,
			redirectTo: true,
			seen: true,
			createdAt: true,
		},
		orderBy: {
			createdAt: 'desc',
		},
	})
}

export async function updateNotificationAsSeen({
	userId,
	notificationId,
}: {
	userId: User['id']
	notificationId: Notification['id']
}) {
	return prisma.notification.update({
		where: {
			id: notificationId,
			userId,
		},
		data: {
			seen: true,
		},
	})
}

export async function deleteNotification({
	userId,
	notificationId,
}: {
	userId: User['id']
	notificationId: Notification['id']
}) {
	return prisma.notification.delete({
		where: {
			id: notificationId,
			userId,
		},
	})
}
