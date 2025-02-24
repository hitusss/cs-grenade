import { Outlet } from 'react-router'
import { type SEOHandle } from '@nasa-gcn/remix-seo'

import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'

export const handle: SEOHandle = {
	getSitemapEntries: () => null,
}

export default function SettingsLayout() {
	return <Outlet />
}

export function ErrorBoundary() {
	return <GeneralErrorBoundary />
}
