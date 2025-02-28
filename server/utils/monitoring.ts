import { httpIntegration, prismaIntegration } from '@sentry/node'
import { nodeProfilingIntegration } from '@sentry/profiling-node'
import * as Sentry from '@sentry/react'

export function init() {
	Sentry.init({
		dsn: process.env.SENTRY_DSN,
		environment: process.env.NODE_ENV,
		tracesSampleRate: process.env.NODE_ENV === 'production' ? 1 : 0,
		denyUrls: [
			/\/resources\/healthcheck/,
			/\/build\//,
			/\/favicons\//,
			/\/img\//,
			/\/fonts\//,
			/\/favicon.ico/,
			/\/site\.webmanifest/,
		],
		integrations: [
			prismaIntegration(),
			httpIntegration(),
			nodeProfilingIntegration(),
		],
		tracesSampler(samplingContext) {
			// ignore healthcheck transactions by other services (consul, etc.)
			if (samplingContext.request?.url?.includes('/resources/healthcheck')) {
				return 0
			}
			return 1
		},
		beforeSendTransaction(event) {
			// ignore all healthcheck related transactions
			//  note that name of header here is case-sensitive
			if (event.request?.headers?.['x-healthcheck'] === 'true') {
				return null
			}

			return event
		},
	})
}
