import { Outlet } from '@remix-run/react'

import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'

export default function SettingsLayout() {
	return <Outlet />
}

export function ErrorBoundary() {
	return <GeneralErrorBoundary />
}
