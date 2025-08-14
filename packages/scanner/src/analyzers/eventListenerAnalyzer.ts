import fs from 'fs';
import type { IgnoreFilter } from '@/IgnoreFilter';
import i18next from '@/i18n';
import { parse as jsParse } from '@/parsers/jsParser';
import type { Asset } from '@/rsbuild-plugins/shake-plugin';
import type { ScanOptions } from '@/types/config';
import type { ParseResult as HtmlParseResult } from '@/types/html';
import { resolveDependencies } from '@/utils/dependencyResolver';
import { normalizeIssueFilePath } from '@/utils/file';
import { getSourceCodeLocation } from '@/utils/getSourceCodeLocation';
import { normalizeHtmlIssue } from '@/utils/normalizeHtmlIssue';
import type { Issue } from '../types/issues';
import type { EventListener, ParseResult } from '../types/js';
import type {
	HtmlParsedFile,
	JsParsedFile,
	ParsedFile,
} from '../types/parsed-file';

// Generic utility type: extract T from Promise<T>
type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;

type HtmlOrJSParsedFile = HtmlParsedFile | JsParsedFile;

export type ParsedJSFile = Omit<HtmlOrJSParsedFile, 'ast'> & {
	ast: ParseResult;
};

type UnRemovedListener = {
	listener: EventListener;
	loc: UnwrapPromise<ReturnType<typeof getSourceCodeLocation>>;
	asset: Asset;
};

type UnRemovedListeners = UnRemovedListener[];

function generateListenerKey(listener: EventListener) {
	return `${listener.element}:${listener.event}`;
}

function isDynamicEvent(event: string) {
	return event.startsWith('[variable:');
}

/**
 * Find actual definitions of event listeners through dependency analysis and AST parsing
 * Prioritize direct AST parsing of current file, only use dependency analysis when necessary
 * @param rawListener Unremoved listener
 * @param fileDeps File dependencies
 * @param parsedFileMap Parsed file map
 * @param rawListenerKeys Raw listener keys
 * @param options Scan options
 * @returns Listener definition
 */
async function findListenerDefinition(
	rawListener: UnRemovedListener,
	fileDeps: Map<string, Set<string>>,
	parsedFileMap: Map<string, ParseResult>,
	rawListenerKeys: Set<string>,
	options: Required<ScanOptions>,
): Promise<{
	found: boolean;
	definitionFile?: string;
	definitionLocation?: any;
	key?: string;
}> {
	const { listener, loc, asset } = rawListener;
	const generateRawListenerKey = (raw: EventListener) => {
		return `${generateListenerKey(raw)}:${asset.name}`;
	};
	if (rawListenerKeys.has(generateRawListenerKey(listener))) {
		return {
			found: true,
		};
	}
	const listenerElement = listener.definition;

	if (!loc || !loc.source) {
		return {
			found: false,
		};
	}
	const sourceFile = loc.source;

	const findListenerInParsedFile = (parsedFile: ParseResult) => {
		// Find element definitions (variable declarations, functions, etc.)
		const elementDefinition = parsedFile.globalVariables?.find(
			(variable) => variable.name === listenerElement,
		);

		if (elementDefinition) {
			const key = `${sourceFile}:${elementDefinition.location?.start?.line || 0}:${elementDefinition.location?.start?.column || 0}`;
			rawListenerKeys.add(generateRawListenerKey(listener));
			return {
				found: true,
				definitionFile: sourceFile,
				definitionLocation: elementDefinition.location,
				key,
			};
		}

		// Find function definitions
		const functionDefinition = parsedFile.functions?.find(
			(func) => func.name === listenerElement,
		);

		if (functionDefinition) {
			const key = `${sourceFile}:${functionDefinition.location?.start?.line || 0}:${functionDefinition.location?.start?.column || 0}`;
			return {
				found: true,
				definitionFile: sourceFile,
				definitionLocation: functionDefinition.location,
				key,
			};
		}
	};
	const parsedFile = parsedFileMap.get(sourceFile);

	// 1. First try to find definition in current file's AST
	if (parsedFile && parsedFile.eventListeners) {
		const res = findListenerInParsedFile(parsedFile);
		if (res?.found) {
			return res;
		}
	}

	// 2. If not found in current file, perform dependency analysis
	try {
		const handledDependencies = fileDeps.get(sourceFile);
		let dependencies: string[] | undefined = handledDependencies
			? Array.from(handledDependencies)
			: undefined;
		if (!dependencies) {
			dependencies = await resolveDependencies(sourceFile, {
				maxDepth: 2,
				baseDir: process.cwd(),
				extensions: ['.js', '.jsx', '.ts', '.tsx'],
				verbose: false,
			});
			fileDeps.set(sourceFile, new Set(dependencies));
		}

		// 3. In dependency files, find definitions
		for (const depPath of dependencies) {
			if (depPath === sourceFile) continue; // Skip current file

			// Find corresponding JS file
			const depFile = parsedFileMap.get(depPath);
			let parsed: ParseResult | undefined = depFile;
			if (!depFile) {
				// If file hasn't been parsed, parse it directly
				try {
					const content = fs.readFileSync(depPath, 'utf-8');
					parsed = await jsParse(
						content,
						depPath.endsWith('.ts') || depPath.endsWith('.tsx'),
						options,
					);
					parsedFileMap.set(depPath, parsed);
				} catch (error) {}
			}

			if (!parsed) {
				continue;
			}
			const res = findListenerInParsedFile(parsed);
			if (res?.found) {
				return res;
			}
		}
	} catch (error) {
		// Dependency analysis failed, return not found
		console.warn(`Dependency analysis failed: ${error}`);
	}

	return {
		found: false,
	};
}

