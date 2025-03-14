import { data } from 'react-router'
import { parseWithZod } from '@conform-to/zod'
import { invariantResponse } from '@epic-web/invariant'
import { parseFormData } from '@mjackson/form-data-parser'

import { prisma } from '#app/utils/db.server.ts'
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

	const map = await prisma.map.findUnique({
		where: { name: mapName },
		select: {
			label: true,
			image: {
				select: {
					id: true,
				},
			},
			logo: {
				select: {
					id: true,
				},
			},
			radar: {
				select: {
					id: true,
				},
			},
		},
	})

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

	await prisma.map.update({
		where: { name: mapName },
		data: {
			name: toSlug(label),
			label,
		},
	})

	if (image) {
		await prisma.mapImage.delete({
			where: { mapName },
		})
		await prisma.mapImage.create({
			data: {
				mapName,
				contentType: image.contentType,
				blob: image.blob,
			},
		})
	}

	if (logo) {
		await prisma.mapLogo.delete({
			where: { mapName },
		})
		await prisma.mapLogo.create({
			data: {
				mapName,
				contentType: logo.contentType,
				blob: logo.blob,
			},
		})
	}

	if (radar) {
		await prisma.mapRadar.delete({
			where: { mapName },
		})
		await prisma.mapRadar.create({
			data: {
				mapName,
				contentType: radar.contentType,
				blob: radar.blob,
			},
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
