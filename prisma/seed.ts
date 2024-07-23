import { promiseHash } from 'remix-utils/promise'

import {
	accesses,
	actions,
	entities,
	type Access,
	type Action,
	type Entity,
} from '#types/permissions.ts'
import { prisma } from '#app/utils/db.server.ts'
import { MOCK_CODE_GITHUB } from '#app/utils/providers/constants'

import {
	cleanupDb,
	createPassword,
	createUser,
	getUserImages,
	img,
} from '#tests/db-utils.ts'
import { insertGitHubUser } from '#tests/mocks/github.ts'

const roles: Record<
	string,
	{ priority: number; permissions: `${Action}:${Entity}:${Access}`[] }
> = {
	superadmin: {
		priority: 100,
		permissions: [
			/* user */
			'create:user:any',
			'read:user:any',
			'update:user:any',
			'delete:user:any',
			/* support */
			'create:support:any',
			'read:support:any',
			'update:support:any',
			'delete:support:any',
			/* map */
			'create:map:any',
			'read:map:any',
			'update:map:any',
			'delete:map:any',
			/* destinatin */
			'create:destination:any',
			'read:destination:any',
			'update:destination:any',
			'delete:destination:any',
			/* grenade */
			'create:grenade:any',
			'read:grenade:any',
			'update:grenade:any',
			'delete:grenade:any',
			/* admin */
			'create:admin:any',
			'read:admin:any',
			'update:admin:any',
			'delete:admin:any',
			/* cache */
			'create:cache:any',
			'read:cache:any',
			'update:cache:any',
			'delete:cache:any',
			/* review-destination-request */
			'create:review-destination-request:any',
			'read:review-destination-request:any',
			'update:review-destination-request:any',
			'delete:review-destination-request:any',
			/* review-grenade-request */
			'create:review-grenade-request:any',
			'read:review-grenade-request:any',
			'update:review-grenade-request:any',
			'delete:review-grenade-request:any',
		],
	},
	admin: {
		priority: 80,
		permissions: [
			/* user */
			'create:user:any',
			'read:user:any',
			'update:user:any',
			'delete:user:any',
			/* support */
			'create:support:any',
			'read:support:any',
			'update:support:any',
			'delete:support:any',
			/* map */
			'create:map:any',
			'read:map:any',
			'update:map:any',
			'delete:map:any',
			/* destinatin */
			'create:destination:own',
			'read:destination:any',
			'update:destination:own',
			'delete:destination:own',
			/* grenade */
			'create:grenade:own',
			'read:grenade:any',
			'update:grenade:own',
			'delete:grenade:own',
			/* admin */
			'read:admin:any',
			/* cache */
			/* review-destination-request */
			'create:review-destination-request:any',
			'read:review-destination-request:any',
			'update:review-destination-request:any',
			'delete:review-destination-request:any',
			/* review-grenade-request */
			'create:review-grenade-request:any',
			'read:review-grenade-request:any',
			'update:review-grenade-request:any',
			'delete:review-grenade-request:any',
		],
	},
	moderator: {
		priority: 50,
		permissions: [
			/* user */
			'create:user:own',
			'read:user:own',
			'update:user:own',
			'delete:user:own',
			/* support */
			'create:support:any',
			'read:support:any',
			'update:support:any',
			'delete:support:any',
			/* map */
			'read:map:own',
			/* destinatin */
			'create:destination:own',
			'read:destination:own',
			'update:destination:own',
			'delete:destination:own',
			/* grenade */
			'create:grenade:own',
			'read:grenade:own',
			'update:grenade:own',
			'delete:grenade:own',
			/* admin */
			'read:admin:any',
			/* cache */
			/* review-destination-request */
			'create:review-destination-request:any',
			'read:review-destination-request:any',
			'update:review-destination-request:any',
			'delete:review-destination-request:any',
			/* review-grenade-request */
			'create:review-grenade-request:any',
			'read:review-grenade-request:any',
			'update:review-grenade-request:any',
			'delete:review-grenade-request:any',
		],
	},
	userplus: {
		priority: 5,
		permissions: [
			/* user */
			'create:user:own',
			'read:user:own',
			'update:user:own',
			'delete:user:own',
			/* support */
			'create:support:own',
			'read:support:own',
			'update:support:own',
			'delete:support:own',
			/* map */
			'read:map:own',
			/* destinatin */
			'create:destination:own',
			'read:destination:own',
			'update:destination:own',
			'delete:destination:own',
			/* grenade */
			'create:grenade:own',
			'read:grenade:own',
			'update:grenade:own',
			'delete:grenade:own',
			/* admin */
			/* cache */
			/* review-destination-request */
			/* review-grenade-request */
		],
	},
	user: {
		priority: 0,
		permissions: [
			/* user */
			'create:user:own',
			'read:user:own',
			'update:user:own',
			'delete:user:own',
			/* support */
			'create:support:own',
			'read:support:own',
			'update:support:own',
			'delete:support:own',
			/* map */
			'read:map:own',
			/* destinatin */
			'read:destination:own',
			/* grenade */
			'read:grenade:own',
			/* admin */
			/* cache */
			/* review-destination-request */
			/* review-grenade-request */
		],
	},
}

