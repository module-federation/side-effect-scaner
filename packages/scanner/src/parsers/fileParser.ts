import path from 'path';
import type { Asset, AssetMap } from '@/rsbuild-plugins/shake-plugin';
import type { ScanOptions } from '@/types/config';
import type { BaseParsedFile, ParsedFile } from '@/types/parsed-file';
import { getFileTypeFromExt } from '@/utils/file';
import { IgnoreFilter } from '../IgnoreFilter';
import { parse as cssParse } from './cssParser';
import { parse as htmlParse } from './htmlParser';
import { parse as jsParse } from './jsParser';

/**
 * Dynamically parses file content based on its extension.
 * @returns A promise that resolves to a ParsedFile object.
 */
// async function parse(filePath: string): Promise<ParsedFile> {
async function parseItem(
	asset: Asset,
	options: Required<ScanOptions>,
): Promise<ParsedFile> {
	const content = asset.content;
	const fileExt = path.extname(asset.name);
	const baseResult: BaseParsedFile = {
		path: asset.name,
		fileName: path.basename(asset.name),
		extension: fileExt,
		content,
		asset,
	};

	// Check if entire file should be ignored
	const ignoreFilter = new IgnoreFilter(options.ignore || []);
	const sources = [...JSON.parse(asset.map || `{"sources":[]}`).sources];
	if (sources.some((source) => ignoreFilter.shouldIgnoreFile(source))) {
		return {
			...baseResult,
			type: getFileTypeFromExt(fileExt),
			ast: null,
			disabled: true,
		};
	}

	try {
		switch (fileExt) {
			case '.html':
			case '.htm':
				return {
					...baseResult,
					type: 'html',
					ast: await htmlParse(content, options),
				};

			case '.css':
				return {
					...baseResult,
					type: 'css',
					ast: await cssParse(content, options),
				};

			case '.js':
			case '.jsx':
				return {
					...baseResult,
					type: 'js',
					ast: await jsParse(content, false, options),
				};

			case '.ts':
			case '.tsx':
				return {
					...baseResult,
					type: 'js',
					typescript: true,
					ast: await jsParse(content, true, options),
				};

			default:
				return {
					...baseResult,
					type: 'unknown',
					ast: null,
				};
		}
	} catch (error: any) {
		return {
			...baseResult,
			type: 'error',
			error: error.message,
		};
	}
}

/**
 * Dynamically parses file content based on its extension.
 * @returns A promise that resolves to a ParsedFiles array.
 */
// async function parse(filePath: string): Promise<ParsedFile[]> {
async function parse(
	assetMap: AssetMap,
	options: Required<ScanOptions>,
): Promise<ParsedFile[]> {
	return Promise.all(
		[
			...Object.values(assetMap.css),
			...Object.values(assetMap.js),
			...Object.values(assetMap.html),
		].map(async (asset) => await parseItem(asset, options)),
	);
}

export { parse };
