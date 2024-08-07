import * as cookie from 'cookie'
import { z } from 'zod'

import { colors, modes, type Color, type Mode } from './theme.ts'

const ModeSchema = z.enum(modes)
const ColorSchema = z.enum(colors)

const modeCookieName = 'en_theme_mode'

const colorCookieName = 'en_theme_color'

export function getTheme(request: Request) {
	const cookieHeader = request.headers.get('cookie')

	let mode = cookieHeader ? cookie.parse(cookieHeader)[modeCookieName] : 'light'
	const modeResult = ModeSchema.safeParse(mode)

	let color = cookieHeader
		? cookie.parse(cookieHeader)[colorCookieName]
		: 'yellow'
	const colorResult = ColorSchema.safeParse(color)

	return {
		mode: modeResult.success ? modeResult.data : null,
		color: colorResult.success ? colorResult.data : null,
	}
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
