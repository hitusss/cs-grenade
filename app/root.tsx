import {
	json,
	type HeadersFunction,
	type LinksFunction,
	type LoaderFunctionArgs,
	type MetaFunction,
} from '@remix-run/node'
import {
	Links,
	Meta,
	Outlet,
	Scripts,
	ScrollRestoration,
	useLoaderData,
} from '@remix-run/react'
import { withSentry } from '@sentry/remix'
import openLayersSheetUrl from 'ol/ol.css?url'
import { HoneypotProvider } from 'remix-utils/honeypot/react'

import { GeneralErrorBoundary } from './components/error-boundary.tsx'
import { Footer } from './components/footer.tsx'
import { Header } from './components/header.tsx'
import { Lightbox, LightboxProvider } from './components/lightbox.tsx'
import { EpicProgress } from './components/progress-bar.tsx'
import { useToast } from './components/toaster.tsx'
import { href as iconsHref } from './components/ui/icon.tsx'
import { Toaster } from './components/ui/sonner.tsx'
import {
	useOptionalTheme,
	useTheme,
} from './routes/resources+/theme-switch.tsx'
import tailwindStyleSheetUrl from './styles/tailwind.css?url'
import { getUserId, logout } from './utils/auth.server.ts'
import { ClientHintCheck, getHints } from './utils/client-hints.tsx'
import { prisma } from './utils/db.server.ts'
import { getEnv } from './utils/env.server.ts'
import { honeypot } from './utils/honeypot.server.ts'
import { combineHeaders, getDomainUrl } from './utils/misc.tsx'
import { useNonce } from './utils/nonce-provider.ts'
import { getSocialMetas } from './utils/seo.ts'
import { getTheme } from './utils/theme.server.ts'
import { type Color, type Mode } from './utils/theme.ts'
import { makeTimings, time } from './utils/timing.server.ts'
import { getToast } from './utils/toast.server.ts'

export const links: LinksFunction = () => {
	return [
		// Preload svg sprite as a resource to avoid render blocking
		{ rel: 'preload', href: iconsHref, as: 'image' },
		// Preload CSS as a resource to avoid render blocking
		{ rel: 'mask-icon', href: '/favicons/mask-icon.svg' },
		{
			rel: 'alternate icon',
			type: 'image/png',
			href: '/favicons/favicon-32x32.png',
		},
		{ rel: 'apple-touch-icon', href: '/favicons/apple-touch-icon.png' },
		{
			rel: 'manifest',
			href: '/site.webmanifest',
			crossOrigin: 'use-credentials',
		} as const, // necessary to make typescript happy
		//These should match the css preloads above to avoid css as render blocking resource
		{ rel: 'icon', type: 'image/svg+xml', href: '/favicons/favicon.svg' },
		{ rel: 'stylesheet', href: tailwindStyleSheetUrl },
		{ rel: 'stylesheet', href: openLayersSheetUrl },
	].filter(Boolean)
}

export const meta: MetaFunction<typeof loader> = ({ data }) => {
	if (!data) {
		return getSocialMetas({
			url: '',
			title: 'Error - CSGrenade',
		})
	}
	return getSocialMetas({
		url: `${data?.requestInfo.origin}${data?.requestInfo.path}`,
	})
}

