import { redirect } from 'react-router'

import { grenadeTypes } from '#types/grenades-types.ts'

export async function loader() {
	return redirect(`${grenadeTypes[0]}`)
}
