import {
	accesses,
	actions,
	entities,
	type Access,
	type Action,
	type Entity,
} from '#types/permissions.ts'
import { prisma } from '#app/utils/db.server.ts'

type PermissionArray = Array<{ entity: Entity; action: Action; access: Access }>

export async function createPermissions() {
	const permissionsToCreate = []
	for (const entity of entities) {
		for (const action of actions) {
			for (const access of accesses) {
				permissionsToCreate.push({ entity, action, access })
			}
		}
	}

	await prisma.permission.createMany({ data: permissionsToCreate })
}

async function createRole(
	name: string,
	priority: number,
	permissions: PermissionArray,
) {
	const permissionIds = await Promise.all(
		permissions.map(
			async ({ entity, action, access }) =>
				await prisma.permission.findFirst({
					where: { entity, action, access },
					select: { id: true },
				}),
		),
	)
	await prisma.role.create({
		data: {
			name,
			priority,
			permissions: {
				connect: permissionIds.filter(Boolean),
			},
		},
	})
}

export function createSuperAdminRole() {
	const permissions: PermissionArray = []

	for (const entity of entities) {
		for (const action of actions) {
			permissions.push({ entity, action, access: 'any' })
		}
	}

	return createRole('superadmin', 100, permissions)
}

export function createAdminRole() {
	const permissions: PermissionArray = []

	permissions.push({ entity: 'admin', action: 'read', access: 'any' })

	permissions.push({ entity: 'map', action: 'create', access: 'any' })
	permissions.push({ entity: 'map', action: 'read', access: 'any' })
	permissions.push({ entity: 'map', action: 'update', access: 'any' })
	permissions.push({ entity: 'map', action: 'delete', access: 'any' })

	permissions.push({ entity: 'destination', action: 'create', access: 'own' })
	permissions.push({ entity: 'destination', action: 'read', access: 'any' })
	permissions.push({ entity: 'destination', action: 'update', access: 'own' })
	permissions.push({ entity: 'destination', action: 'delete', access: 'own' })

	permissions.push({ entity: 'grenade', action: 'create', access: 'own' })
	permissions.push({ entity: 'grenade', action: 'read', access: 'any' })
	permissions.push({ entity: 'grenade', action: 'update', access: 'own' })
	permissions.push({ entity: 'grenade', action: 'delete', access: 'own' })

	permissions.push({
		entity: 'review-destination-request',
		action: 'create',
		access: 'any',
	})
	permissions.push({
		entity: 'review-destination-request',
		action: 'read',
		access: 'any',
	})
	permissions.push({
		entity: 'review-destination-request',
		action: 'update',
		access: 'any',
	})
	permissions.push({
		entity: 'review-destination-request',
		action: 'delete',
		access: 'any',
	})

	permissions.push({
		entity: 'review-grenade-request',
		action: 'create',
		access: 'any',
	})
	permissions.push({
		entity: 'review-grenade-request',
		action: 'read',
		access: 'any',
	})
	permissions.push({
		entity: 'review-grenade-request',
		action: 'update',
		access: 'any',
	})
	permissions.push({
		entity: 'review-grenade-request',
		action: 'delete',
		access: 'any',
	})

	permissions.push({ entity: 'support', action: 'create', access: 'any' })
	permissions.push({ entity: 'support', action: 'read', access: 'any' })
	permissions.push({ entity: 'support', action: 'update', access: 'any' })
	permissions.push({ entity: 'support', action: 'delete', access: 'any' })

	permissions.push({ entity: 'user', action: 'create', access: 'any' })
	permissions.push({ entity: 'user', action: 'read', access: 'any' })
	permissions.push({ entity: 'user', action: 'update', access: 'any' })
	permissions.push({ entity: 'user', action: 'delete', access: 'any' })

	return createRole('admin', 80, permissions)
}

