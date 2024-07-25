import { Link, useRouteLoaderData } from '@remix-run/react'

import { cn } from '#app/utils/misc.tsx'
import { type loader as rootLoader } from '#app/root.tsx'

import { Logo } from './logo.tsx'
import { Button } from './ui/button.tsx'

export function Footer() {
	const data = useRouteLoaderData<typeof rootLoader>('root')

	const activeMaps = data?.maps.filter((m) => m.isActive) || []
	const inactiveMaps = data?.maps.filter((m) => !m.isActive) || []

	return (
		<footer className="bg-accent">
			<div className="container flex flex-wrap justify-evenly gap-12 py-8 sm:gap-24 sm:py-16">
				<Logo className="size-36" />
				<FooterSection title="Links">
					<FooterLink to="/">Home</FooterLink>
					<FooterLink to="/users">Users</FooterLink>
					<FooterLink to="/support">Support</FooterLink>
					<FooterLink to="/about">About</FooterLink>
					<FooterLink to="/privacy">Privacy</FooterLink>
					<FooterLink to="/tos">TOS</FooterLink>
				</FooterSection>
				<FooterSection title="Maps">
					{activeMaps.map((m) => (
						<FooterLink key={m.name} to={`/map/${m.name}`} className="gap-2">
							<img
								alt=""
								src={`/resources/map-logos/${m.logo?.id}`}
								className="size-6"
							/>
							{m.label}
						</FooterLink>
					))}
				</FooterSection>
				{inactiveMaps.length > 0 ? (
					<FooterSection title="Inactive maps">
						{inactiveMaps.map((m) => (
							<FooterLink key={m.name} to={`/map/${m.name}`} className="gap-2">
								<img
									alt=""
									src={`/resources/map-logos/${m.logo?.id}`}
									className="size-6"
								/>
								{m.label}
							</FooterLink>
						))}
					</FooterSection>
				) : null}
			</div>
		</footer>
	)
}

function FooterSection({
	children,
	title,
}: {
	children: React.ReactNode
	title: string
}) {
	return (
		<div className="grid w-full grid-rows-[auto_1fr] place-content-center sm:w-auto">
			<p className="mb-2 font-bold">{title}</p>
			<div className="flex max-h-full flex-col flex-wrap content-start gap-2 sm:max-h-36">
				{children}
			</div>
		</div>
	)
}

function FooterLink({
	children,
	to,
	className,
}: {
	children: React.ReactNode
	to: string
	className?: string
}) {
	return (
		<Button variant="link" asChild className={cn('justify-start', className)}>
			<Link to={to}>{children}</Link>
		</Button>
	)
}
