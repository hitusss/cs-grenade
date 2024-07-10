import { type LoaderFunctionArgs } from '@remix-run/node'
import { invariantResponse } from '@epic-web/invariant'
import { eventStream } from 'remix-utils/sse/server'

import { emitter } from '#app/utils/event.server.ts'

export async function loader({ request, params }: LoaderFunctionArgs) {
	const event = params['*']
	invariantResponse(event, 'Event is required')

	return eventStream(request.signal, (send) => {
		const handler = () => {
			send({
				data: new Date().toISOString(),
			})
		}

		emitter.addListener(event, handler)
		return () => {
			emitter.removeListener(event, handler)
		}
	})
}
