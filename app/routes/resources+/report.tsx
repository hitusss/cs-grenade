import { useState } from 'react'
import { data, useFetcher } from 'react-router'
import { getFormProps, getTextareaProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { HoneypotInputs } from 'remix-utils/honeypot/react'

import { prisma } from '#app/utils/db.server.ts'
import { checkHoneypot } from '#app/utils/honeypot.server.ts'
import { getReferrerRoute } from '#app/utils/misc.tsx'
import { requireUserWithPermission } from '#app/utils/permissions.server.ts'
import { userHasPermission } from '#app/utils/permissions.ts'
import { redirectWithToast } from '#app/utils/toast.server.ts'
import { useOptionalUser } from '#app/utils/user.ts'
import { ReportSchema } from '#app/utils/validators/report.ts'
import { Button } from '#app/components/ui/button.tsx'
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '#app/components/ui/dialog.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { ErrorList, TextareaField } from '#app/components/forms.tsx'

import { type Route } from './+types/report.ts'

type ReportDialogProps = {
	className?: string
	destinationId?: string
	grenadeId?: string
} & (
	| {
			type: 'destination'
			destinationId: string
	  }
	| {
			type: 'grenade'
			grenadeId: string
	  }
)
export async function action({ request }: Route.ActionArgs) {
	const userId = await requireUserWithPermission(request, 'create:report')
	const referrerRoute = getReferrerRoute(request)

	const formData = await request.formData()
	await checkHoneypot(formData)

	const submission = parseWithZod(formData, {
		schema: ReportSchema,
	})
	if (submission.status !== 'success') {
		return data(
			{ result: submission.reply() },
			{
				status: submission.status === 'error' ? 400 : 200,
			},
		)
	}

	let lastDay = Date.now() - 24 * 60 * 60 * 1000
	const hasRecentlyReport = await prisma.report.count({
		where: {
			userId,
			destinationId: submission.value.destinationId,
			grenadeId: submission.value.grenadeId,
			createdAt: {
				gte: new Date(lastDay).toISOString(),
			},
		},
	})
	if (hasRecentlyReport > 0) {
		return data({
			result: submission.reply({
				formErrors: [
					"You can't report the same place twice in a day, please try again later.",
				],
			}),
		})
	}

	await prisma.report.create({
		data: {
			...submission.value,
			userId,
		},
	})

	return redirectWithToast(
		referrerRoute,
		{
			type: 'success',
			title: 'Your report has been submitted.',
			description: '',
		},
		{
			headers: {
				'X-Remix-Reload-Document': 'true',
			},
		},
	)
}

export function ReportDialog({ className, type, ...props }: ReportDialogProps) {
	const fetcher = useFetcher<typeof action>()
	const user = useOptionalUser()
	const hasCreateReportPermission = userHasPermission(user, 'create:report')

	const [open, setOpen] = useState(false)

	const [form, fields] = useForm({
		id: `report`,
		constraint: getZodConstraint(ReportSchema),
		lastResult: fetcher.data?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: ReportSchema })
		},
		shouldRevalidate: 'onBlur',
	})

	if (!user || !hasCreateReportPermission) {
		return null
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button variant="destructive" className={className}>
					<Icon name="triangle-alert" />
					Report {type}
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Report {type}</DialogTitle>
				</DialogHeader>
				<fetcher.Form
					method="POST"
					{...getFormProps(form)}
					action="/resources/report"
				>
					<HoneypotInputs />
					<input
						name="destinationId"
						value={props.destinationId}
						type="hidden"
					/>
					<input name="grenadeId" value={props.grenadeId} type="hidden" />
					<TextareaField
						labelProps={{ children: 'Message' }}
						textareaProps={{
							...getTextareaProps(fields.message),
							autoFocus: true,
							placeholder: 'Report message',
						}}
						errors={fields.message.errors}
					/>
					<ErrorList errors={form.errors} />
					<DialogFooter>
						<DialogClose asChild>
							<Button type="button" variant="ghost">
								Cancel
							</Button>
						</DialogClose>
						<Button type="submit">Submit report</Button>
					</DialogFooter>
				</fetcher.Form>
			</DialogContent>
		</Dialog>
	)
}
