import { Outlet } from '@remix-run/react'
import { type SEOHandle } from '@nasa-gcn/remix-seo'

import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'

export const handle: SEOHandle = {
	getSitemapEntries: () => null,
}

export default function MapLayout() {
	return (
		<main className="container min-h-full py-12">
			<Outlet />
		</main>
	)
}

export function ErrorBoundary() {
	return <GeneralErrorBoundary />
}
