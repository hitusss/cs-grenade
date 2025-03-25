import { data } from 'react-router'
import { parseWithZod } from '@conform-to/zod'
import { invariantResponse } from '@epic-web/invariant'
import { parseFormData } from '@mjackson/form-data-parser'

import {
	createMapImage,
	createMapLogo,
	createMapRadar,
	deleteMapImageByMapName,
	deleteMapLogoByMapName,
	deleteMapRadarByMapName,
	getMap,
	updateMapNameAndLabel,
} from '#app/models/index.server.ts'
import { checkHoneypot } from '#app/utils/honeypot.server.ts'
import { toSlug, uploadHandler } from '#app/utils/misc.tsx'
import { requireUserWithPermission } from '#app/utils/permissions.server.ts'
import { redirectWithToast } from '#app/utils/toast.server.ts'
import { EditMapSchema, MAX_SIZE } from '#app/utils/validators/map.ts'
import { MapForm } from '#app/components/map-form.tsx'

import { type Route } from './+types/edit.ts'

export async function loader({ request, params }: Route.LoaderArgs) {
	await requireUserWithPermission(request, 'update:map')

	const mapName = params.mapName
	invariantResponse(mapName, 'Map is required', { status: 400 })

	const map = await getMap(mapName)

	invariantResponse(map, 'Not found', { status: 404 })

	return data({ map })
}

export async function action({ request, params }: Route.ActionArgs) {
	await requireUserWithPermission(request, 'update:map')

	const mapName = params.mapName

	invariantResponse(mapName, 'Map is required', { status: 400 })

	const formData = await parseFormData(
		request,
		uploadHandler({ maxPartSize: MAX_SIZE }),
	)
	await checkHoneypot(formData)

	const submission = await parseWithZod(formData, {
		schema: EditMapSchema.transform(async (data) => {
			return {
				label: data.label,
				image: data.image
					? {
							contentType: data.image.type,
							blob: Buffer.from(await data.image.arrayBuffer()),
						}
					: null,
				logo: data.logo
					? {
							contentType: data.logo.type,
							blob: Buffer.from(await data.logo.arrayBuffer()),
						}
					: null,
				radar: data.radar
					? {
							contentType: data.radar.type,
							blob: Buffer.from(await data.radar.arrayBuffer()),
						}
					: null,
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
	const newName = toSlug(label)

	await updateMapNameAndLabel({
		name: mapName,
		newName,
		newLabel: label,
	})

	if (image) {
		await deleteMapImageByMapName(mapName)
		await createMapImage({
			mapName: newName,
			contentType: image.contentType,
			blob: image.blob,
		})
	}

	if (logo) {
		await deleteMapLogoByMapName(mapName)
		await createMapLogo({
			mapName: newName,
			contentType: logo.contentType,
			blob: logo.blob,
		})
	}

	if (radar) {
		await deleteMapRadarByMapName(mapName)
		await createMapRadar({
			mapName: newName,
			contentType: radar.contentType,
			blob: radar.blob,
		})
	}

	return await redirectWithToast(`/`, {
		title: 'Map Updated',
		description: ``,
		type: 'success',
	})
}

export default function MapEditRoute({
	loaderData,
	actionData,
}: Route.ComponentProps) {
	return (
		<div className="mx-auto max-w-2xl">
			<h1>Edit Map</h1>
			<MapForm
				type="edit"
				defaultValue={{
					label: loaderData.map.label,
					image: loaderData.map.image?.id,
					logo: loaderData.map.logo?.id,
					radar: loaderData.map.radar?.id,
				}}
				result={actionData?.result}
			/>
		</div>
	)
}
