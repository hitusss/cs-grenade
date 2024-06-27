import { default as defaultConfig } from '@epic-web/config/eslint'

/** @type {import("eslint").Linter.Config} */
export default [
	...defaultConfig,
	// add custom config objects here:
	{
		rules: {
			'import/order': 'off',
			'react-hooks/exhaustive-deps': 'off',
		},
	},
]
