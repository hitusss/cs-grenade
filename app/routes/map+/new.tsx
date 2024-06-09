import {
	json,
	unstable_createMemoryUploadHandler,
	unstable_parseMultipartFormData,
	type ActionFunctionArgs,
} from '@remix-run/node'
import { useActionData } from '@remix-run/react'
import { parseWithZod } from '@conform-to/zod'
import { type SEOHandle } from '@nasa-gcn/remix-seo'
import { z } from 'zod'

import { prisma } from '#app/utils/db.server.ts'
import { checkHoneypot } from '#app/utils/honeypot.server.ts'
import { toSlug } from '#app/utils/misc.tsx'
import { requireUserWithPermission } from '#app/utils/permissions.server.ts'
import { redirectWithToast } from '#app/utils/toast.server.ts'
import { MAX_SIZE, NewMapSchema } from '#app/utils/validators/map.ts'
import { MapForm } from '#app/components/map-form.tsx'

export const handle: SEOHandle = {
	getSitemapEntries: () => null,
}

export async function action({ request }: ActionFunctionArgs) {
	const userId = await requireUserWithPermission(request, 'create:map')

	const formData = await unstable_parseMultipartFormData(
		request,
		unstable_createMemoryUploadHandler({ maxPartSize: MAX_SIZE }),
	)
	checkHoneypot(formData)

	const submission = await parseWithZod(formData, {
		schema: NewMapSchema.transform(async data => {
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
		return json(
			{ result: submission.reply() },
			{
				status: submission.status === 'error' ? 400 : 200,
			},
		)
	}

	const { label, image, logo, radar } = submission.value

	await prisma.map.create({
		data: {
			name: toSlug(label),
			label,
			image: {
				create: image,
			},
			logo: {
				create: logo,
			},
			radar: {
				create: radar,
			},
			userId,
		},
	})

	return await redirectWithToast(`/map/${toSlug(label)}`, {
		title: 'Map Created',
		description: ``,
		type: 'success',
	})
}

export default function NewMapPage() {
	const actionData = useActionData<typeof action>()

	return (
		<div className="max-w-2xl mx-auto">
			<h1>New Map</h1>
			<MapForm type="new" result={actionData?.result} />
		</div>
	)
}
