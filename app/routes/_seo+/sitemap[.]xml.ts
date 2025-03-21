import { type ServerBuild } from 'react-router'
import { generateSitemap } from '@nasa-gcn/remix-seo'

import { getDomainUrl } from '#app/utils/misc.tsx'

import { type Route } from './+types/sitemap[.]xml.ts'

export async function loader({ request, context }: Route.LoaderArgs) {
	const serverBuild = (await context.serverBuild) as { build: ServerBuild }
	// @ts-expect-error
	return generateSitemap(request, serverBuild.build.routes, {
		siteUrl: getDomainUrl(request),
		headers: {
			'Cache-Control': `public, max-age=${60 * 5}`,
		},
	})
}
