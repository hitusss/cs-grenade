import { redirect } from 'react-router'
import { SetCookie } from '@mjackson/headers'
import { createId as cuid } from '@paralleldrive/cuid2'
import { GitHubStrategy } from 'remix-auth-github'
import { z } from 'zod'

import { cache, cachified } from '../cache.server.ts'
import { type Timings } from '../timing.server.ts'
import { MOCK_CODE_GITHUB, MOCK_CODE_GITHUB_HEADER } from './constants.ts'
import { type AuthProvider } from './provider.ts'

const GitHubUserSchema = z.object({ login: z.string() })
const GitHubUserParseResult = z
	.object({
		success: z.literal(true),
		data: GitHubUserSchema,
	})
	.or(
		z.object({
			success: z.literal(false),
		}),
	)

const shouldMock =
	process.env.GITHUB_CLIENT_ID?.startsWith('MOCK_') ||
	process.env.NODE_ENV === 'test'

const GitHubUserResponseSchema = z.object({
	id: z.number().or(z.string()),
	login: z.string(),
	name: z.string().optional(),
	email: z.string(),
	avatar_url: z.string().optional(),
})

export class GitHubProvider implements AuthProvider {
	getAuthStrategy() {
		return new GitHubStrategy(
			{
				clientId: process.env.GITHUB_CLIENT_ID,
				clientSecret: process.env.GITHUB_CLIENT_SECRET,
				redirectURI: process.env.GITHUB_REDIRECT_URI,
			},
			async ({ tokens }) => {
				const userResponse = await fetch('https://api.github.com/user', {
					headers: {
						Accept: 'application/vnd.github+json',
						Authorization: `Bearer ${tokens.accessToken()}`,
						'X-GitHub-Api-Version': '2022-11-28',
					},
				})
				const rawUser = await userResponse.json()
				const user = GitHubUserResponseSchema.parse(rawUser)

				return {
					id: String(user.id),
					username: user.login,
					name: user.name,
					email: user.email,
					imageUrl: user.avatar_url,
				}
			},
		)
	}

	async resolveConnectionData(
		providerId: string,
		{ timings }: { timings?: Timings } = {},
	) {
		const result = await cachified({
			key: `connection-data:github:${providerId}`,
			cache,
			timings,
			ttl: 1000 * 60,
			swr: 1000 * 60 * 60 * 24 * 7,
			async getFreshValue(context) {
				const response = await fetch(
					`https://api.github.com/user/${providerId}`,
					{ headers: { Authorization: `token ${process.env.GITHUB_TOKEN}` } },
				)
				const rawJson = await response.json()
				const result = GitHubUserSchema.safeParse(rawJson)
				if (!result.success) {
					// if it was unsuccessful, then we should kick it out of the cache
					// asap and try again.
					context.metadata.ttl = 0
				}
				return result
			},
			checkValue: GitHubUserParseResult,
		})
		return {
			displayName: result.success ? result.data.login : 'Unknown',
			link: result.success ? `https://github.com/${result.data.login}` : null,
		} as const
	}

	async handleMockAction(request: Request) {
		if (!shouldMock) return
		const state = cuid()
		const code =
			request.headers.get(MOCK_CODE_GITHUB_HEADER) || MOCK_CODE_GITHUB
		const searchParams = new URLSearchParams({ code, state })
		let cookie = new SetCookie({
			name: 'github',
			value: searchParams.toString(),
			path: '/',
			sameSite: 'Lax',
			httpOnly: true,
			maxAge: 60 * 10,
			secure: process.env.NODE_ENV === 'production' || undefined,
		})
		throw redirect(`/auth/github/callback?${searchParams}`, {
			headers: {
				'Set-Cookie': cookie.toString(),
			},
		})
	}
}
