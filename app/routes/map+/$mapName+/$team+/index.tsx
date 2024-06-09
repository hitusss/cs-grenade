import { redirect } from '@remix-run/node'

import { grenadeTypes } from '#types/grenades-types.ts'

export async function loader() {
	return redirect(`${grenadeTypes[0]}`)
}
