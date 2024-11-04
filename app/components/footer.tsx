import { Link, useRouteLoaderData } from '@remix-run/react'

import { cn } from '#app/utils/misc.tsx'
import { type loader as rootLoader } from '#app/root.tsx'

import { Logo } from './logo.tsx'
import { Button } from './ui/button.tsx'
import { Icon } from './ui/icon.tsx'
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from './ui/tooltip.tsx'

export function Footer() {
	const data = useRouteLoaderData<typeof rootLoader>('root')

	const activeMaps = data?.maps.filter((m) => m.isActive) || []
	const inactiveMaps = data?.maps.filter((m) => !m.isActive) || []

	return (
		<footer className="border-t bg-accent">
			<div className="container grid grid-cols-4 gap-8 px-12 py-20 xl:grid-cols-12">
				<div className="col-span-full sm:col-span-2">
					<Logo className="size-36" />
					<div className="mt-4 flex w-36 flex-wrap gap-4">
						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<a href="https://github.com/hitusss/cs-grenade">
										<Icon name="github-logo" className="size-8" />
										<span className="sr-only">github repository</span>
									</a>
								</TooltipTrigger>
								<TooltipContent>Github repository</TooltipContent>
							</Tooltip>
						</TooltipProvider>
					</div>
				</div>
				<FooterSection title="Links" className="col-span-full sm:col-span-2">
					<ul className="grid grid-cols-[repeat(2,max-content)]">
						<li>
							<FooterLink to="/">Home</FooterLink>
						</li>
						<li>
							<FooterLink to="/users">Users</FooterLink>
						</li>
						<li>
							<FooterLink to="/support">Support</FooterLink>
						</li>
						<li>
							<FooterLink to="/about">About</FooterLink>
						</li>
						<li>
							<FooterLink to="/privacy">Privacy</FooterLink>
						</li>
						<li>
							<FooterLink to="/tos">TOS</FooterLink>
						</li>
					</ul>
				</FooterSection>
				{activeMaps.length > 0 ? (
					<FooterSection
						title="Maps"
						className={cn(
							'col-span-full',
							inactiveMaps.length > 0
								? 'md:col-span-2 xl:col-span-4'
								: 'lg:col-span-8',
						)}
					>
						<ul className="grid grid-cols-[repeat(auto-fit,minmax(12rem,max-content))]">
							{activeMaps.map((m) => (
								<li key={m.name}>
									<FooterLink to={`/map/${m.name}`} className="gap-2">
										<img
											alt=""
											src={`/resources/map-logos/${m.logo?.id}`}
											className="size-6"
										/>
										{m.label}
									</FooterLink>
								</li>
							))}
						</ul>
					</FooterSection>
				) : null}
				{inactiveMaps.length > 0 ? (
					<FooterSection
						title="Inactive maps"
						className={cn(
							'col-span-full',
							activeMaps.length > 0
								? 'md:col-span-2 xl:col-span-4'
								: 'lg:col-span-8',
						)}
					>
						<ul className="grid grid-cols-[repeat(auto-fit,minmax(12rem,max-content))]">
							{inactiveMaps.map((m) => (
								<li key={m.name}>
									<FooterLink to={`/map/${m.name}`} className="gap-2">
										<img
											alt=""
											src={`/resources/map-logos/${m.logo?.id}`}
											className="size-6"
										/>
										{m.label}
									</FooterLink>
								</li>
							))}
						</ul>
					</FooterSection>
				) : null}
			</div>
		</footer>
	)
}

function FooterSection({
	children,
	title,
	className,
}: {
	children: React.ReactNode
	title: string
	className?: string
}) {
	return (
		<div className={cn('grid grid-rows-[auto_1fr]', className)}>
			<p className="mb-2 font-bold">{title}</p>
			<div>{children}</div>
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