export function createModeratorRole() {
	const permissions: PermissionArray = []

	permissions.push({ entity: 'admin', action: 'read', access: 'any' })

	permissions.push({ entity: 'map', action: 'read', access: 'own' })

	permissions.push({ entity: 'destination', action: 'create', access: 'own' })
	permissions.push({ entity: 'destination', action: 'read', access: 'own' })
	permissions.push({ entity: 'destination', action: 'update', access: 'own' })
	permissions.push({ entity: 'destination', action: 'delete', access: 'own' })

	permissions.push({ entity: 'grenade', action: 'create', access: 'own' })
	permissions.push({ entity: 'grenade', action: 'read', access: 'own' })
	permissions.push({ entity: 'grenade', action: 'update', access: 'own' })
	permissions.push({ entity: 'grenade', action: 'delete', access: 'own' })

	permissions.push({
		entity: 'review-destination-request',
		action: 'create',
		access: 'any',
	})
	permissions.push({
		entity: 'review-destination-request',
		action: 'read',
		access: 'any',
	})
	permissions.push({
		entity: 'review-destination-request',
		action: 'update',
		access: 'any',
	})
	permissions.push({
		entity: 'review-destination-request',
		action: 'delete',
		access: 'any',
	})

	permissions.push({
		entity: 'review-grenade-request',
		action: 'create',
		access: 'any',
	})
	permissions.push({
		entity: 'review-grenade-request',
		action: 'read',
		access: 'any',
	})
	permissions.push({
		entity: 'review-grenade-request',
		action: 'update',
		access: 'any',
	})
	permissions.push({
		entity: 'review-grenade-request',
		action: 'delete',
		access: 'any',
	})

	permissions.push({ entity: 'support', action: 'create', access: 'any' })
	permissions.push({ entity: 'support', action: 'read', access: 'any' })
	permissions.push({ entity: 'support', action: 'update', access: 'any' })
	permissions.push({ entity: 'support', action: 'delete', access: 'any' })

	permissions.push({ entity: 'user', action: 'create', access: 'own' })
	permissions.push({ entity: 'user', action: 'read', access: 'own' })
	permissions.push({ entity: 'user', action: 'update', access: 'own' })
	permissions.push({ entity: 'user', action: 'delete', access: 'own' })

	return createRole('moderator', 50, permissions)
}

export function createUserPlusRole() {
	const permissions: PermissionArray = []

	permissions.push({ entity: 'map', action: 'read', access: 'own' })

	permissions.push({ entity: 'destination', action: 'create', access: 'own' })
	permissions.push({ entity: 'destination', action: 'read', access: 'own' })
	permissions.push({ entity: 'destination', action: 'update', access: 'own' })
	permissions.push({ entity: 'destination', action: 'delete', access: 'own' })

	permissions.push({ entity: 'grenade', action: 'create', access: 'own' })
	permissions.push({ entity: 'grenade', action: 'read', access: 'own' })
	permissions.push({ entity: 'grenade', action: 'update', access: 'own' })
	permissions.push({ entity: 'grenade', action: 'delete', access: 'own' })

	permissions.push({ entity: 'support', action: 'create', access: 'own' })
	permissions.push({ entity: 'support', action: 'read', access: 'own' })
	permissions.push({ entity: 'support', action: 'update', access: 'own' })
	permissions.push({ entity: 'support', action: 'delete', access: 'own' })

	permissions.push({ entity: 'user', action: 'create', access: 'own' })
	permissions.push({ entity: 'user', action: 'read', access: 'own' })
	permissions.push({ entity: 'user', action: 'update', access: 'own' })
	permissions.push({ entity: 'user', action: 'delete', access: 'own' })

	return createRole('userplus', 0, permissions)
}

export function createUserRole() {
	const permissions: PermissionArray = []

	permissions.push({ entity: 'map', action: 'read', access: 'own' })

	permissions.push({ entity: 'destination', action: 'read', access: 'any' })

	permissions.push({ entity: 'grenade', action: 'read', access: 'any' })

	permissions.push({ entity: 'support', action: 'create', access: 'own' })
	permissions.push({ entity: 'support', action: 'read', access: 'own' })
	permissions.push({ entity: 'support', action: 'update', access: 'own' })
	permissions.push({ entity: 'support', action: 'delete', access: 'own' })

	permissions.push({ entity: 'user', action: 'create', access: 'own' })
	permissions.push({ entity: 'user', action: 'read', access: 'own' })
	permissions.push({ entity: 'user', action: 'update', access: 'own' })
	permissions.push({ entity: 'user', action: 'delete', access: 'own' })

	return createRole('user', 0, permissions)
}

async function generatePermissions() {
	console.log('🔐 Generating permissions...')
	console.time(`🔐 Permissions have been generated`)

	console.time('🧹 Cleaned up the permissions database...')
	await prisma.permission.deleteMany()
	await prisma.role.deleteMany()
	console.timeEnd('🧹 Cleaned up the permissions database...')

	console.time('📦 Generated the permissions database...')
	await createPermissions()
	console.timeEnd('📦 Generated the permissions database...')

	console.time('📦 Created the superadmin role...')
	await createSuperAdminRole()
	console.timeEnd('📦 Created the superadmin role...')

	console.time('📦 Created the admin role...')
	await createAdminRole()
	console.timeEnd('📦 Created the admin role...')

	console.time('📦 Created the moderator role...')
	await createModeratorRole()
	console.timeEnd('📦 Created the moderator role...')

	console.time('📦 Created the user plus role...')
	await createUserPlusRole()
	console.timeEnd('📦 Created the user plus role...')

	console.time('📦 Created the user role...')
	await createUserRole()
	console.timeEnd('📦 Created the user role...')

	console.timeEnd(`🔐 Permissions have been generated`)
}

generatePermissions()
	.catch((e) => {
		console.error(e)
		process.exit(1)
	})
	.finally(async () => {
		await prisma.$disconnect()
	})