const maps = [
	{ name: 'ancient', label: 'Ancient' },
	{ name: 'anubis', label: 'Anubis' },
	{ name: 'dust_2', label: 'Dust 2' },
	{ name: 'inferno', label: 'Inferno' },
	{ name: 'mirage', label: 'Mirage' },
	{ name: 'nuke', label: 'Nuke' },
	{ name: 'overpass', label: 'Overpass' },
	{ name: 'vertigo', label: 'Vertigo' },
]

async function seed() {
	console.log('🌱 Seeding...')
	console.time(`🌱 Database has been seeded`)

	console.time('🧹 Cleaned up the database...')
	await cleanupDb(prisma)
	console.timeEnd('🧹 Cleaned up the database...')

	if (!process.env.SKIP_PERMISSIONS) {
		console.time('🔑 Created permissions')
		const permissionsToCreate = []
		for (const entity of entities) {
			for (const action of actions) {
				for (const access of accesses) {
					permissionsToCreate.push({ entity, action, access })
				}
			}
		}
		await prisma.permission.createMany({ data: permissionsToCreate })
		console.timeEnd('🔑 Created permissions')
	}

	if (!process.env.SKIP_ROLES) {
		console.time('🔐 Created roles')
		for (let role in roles) {
			const roleData = roles[role]
			if (!roleData) {
				throw new Error(`Error creating role: ${role}`)
			}
			const permissions = roleData.permissions.map((p) => {
				const [action, entity, access] = p.split(':')
				if (!action || !entity || !access) {
					throw new Error(`Error parsing permissions for role: ${role}`)
				}
				return { action_entity_access: { access, entity, action } }
			})
			await prisma.role.create({
				data: {
					name: role,
					priority: roleData.priority,
					permissions: {
						connect: permissions,
					},
				},
			})
		}
		console.timeEnd('🔐 Created roles')
	}

	if (!process.env.SKIP_MAPS) {
		console.time('🗺️ Created maps')
		for (let map of maps) {
			const mapImages = await promiseHash({
				image: img({
					filepath: `./tests/fixtures/images/map/${map.name}_image.png`,
				}),
				logo: img({
					filepath: `./tests/fixtures/images/map/${map.name}_logo.png`,
				}),
				radar: img({
					filepath: `./tests/fixtures/images/map/${map.name}_radar.svg`,
				}),
			})
			await prisma.map.create({
				data: {
					name: map.name,
					label: map.label,
					image: {
						create: {
							...mapImages.image,
						},
					},
					logo: {
						create: {
							...mapImages.logo,
						},
					},
					radar: {
						create: {
							...mapImages.radar,
						},
					},
					user: {
						connectOrCreate: {
							where: {
								username: 'maps',
							},
							create: {
								username: 'maps',
								email: 'maps',
							},
						},
					},
				},
			})
		}
		console.timeEnd('🗺️ Created maps')
	}

	if (!process.env.SKIP_USERS) {
		const totalUsers = process.env.SEED_USERS
			? Number(process.env.SEED_USERS)
			: 5
		console.time(`👤 Created ${totalUsers} users...`)
		const userImages = await getUserImages()

		for (let index = 0; index < totalUsers; index++) {
			const userData = createUser()
			await prisma.user
				.create({
					select: { id: true },
					data: {
						...userData,
						password: { create: createPassword(userData.username) },
						image: { create: userImages[index % userImages.length] },
						roles: { connect: { name: 'user' } },
					},
				})
				.catch((e) => {
					console.error('Error creating a user:', e)
					return null
				})
		}
		console.timeEnd(`👤 Created ${totalUsers} users...`)
	}

	if (!process.env.SKIP_ADMIN_USER) {
		console.time(`👑 Created admin user`)
		const githubUser = await insertGitHubUser(MOCK_CODE_GITHUB)

		await prisma.user.create({
			select: { id: true },
			data: {
				email: 'admin',
				username: 'admin',
				name: 'Admin',
				password: { create: createPassword('password') },
				connections: {
					create: { providerName: 'github', providerId: githubUser.profile.id },
				},
				roles: { connect: [{ name: 'superadmin' }, { name: 'user' }] },
			},
		})
		console.timeEnd(`👑 Created admin user`)
	}

	console.timeEnd(`🌱 Database has been seeded`)
}

seed()
	.catch((e) => {
		console.error(e)
		process.exit(1)
	})
	.finally(async () => {
		await prisma.$disconnect()
	})

// we're ok to import from the test directory in this file
/*
eslint
	no-restricted-imports: "off",
*/
