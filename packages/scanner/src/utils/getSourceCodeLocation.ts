import * as path from 'path';
import type {
	NullableMappedPosition,
	SourceMapConsumer as SourceMapConsumerInstance,
} from 'source-map';
import { SourceMapConsumer } from 'source-map';
import type { Asset } from '@/rsbuild-plugins/shake-plugin';
import type { Position } from '@/types/common';
import type { ScanOptions } from '@/types/config';
import type { EventListener } from '@/types/js';

type BasedIndex = { line: number; column: number };

const SOURCE_MAP_CONSUME_SIZE_LIMIT = 64 * 1024 * 1024;
const SOURCE_MAP_CONSUMER_CACHE_LIMIT = 2;

type CachedSourceMapConsumer = {
	consumer: SourceMapConsumerInstance;
	lastUsed: number;
};

const sourceMapConsumerCache = new Map<string, CachedSourceMapConsumer>();
const sourceMapConsumerPromises = new Map<
	string,
	Promise<CachedSourceMapConsumer>
>();
let sourceMapConsumerUsedAt = 0;

function findTopLevelJsonProperty(json: string, propertyName: string): number {
	const key = `"${propertyName}"`;
	let depth = 0;
	let inString = false;
	let escaped = false;

	for (let i = 0; i < json.length; i++) {
		const char = json[i];

		if (inString) {
			if (escaped) {
				escaped = false;
			} else if (char === '\\') {
				escaped = true;
			} else if (char === '"') {
				inString = false;
			}
			continue;
		}

		if (char === '"') {
			if (depth === 1 && json.startsWith(key, i)) {
				let nextIndex = i + key.length;
				while (/\s/.test(json[nextIndex])) {
					nextIndex++;
				}
				if (json[nextIndex] === ':') {
					return i;
				}
			}
			inString = true;
			continue;
		}

		if (char === '{' || char === '[') {
			depth++;
		} else if (char === '}' || char === ']') {
			depth--;
		}
	}

	return -1;
}

function findJsonArrayEnd(json: string, start: number): number {
	let depth = 0;
	let inString = false;
	let escaped = false;

	for (let i = start; i < json.length; i++) {
		const char = json[i];

		if (inString) {
			if (escaped) {
				escaped = false;
			} else if (char === '\\') {
				escaped = true;
			} else if (char === '"') {
				inString = false;
			}
			continue;
		}

		if (char === '"') {
			inString = true;
			continue;
		}

		if (char === '[') {
			depth++;
		} else if (char === ']') {
			depth--;
			if (depth === 0) {
				return i;
			}
		}
	}

	return -1;
}

function stripSourcesContent(sourcemap: string): string {
	const propertyStart = findTopLevelJsonProperty(sourcemap, 'sourcesContent');
	if (propertyStart === -1) {
		return sourcemap;
	}

	let colonIndex = propertyStart;
	while (sourcemap[colonIndex] !== ':' && colonIndex < sourcemap.length) {
		colonIndex++;
	}

	let arrayStart = colonIndex + 1;
	while (/\s/.test(sourcemap[arrayStart])) {
		arrayStart++;
	}

	if (sourcemap[arrayStart] !== '[') {
		return sourcemap;
	}

	const arrayEnd = findJsonArrayEnd(sourcemap, arrayStart);
	if (arrayEnd === -1) {
		return sourcemap;
	}

	let removeStart = propertyStart;
	let removeEnd = arrayEnd + 1;
	while (/\s/.test(sourcemap[removeEnd])) {
		removeEnd++;
	}
	if (sourcemap[removeEnd] === ',') {
		removeEnd++;
	} else {
		let previousIndex = propertyStart - 1;
		while (/\s/.test(sourcemap[previousIndex])) {
			previousIndex--;
		}
		if (sourcemap[previousIndex] === ',') {
			removeStart = previousIndex;
		}
	}

	return sourcemap.slice(0, removeStart) + sourcemap.slice(removeEnd);
}

function evictSourceMapConsumers(currentKey: string) {
	while (sourceMapConsumerCache.size > SOURCE_MAP_CONSUMER_CACHE_LIMIT) {
		let oldestKey: string | undefined;
		let oldestUsedAt = Number.POSITIVE_INFINITY;

		for (const [key, cachedConsumer] of sourceMapConsumerCache) {
			if (key === currentKey) {
				continue;
			}
			if (cachedConsumer.lastUsed < oldestUsedAt) {
				oldestKey = key;
				oldestUsedAt = cachedConsumer.lastUsed;
			}
		}

		if (!oldestKey) {
			return;
		}

		sourceMapConsumerCache.get(oldestKey)?.consumer.destroy();
		sourceMapConsumerCache.delete(oldestKey);
	}
}

async function getCachedSourceMapConsumer(
	asset: Asset,
	sourcemap: string,
): Promise<SourceMapConsumerInstance> {
	const cacheKey = asset.name;
	const cachedConsumer = sourceMapConsumerCache.get(cacheKey);
	if (cachedConsumer) {
		cachedConsumer.lastUsed = ++sourceMapConsumerUsedAt;
		return cachedConsumer.consumer;
	}

	let consumerPromise = sourceMapConsumerPromises.get(cacheKey);
	if (!consumerPromise) {
		consumerPromise = (async () => {
			const consumer = await new SourceMapConsumer(
				stripSourcesContent(sourcemap),
			);
			return {
				consumer,
				lastUsed: ++sourceMapConsumerUsedAt,
			};
		})();
		sourceMapConsumerPromises.set(cacheKey, consumerPromise);
	}

	try {
		const resolvedConsumer = await consumerPromise;
		resolvedConsumer.lastUsed = ++sourceMapConsumerUsedAt;
		sourceMapConsumerCache.set(cacheKey, resolvedConsumer);
		sourceMapConsumerPromises.delete(cacheKey);
		evictSourceMapConsumers(cacheKey);
		return resolvedConsumer.consumer;
	} catch (error) {
		sourceMapConsumerPromises.delete(cacheKey);
		throw error;
	}
}

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
		column: position.column + baseIndex.column - 1,
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
	if (
		asset.name.endsWith('.html') ||
		!sourcemap ||
		sourcemap.length > SOURCE_MAP_CONSUME_SIZE_LIMIT
	) {
		return { ...defaultRtn };
	}

	try {
		// Use sourcemap to map the compiled location back to the original source location
		if (!location.start || !location.end) {
			return { ...defaultRtn };
		}

		const consumer = await getCachedSourceMapConsumer(asset, sourcemap);
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
			return { ...defaultRtn };
		}

		// Remove webpack:// prefix, get clean file path
		const cleanSource = startLocation.source;

		// Build the complete path of the original file
		const originalFilePath = path.resolve(
			projectRoot,
			removeSourceBundlerPrefix(cleanSource),
		);

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
			actualCode: undefined,
			lineContent: undefined,
		};
	} catch (error) {
		if (options.verbose) {
			console.error(`Error processing sourcemap for ${asset.name}:`, error);
		}
		return null;
	}
};
