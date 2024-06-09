import { Outlet } from '@remix-run/react'
import { type SEOHandle } from '@nasa-gcn/remix-seo'

export const handle: SEOHandle = {
	getSitemapEntries: () => null,
}

export default function MapLayout() {
	return (
		<div className="container py-12 min-h-full">
			<Outlet />
		</div>
	)
}
