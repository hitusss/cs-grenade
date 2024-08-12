import {
	json,
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
	type MetaFunction,
} from '@remix-run/node'
import { Form, Link, useActionData, useSearchParams } from '@remix-run/react'
import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { HoneypotInputs } from 'remix-utils/honeypot/react'
import { z } from 'zod'

import { login, requireAnonymous } from '#app/utils/auth.server.ts'
import {
	ProviderConnectionForm,
	providerNames,
} from '#app/utils/connections.tsx'
import { checkHoneypot } from '#app/utils/honeypot.server.ts'
import { useIsPending } from '#app/utils/misc.tsx'
import { PasswordSchema, UsernameSchema } from '#app/utils/validators/user.ts'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { AuthLayout } from '#app/components/auth-layout.tsx'
import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import { CheckboxField, ErrorList, Field } from '#app/components/forms.tsx'

import { handleNewSession } from './login.server.ts'

const LoginFormSchema = z.object({
	username: UsernameSchema,
	password: PasswordSchema,
	redirectTo: z.string().optional(),
	remember: z.boolean().optional(),
})

export const meta: MetaFunction = () => {
	return [{ title: 'Login to CS-Grenade' }]
}

export async function loader({ request }: LoaderFunctionArgs) {
	await requireAnonymous(request)
	return json({})
}

export async function action({ request }: ActionFunctionArgs) {
	await requireAnonymous(request)
	const formData = await request.formData()
	checkHoneypot(formData)
	const submission = await parseWithZod(formData, {
		schema: (intent) =>
			LoginFormSchema.transform(async (data, ctx) => {
				if (intent !== null) return { ...data, session: null }

				const session = await login(data)
				if (!session) {
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						message: 'Invalid username or password',
					})
					return z.NEVER
				}

				return { ...data, session }
			}),
		async: true,
	})

	if (submission.status !== 'success' || !submission.value.session) {
		return json(
			{ result: submission.reply({ hideFields: ['password'] }) },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}

	const { session, remember, redirectTo } = submission.value

	return handleNewSession({
		request,
		session,
		remember: remember ?? false,
		redirectTo,
	})
}

export default function LoginRoute() {
	const actionData = useActionData<typeof action>()
	const isPending = useIsPending()
	const [searchParams] = useSearchParams()
	const redirectTo = searchParams.get('redirectTo')

	const [form, fields] = useForm({
		id: 'login-form',
		constraint: getZodConstraint(LoginFormSchema),
		defaultValue: { redirectTo },
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: LoginFormSchema })
		},
		shouldRevalidate: 'onBlur',
	})

	return (
		<AuthLayout title="Welcome back!" subtitle="Please enter your details.">
			<>
				<Form method="POST" {...getFormProps(form)}>
					<HoneypotInputs />
					<Field
						labelProps={{ children: 'Username' }}
						inputProps={{
							...getInputProps(fields.username, { type: 'text' }),
							autoFocus: true,
							className: 'lowercase',
							autoComplete: 'username',
						}}
						errors={fields.username.errors}
					/>

					<Field
						labelProps={{ children: 'Password' }}
						inputProps={{
							...getInputProps(fields.password, {
								type: 'password',
							}),
							autoComplete: 'current-password',
						}}
						errors={fields.password.errors}
					/>

					<div className="flex justify-between">
						<CheckboxField
							labelProps={{
								htmlFor: fields.remember.id,
								children: 'Remember me',
							}}
							buttonProps={getInputProps(fields.remember, {
								type: 'checkbox',
							})}
							errors={fields.remember.errors}
						/>
						<div>
							<Link to="/forgot-password" className="text-sm font-semibold">
								Forgot password?
							</Link>
						</div>
					</div>

					<input {...getInputProps(fields.redirectTo, { type: 'hidden' })} />
					<ErrorList errors={form.errors} id={form.errorId} />

					<StatusButton
						className="mt-4 w-full"
						status={isPending ? 'pending' : (form.status ?? 'idle')}
						type="submit"
						disabled={isPending}
					>
						Log in
					</StatusButton>
				</Form>
				<ul className="grid gap-6 border-b-2 border-t-2 border-border py-3">
					{providerNames.map((providerName) => (
						<li key={providerName}>
							<ProviderConnectionForm
								type="Login"
								providerName={providerName}
								redirectTo={redirectTo}
							/>
						</li>
					))}
				</ul>
				<div className="flex items-center justify-center gap-2">
					<span className="text-muted-foreground">New here?</span>
					<Link
						to={
							redirectTo
								? `/signup?${encodeURIComponent(redirectTo)}`
								: '/signup'
						}
					>
						Create an account
					</Link>
				</div>
			</>
		</AuthLayout>
	)
}

export function ErrorBoundary() {
	return <GeneralErrorBoundary />
}