export async function loader({ request }: LoaderFunctionArgs) {
	const timings = makeTimings('root loader')
	const userId = await time(() => getUserId(request), {
		timings,
		type: 'getUserId',
		desc: 'getUserId in root',
	})

	const maps = await time(
		() =>
			prisma.map.findMany({
				select: {
					name: true,
					label: true,
					isActive: true,
					image: {
						select: {
							id: true,
						},
					},
					logo: {
						select: {
							id: true,
						},
					},
				},
				orderBy: {
					name: 'asc',
				},
			}),
		{ timings, type: 'select maps', desc: 'select maps in root' },
	)

	const user = userId
		? await time(
				() =>
					prisma.user.findUniqueOrThrow({
						select: {
							id: true,
							name: true,
							username: true,
							image: { select: { id: true } },
							roles: {
								select: {
									name: true,
									priority: true,
									permissions: {
										select: { entity: true, action: true, access: true },
									},
								},
							},
						},
						where: { id: userId },
					}),
				{ timings, type: 'find user', desc: 'find user in root' },
			)
		: null
	if (userId && !user) {
		console.info('something weird happened')
		// something weird happened... The user is authenticated but we can't find
		// them in the database. Maybe they were deleted? Let's log them out.
		await logout({ request, redirectTo: '/' })
	}
	const { toast, headers: toastHeaders } = await getToast(request)
	const honeyProps = honeypot.getInputProps()

	return json(
		{
			maps,
			user,
			requestInfo: {
				hints: getHints(request),
				origin: getDomainUrl(request),
				path: new URL(request.url).pathname,
				userPrefs: {
					theme: getTheme(request),
				},
			},
			ENV: getEnv(),
			toast,
			honeyProps,
		},
		{
			headers: combineHeaders(
				{ 'Server-Timing': timings.toString() },
				toastHeaders,
			),
		},
	)
}

export const headers: HeadersFunction = ({ loaderHeaders }) => {
	const headers = {
		'Server-Timing': loaderHeaders.get('Server-Timing') ?? '',
	}
	return headers
}

function Document({
	children,
	nonce,
	mode = 'light',
	color = 'yellow',
	env = {},
}: {
	children: React.ReactNode
	nonce: string
	mode?: Mode
	color?: Color
	env?: Record<string, string>
}) {
	const allowIndexing = ENV.ALLOW_INDEXING !== 'false'
	return (
		<html lang="en" className={`${mode} ${color} h-full overflow-x-hidden`}>
			<head>
				<ClientHintCheck nonce={nonce} />
				<Meta />
				<meta charSet="utf-8" />
				<meta name="viewport" content="width=device-width,initial-scale=1" />
				{allowIndexing ? null : (
					<meta name="robots" content="noindex, nofollow" />
				)}
				<Links />
			</head>
			<body className="bg-background text-foreground">
				{children}
				<script
					nonce={nonce}
					dangerouslySetInnerHTML={{
						__html: `window.ENV = ${JSON.stringify(env)}`,
					}}
				/>
				<ScrollRestoration
					nonce={nonce}
					getKey={(location) => {
						if (location.pathname.startsWith('/users')) return '/users'
						if (location.pathname.startsWith('/map')) return '/map'
						return location.key
					}}
				/>
				<Scripts nonce={nonce} />
			</body>
		</html>
	)
}

export function Layout({ children }: { children: React.ReactNode }) {
	// if there was an error running the loader, data could be missing
	const data = useLoaderData<typeof loader | null>()
	const nonce = useNonce()
	const theme = useOptionalTheme()
	return (
		<Document
			nonce={nonce}
			mode={theme.mode}
			color={theme.color}
			env={data?.ENV}
		>
			{children}
		</Document>
	)
}

function App() {
	const data = useLoaderData<typeof loader>()
	const theme = useTheme()
	useToast(data.toast)

	return (
		<>
			<div className="flex h-screen flex-col justify-between">
				<Header />

				<div className="flex-1">
					<Outlet />
				</div>

				<Footer />
			</div>
			<Toaster closeButton position="top-center" theme={theme.mode} />
			<EpicProgress />
			<Lightbox />
		</>
	)
}

function AppWithProviders() {
	const data = useLoaderData<typeof loader>()
	return (
		<HoneypotProvider {...data.honeyProps}>
			<LightboxProvider>
				<App />
			</LightboxProvider>
		</HoneypotProvider>
	)
}

export default withSentry(AppWithProviders)

export function ErrorBoundary() {
	return <GeneralErrorBoundary />
}
