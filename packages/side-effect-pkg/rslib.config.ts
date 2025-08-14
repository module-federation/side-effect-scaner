import { defineConfig } from '@rslib/core';
import pkg from './package.json';

const shared = {
	dts: {
		bundle: false,
	},
};

export default defineConfig({
	output: {
		cleanDistPath: true,
	},
	lib: [
		{
			...shared,
			format: 'cjs',
			output: {
				distPath: {
					root: './dist/cjs',
				},
			},
			source: {
				define: {
					__VERSION__: JSON.stringify(pkg.version),
				},
			},
		},
	],
});
