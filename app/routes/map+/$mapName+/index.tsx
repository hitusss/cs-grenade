import { redirect } from 'react-router'

import { grenadeTypes } from '#types/grenades-types.ts'
import { teams } from '#types/teams.ts'

export async function loader() {
	return redirect(`${teams[0]}/${grenadeTypes[0]}`)
}
