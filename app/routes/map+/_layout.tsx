import { Outlet } from '@remix-run/react'

export default function MapLayout() {
	return (
		<div className="container py-12 min-h-full">
			<Outlet />
		</div>
	)
}
