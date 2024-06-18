import {
	json,
	unstable_createMemoryUploadHandler,
	unstable_parseMultipartFormData,
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
} from '@remix-run/node'
import { useActionData, useLoaderData } from '@remix-run/react'
import { parseWithZod } from '@conform-to/zod'
import { invariantResponse } from '@epic-web/invariant'

import { prisma } from '#app/utils/db.server.ts'
import { checkHoneypot } from '#app/utils/honeypot.server.ts'
import { toSlug } from '#app/utils/misc.tsx'
import { requireUserWithPermission } from '#app/utils/permissions.server.ts'
import { redirectWithToast } from '#app/utils/toast.server.ts'
import { EditMapSchema, MAX_SIZE } from '#app/utils/validators/map.ts'
import { MapForm } from '#app/components/map-form.tsx'

export async function loader({ request, params }: LoaderFunctionArgs) {
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

	return json({ map })
}

export async function action({ request, params }: ActionFunctionArgs) {
	await requireUserWithPermission(request, 'update:map')

	const mapName = params.mapName

	invariantResponse(mapName, 'Map is required', { status: 400 })

	const formData = await unstable_parseMultipartFormData(
		request,
		unstable_createMemoryUploadHandler({ maxPartSize: MAX_SIZE }),
	)
	checkHoneypot(formData)

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
		return json(
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

export default function EditMapRoute() {
	const data = useLoaderData<typeof loader>()
	const actionData = useActionData<typeof action>()

	return (
		<div className="max-w-2xl mx-auto">
			<h1>Edit Map</h1>
			<MapForm
				type="edit"
				defaultValue={{
					label: data.map.label,
					image: data.map.image?.id,
					logo: data.map.logo?.id,
					radar: data.map.radar?.id,
				}}
				result={actionData?.result}
			/>
		</div>
	)
}
