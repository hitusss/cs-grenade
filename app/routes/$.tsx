// This is called a "splat route" and as it's in the root `/app/routes/`
// directory, it's a catchall. If no other routes match, this one will and we
// can know that the user is hitting a URL that doesn't exist. By throwing a
// 404 from the loader, we can force the error boundary to render which will
// ensure the user gets the right status code and we can display a nicer error
// message for them than the Remix and/or browser default.

import { useLocation } from '@remix-run/react'
import { type SEOHandle } from '@nasa-gcn/remix-seo'

import {
	ErrorComponent,
	GeneralErrorBoundary,
} from '#app/components/error-boundary.tsx'

export const handle: SEOHandle = {
	getSitemapEntries: () => null,
}

export async function loader() {
	throw new Response('Not found', { status: 404 })
}

export default function NotFoundRoute() {
	// due to the loader, this component will never be rendered, but we'll return
	// the error boundary just in case.
	return <ErrorBoundary />
}

export function ErrorBoundary() {
	const location = useLocation()
	return (
		<GeneralErrorBoundary
			statusHandlers={{
				404: () => (
					<ErrorComponent
						heading="404 - Page not found"
						error={`Page not found at ${location.pathname}`}
						link={{
							to: '/',
							icon: 'arrow-left',
							label: 'Go to home',
						}}
					/>
				),
			}}
		/>
	)
}
