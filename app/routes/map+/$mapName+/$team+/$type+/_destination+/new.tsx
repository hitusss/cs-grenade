import { data, Link } from 'react-router'
import { parseWithZod } from '@conform-to/zod'
import { invariantResponse } from '@epic-web/invariant'

import { isGrenadeType } from '#types/grenades-types.ts'
import { isTeamType } from '#types/teams.ts'
import {
	createDestination,
	getUserPermissions,
} from '#app/models/index.server.ts'
import { requireUserId } from '#app/utils/auth.server.ts'
import { checkHoneypot } from '#app/utils/honeypot.server.ts'
import { useIsPending } from '#app/utils/misc.tsx'
import { userHasPermission } from '#app/utils/permissions.ts'
import { redirectWithToast } from '#app/utils/toast.server.ts'
import { useUser } from '#app/utils/user.ts'
import { DestinationSchema } from '#app/utils/validators/destination.ts'
import { Button } from '#app/components/ui/button.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { DestinationForm } from '#app/components/destination-form.tsx'
import { MapBackButton, MapTitle } from '#app/components/map.tsx'

import { type MapHandle } from '../_layout.tsx'
import { type Route } from './+types/new.ts'

export const handle: MapHandle = {
	map: {
		disableAllDestinations: true,
	},
}

export async function loader({ request }: Route.LoaderArgs) {
	await requireUserId(request)
	return data({})
}

export async function action({ request, params }: Route.ActionArgs) {
	const userId = await requireUserId(request)
	const userPermissions = await getUserPermissions(userId)
	const hasCreateDestinationPermission = userHasPermission(
		userPermissions,
		'create:destination',
	)

	const { mapName, team, type } = params

	invariantResponse(mapName, 'Map is required', { status: 400 })
	invariantResponse(isTeamType(team), 'Team is required', { status: 400 })
	invariantResponse(isGrenadeType(type), 'Grenade type is required', {
		status: 400,
	})

	const formData = await request.formData()
	await checkHoneypot(formData)

	const submission = await parseWithZod(formData, {
		schema: DestinationSchema,
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

	const { x, y, name } = submission.value

	await createDestination({
		verified: hasCreateDestinationPermission,
		x,
		y,
		name,
		mapName,
		team,
		type,
		userId,
	})

	return await redirectWithToast(`..`, {
		title: `Destination ${hasCreateDestinationPermission ? 'created' : 'requested'}`,
		description: ``,
		type: 'success',
	})
}

export default function MpaNewDestinationRoute({
	actionData,
}: Route.ComponentProps) {
	const isPending = useIsPending()

	const user = useUser()
	const hasCreateDestinationPermission = userHasPermission(
		user,
		'create:destination',
	)

	return (
		<>
			<MapBackButton />
			<MapTitle>Select location to add destination</MapTitle>
			<DestinationForm
				title={
					hasCreateDestinationPermission
						? 'Create Destination'
						: 'Request Destination'
				}
				type="new"
				result={actionData?.result}
			>
				<Button variant="ghost" type="reset">
					Reset
				</Button>
				<Button variant="destructive" type="button" asChild>
					<Link to="..">Cancel</Link>
				</Button>
				<StatusButton
					type="submit"
					status={isPending ? 'pending' : (actionData?.result.status ?? 'idle')}
				>
					{hasCreateDestinationPermission ? 'Create' : 'Request'}
				</StatusButton>
			</DestinationForm>
		</>
	)
}
