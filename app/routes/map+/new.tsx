import { data } from 'react-router'
import { parseWithZod } from '@conform-to/zod'
import { parseFormData } from '@mjackson/form-data-parser'
import { type SEOHandle } from '@nasa-gcn/remix-seo'
import { z } from 'zod'

import { createMap } from '#app/models/index.server.ts'
import { checkHoneypot } from '#app/utils/honeypot.server.ts'
import { toSlug, uploadHandler } from '#app/utils/misc.tsx'
import { requireUserWithPermission } from '#app/utils/permissions.server.ts'
import { redirectWithToast } from '#app/utils/toast.server.ts'
import { MapSchema, MAX_SIZE } from '#app/utils/validators/map.ts'
import { MapForm } from '#app/components/map-form.tsx'

import { type Route } from './+types/new.ts'

export const handle: SEOHandle = {
	getSitemapEntries: () => null,
}

export async function loader({ request }: Route.LoaderArgs) {
	await requireUserWithPermission(request, 'create:map')
	return data({})
}

export async function action({ request }: Route.ActionArgs) {
	const userId = await requireUserWithPermission(request, 'create:map')

	const formData = await parseFormData(
		request,
		uploadHandler({ maxPartSize: MAX_SIZE }),
	)
	await checkHoneypot(formData)

	const submission = await parseWithZod(formData, {
		schema: MapSchema.transform(async (data) => {
			if (data.image.size <= 0) return z.NEVER
			if (data.logo.size <= 0) return z.NEVER
			if (data.radar.size <= 0) return z.NEVER
			return {
				label: data.label,
				image: {
					contentType: data.image.type,
					blob: Buffer.from(await data.image.arrayBuffer()),
				},
				logo: {
					contentType: data.logo.type,
					blob: Buffer.from(await data.logo.arrayBuffer()),
				},
				radar: {
					contentType: data.radar.type,
					blob: Buffer.from(await data.radar.arrayBuffer()),
				},
			}
		}),
		async: true,
	})
	if (submission.status !== 'success') {
		return data(
			{ result: submission.reply() },
			{
				status: submission.status === 'error' ? 400 : 200,
			},
		)
	}

	const { label, image, logo, radar } = submission.value

	await createMap({
		name: toSlug(label),
		label,
		image,
		logo,
		radar,
		userId,
	})

	return await redirectWithToast(`/map/${toSlug(label)}`, {
		title: 'Map Created',
		description: ``,
		type: 'success',
	})
}

export default function MapNewRoute({ actionData }: Route.ComponentProps) {
	return (
		<div className="mx-auto max-w-2xl">
			<h1>New Map</h1>
			<MapForm type="new" result={actionData?.result} />
		</div>
	)
}
