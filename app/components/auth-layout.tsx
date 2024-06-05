import { Spacer } from './spacer'
import { Card } from './ui/card'

export function AuthLayout({
	title,
	subtitle,
	children,
}: {
	title: string
	subtitle?: string
	children: React.ReactNode
}) {
	return (
		<div className="min-h-full pb-32 pt-20 grid place-content-center">
			<Card className="max-w-lg w-full py-12 px-4">
				<div className="flex flex-col gap-3 text-center break-words">
					<h1 className="text-h1">{title}</h1>
					<p className="text-body-md text-muted-foreground">{subtitle}</p>
				</div>
				<Spacer size="xs" />
				<div className="grid gap-6 px-8">{children}</div>
			</Card>
		</div>
	)
}
