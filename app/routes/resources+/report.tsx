import { useEffect, useState } from 'react'
import { json, type ActionFunctionArgs } from '@remix-run/node'
import { useFetcher } from '@remix-run/react'
import { getFormProps, getTextareaProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { toast } from 'sonner'

import { prisma } from '#app/utils/db.server.ts'
import { checkHoneypot } from '#app/utils/honeypot.server.ts'
import { requireUserWithPermission } from '#app/utils/permissions.server.ts'
import { userHasPermission } from '#app/utils/permissions.ts'
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
import { TextareaField } from '#app/components/forms.tsx'

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
export async function action({ request }: ActionFunctionArgs) {
	const userId = await requireUserWithPermission(request, 'create:report')

	const formData = await request.formData()
	checkHoneypot(formData)

	const submission = parseWithZod(formData, {
		schema: ReportSchema,
	})
	if (submission.status !== 'success') {
		return json(
			{ result: submission.reply() },
			{
				status: submission.status === 'error' ? 400 : 200,
			},
		)
	}

	await prisma.report.create({
		data: {
			...submission.value,
			userId,
		},
	})

	return json({
		result: submission.reply(),
	})
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

	useEffect(() => {
		if (fetcher.data?.result.status === 'success') {
			setOpen(false)
			toast.success('Your report has been submitted.')
		}
	}, [fetcher.data?.result.status])

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
