import { default as defaultConfig } from '@epic-web/config/prettier'

/** @type {import("prettier").Options} */
export default {
	...defaultConfig,
	plugins: [...defaultConfig.plugins, '@ianvs/prettier-plugin-sort-imports'],
	importOrder: [
		'^(react/(.*)$)|^(react$)',
		'^(@remix-run/(.*)$)|^(@remix-run$)',
		'<THIRD_PARTY_MODULES>',
		'',
		'^#types$',
		'^#app/utils/(.*)$',
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
	importOrderTypeScriptVersion: '5.4.5',
	importOrderParserPlugins: ['typescript', 'jsx', 'decorators-legacy'],
}
