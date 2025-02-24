import { default as defaultConfig } from '@epic-web/config/prettier'

/** @type {import("prettier").Options} */
export default {
	...defaultConfig,
	plugins: ['@ianvs/prettier-plugin-sort-imports', ...defaultConfig.plugins],
	importOrder: [
		'^(react/(.*)$)|^(react$)',
		'^(react-router/(.*)$)|^(react-router$)',
		'^(@react-router/(.*)$)|^(@react-router$)',
		'<THIRD_PARTY_MODULES>',
		'',
		'^#types/(.*)$',
		'^#app/utils/(.*)$',
		'^#app/hooks/(.*)$',
		'^#app/components/ui/(.*)$',
		'^#app/components/(.*)$',
		'^#app/styles/(.*)$',
		'^#app/routes/(.*)$',
		'^#app/(.*)$',
		'',
		'^#(.*)$',
		'',
		'^[./]',
	],
	importOrderParserPlugins: ['typescript', 'jsx', 'decorators-legacy'],
}
