import { Outlet } from '@remix-run/react'
import { type SEOHandle } from '@nasa-gcn/remix-seo'

export const handle: SEOHandle = {
	getSitemapEntries: () => null,
}

export default function MapLayout() {
	return (
		<div className="container min-h-full py-12">
			<Outlet />
		</div>
	)
}
