/**
 * @vitest-environment jsdom
 */
import { createRoutesStub } from 'react-router'
import { faker } from '@faker-js/faker'
import { render, screen } from '@testing-library/react'
import setCookieParser from 'set-cookie-parser'
import { test } from 'vitest'

import { getSessionExpirationDate, sessionKey } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { authSessionStorage } from '#app/utils/session.server.ts'
import { loader as rootLoader } from '#app/root.tsx'

import { createUser, getUserImages } from '#tests/db-utils.ts'

import { loader, default as UsernameRoute } from './$username.tsx'

test('The user profile when not logged in as self', async () => {
	const userImages = await getUserImages()
	const userImage =
		userImages[faker.number.int({ min: 0, max: userImages.length - 1 })]
	const user = await prisma.user.create({
		select: { id: true, username: true, name: true },
		data: { ...createUser(), image: { create: userImage } },
	})
	const App = createRoutesStub([
		{
			path: '/users/:username',
			Component: UsernameRoute,
			loader,
		},
	])

	const routeUrl = `/users/${user.username}`
	render(<App initialEntries={[routeUrl]} />)

	await screen.findByRole('heading', { level: 1, name: user.name! })
	await screen.findByRole('img', { name: user.name! })
	await screen.findByRole('link', { name: /favorites/i })
	await screen.findByRole('link', { name: /grenades/i })
	await screen.findByRole('link', { name: /destinations/i })
})

test('The user profile when logged in as self', async () => {
	const userImages = await getUserImages()
	const userImage =
		userImages[faker.number.int({ min: 0, max: userImages.length - 1 })]
	const user = await prisma.user.create({
		select: { id: true, username: true, name: true },
		data: { ...createUser(), image: { create: userImage } },
	})
	const session = await prisma.session.create({
		select: { id: true },
		data: {
			expirationDate: getSessionExpirationDate(),
			userId: user.id,
		},
	})

	const authSession = await authSessionStorage.getSession()
	authSession.set(sessionKey, session.id)
	const setCookieHeader = await authSessionStorage.commitSession(authSession)
	const parsedCookie = setCookieParser.parseString(setCookieHeader)
	const cookieHeader = new URLSearchParams({
		[parsedCookie.name]: parsedCookie.value,
	}).toString()

	const App = createRoutesStub([
		{
			id: 'root',
			path: '/',
			loader: async (args) => {
				// add the cookie header to the request
				args.request.headers.set('cookie', cookieHeader)
				return rootLoader({ ...args, context: args.context })
			},
			children: [
				{
					path: 'users/:username',
					Component: UsernameRoute,
					loader: async (args) => {
						// add the cookie header to the request
						args.request.headers.set('cookie', cookieHeader)
						return loader(args)
					},
				},
			],
		},
	])

	const routeUrl = `/users/${user.username}`
	await render(<App initialEntries={[routeUrl]} />)

	await screen.findByRole('heading', { level: 1, name: user.name! })
	await screen.findByRole('img', { name: user.name! })
	await screen.findByRole('button', { name: /logout/i })
	await screen.findByRole('link', { name: /favorites/i })
	await screen.findByRole('link', { name: /grenades/i })
	await screen.findByRole('link', { name: /destinations/i })
	await screen.findByRole('link', { name: /edit profile/i })
})
