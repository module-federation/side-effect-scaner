import type { IgnoreFilter } from '@/IgnoreFilter';
import i18next from '@/i18n';
import type { ScanOptions } from '@/types/config';
import type { ParseResult as HtmlParseResult } from '@/types/html';
import { normalizeIssueFilePath } from '@/utils/file';
import { getSourceCodeLocation } from '@/utils/getSourceCodeLocation';
import { normalizeHtmlIssue } from '@/utils/normalizeHtmlIssue';
import type { Issue } from '../types/issues';
import type { GlobalVariable as GlobalVar } from '../types/js';
import type { ParsedFile } from '../types/parsed-file';

type ParsedJsFile = ParsedFile & {
	type: 'js';
	ast: { globalVariables: GlobalVar[] };
};
type ParsedHtmlFile = ParsedFile & {
	type: 'html';
	ast: HtmlParseResult;
};

async function analyze(
	parsedFiles: ParsedFile[],
	ignoreFilter: IgnoreFilter,
	options: Required<ScanOptions>,
): Promise<Issue[]> {
	const issues: Issue[] = [];
	const jsFiles = parsedFiles.filter(
		(file) =>
			file.type === 'js' && file.ast && !('disabled' in file && file.disabled),
	) as ParsedJsFile[];

	const htmlFiles = parsedFiles.filter(
		(file) =>
			file.type === 'html' &&
			file.ast &&
			!('disabled' in file && file.disabled),
	) as ParsedHtmlFile[];

	for (const file of [...jsFiles, ...htmlFiles]) {
		// All compiled to var
		const globalVarIssues = await detectGlobalVarDeclarations(
			file,
			ignoreFilter,
			options,
		);
		issues.push(...globalVarIssues);

		const pollutionIssues = await detectGlobalVarPollution(
			file,
			ignoreFilter,
			options,
		);
		issues.push(...pollutionIssues);
	}

	return issues;
}

async function detectGlobalVarDeclarations(
	file: ParsedHtmlFile | ParsedJsFile,
	ignoreFilter: IgnoreFilter,
	options: Required<ScanOptions>,
): Promise<Issue[]> {
	const { asset } = file;
	const issues: Issue[] = [];
	const allowedGlobals = new Set();

	if (file.ast.globalVariables && file.ast.globalVariables.length > 0) {
		for (const globalVar of file.ast.globalVariables) {
			if (file.type === 'js' && globalVar.type === 'var') {
				// After compilation, seems all var
				continue;
			}
			if (allowedGlobals.has(globalVar.name)) {
				continue;
			}

			const loc = await getSourceCodeLocation(
				asset,
				globalVar.location,
				undefined,
				undefined,
				options,
			);
			if (ignoreFilter.shouldIgnore(asset, loc?.start?.line, loc?.source)) {
				continue;
			}
			if (!options.globalVarDeclaration) {
				continue;
			}

			issues.push(
				normalizeHtmlIssue(
					{
						type: 'global_var_declaration',
						severity: 'warning',
						message: i18next.t('global_var_issue_declaration', {
							varName: globalVar.name,
						}),
						varName: globalVar.name,
						varType: globalVar.type,
						file: normalizeIssueFilePath({
							file,
							options,
							locSource: loc?.source,
						}),
						position: loc,
						code: loc?.actualCode || globalVar.code,
						source: loc?.source,
					},
					file,
				),
			);
		}
	}

	return issues;
}

async function detectGlobalVarPollution(
	file: ParsedHtmlFile | ParsedJsFile,
	ignoreFilter: IgnoreFilter,
	options: Required<ScanOptions>,
): Promise<Issue[]> {
	const { asset } = file;
	const issues: Issue[] = [];
	const builtInGlobals = new Set([
		'window',
		'document',
		'navigator',
		'location',
		'history',
		'localStorage',
		'sessionStorage',
		'console',
		'screen',
		'performance',
		'fetch',
		'XMLHttpRequest',
	]);

	if (file.ast.globalVariables && file.ast.globalVariables.length > 0) {
		for (const globalVar of file.ast.globalVariables) {
			if (globalVar.type === 'var') {
				// After compilation, seems all var
				continue;
			}

			if (builtInGlobals.has(globalVar.name)) {
				const loc = await getSourceCodeLocation(
					asset,
					globalVar.location,
					undefined,
					undefined,
					options,
				);
				if (ignoreFilter.shouldIgnore(asset, loc?.start?.line, loc?.source)) {
					continue;
				}
				if (!options.builtInOverride) {
					continue;
				}
				issues.push(
					normalizeHtmlIssue(
						{
							type: 'built_in_override',
							severity: 'error',
							message: i18next.t('global_var_issue_built_in_override', {
								varName: globalVar.name,
							}),
							varName: globalVar.name,
							file: normalizeIssueFilePath({
								file,
								options,
								locSource: loc?.source,
							}),
							position: loc,
							code: loc?.actualCode || globalVar.code,
							source: loc?.source,
						},
						file,
					),
				);
			}
		}
	}

	return issues;
}

export { analyze };
