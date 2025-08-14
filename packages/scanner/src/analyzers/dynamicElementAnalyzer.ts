import type { IgnoreFilter } from '@/IgnoreFilter';
import i18next from '@/i18n';
import type { Asset } from '@/rsbuild-plugins/shake-plugin';
import type { ScanOptions } from '@/types/config';
import type { ParseResult as HtmlParseResult } from '@/types/html';
import { normalizeIssueFilePath } from '@/utils/file';
import { getSourceCodeLocation } from '@/utils/getSourceCodeLocation';
import { normalizeHtmlIssue } from '@/utils/normalizeHtmlIssue';
import type { Issue } from '../types/issues';
import type { DynamicElementOperation, ParseResult } from '../types/js';
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
export type ParsedHtmlFile = Omit<HtmlOrJSParsedFile, 'ast'> & {
	type: 'html';
	ast: HtmlParseResult;
};
type UnTrackedDynamicElement = {
	element: DynamicElementOperation;
	loc: UnwrapPromise<ReturnType<typeof getSourceCodeLocation>>;
	asset: Asset;
};

type UnTrackedDynamicElements = UnTrackedDynamicElement[];

/**
 * Detect side effects of dynamically created elements
 * Including DOM operations like appendChild, insertBefore, removeChild, etc.
 */
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
	) as ParsedHtmlFile[];

	const unTrackedElements: UnTrackedDynamicElements = [];

	await Promise.all(
		[...jsFiles, ...htmlFiles].map(async (file) => {
			const dynamicElementIssues = await detectDynamicElements(
				file,
				ignoreFilter,
				unTrackedElements,
				options,
			);
			issues.push(...dynamicElementIssues);

			const appendChildIssues = await detectAppendChildOperations(
				file,
				ignoreFilter,
				options,
			);
			issues.push(...appendChildIssues);

			const insertBeforeIssues = await detectInsertBeforeOperations(
				file,
				ignoreFilter,
				options,
			);
			issues.push(...insertBeforeIssues);

			const removeChildIssues = await detectRemoveChildOperations(
				file,
				ignoreFilter,
				options,
			);
			issues.push(...removeChildIssues);
		}),
	);

	return issues;
}

/**
 * Detect operations for dynamically creating elements
 * @param file Parsed file
 * @param rules Rule configuration
 * @returns List of issues
 */
async function detectDynamicElements(
	file: ParsedJSFile | ParsedHtmlFile,
	ignoreFilter: IgnoreFilter,
	unTrackedElements: UnTrackedDynamicElements,
	options: Required<ScanOptions>,
): Promise<Issue[]> {
	const { asset } = file;
	const issues: Issue[] = [];

	if (
		!file.ast.dynamicElements ||
		file.ast.dynamicElements.create.length === 0
	) {
		return issues;
	}

	await Promise.all(
		file.ast.dynamicElements.create.map(async (element) => {
			// Check if there's corresponding cleanup operation
			const hasCleanup = checkForCleanupOperation(file, element);

			if (!hasCleanup) {
				const loc = await getSourceCodeLocation(
					asset,
					element.location,
					undefined,
					undefined,
					options,
				);
				if (ignoreFilter.shouldIgnore(asset, loc?.start?.line, loc?.source)) {
					return;
				}

				unTrackedElements.push({
					element,
					loc,
					asset: file.asset,
				});

				if (!options.untrackedDynamicElement) {
					return;
				}
				issues.push(
					normalizeUnTrackedElementIssue(
						{
							element,
							loc,
							asset: file.asset,
						},
						file,
						options,
					),
				);
			}
		}),
	);

	return issues;
}

/**
 * Detect appendChild operations
 * @param file Parsed file
 * @param rules Rule configuration
 * @returns List of issues
 */
async function detectAppendChildOperations(
	file: ParsedJSFile | ParsedHtmlFile,
	ignoreFilter: IgnoreFilter,
	options: Required<ScanOptions>,
): Promise<Issue[]> {
	const { asset } = file;
	const issues: Issue[] = [];

	if (
		!file.ast.dynamicElements ||
		file.ast.dynamicElements.append.length === 0
	) {
		return issues;
	}

	await Promise.all(
		file.ast.dynamicElements.append.map(async (operation) => {
			const loc = await getSourceCodeLocation(
				asset,
				operation.location,
				undefined,
				undefined,
				options,
			);
			if (ignoreFilter.shouldIgnore(asset, loc?.start?.line, loc?.source)) {
				return;
			}

			if (!options.dynamicElementAppend) {
				return;
			}

			issues.push(
				normalizeHtmlIssue(
					{
						type: 'dynamic_element_append',
						severity: 'warning',
						message: i18next.t('dynamic_issue_append_element'),
						element: operation.element,
						parent: operation.parent || 'unknown',
						file: normalizeIssueFilePath({
							file,
							options,
							locSource: loc?.source,
						}),
						position: loc,
						code: loc?.actualCode || operation.code || '',
						operation: 'appendChild',
						source: loc?.source,
					},
					file,
				),
			);
		}),
	);

	return issues;
}

