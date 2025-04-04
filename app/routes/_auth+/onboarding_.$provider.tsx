import {
	data,
	Form,
	Link,
	redirect,
	useSearchParams,
	type Params,
} from 'react-router'
import {
	getFormProps,
	getInputProps,
	useForm,
	type SubmissionResult,
} from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { type SEOHandle } from '@nasa-gcn/remix-seo'
import { safeRedirect } from 'remix-utils/safe-redirect'
import { z } from 'zod'

import { getUserIdByUsername } from '#app/models/index.server.ts'
import {
	requireAnonymous,
	sessionKey,
	signupWithConnection,
} from '#app/utils/auth.server.ts'
import { ProviderNameSchema } from '#app/utils/connections.tsx'
import { useIsPending } from '#app/utils/misc.tsx'
import { authSessionStorage } from '#app/utils/session.server.ts'
import { redirectWithToast } from '#app/utils/toast.server.ts'
import { NameSchema, UsernameSchema } from '#app/utils/validators/user.ts'
import { verifySessionStorage } from '#app/utils/verification.server.ts'
import { Button } from '#app/components/ui/button.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { AuthLayout } from '#app/components/auth-layout.tsx'
import { CheckboxField, ErrorList, Field } from '#app/components/forms.tsx'

import { type Route } from './+types/onboarding_.$provider.ts'
import { onboardingEmailSessionKey } from './onboarding.tsx'

export const providerIdKey = 'providerId'
export const prefilledProfileKey = 'prefilledProfile'

const SignupFormSchema = z.object({
	imageUrl: z.string().optional(),
	username: UsernameSchema,
	name: NameSchema,
	agreeToTermsOfServiceAndPrivacyPolicy: z.boolean({
		required_error: 'You must agree to the terms of service and privacy policy',
	}),
	remember: z.boolean().optional(),
	redirectTo: z.string().optional(),
})

async function requireData({
	request,
	params,
}: {
	request: Request
	params: Params
}) {
	await requireAnonymous(request)
	const verifySession = await verifySessionStorage.getSession(
		request.headers.get('cookie'),
	)
	const email = verifySession.get(onboardingEmailSessionKey)
	const providerId = verifySession.get(providerIdKey)
	const result = z
		.object({
			email: z.string(),
			providerName: ProviderNameSchema,
			providerId: z.string(),
		})
		.safeParse({ email, providerName: params.provider, providerId })
	if (result.success) {
		return result.data
	} else {
		console.error(result.error)
		throw redirect('/signup')
	}
}

export const handle: SEOHandle = {
	getSitemapEntries: () => null,
}

export const meta: Route.MetaFunction = () => {
	return [{ title: 'Setup CS-Grenade Account' }]
}

export async function loader({ request, params }: Route.LoaderArgs) {
	const { email } = await requireData({ request, params })
	const verifySession = await verifySessionStorage.getSession(
		request.headers.get('cookie'),
	)
	const prefilledProfile = verifySession.get(prefilledProfileKey)

	return data({
		email,
		status: 'idle',
		submission: {
			initialValue: prefilledProfile ?? {},
		} as SubmissionResult,
	})
}

