import { invariantResponse } from '@epic-web/invariant'

import { getGrenadeImageChanges } from '#app/models/index.server.ts'

import { type Route } from './+types/grenade-changes-images.$imageId.ts'

export async function loader({ params }: Route.LoaderArgs) {
	invariantResponse(params.imageId, 'Image ID is required', { status: 400 })
	const image = await getGrenadeImageChanges(params.imageId)

	invariantResponse(image, 'Not found', { status: 404 })
	invariantResponse(image.contentType, 'Not found', { status: 404 })
	invariantResponse(image.blob, 'Not found', { status: 404 })

	return new Response(image.blob, {
		headers: {
			'Content-Type': image.contentType,
			'Content-Length': Buffer.byteLength(image.blob).toString(),
			'Content-Disposition': `inline; filename="${params.imageId}"`,
			'Cache-Control': 'public, max-age=31536000, immutable',
		},
	})
}
