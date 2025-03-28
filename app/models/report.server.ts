import { type Report } from '@prisma/client'

import { type OptionalNullable } from '#types/utils.ts'
import { prisma } from '#app/utils/db.server.ts'

export async function createReport({
	userId,
	destinationId,
	grenadeId,
	message,
}: OptionalNullable<{
	userId: Report['userId']
	destinationId: Report['destinationId']
	grenadeId: Report['grenadeId']
	message: Report['message']
}>) {
	return prisma.report.create({
		data: {
			userId,
			destinationId,
			grenadeId,
			message,
		},
	})
}

export async function getUserRecentReportCount({
	userId,
	destinationId,
	grenadeId,
	date,
}: OptionalNullable<{
	userId: Report['userId']
	destinationId: Report['destinationId']
	grenadeId: Report['grenadeId']
	date: number
}>) {
	return prisma.report.count({
		where: {
			userId,
			destinationId,
			grenadeId,
			createdAt: {
				gte: new Date(date).toISOString(),
			},
		},
	})
}

export async function deleteReport(reportId: Report['id']) {
	return prisma.report.delete({
		where: {
			id: reportId,
		},
	})
}

export async function deleteAllDestinationReports(
	destinationId: Report['grenadeId'],
) {
	return prisma.report.deleteMany({
		where: {
			destinationId,
		},
	})
}

export async function deleteAllGrenadeReports(grenadeId: Report['grenadeId']) {
	return prisma.report.deleteMany({
		where: {
			grenadeId,
		},
	})
}
