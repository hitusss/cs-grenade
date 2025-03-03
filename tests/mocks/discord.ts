import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { faker } from '@faker-js/faker'
import fsExtra from 'fs-extra'
import { http, HttpResponse, passthrough, type HttpHandler } from 'msw'

const { json } = HttpResponse

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const here = (...s: Array<string>) => path.join(__dirname, ...s)

const discordUserFixturePath = path.join(
	here(
		'..',
		'fixtures',
		'discord',
		`users.${process.env.VITEST_POOL_ID || 0}.local.json`,
	),
)

await fsExtra.ensureDir(path.dirname(discordUserFixturePath))

function createDiscordUser(code?: string | null) {
	code ??= faker.string.uuid()
	return {
		code,
		accessToken: `${code}_mock_access_token`,
		refreshToken: `${code}_mock_refresh_token`,
		profile: {
			id: faker.string.uuid(),
			username: faker.internet.username(),
			global_name: faker.person.fullName(),
			avatar: faker.number.hex({ min: 1000000, max: 1000000000000 }),
			email: faker.internet.email(),
		},
	}
}

export type DiscordUser = ReturnType<typeof createDiscordUser>

async function getDiscordUsers() {
	try {
		if (await fsExtra.pathExists(discordUserFixturePath)) {
			const json = await fsExtra.readJson(discordUserFixturePath)
			return json as Array<DiscordUser>
		}
		return []
	} catch (error) {
		console.error(error)
		return []
	}
}

export async function deleteDiscordUser(primaryEmail: string) {
	const users = await getDiscordUsers()
	const user = users.find((u) => u.profile.email === primaryEmail)
	if (!user) return null
	await setDiscordUsers(users.filter((u) => u.profile.email !== primaryEmail))
	return user
}

export async function deleteDiscordUsers() {
	await fsExtra.remove(discordUserFixturePath)
}

async function setDiscordUsers(users: Array<DiscordUser>) {
	await fsExtra.writeJson(discordUserFixturePath, users, { spaces: 2 })
}

export async function insertDiscordUser(code?: string | null) {
	const discordUsers = await getDiscordUsers()
	let user = discordUsers.find((u) => u.code === code)
	if (user) {
		Object.assign(user, createDiscordUser(code))
	} else {
		user = createDiscordUser(code)
		discordUsers.push(user)
	}
	await setDiscordUsers(discordUsers)
	return user
}

async function getUser(request: Request) {
	const accessToken = request.headers
		.get('authorization')
		?.slice('token '.length)
		.trim()

	if (!accessToken) {
		return new Response('Unauthorized', { status: 401 })
	}

	const user = (await getDiscordUsers()).find(
		(u) => u.accessToken === accessToken,
	)

	if (!user) {
		return new Response('Not Found', { status: 404 })
	}
	return user
}

const passthroughDiscord =
	!process.env.DISCORD_CLIENT_ID.startsWith('MOCK_') &&
	process.env.NODE_ENV !== 'test'

export const handlers: Array<HttpHandler> = [
	http.post('https://discord.com/api/v10/oauth2/token', async ({ request }) => {
		if (passthroughDiscord) return passthrough()
		const params = new URLSearchParams(await request.text())

		const code = params.get('code')
		const discordUsers = await getDiscordUsers()
		let user = discordUsers.find((u) => u.code === code)
		if (!user) {
			user = await insertDiscordUser(code)
		}

		return json({
			access_token: user.accessToken,
			token_type: '__MOCK_TOKEN_TYPE__',
			expires_in: 604800,
			refresh_token: user.refreshToken,
			scope: 'identify',
		})
	}),
	http.get('https://discord.com/api/v10/users/@me', async ({ request }) => {
		if (passthroughDiscord) return passthrough()

		const user = await getUser(request)
		if (user instanceof Response) return user

		return json(user.profile)
	}),
	http.get('https://discord.com/api/v10/users/:id', async ({ params }) => {
		if (passthroughDiscord) return passthrough()

		const mockUser = (await getDiscordUsers()).find(
			(u) => u.profile.id === params.id,
		)
		if (mockUser) return json(mockUser.profile)

		return new Response('Not Found', { status: 404 })
	}),
	http.get('https://cdn.discordapp.com/avatars/:userId/:avararId', async () => {
		if (passthroughDiscord) return passthrough()

		const buffer = await fsExtra.readFile('./tests/fixtures/discord/ghost.jpg')
		return new Response(buffer, {
			headers: { 'content-type': 'image/jpg' },
		})
	}),
]
