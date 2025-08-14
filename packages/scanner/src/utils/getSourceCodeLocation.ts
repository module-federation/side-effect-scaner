import * as fs from 'fs';
import * as path from 'path';
import type { NullableMappedPosition } from 'source-map';
import { SourceMapConsumer } from 'source-map';
import type { Asset } from '@/rsbuild-plugins/shake-plugin';
import type { Position } from '@/types/common';
import type { ScanOptions } from '@/types/config';
import type { EventListener } from '@/types/js';

type BasedIndex = { line: number; column: number };

function normalizeResLocation(location: NullableMappedPosition) {
	if (location.column !== null) {
		location.column = location.column + 1;
	}
	return location;
}

function normalizeInputPosition(position: Position, baseIndex: BasedIndex) {
	if (position.line === null || position.column === null) {
		return position;
	}

	return {
		line: position.line + baseIndex.line,
		column: position.column + baseIndex.column,
	};
}

export function removeSourceBundlerPrefix(source: string) {
	return source.replace(/^webpack:\/\/[^/]+\//, '');
}
export const getSourceCodeLocation = async (
	asset: Asset,
	location: EventListener['location'],
	projectRoot: string = process.cwd(),
	basedIndex: BasedIndex = { line: 0, column: 0 },
	options: Required<ScanOptions>,
) => {
	const sourcemap = asset.map;

	const defaultRtn = {
		...location,
		source: options.compile
			? options.dir
				? asset.name
				: 'unknown'
			: asset.name,
		originalFilePath: undefined,
		actualCode: undefined,
		lineContent: undefined,
	};
	if (asset.name.endsWith('.html') || !sourcemap) {
		return { ...defaultRtn };
	}

	try {
		// Use sourcemap to map the compiled location back to the original source location
		const res = await SourceMapConsumer.with(
			sourcemap,
			null,
			async (consumer) => {
				try {
					if (!location.start || !location.end) {
						consumer.destroy();
						return { ...defaultRtn };
					}
					const startLocation = normalizeResLocation(
						consumer.originalPositionFor(
							normalizeInputPosition(location.start, basedIndex),
						),
					);
					const endLocation = normalizeResLocation(
						consumer.originalPositionFor(
							normalizeInputPosition(location.end, basedIndex),
						),
					);

					if (
						!startLocation.line ||
						!startLocation.column ||
						!endLocation.line ||
						!endLocation.column ||
						!startLocation.source ||
						!endLocation.source
					) {
						consumer.destroy();

						return { ...defaultRtn };
					}

					// Remove webpack:// prefix, get clean file path
					let cleanSource = startLocation.source;

					// Build the complete path of the original file
					const originalFilePath = path.resolve(projectRoot, cleanSource);

					// Read the original file content to verify the position accuracy
					let originalCode = '';
					try {
						originalCode = fs.readFileSync(originalFilePath, 'utf-8');
					} catch (error) {
						cleanSource = 'unknown';
						if (options.verbose) {
							console.warn(`无法读取原始文件: ${originalFilePath}`);
							console.error(error);
						}
					}

					// Extract the actual code fragment for verification
					const lines = originalCode.split('\n');
					const startLineIndex = startLocation.line - 1;

					let actualCode = '';
					if (lines[startLineIndex]) {
						if (startLocation.line === endLocation.line) {
							// Single line case
							actualCode = lines[startLineIndex].substring(
								// Source-map column numbers start at 0, while substring starts at 1, so we need to subtract 1. In addition, we have already added 1 to the column, so we need to subtract 1 again.
								startLocation.column - 1,
								endLocation.column - 0,
							);
						} else {
							// Cross line case, extract the fragment of the starting line
							actualCode = lines[startLineIndex].substring(
								startLocation.column - 1,
							);
						}
					}
					consumer.destroy();

					return {
						start: {
							line: startLocation.line,
							column: startLocation.column,
						},
						end: {
							line: endLocation.line,
							column: endLocation.column,
						},
						source: cleanSource,
						originalFilePath,
						actualCode: actualCode.trim(), // Actual code fragment, remove leading and trailing spaces
						lineContent: lines[startLineIndex] || '', // Entire line content for comparison
					};
				} catch (error) {
					if (options.verbose) {
						console.error(
							`Error processing sourcemap for ${asset.name}:`,
							error,
						);
					}
					consumer.destroy();
					return null;
				}
			},
		);
		return res;
	} catch (error) {
		if (options.verbose) {
			console.error(`Error processing sourcemap for ${asset.name}:`, error);
		}
		return null;
	}
};
