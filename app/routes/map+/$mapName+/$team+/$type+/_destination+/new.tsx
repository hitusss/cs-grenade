import {
	json,
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
} from '@remix-run/node'
import { Link, useActionData } from '@remix-run/react'
import { parseWithZod } from '@conform-to/zod'
import { invariantResponse } from '@epic-web/invariant'

import { requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { checkHoneypot } from '#app/utils/honeypot.server.ts'
import { getUserPermissions } from '#app/utils/permissions.server.ts'
import { userHasPermission } from '#app/utils/permissions.ts'
import { redirectWithToast } from '#app/utils/toast.server.ts'
import { useUser } from '#app/utils/user.ts'
import { DestinationSchema } from '#app/utils/validators/destination.ts'
import { Button } from '#app/components/ui/button.tsx'
import { DestinationForm } from '#app/components/destination-form.tsx'
import { MapBackButton, MapTitle } from '#app/components/map.tsx'

export async function loader({ request }: LoaderFunctionArgs) {
	await requireUserId(request)
	return json({})
}

export async function action({ request, params }: ActionFunctionArgs) {
	const userId = await requireUserId(request)
	const userPermissions = await getUserPermissions(userId)
	const hasPermission = userHasPermission(userPermissions, 'create:destination')

	const { mapName, team, type } = params

	invariantResponse(mapName, 'Map is required', { status: 400 })
	invariantResponse(team, 'Team is required', { status: 400 })
	invariantResponse(type, 'Grenade type is required', { status: 400 })

	const formData = await request.formData()
	checkHoneypot(formData)

	const submission = await parseWithZod(formData, {
		schema: DestinationSchema,
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

	const { x, y, name } = submission.value

	await prisma.destination.create({
		data: {
			verified: hasPermission,
			x,
			y,
			name,
			mapName,
			team,
			type,
			userId,
		},
	})

	return await redirectWithToast(`..`, {
		title: `Destination ${hasPermission ? 'created' : 'requested'}`,
		description: ``,
		type: 'success',
	})
}

export default function NewDestinationPage() {
	const actionData = useActionData<typeof action>()

	const user = useUser()
	const hasPermission = userHasPermission(user, 'create:destination')

	return (
		<>
			<MapBackButton />
			<MapTitle>Select location to add destination</MapTitle>
			<DestinationForm
				title={hasPermission ? 'Create Destination' : 'Request Destination'}
				type="new"
				result={actionData?.result}
			>
				<Button variant="ghost" type="reset">
					Reset
				</Button>
				<Button variant="destructive" type="button" asChild>
					<Link to="..">Cancel</Link>
				</Button>
				<Button type="submit">{hasPermission ? 'Create' : 'Request'}</Button>
			</DestinationForm>
		</>
	)
}
