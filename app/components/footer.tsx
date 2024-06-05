import { ThemeSwitch } from '#app/routes/resources+/theme-switch.tsx'

import { Logo } from './logo.tsx'

export function Footer() {
	return (
		<footer className="container flex justify-between pb-5">
			<Logo className="size-12" />
			<ThemeSwitch />
		</footer>
	)
}
