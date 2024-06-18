import {
	isRouteErrorResponse,
	Link,
	useParams,
	useRouteError,
	type ErrorResponse,
} from '@remix-run/react'
import { captureRemixErrorBoundaryError } from '@sentry/remix'

import { getErrorMessage } from '#app/utils/misc.tsx'

import { Icon, type IconName } from './ui/icon.tsx'

type StatusHandler = (info: {
	error: ErrorResponse
	params: Record<string, string | undefined>
}) => JSX.Element | null

export function GeneralErrorBoundary({
	defaultStatusHandler = ({ error }) => <ErrorComponent error={error} />,
	statusHandlers,
	unexpectedErrorHandler = (error) => (
		<ErrorComponent error={getErrorMessage(error)} />
	),
}: {
	defaultStatusHandler?: StatusHandler
	statusHandlers?: Record<number, StatusHandler>
	unexpectedErrorHandler?: (error: unknown) => JSX.Element | null
}) {
	const error = useRouteError()
	captureRemixErrorBoundaryError(error)
	const params = useParams()

	if (typeof document !== 'undefined') {
		console.error(error)
	}

	return (
		<div className="container h-full grid place-items-center p-20">
			{isRouteErrorResponse(error)
				? (statusHandlers?.[error.status] ?? defaultStatusHandler)({
						error,
						params,
					})
				: unexpectedErrorHandler(error)}
		</div>
	)
}

export function ErrorComponent({
	heading = 'Something went wrong!',
	error,
	link = {
		to: '.',
		icon: 'refresh-cw',
		label: 'Try again',
	},
}: {
	heading?: string
	error: ErrorResponse | string
	link?: {
		to: string
		icon: IconName
		label: string
	}
}) {
	return (
		<div className="grid gap-6 max-w-xl">
			<div className="grid gap-3">
				<h1>{heading}</h1>
				<pre className="whitespace-pre-wrap break-all text-body-md">
					{typeof error === 'string'
						? error
						: `${error.status} - ${error.data}`}
				</pre>
			</div>
			<Link to={link.to}>
				<Icon name={link.icon}>{link.label}</Icon>
			</Link>
		</div>
	)
}