/**
 * Detect insertBefore operations
 * @param file Parsed file
 * @param rules Rule configuration
 * @returns List of issues
 */
async function detectInsertBeforeOperations(
	file: ParsedJSFile | ParsedHtmlFile,
	ignoreFilter: IgnoreFilter,
	options: Required<ScanOptions>,
): Promise<Issue[]> {
	const { asset } = file;
	const issues: Issue[] = [];

	if (
		!file.ast.dynamicElements ||
		file.ast.dynamicElements.insert.length === 0
	) {
		return issues;
	}

	await Promise.all(
		file.ast.dynamicElements.insert.map(async (operation) => {
			const loc = await getSourceCodeLocation(
				asset,
				operation.location,
				undefined,
				undefined,
				options,
			);
			if (ignoreFilter.shouldIgnore(asset, loc?.start?.line, loc?.source)) {
				return;
			}

			if (!options.dynamicElementInsert) {
				return;
			}

			issues.push(
				normalizeHtmlIssue(
					{
						type: 'dynamic_element_insert',
						severity: 'warning',
						message: i18next.t('dynamic_issue_insert_element'),
						element: operation.element,
						parent: operation.parent || 'unknown',
						reference: operation.reference,
						file: normalizeIssueFilePath({
							file,
							options,
							locSource: loc?.source,
						}),
						position: loc,
						code: loc?.actualCode || operation.code || '',
						operation: 'insertBefore',
						source: loc?.source,
					},
					file,
				),
			);
		}),
	);

	return issues;
}

/**
 * Detect removeChild operations
 * @param file Parsed file
 * @param rules Rule configuration
 * @returns List of issues
 */
async function detectRemoveChildOperations(
	file: ParsedJSFile | ParsedHtmlFile,
	ignoreFilter: IgnoreFilter,
	options: Required<ScanOptions>,
): Promise<Issue[]> {
	const { asset } = file;
	const issues: Issue[] = [];

	if (
		!file.ast.dynamicElements ||
		file.ast.dynamicElements.remove.length === 0
	) {
		return issues;
	}

	await Promise.all(
		file.ast.dynamicElements.remove.map(async (operation) => {
			const loc = await getSourceCodeLocation(
				asset,
				operation.location,
				undefined,
				undefined,
				options,
			);
			if (
				ignoreFilter.shouldIgnore(asset, loc?.start?.line, loc?.source) ||
				!options.dynamicElementRemove
			) {
				return;
			}

			issues.push(
				normalizeHtmlIssue(
					{
						type: 'dynamic_element_remove',
						severity: 'warning',
						message: i18next.t('dynamic_issue_remove_element'),
						element: operation.element,
						parent: operation.parent || 'unknown',
						file: normalizeIssueFilePath({
							file,
							options,
							locSource: loc?.source,
						}),
						position: loc,
						code: loc?.actualCode || operation.code || '',
						operation: 'removeChild',
						source: loc?.source,
					},
					file,
				),
			);
		}),
	);

	return issues;
}

/**
 * Check if there's corresponding cleanup operation
 * @param file Parsed file
 * @param element Dynamic element operation
 * @returns True if there's cleanup operation
 */
function checkForCleanupOperation(
	file: ParsedJSFile | ParsedHtmlFile,
	element: DynamicElementOperation,
): boolean {
	if (!file.ast.dynamicElements) {
		return false;
	}

	// Check if there's corresponding removeChild or innerHTML = '' cleanup operation
	const cleanupOperations = file.ast.dynamicElements.remove.filter(
		(op) => op.element === element.element,
	);

	return cleanupOperations.length > 0;
}

/**
 * Normalize untracked dynamic element issue format
 * @param unTrackedElement Untracked dynamic element
 * @param file Parsed file
 * @param options Scan options
 * @returns Normalized issue
 */
function normalizeUnTrackedElementIssue(
	unTrackedElement: UnTrackedDynamicElement,
	file: ParsedFile,
	options: Required<ScanOptions>,
): Issue {
	const { element, loc } = unTrackedElement;
	return normalizeHtmlIssue(
		{
			type: 'untracked_dynamic_element',
			severity: 'warning',
			message: i18next.t('dynamic_issue_untracked_element'),
			element: element.element,
			method: element.method || 'unknown',
			file: normalizeIssueFilePath({
				file,
				options,
				locSource: loc?.source,
			}),
			position: loc,
			code: loc?.actualCode || element.code || '',
			source: loc?.source,
		},
		file,
	);
}

export { analyze };