async function analyze(
	parsedFiles: ParsedFile[],
	ignoreFilter: IgnoreFilter,
	options: Required<ScanOptions>,
): Promise<Issue[]> {
	const issues: Issue[] = [];
	const jsFiles = parsedFiles.filter(
		(file) =>
			file.type === 'js' && file.ast && !('disabled' in file && file.disabled),
	) as ParsedJSFile[];
	const htmlFiles = parsedFiles.filter(
		(file) =>
			file.type === 'html' &&
			file.ast &&
			!('disabled' in file && file.disabled),
	) as (ParsedFile & { type: 'html'; ast: HtmlParseResult })[];

	const removedListeners: Array<Omit<UnRemovedListener, 'loc'>> = [];
	const unRemovedListeners: UnRemovedListeners = [];

	await Promise.all(
		[...jsFiles, ...htmlFiles].map(async (file) => {
			if (file.type === 'js') {
				file.ast.eventListeners.remove.forEach((listener) => {
					removedListeners.push({
						listener,
						asset: file.asset,
					});
				});
			}

			// const eventListeners = collectEventListeners(file);
			const unremovableListenerIssues = await detectUnremovableListeners(
				file,
				ignoreFilter,
				unRemovedListeners,
				options,
			);
			issues.push(...unremovableListenerIssues);

			const anonymousListenerIssues = await detectAnonymousListeners(
				file,
				ignoreFilter,
				options,
			);
			issues.push(...anonymousListenerIssues);
		}),
	);

	if (!unRemovedListeners.length) {
		return issues;
	}

	if (!removedListeners.length && options.unRemovedEventListener) {
		unRemovedListeners.forEach((unRemovedListener) => {
			issues.push(
				normalizeUnremovableListenerIssue(unRemovedListener, options),
			);
		});
		return issues;
	}

	// 1. Create key mapping for removedListeners (using optimized dependency analysis)
	const removedListenerKeys = new Set<string>();
	const fileDeps = new Map<string, Set<string>>();
	const parsedFileMap = new Map<string, ParseResult>();
	const rawListenerKeys = new Set<string>();
	await Promise.all(
		removedListeners.map(async ({ listener, asset }) => {
			const loc = await getSourceCodeLocation(
				asset,
				listener.location,
				undefined,
				undefined,
				options,
			);
			// Use optimized method to find definition
			const definitionInfo = await findListenerDefinition(
				{
					listener,
					loc,
					asset,
				},
				fileDeps,
				parsedFileMap,
				rawListenerKeys,
				options,
			);
			if (definitionInfo.key) {
				removedListenerKeys.add(definitionInfo.key);
			}
		}),
	);

	// 2. Traverse unRemovedListeners, check if there is a corresponding removeListener
	await Promise.all(
		unRemovedListeners.map(async ({ listener, asset, loc }) => {
			// Use optimized method to find definition
			const definitionInfo = await findListenerDefinition(
				{
					listener,
					loc,
					asset,
				},
				fileDeps,
				parsedFileMap,
				rawListenerKeys,
				options,
			);

			if (definitionInfo.key) {
				// 3. Compare keys, if not equal, considered as not removed
				if (
					!removedListenerKeys.has(definitionInfo.key) &&
					options.unRemovedEventListener
				) {
					console.log(`Unremoved listener detected: ${definitionInfo.key}`);
					issues.push(
						normalizeUnremovableListenerIssue(
							{
								listener,
								loc,
								asset,
							},
							options,
						),
					);
				}
			} else {
				if (options.unRemovedEventListener) {
					// If cannot get location info, directly considered as not removed
					issues.push(
						normalizeUnremovableListenerIssue(
							{
								listener,
								loc,
								asset,
							},
							options,
						),
					);
				}
			}
		}),
	);
	return issues;
}

