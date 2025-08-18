import { appTools, defineConfig } from '@modern-js/app-tools';

// https://modernjs.dev/en/configure/app/usage
export default defineConfig({
	runtime: {
		router: true,
	},
	plugins: [
		appTools({
			bundler: 'rspack', // Set to 'webpack' to enable webpack
		}),
	],
	output: {
		cssModules: {
			localIdentName: 'CSS_MODULE_LOCAL_IDENT_NAME-[local]-[hash:base64:6]',
		},
	},
});
