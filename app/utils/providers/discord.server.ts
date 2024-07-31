import { redirect } from '@remix-run/node'
import { createId as cuid } from '@paralleldrive/cuid2'
import { DiscordStrategy } from 'remix-auth-discord'
import { z } from 'zod'

import { cache, cachified } from '../cache.server.ts'
import { connectionSessionStorage } from '../connections.server.ts'
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

export class DiscordProvider implements AuthProvider {
	getAuthStrategy() {
		return new DiscordStrategy(
			{
				clientID: process.env.DISCORD_CLIENT_ID,
				clientSecret: process.env.DISCORD_CLIENT_SECRET,
				callbackURL: '/auth/discord/callback',
				scope: ['identify', 'email'],
			},
			async ({ profile }) => {
				const email = profile.emails?.[0]?.value.trim().toLowerCase()
				if (!email) {
					throw new Error('Email not found')
				}
				const username = profile.__json.username
				const imageUrl = profile.photos?.[0]
					? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.photos[0].value}`
					: undefined
				return {
					email,
					id: profile.id,
					username,
					name: profile.__json.global_name ?? undefined,
					imageUrl,
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

		const connectionSession = await connectionSessionStorage.getSession(
			request.headers.get('cookie'),
		)
		const state = cuid()
		connectionSession.set('oauth2:state', state)

		// allows us to inject a code when running e2e tests,
		// but falls back to a pre-defined 🐨 constant
		const code =
			request.headers.get(MOCK_CODE_DISCORD_HEADER) || MOCK_CODE_DISCORD
		const searchParams = new URLSearchParams({ code, state })
		throw redirect(`/auth/discord/callback?${searchParams}`, {
			headers: {
				'set-cookie':
					await connectionSessionStorage.commitSession(connectionSession),
			},
		})
	}
}
