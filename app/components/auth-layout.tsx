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
			<div className="max-w-lg w-full rounded-lg border py-12 px-6">
				<div className="flex flex-col gap-3 text-center break-words">
					<h1>{title}</h1>
					<p className="text-muted-foreground">{subtitle}</p>
				</div>
				<div className="grid gap-6 px-8 mt-16">{children}</div>
			</div>
		</div>
	)
}
