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
		<main className="grid min-h-full place-content-center pb-32 pt-20">
			<div className="w-full max-w-lg rounded-lg border px-6 py-12">
				<div className="flex flex-col gap-3 break-words text-center">
					<h1>{title}</h1>
					<p className="text-muted-foreground">{subtitle}</p>
				</div>
				<div className="mt-16 grid gap-6 px-8">{children}</div>
			</div>
		</main>
	)
}
