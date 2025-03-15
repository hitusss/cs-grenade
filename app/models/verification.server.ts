import { type Verification } from '@prisma/client'

import { type OptionalNullable } from '#types/utils.ts'
import { prisma } from '#app/utils/db.server.ts'

export async function createOrUpdateVerification(
	data: OptionalNullable<Omit<Verification, 'id' | 'createdAt'>>,
) {
	return prisma.verification.upsert({
		where: { target_type: { target: data.target, type: data.type } },
		create: data,
		update: data,
	})
}

export async function getVerification({
	target,
	type,
}: {
	target: Verification['target']
	type: Verification['type']
}) {
	return prisma.verification.findUnique({
		where: {
			target_type: { target, type },
			OR: [{ expiresAt: { gt: new Date() } }, { expiresAt: null }],
		},
		select: {
			id: true,
			algorithm: true,
			secret: true,
			period: true,
			digits: true,
			charSet: true,
		},
	})
}

export async function getActiveVerification({
	target,
	type,
}: {
	target: Verification['target']
	type: Verification['type']
}) {
	return prisma.verification.findUnique({
		where: {
			target_type: { target, type },
			OR: [{ expiresAt: { gt: new Date() } }, { expiresAt: null }],
		},
		select: {
			id: true,
			algorithm: true,
			secret: true,
			period: true,
			charSet: true,
			digits: true,
		},
	})
}

export async function getVerificationId({
	target,
	type,
}: {
	target: Verification['target']
	type: Verification['type']
}) {
	return prisma.verification.findUnique({
		where: {
			target_type: { target, type },
		},
		select: { id: true },
	})
}

export async function updateVerifiactionType({
	target,
	type,
	newType,
}: {
	target: Verification['target']
	type: Verification['type']
	newType: Verification['type']
}) {
	return prisma.verification.update({
		where: { target_type: { target: target, type: type } },
		data: { type: newType },
	})
}

export async function deleteVerification({
	target,
	type,
}: {
	target: Verification['target']
	type: Verification['type']
}) {
	return prisma.verification.delete({
		where: { target_type: { target, type } },
	})
}

export async function deleteMayVerifications({
	target,
	type,
}: {
	target: Verification['target']
	type: Verification['type']
}) {
	return prisma.verification.delete({
		where: { target_type: { target, type } },
	})
}
