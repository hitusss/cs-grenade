import { useRef } from 'react'
import { Form, Link, useSubmit } from 'react-router'

import { userHasPermission } from '#app/utils/permissions.ts'
import {
	getUserDisplayName,
	getUserFullName,
	getUserImgSrc,
	useOptionalUser,
	useUser,
} from '#app/utils/user.ts'
import { Notifications } from '#app/routes/resources+/notifications.tsx'
import { ThemeSwitch } from '#app/routes/resources+/theme-switch.tsx'

import { Logo } from './logo.tsx'
import { Button } from './ui/button.tsx'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuPortal,
	DropdownMenuTrigger,
} from './ui/dropdown-menu.tsx'
import { Icon } from './ui/icon.tsx'

export function Header() {
	const user = useOptionalUser()

	return (
		<header className="container py-6">
			<nav className="flex flex-wrap items-center justify-between gap-4 sm:flex-nowrap md:gap-8">
				<Link to="/">
					<Logo className="size-12" />
					<span className="sr-only">Home</span>
				</Link>
				<div className="flex items-center gap-6">
					<ThemeSwitch />
					{user ? (
						<>
							<Notifications />
							<UserDropdown />
						</>
					) : (
						<Button asChild variant="default" size="lg">
							<Link to="/login">Log In</Link>
						</Button>
					)}
				</div>
			</nav>
		</header>
	)
}

function UserDropdown() {
	const submit = useSubmit()
	const formRef = useRef<HTMLFormElement>(null)

	const user = useUser()
	const hasReadSupportPermission = userHasPermission(user, 'read:support')
	const hasReadAdminAnyPermission = userHasPermission(user, 'read:admin:any')

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					asChild
					variant="secondary"
					size="icon"
					className="sm:w-auto sm:px-4"
				>
					<Link
						to={`/users/${user.username}`}
						// this is for progressive enhancement
						onClick={(e) => e.preventDefault()}
						className="flex items-center gap-2"
					>
						<img
							className="h-8 w-8 rounded-full object-cover"
							alt={getUserFullName(user)}
							src={getUserImgSrc(user.image?.id)}
						/>
						<span className="hidden sm:block">{getUserDisplayName(user)}</span>
					</Link>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuPortal>
				<DropdownMenuContent sideOffset={8} align="start">
					{hasReadAdminAnyPermission ? (
						<DropdownMenuItem asChild>
							<Link prefetch="intent" to="/admin">
								<Icon className="text-lg" name="shield">
									Admin
								</Icon>
							</Link>
						</DropdownMenuItem>
					) : null}
					<DropdownMenuItem asChild>
						<Link prefetch="intent" to={`/users/${user.username}`}>
							<Icon className="text-lg" name="circle-user">
								Profile
							</Icon>
						</Link>
					</DropdownMenuItem>
					{hasReadSupportPermission ? (
						<DropdownMenuItem asChild>
							<Link prefetch="intent" to="/support">
								<Icon className="text-lg" name="life-buoy">
									Support
								</Icon>
							</Link>
						</DropdownMenuItem>
					) : null}
					<DropdownMenuItem
						asChild
						// this prevents the menu from closing before the form submission is completed
						onSelect={(event) => {
							event.preventDefault()
							void submit(formRef.current)
						}}
					>
						<Form action="/logout" method="POST" ref={formRef}>
							<Icon className="text-lg" name="log-out">
								<button type="submit">Logout</button>
							</Icon>
						</Form>
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenuPortal>
		</DropdownMenu>
	)
}
