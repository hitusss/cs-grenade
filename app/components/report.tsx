import { Form } from 'react-router'

import {
	getUserDisplayName,
	getUserFullName,
	getUserImgSrc,
} from '#app/utils/user.ts'

import { Button } from './ui/button.tsx'
import { Icon } from './ui/icon.tsx'
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from './ui/tooltip.tsx'

type Report = {
	id: string
	message: string
	user: {
		name: string | null
		image: {
			id: string
		} | null
		username: string
	} | null
}

function Report({ report }: { report: Report }) {
	return (
		<li className="bg-accent text-accent-foreground grid gap-2 rounded px-4 py-2">
			<div className="flex justify-between gap-4">
				<p>{report.message}</p>
				<Form method="post">
					<input type="hidden" name="reportId" value={report.id} />
					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger>
								<Button
									type="submit"
									name="intent"
									value="delete-report"
									variant="destructive"
									size="icon"
								>
									<Icon name="trash" />
									<span className="sr-only">Delete report</span>
								</Button>
							</TooltipTrigger>
							<TooltipContent>Delete report</TooltipContent>
						</Tooltip>
					</TooltipProvider>
				</Form>
			</div>
			<div className="flex items-center gap-2">
				<img
					src={getUserImgSrc(report.user?.image?.id)}
					className="size-6 rounded-full"
					alt={getUserDisplayName(report.user)}
				/>
				{getUserFullName(report.user)}
			</div>
		</li>
	)
}

export function ReportsList({ reports }: { reports: Report[] }) {
	return (
		<ul className="grid gap-1">
			{reports.map((r) => (
				<Report key={r.id} report={r} />
			))}
		</ul>
	)
}
