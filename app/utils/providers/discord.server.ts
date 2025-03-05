import { redirect } from 'react-router'
import { SetCookie } from '@mjackson/headers'
import { DiscordStrategy } from '@nichtsam/remix-auth-discord'
import { createId as cuid } from '@paralleldrive/cuid2'
import { z } from 'zod'

import { cache, cachified } from '../cache.server.ts'
import { type Timings } from '../timing.server.ts'
import { MOCK_CODE_DISCORD, MOCK_CODE_DISCORD_HEADER } from './constants.ts'
import { type AuthProvider } from './provider.ts'

const DiscordUserSchema = z.object({ username: z.string() })
const DiscordUserParseResult = z
	.object({
		success: z.literal(true),
		data: DiscordUserSchema,
	})
	.or(
		z.object({
			success: z.literal(false),
		}),
	)

const shouldMock =
	process.env.DISCORD_CLIENT_ID?.startsWith('MOCK_') ||
	process.env.NODE_ENV === 'test'

const DiscordUserResponseSchema = z.object({
	id: z.number().or(z.string()),
	username: z.string(),
	global_name: z.string().optional(),
	email: z.string(),
	avatar: z.string().optional(),
})

export class DiscordProvider implements AuthProvider {
	getAuthStrategy() {
		return new DiscordStrategy(
			{
				clientId: process.env.DISCORD_CLIENT_ID,
				clientSecret: process.env.DISCORD_CLIENT_SECRET,
				redirectURI: process.env.DISCORD_REDIRECT_URI,
				scopes: ['identify', 'email'],
			},
			async ({ tokens }) => {
				console.log(tokens)
				const userResponse = await fetch(
					'https://discord.com/api/v10/users/@me',
					{
						headers: {
							Authorization: `Bearer ${tokens.accessToken()}`,
						},
					},
				)
				const rawUser = await userResponse.json()
				const user = DiscordUserResponseSchema.parse(rawUser)

				return {
					id: String(user.id),
					username: user.username,
					name: user.global_name,
					email: user.email,
					imageUrl: `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}`,
				}
			},
		)
	}

	async resolveConnectionData(
		providerId: string,
		{ timings }: { timings?: Timings } = {},
	) {
		const result = await cachified({
			key: `connection-data:discord:${providerId}`,
			cache,
			timings,
			ttl: 1000 * 60,
			swr: 1000 * 60 * 60 * 24 * 7,
			async getFreshValue(context) {
				const response = await fetch(
					`https://discord.com/api/v10/users/${providerId}`,
					{
						headers: {
							Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
						},
					},
				)
				const rawJson = await response.json()
				const result = DiscordUserSchema.safeParse(rawJson)
				if (!result.success) {
					// if it was unsuccessful, then we should kick it out of the cache
					// asap and try again.
					context.metadata.ttl = 0
				}
				return result
			},
			checkValue: DiscordUserParseResult,
		})
		return {
			displayName: result.success ? result.data.username : 'Unknown',
		} as const
	}

	async handleMockAction(request: Request) {
		if (!shouldMock) return
		const state = cuid()
		const code =
			request.headers.get(MOCK_CODE_DISCORD_HEADER) || MOCK_CODE_DISCORD
		const searchParams = new URLSearchParams({ code, state })
		let cookie = new SetCookie({
			name: 'discord',
			value: searchParams.toString(),
			path: '/',
			sameSite: 'Lax',
			httpOnly: true,
			maxAge: 60 * 10,
			secure: process.env.NODE_ENV === 'production' || undefined,
		})
		throw redirect(`/auth/discord/callback?${searchParams}`, {
			headers: {
				'Set-Cookie': cookie.toString(),
			},
		})
	}
}
