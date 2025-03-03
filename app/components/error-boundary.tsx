import { useEffect, type ReactElement } from 'react'
import {
	isRouteErrorResponse,
	Link,
	useParams,
	useRouteError,
	type ErrorResponse,
} from 'react-router'
import { captureException } from '@sentry/react'

import { getErrorMessage } from '#app/utils/misc'

import { Icon, type IconName } from './ui/icon.tsx'

type StatusHandler = (info: {
	error: ErrorResponse
	params: Record<string, string | undefined>
}) => ReactElement | null

export function GeneralErrorBoundary({
	defaultStatusHandler = ({ error }) => <ErrorComponent error={error} />,
	statusHandlers,
	unexpectedErrorHandler = (error) => (
		<ErrorComponent error={getErrorMessage(error)} />
	),
}: {
	defaultStatusHandler?: StatusHandler
	statusHandlers?: Record<number, StatusHandler>
	unexpectedErrorHandler?: (error: unknown) => ReactElement | null
}) {
	const error = useRouteError()
	const params = useParams()

	if (typeof document !== 'undefined') {
		console.error(error)
	}

	useEffect(() => {
		captureException(error)
	}, [error])

	return (
		<div className="container grid h-full place-items-center p-20">
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
		<div className="grid max-w-xl gap-6">
			<div className="grid gap-3">
				<h1>{heading}</h1>
				<pre className="text-lg break-all whitespace-pre-wrap">
					{typeof error === 'string'
						? error
						: `${error.status} - ${getErrorMessage(error.data)}`}
				</pre>
			</div>
			<Link to={link.to}>
				<Icon name={link.icon}>{link.label}</Icon>
			</Link>
		</div>
	)
}
