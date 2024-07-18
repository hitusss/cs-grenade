import { json, type LoaderFunctionArgs } from '@remix-run/node'
import { invariantResponse } from '@epic-web/invariant'

import { lruCache } from '#app/utils/cache.server.ts'
import {
	ensureInstance,
	getAllInstances,
	getInstanceInfo,
} from '#app/utils/litefs.server.ts'
import { requireUserWithPermission } from '#app/utils/permissions.server.ts'

export async function loader({ request, params }: LoaderFunctionArgs) {
	await requireUserWithPermission(request, 'read:cache:any')
	const searchParams = new URL(request.url).searchParams
	const currentInstanceInfo = await getInstanceInfo()
	const allInstances = await getAllInstances()
	const instance =
		searchParams.get('instance') ?? currentInstanceInfo.currentInstance
	await ensureInstance(instance)

	const { cacheKey } = params
	invariantResponse(cacheKey, 'cacheKey is required')
	return json({
		instance: {
			hostname: instance,
			region: allInstances[instance],
			isPrimary: currentInstanceInfo.primaryInstance === instance,
		},
		cacheKey,
		value: lruCache.get(cacheKey),
	})
}