function normalizeUnremovableListenerIssue(
	unRemovedListener: UnRemovedListener,
	options: Required<ScanOptions>,
): Issue {
	const { listener, loc, asset } = unRemovedListener;
	return {
		type: 'unremoved_event_listener',
		severity: 'warning',
		message: i18next.t('event_issue_unremoved_listener', {
			event: listener.event,
		}),
		event: listener.event,
		element: listener.element,
		file: normalizeIssueFilePath({
			// @ts-ignore
			file: {
				path: asset.name,
			},
			options,
			locSource: loc?.source,
		}),
		position: loc,
		code: loc?.actualCode || listener.code,
		source: loc?.source,
	};
}

async function detectUnremovableListeners(
	file: ParsedJSFile,
	ignoreFilter: IgnoreFilter,
	unRemovedListeners: UnRemovedListeners,
	options: Required<ScanOptions>,
): Promise<Issue[]> {
	const { asset } = file;
	const issues: Issue[] = [];
	if (asset.name.endsWith('.html')) {
		return issues;
	}

	if (
		!file.ast.eventListeners.add ||
		file.ast.eventListeners.add.length === 0
	) {
		return issues;
	}

	await Promise.all(
		file.ast.eventListeners.add.map(async (listener) => {
			if (listener.type === 'jQuery.on') {
				return;
			}

			// Anonymous functions are handled by detectAnonymousListeners
			const isAnonymous =
				listener.code &&
				(listener.code.includes('function(') ||
					listener.code.includes('function (') ||
					listener.code.includes('=>'));

			if (isAnonymous) {
				return;
			}

			const hasRemoveListener = checkForRemoveListener(file, listener);

			if (!hasRemoveListener) {
				const loc = await getSourceCodeLocation(
					asset,
					listener.location,
					undefined,
					undefined,
					options,
				);
				if (ignoreFilter.shouldIgnore(asset, loc?.start?.line, loc?.source)) {
					return;
				}

				if (isDynamicEvent(listener.event)) {
					// Dynamic events cannot be determined
					return;
				}
				unRemovedListeners.push({
					listener,
					loc,
					asset: file.asset,
				});
			}
		}),
	);

	return issues;
}

function checkForRemoveListener(
	file: ParsedJSFile,
	listener: EventListener,
): boolean {
	const key = generateListenerKey(listener);
	return Boolean(
		file.ast.eventListeners.remove.find((e) => generateListenerKey(e) === key),
	);
}

async function detectAnonymousListeners(
	file: ParsedJSFile,
	ignoreFilter: IgnoreFilter,
	options: Required<ScanOptions>,
): Promise<Issue[]> {
	const { asset } = file;
	const issues: Issue[] = [];

	if (
		!file.ast.eventListeners.add ||
		file.ast.eventListeners.add.length === 0
	) {
		return issues;
	}

	await Promise.all(
		file.ast.eventListeners.add.map(async (listener) => {
			if (
				listener.code &&
				(listener.code.includes('function(') ||
					listener.code.includes('function (') ||
					listener.code.includes('=>'))
			) {
				const loc = await getSourceCodeLocation(
					asset,
					listener.location,
					undefined,
					undefined,
					options,
				);
				if (ignoreFilter.shouldIgnore(asset, loc?.start?.line, loc?.source)) {
					return;
				}
				if (options.anonymousEventHandler) {
					issues.push(
						normalizeHtmlIssue(
							{
								type: 'anonymous_event_handler',
								severity: 'info',
								message: i18next.t('event_issue_anonymous_handler', {
									event: listener.event,
								}),
								event: listener.event,
								element: listener.element,
								file: normalizeIssueFilePath({
									file,
									options,
									locSource: loc?.source,
								}),
								position: loc,
								code: loc?.actualCode || listener.code,
								source: loc?.source,
							},
							file,
						),
					);
				}
			}
		}),
	);

	return issues;
}

export { analyze };
