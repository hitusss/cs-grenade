import { data, Form, redirect, useNavigation } from 'react-router'
import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { invariantResponse } from '@epic-web/invariant'
import { parseFormData } from '@mjackson/form-data-parser'
import { type SEOHandle } from '@nasa-gcn/remix-seo'
import { z } from 'zod'

import {
	deleteUserImage,
	getUser,
	updateUserImage,
} from '#app/models/index.server.ts'
import { requireUserId } from '#app/utils/auth.server.ts'
import {
	uploadHandler,
	useDoubleCheck,
	useIsPending,
} from '#app/utils/misc.tsx'
import { getUserImgSrc } from '#app/utils/user.ts'
import { Button } from '#app/components/ui/button.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { ErrorList, ImageField } from '#app/components/forms.tsx'

import { type Route } from './+types/profile.photo.ts'
import { type BreadcrumbHandle } from './profile.tsx'

export const handle: BreadcrumbHandle & SEOHandle = {
	breadcrumb: <Icon name="circle-user">Photo</Icon>,
	getSitemapEntries: () => null,
}

const MAX_SIZE = 1024 * 1024 * 3 // 3MB

const DeleteImageSchema = z.object({
	intent: z.literal('delete'),
})

const NewImageSchema = z.object({
	intent: z.literal('submit'),
	photoFile: z
		.instanceof(File)
		.refine((file) => file.size > 0, 'Image is required')
		.refine(
			(file) => file.size <= MAX_SIZE,
			'Image size must be less than 3MB',
		),
})

const PhotoFormSchema = z.discriminatedUnion('intent', [
	DeleteImageSchema,
	NewImageSchema,
])

export async function loader({ request }: Route.LoaderArgs) {
	const userId = await requireUserId(request)
	const user = await getUser(userId)
	invariantResponse(user, 'User not found', { status: 404 })
	return data({ user })
}

export async function action({ request }: Route.ActionArgs) {
	const userId = await requireUserId(request)
	const formData = await parseFormData(
		request,
		uploadHandler({ maxPartSize: MAX_SIZE }),
	)

	const submission = await parseWithZod(formData, {
		schema: PhotoFormSchema.transform(async (data) => {
			if (data.intent === 'delete') return { intent: 'delete' }
			if (data.photoFile.size <= 0) return z.NEVER
			return {
				intent: data.intent,
				image: {
					contentType: data.photoFile.type,
					blob: Buffer.from(await data.photoFile.arrayBuffer()),
				},
			}
		}),
		async: true,
	})

	if (submission.status !== 'success') {
		return data(
			{ result: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}

	const { image, intent } = submission.value

	await deleteUserImage(userId)

	if (intent === 'delete') {
		return redirect('/settings/profile')
	}

	if (image) {
		await updateUserImage({ userId, image })
	}

	return redirect('/settings/profile')
}

export default function SettingsProfilePhotoRoute({
	loaderData,
	actionData,
}: Route.ComponentProps) {
	const doubleCheckDeleteImage = useDoubleCheck()

	const navigation = useNavigation()

	const [form, fields] = useForm({
		id: 'profile-photo',
		constraint: getZodConstraint(PhotoFormSchema),
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: PhotoFormSchema })
		},
		shouldRevalidate: 'onBlur',
	})

	const isPending = useIsPending()
	const pendingIntent = isPending ? navigation.formData?.get('intent') : null
	const lastSubmissionIntent = fields.intent.value

	return (
		<div>
			<Form
				method="POST"
				encType="multipart/form-data"
				className="flex flex-col items-center justify-center gap-10"
				{...getFormProps(form)}
			>
				<ImageField
					key={fields.photoFile.key}
					inputProps={getInputProps(fields.photoFile, {
						type: 'file',
						autoFocus: true,
					})}
					labelProps={{ children: 'Photo' }}
					errors={fields.photoFile.errors}
					size="lg"
					existingImage={
						loaderData.user
							? getUserImgSrc(loaderData.user.image?.id)
							: undefined
					}
					fullRounded
				/>
				<div className="flex gap-4">
					<Button variant="ghost" className="peer-invalid:hidden" type="reset">
						Reset
					</Button>
					{loaderData.user.image?.id ? (
						<StatusButton
							className="peer-valid:hidden"
							variant="destructive"
							{...doubleCheckDeleteImage.getButtonProps({
								type: 'submit',
								name: 'intent',
								value: 'delete',
							})}
							status={
								pendingIntent === 'delete'
									? 'pending'
									: lastSubmissionIntent === 'delete'
										? (form.status ?? 'idle')
										: 'idle'
							}
						>
							<Icon name="trash">
								{doubleCheckDeleteImage.doubleCheck
									? 'Are you sure?'
									: 'Delete'}
							</Icon>
						</StatusButton>
					) : null}
					<StatusButton
						name="intent"
						value="submit"
						type="submit"
						className="peer-invalid:hidden"
						status={
							pendingIntent === 'submit'
								? 'pending'
								: lastSubmissionIntent === 'submit'
									? (form.status ?? 'idle')
									: 'idle'
						}
					>
						Save Photo
					</StatusButton>
				</div>
				<ErrorList errors={form.errors} />
			</Form>
		</div>
	)
}
