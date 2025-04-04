import { Outlet } from 'react-router'
import { type SEOHandle } from '@nasa-gcn/remix-seo'

import { Icon } from '#app/components/ui/icon.tsx'
import { type VerificationTypes } from '#app/routes/_auth+/verify.tsx'

import { type BreadcrumbHandle } from './profile.tsx'

export const handle: BreadcrumbHandle & SEOHandle = {
	breadcrumb: <Icon name="lock">2FA</Icon>,
	getSitemapEntries: () => null,
}

export const twoFAVerificationType = '2fa' satisfies VerificationTypes

export default function SettingsProfileTwoFactorRoute() {
	return <Outlet />
}
