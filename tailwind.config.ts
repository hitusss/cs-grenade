import { type Config } from 'tailwindcss'
import animatePlugin from 'tailwindcss-animate'
import radixPlugin from 'tailwindcss-radix'

import { extendedTheme } from './app/utils/extended-theme.ts'

export default {
	content: ['./app/**/*.{ts,tsx,jsx,js}'],
	darkMode: 'class',
	theme: {
		container: {
			center: true,
			padding: {
				DEFAULT: '1rem',
				'2xl': '2rem',
			},
			screens: {
				'2xl': '1535px',
			},
		},
		extend: extendedTheme,
	},
	plugins: [animatePlugin, radixPlugin],
} satisfies Config
