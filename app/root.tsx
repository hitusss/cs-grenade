import { useEffect } from 'react'
import {
	data,
	Links,
	Meta,
	Outlet,
	Scripts,
	ScrollRestoration,
	useLoaderData,
} from 'react-router'
import openLayersSheetUrl from 'ol/ol.css?url'
import { HoneypotProvider } from 'remix-utils/honeypot/react'
import { toast } from 'sonner'

import { type Route } from './+types/root.ts'
import { GeneralErrorBoundary } from './components/error-boundary.tsx'
import { Footer } from './components/footer.tsx'
import { Header } from './components/header.tsx'
import { Lightbox, LightboxProvider } from './components/lightbox.tsx'
import { EpicProgress } from './components/progress-bar.tsx'
import { href as iconsHref } from './components/ui/icon.tsx'
import { Toaster } from './components/ui/sonner.tsx'
import { getMaps, getUserWithPermissions } from './models/index.server.ts'
import {
	useOptionalTheme,
	useTheme,
} from './routes/resources+/theme-switch.tsx'
import tailwindStyleSheetUrl from './styles/tailwind.css?url'
import { getUserId, logout } from './utils/auth.server.ts'
import { ClientHintCheck, getHints } from './utils/client-hints.tsx'
import { getEnv } from './utils/env.server.ts'
import { honeypot } from './utils/honeypot.server.ts'
import { combineHeaders, getDomainUrl } from './utils/misc.tsx'
import { useNonce } from './utils/nonce-provider.ts'
import { getSocialMetas } from './utils/seo.ts'
import { getTheme } from './utils/theme.server.ts'
import { type Color, type Mode } from './utils/theme.ts'
import { makeTimings, time } from './utils/timing.server.ts'
import { getToast } from './utils/toast.server.ts'

export const links: Route.LinksFunction = () => {
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

export const meta: Route.MetaFunction = ({ data }) => {
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

export async function loader({ request }: Route.LoaderArgs) {
	const timings = makeTimings('root loader')
	const userId = await time(() => getUserId(request), {
		timings,
		type: 'getUserId',
		desc: 'getUserId in root',
	})

	const maps = await time(() => getMaps(), {
		timings,
		type: 'select maps',
		desc: 'select maps in root',
	})

	const user = userId
		? await time(() => getUserWithPermissions(userId), {
				timings,
				type: 'find user',
				desc: 'find user in root',
			})
		: null
	if (userId && !user) {
		console.info('something weird happened')
		// something weird happened... The user is authenticated but we can't find
		// them in the database. Maybe they were deleted? Let's log them out.
		await logout({ request, redirectTo: '/' })
	}
	const { toast, headers: toastHeaders } = await getToast(request)
	const honeyProps = await honeypot.getInputProps()

	return data(
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

export const headers: Route.HeadersFunction = ({ loaderHeaders }) => {
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
	env?: Record<string, string | undefined>
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
	const loaderData = useLoaderData<typeof loader | null>()
	const nonce = useNonce()
	const theme = useOptionalTheme()
	return (
		<Document
			nonce={nonce}
			mode={theme.mode}
			color={theme.color}
			env={loaderData?.ENV}
		>
			{children}
		</Document>
	)
}

function App() {
	const loaderData = useLoaderData<typeof loader>()
	const theme = useTheme()
	const toastData = loaderData.toast

	useEffect(() => {
		if (toastData) {
			setTimeout(() => {
				toast[toastData.type](toastData.title, {
					id: toastData.id,
					description: toastData.description,
				})
			}, 0)
		}
	}, [toastData])

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
	const loaderData = useLoaderData<typeof loader>()
	return (
		<HoneypotProvider {...loaderData.honeyProps}>
			<LightboxProvider>
				<App />
			</LightboxProvider>
		</HoneypotProvider>
	)
}

export default AppWithProviders

export function ErrorBoundary() {
	return <GeneralErrorBoundary />
}
