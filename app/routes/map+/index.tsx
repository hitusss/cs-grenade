import { redirect } from '@remix-run/node'
import { type SEOHandle } from '@nasa-gcn/remix-seo'

export const handle: SEOHandle = {
	getSitemapEntries: () => null,
}

export async function loader() {
	return redirect('/')
}