export async function action({ request, params }: Route.ActionArgs) {
	const { email, providerId, providerName } = await requireData({
		request,
		params,
	})
	const formData = await request.formData()
	const verifySession = await verifySessionStorage.getSession(
		request.headers.get('cookie'),
	)

	const submission = await parseWithZod(formData, {
		schema: SignupFormSchema.superRefine(async (data, ctx) => {
			const existingUser = await getUserIdByUsername(data.username)
			if (existingUser) {
				ctx.addIssue({
					path: ['username'],
					code: z.ZodIssueCode.custom,
					message: 'A user already exists with this username',
				})
				return
			}
		}).transform(async (data) => {
			const session = await signupWithConnection({
				...data,
				email,
				providerId,
				providerName,
			})
			return { ...data, session }
		}),
		async: true,
	})

	if (submission.status !== 'success') {
		return data(
			{ result: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}

	const { session, remember, redirectTo } = submission.value

	const authSession = await authSessionStorage.getSession(
		request.headers.get('cookie'),
	)
	authSession.set(sessionKey, session.id)
	const headers = new Headers()
	headers.append(
		'set-cookie',
		await authSessionStorage.commitSession(authSession, {
			expires: remember ? session.expirationDate : undefined,
		}),
	)
	headers.append(
		'set-cookie',
		await verifySessionStorage.destroySession(verifySession),
	)

	return redirectWithToast(
		safeRedirect(redirectTo),
		{ title: 'Welcome', description: 'Thanks for signing up!' },
		{ headers },
	)
}

export default function OnboardingProviderRoute({
	loaderData,
	actionData,
}: Route.ComponentProps) {
	const isPending = useIsPending()
	const [searchParams] = useSearchParams()
	const redirectTo = searchParams.get('redirectTo')

	const [form, fields] = useForm({
		id: 'onboarding-provider-form',
		constraint: getZodConstraint(SignupFormSchema),
		lastResult: actionData?.result ?? loaderData.submission,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: SignupFormSchema })
		},
		shouldRevalidate: 'onBlur',
	})

	return (
		<AuthLayout
			title={`Welcome aboard ${loaderData.email}!`}
			subtitle="Please enter your details."
		>
			<Form method="POST" {...getFormProps(form)}>
				{fields.imageUrl.initialValue ? (
					<div className="mb-4 flex flex-col items-center justify-center gap-4">
						<img
							src={fields.imageUrl.initialValue}
							alt="Profile"
							className="h-24 w-24 rounded-full"
						/>
						<p className="text-muted-foreground">
							You can change your photo later
						</p>
						<input {...getInputProps(fields.imageUrl, { type: 'hidden' })} />
					</div>
				) : null}
				<Field
					labelProps={{ htmlFor: fields.username.id, children: 'Username' }}
					inputProps={{
						...getInputProps(fields.username, { type: 'text' }),
						autoFocus: true,
						autoComplete: 'username',
						className: 'lowercase',
					}}
					errors={fields.username.errors}
				/>
				<Field
					labelProps={{ htmlFor: fields.name.id, children: 'Name' }}
					inputProps={{
						...getInputProps(fields.name, { type: 'text' }),
						autoComplete: 'name',
					}}
					errors={fields.name.errors}
				/>

				<CheckboxField
					labelProps={{
						htmlFor: fields.agreeToTermsOfServiceAndPrivacyPolicy.id,
						children: (
							<div>
								Do you agree to our{' '}
								<Button variant="link" asChild className="inline p-0">
									<Link to="/tos" target="_blank">
										Terms of Service
									</Link>
								</Button>{' '}
								and{' '}
								<Button variant="link" asChild className="inline p-0">
									<Link to="/privacy" target="_blank">
										Privacy Policy
									</Link>
								</Button>
								?
							</div>
						),
					}}
					buttonProps={getInputProps(
						fields.agreeToTermsOfServiceAndPrivacyPolicy,
						{ type: 'checkbox' },
					)}
					errors={fields.agreeToTermsOfServiceAndPrivacyPolicy.errors}
				/>
				<CheckboxField
					labelProps={{
						htmlFor: fields.remember.id,
						children: 'Remember me',
					}}
					buttonProps={getInputProps(fields.remember, { type: 'checkbox' })}
					errors={fields.remember.errors}
				/>

				{redirectTo ? (
					<input type="hidden" name="redirectTo" value={redirectTo} />
				) : null}

				<ErrorList errors={form.errors} id={form.errorId} />

				<StatusButton
					className="mt-4 w-full"
					status={isPending ? 'pending' : (form.status ?? 'idle')}
					type="submit"
					disabled={isPending}
				>
					Create an account
				</StatusButton>
			</Form>
		</AuthLayout>
	)
}
