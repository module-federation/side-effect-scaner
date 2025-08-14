import type { RsbuildPlugin } from '@rsbuild/core';

/**
 * Safely convert asset source to UTF-8 string
 * Handle possible Buffer, string, or other types
 */
// Handle other possible types (like Uint8Array)
// Handle array types
// Finally try to call toString method
function safeAssetToString(source: any): string {
	if (!source) return '';

	if (typeof source === 'string') {
		return source;
	}

	if (Buffer.isBuffer(source)) {
		return source.toString('utf-8');
	}

	// Handle other possible types (like Uint8Array)
	if (source instanceof Uint8Array) {
		return Buffer.from(source).toString('utf-8');
	}

	// Handle array types
	if (Array.isArray(source)) {
		return Buffer.from(source).toString('utf-8');
	}

	// Finally try to call toString method
	try {
		return source.toString();
	} catch {
		return String(source);
	}
}

export type Asset = {
	name: string;
	content: string;
	map: string;
};

export type AssetMap = {
	js: Asset[];
	css: Asset[];
	html: Asset[];
};

export const shakePlugin = (
	processAssets: (assetMap: AssetMap) => Promise<void>,
): RsbuildPlugin => ({
	name: 'shake-plugin',
	setup(api) {
		api.processAssets({ stage: 'optimize-transfer' }, async ({ assets }) => {
			const assetEntries = Object.entries(assets);
			const assetMap: AssetMap = {
				js: [],
				css: [],
				html: [],
			};
			const defaultValue: Asset = {
				name: '',
				content: '',
				map: '',
			};

			assetEntries.forEach(([assetName, assetSource]) => {
				if (assetName.endsWith('.js')) {
					const map = assetEntries.find(
						([name]) => name === `${assetName}.map`,
					);
					assetMap['js'].push({
						...defaultValue,
						name: assetName,
						content: safeAssetToString(assetSource.source()),
						map: map ? safeAssetToString(map[1].source()) : '',
					});
				} else if (assetName.endsWith('.css')) {
					const map = assetEntries.find(
						([name]) => name === `${assetName}.map`,
					);
					assetMap['css'].push({
						...defaultValue,
						name: assetName,
						content: safeAssetToString(assetSource.source()),
						map: map ? safeAssetToString(map[1].source()) : '',
					});
				} else if (assetName.endsWith('.html')) {
					assetMap['html'].push({
						...defaultValue,
						name: assetName,
						content: safeAssetToString(assetSource.source()),
					});
				}
			});

			await processAssets(assetMap);
		});
	},
});
