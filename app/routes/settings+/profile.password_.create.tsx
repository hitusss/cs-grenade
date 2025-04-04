import { data, Form, Link, redirect } from 'react-router'
import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { type SEOHandle } from '@nasa-gcn/remix-seo'

import {
	checkUserHasPassword,
	updateUserPassowrd,
} from '#app/models/index.server.ts'
import { getPasswordHash, requireUserId } from '#app/utils/auth.server.ts'
import { useIsPending } from '#app/utils/misc.tsx'
import { PasswordAndConfirmPasswordSchema } from '#app/utils/validators/user.ts'
import { Button } from '#app/components/ui/button.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { ErrorList, Field } from '#app/components/forms.tsx'

import { type Route } from './+types/profile.password_.create.ts'
import { type BreadcrumbHandle } from './profile.tsx'

export const handle: BreadcrumbHandle & SEOHandle = {
	breadcrumb: <Icon name="rectangle-ellipsis">Password</Icon>,
	getSitemapEntries: () => null,
}

const CreatePasswordForm = PasswordAndConfirmPasswordSchema

async function requireNoPassword(userId: string) {
	const password = await checkUserHasPassword(userId)
	if (password) {
		throw redirect('/settings/profile/password')
	}
}

export async function loader({ request }: Route.LoaderArgs) {
	const userId = await requireUserId(request)
	await requireNoPassword(userId)
	return data({})
}

export async function action({ request }: Route.ActionArgs) {
	const userId = await requireUserId(request)
	await requireNoPassword(userId)
	const formData = await request.formData()
	const submission = await parseWithZod(formData, {
		async: true,
		schema: CreatePasswordForm,
	})
	if (submission.status !== 'success') {
		return data(
			{
				result: submission.reply({
					hideFields: ['password', 'confirmPassword'],
				}),
			},
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}

	const { password } = submission.value
	const passwordHash = await getPasswordHash(password)

	await updateUserPassowrd({
		userId,
		passwordHash,
	})

	return redirect(`/settings/profile`, { status: 302 })
}

export default function SettingsProfilePasswordCreateRoute({
	actionData,
}: Route.ComponentProps) {
	const isPending = useIsPending()

	const [form, fields] = useForm({
		id: 'password-create-form',
		constraint: getZodConstraint(CreatePasswordForm),
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: CreatePasswordForm })
		},
		shouldRevalidate: 'onBlur',
	})

	return (
		<Form method="POST" {...getFormProps(form)} className="mx-auto max-w-md">
			<Field
				labelProps={{ children: 'New Password' }}
				inputProps={{
					...getInputProps(fields.password, { type: 'password' }),
					autoComplete: 'new-password',
					autoFocus: true,
				}}
				errors={fields.password.errors}
			/>
			<Field
				labelProps={{ children: 'Confirm New Password' }}
				inputProps={{
					...getInputProps(fields.confirmPassword, {
						type: 'password',
					}),
					autoComplete: 'new-password',
				}}
				errors={fields.confirmPassword.errors}
			/>
			<ErrorList id={form.errorId} errors={form.errors} />
			<div className="grid w-full grid-cols-2 gap-6">
				<Button variant="secondary" asChild>
					<Link to="..">Cancel</Link>
				</Button>
				<StatusButton
					type="submit"
					status={isPending ? 'pending' : (form.status ?? 'idle')}
				>
					Create Password
				</StatusButton>
			</div>
		</Form>
	)
}
