import chalk from 'chalk';
import * as cssAnalyzer from './analyzers/cssAnalyzer';
import * as dynamicElementAnalyzer from './analyzers/dynamicElementAnalyzer';
import * as eventListenerAnalyzer from './analyzers/eventListenerAnalyzer';
import * as globalVarAnalyzer from './analyzers/globalVarAnalyzer';
import { IgnoreFilter } from './IgnoreFilter';
import * as fileParser from './parsers/fileParser';
import { generateMarkdownReport } from './reporters';
import type { AssetMap } from './rsbuild-plugins/shake-plugin';
import type { ScanOptions } from './types/config';
import * as dependencyResolver from './utils/dependencyResolver';

/**
 * @param {ScanOptions} options - Scan options
 * @returns {Promise<Object>} Scan results
 */
// Load configuration
// Parse files
// Analyze files
export async function scan(
	options: Required<ScanOptions>,
	assetMap?: AssetMap,
) {
	const scannedAt = new Date().toString();
	// 加载配置

	const finalAssetMap =
		assetMap ||
		(await dependencyResolver.resolveAssetMap(options.dir || options.entry, {
			maxDepth: options.maxDepth,
			aliases: options.alias,
		}));

	if (!finalAssetMap['js']) {
		console.log(
			chalk.red(
				`无法从入口文件 "${options.entry}" 解析到任何文件。请检查入口文件路径是否正确，以及文件是否真实存在。`,
			),
		);
		process.exit(1);
	}

	// 解析文件
	const parsedFiles = await fileParser.parse(finalAssetMap, options);

	if (!parsedFiles.length) {
		console.log(
			chalk.red(
				`无法从入口文件 "${options.entry}" 解析到任何文件。请检查入口文件路径是否正确，以及文件是否真实存在。`,
			),
		);
		process.exit(1);
	}
	const ignoreFilter = new IgnoreFilter(options.ignore || []);

	// 分析文件
	const [
		cssResults,
		globalVarResults,
		eventListenerResults,
		dynamicElementResults,
	] = await Promise.all([
		cssAnalyzer.analyze(parsedFiles, ignoreFilter, options),
		globalVarAnalyzer.analyze(parsedFiles, ignoreFilter, options),
		eventListenerAnalyzer.analyze(parsedFiles, ignoreFilter, options),
		dynamicElementAnalyzer.analyze(parsedFiles, ignoreFilter, options),
	]);

	await generateMarkdownReport(
		options,
		{
			css: cssResults,
			globalVars: globalVarResults,
			eventListeners: eventListenerResults,
			dynamicElements: dynamicElementResults,
		},
		parsedFiles.length,
		scannedAt,
	);
}
