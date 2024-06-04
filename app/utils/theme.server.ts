import * as cookie from 'cookie'

import { colors, modes, type Color, type Mode, type Theme } from './theme.ts'

const modeCookieName = 'en_theme_mode'

const colorCookieName = 'en_theme_color'

export function getTheme(request: Request) {
	const cookieHeader = request.headers.get('cookie')

	let mode = cookieHeader
		? cookie.parse(cookieHeader)[modeCookieName]
		: 'system'
	if (mode === undefined) mode = 'system'
	if (!modes.includes(mode)) mode = 'system'

	let color = cookieHeader
		? cookie.parse(cookieHeader)[colorCookieName]
		: 'yellow'
	if (color === undefined) color = 'yellow'
	if (!colors.includes(color)) color = 'yellow'

	return {
		mode,
		color,
	} as Theme
}

export function setTheme(mode: Mode, color: Color) {
	const headers = new Headers()
	if (mode === 'system') {
		headers.append(
			'Set-Cookie',
			cookie.serialize(modeCookieName, '', { path: '/', maxAge: -1 }),
		)
	} else {
		headers.append(
			'Set-Cookie',
			cookie.serialize(modeCookieName, mode, { path: '/', maxAge: 31536000 }),
		)
	}

	headers.append(
		'Set-Cookie',
		cookie.serialize(colorCookieName, color, { path: '/', maxAge: 31536000 }),
	)

	return headers
}
