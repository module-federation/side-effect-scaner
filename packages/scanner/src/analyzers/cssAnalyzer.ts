import { CSS_MODULE_LOCAL_IDENT_NAME } from '@/constant';
import type { IgnoreFilter } from '@/IgnoreFilter';
import i18next from '@/i18n';
import type { ScanOptions } from '@/types/config';
import type { CssFile, CssRule } from '@/types/css';
import type { HtmlFile } from '@/types/html';
import type { Issue } from '@/types/issues';
import type { ParsedFile } from '@/types/parsed-file';
import { normalizeIssueFilePath } from '@/utils/file';
import { getSourceCodeLocation } from '@/utils/getSourceCodeLocation';
import { normalizeHtmlIssue } from '@/utils/normalizeHtmlIssue';

function filterCssModuleSelector(selectors: string[]) {
	return selectors.some((selector) =>
		selector.includes(CSS_MODULE_LOCAL_IDENT_NAME),
	);
}

/**
 * Detect global selectors
 * @param {Object} file CSS file
 * @param {Object} rules Rule configuration
 * @returns {Array<Object>} Detected issues
 */
async function detectGlobalSelectors(
	file: CssFile | HtmlFile,
	ignoreFilter: IgnoreFilter,
	options: Required<ScanOptions>,
): Promise<Issue[]> {
	const { asset } = file;
	const issues: Issue[] = [];
	// const globalSelectorsThreshold = rules.globalSelectorsThreshold || 3;

	// Defining a global selector pattern
	const globalSelectorPatterns = [
		'*',
		'body',
		'html',
		'div',
		'span',
		'p',
		'a',
		'input',
		'button',
		'form',
		'h1',
		'h2',
		'h3',
		'h4',
		'h5',
		'h6',
		'ul',
		'ol',
		'li',
		'table',
		'tr',
		'td',
	];

	// Defining critical global elements (highest priority detection)
	const criticalGlobalElements = ['body', 'html', '*'];

	// Check selectors in the file
	if (file.ast.globalRules) {
		for (const rule of file.ast.globalRules) {
			if (filterCssModuleSelector(rule.selectors)) {
				continue;
			}
			const loc = await getSourceCodeLocation(
				asset,
				rule.location,
				undefined,
				{
					column: -1,
					line: 0,
				},
				options,
			);
			if (ignoreFilter.shouldIgnore(asset, loc?.start?.line, loc?.source)) {
				continue;
			}
			for (const selector of rule.selectors || []) {
				// Check if it's a critical global element (body, html, *)
				const selectorParts = selector.split(/\s+|>|\+|~/);
				const isCriticalGlobal = selectorParts.some((part) =>
					criticalGlobalElements.includes(part.trim()),
				);

				if (isCriticalGlobal) {
					// Check critical global element styles
					const criticalDeclarations = checkCriticalGlobalStyles(rule);
					if (criticalDeclarations.length > 0 && options.criticalGlobalStyle) {
						issues.push(
							normalizeHtmlIssue(
								{
									type: 'critical_global_style',
									severity: 'error',
									message: i18next.t('css_issue_critical_global_style', {
										selector,
										declarations: criticalDeclarations.join(', '),
									}),
									selector: selector,
									declarations: criticalDeclarations,
									file: normalizeIssueFilePath({
										file,
										options,
										locSource: loc?.source,
									}),
									position: loc,
									code: loc?.actualCode,
									source: loc?.source,
								},
								file,
							),
						);
					}
				}

				// Check if it's a global selector
				for (const part of selectorParts) {
					const cleanPart = part.trim();
					if (globalSelectorPatterns.includes(cleanPart)) {
						if (
							options.globalSelector &&
							(!options.excludeGlobalSelectorAfterClass ||
								globalSelectorPatterns.includes(selectorParts[0]) ||
								!selectorParts.some((se) => se.startsWith('.')))
						) {
							issues.push(
								normalizeHtmlIssue(
									{
										type: 'global_selector',
										severity: 'warning',
										message: i18next.t('css_issue_global_selector', {
											selector: cleanPart,
										}),
										selector: selector,
										file: normalizeIssueFilePath({
											file,
											options,
											locSource: loc?.source,
										}),
										position: loc,
										code: loc?.actualCode,
									},
									file,
								),
							);
						}

						break;
					}
				}
			}
		}
	}

	return issues;
}

/**
 * Check critical global styles
 * @param {Object} rule CSS rule
 * @returns {Array<string>} List of critical style declarations
 */
function checkCriticalGlobalStyles(rule: CssRule): string[] {
	const criticalDeclarations: string[] = [];

	// Define key style properties that may cause side effects
	const criticalProperties = [
		'margin',
		'padding',
		'width',
		'height',
		'display',
		'position',
		'top',
		'left',
		'right',
		'bottom',
		'background',
		'background-color',
		'color',
		'font-family',
		'font-size',
		'line-height',
		'text-align',
		'border',
		'border-radius',
		'box-sizing',
		'overflow',
		'z-index',
	];

	// Define global styles that may cause serious side effects
	const dangerousGlobalStyles = [
		{ property: 'display', value: /^(block|flex|grid|none)$/ },
		{ property: 'position', value: /^(absolute|fixed|sticky)$/ },
		{ property: 'width', value: /^(100vw|100%|auto)$/ },
		{ property: 'height', value: /^(100vh|100%|auto)$/ },
		{ property: 'margin', value: /^(0|auto|unset|initial)/ },
		{ property: 'padding', value: /^(0|unset|initial)/ },
		{ property: 'box-sizing', value: /^border-box$/ },
	];

	if (rule.declarations) {
		for (const declaration of rule.declarations) {
			const property = declaration.property.toLowerCase();
			const value = declaration.value.toLowerCase().trim();

			// Check if it's key property
			if (criticalProperties.includes(property)) {
				// Check for dangerous style combinations
				const isDangerous = dangerousGlobalStyles.some(
					(style) => style.property === property && style.value.test(value),
				);

				if (isDangerous) {
					criticalDeclarations.push(
						`${declaration.property}: ${declaration.value}`,
					);
				}
			}

			// Special check: * selector setting box-sizing
			if (property === 'box-sizing' && value === 'border-box') {
				criticalDeclarations.push(
					i18next.t('css_issue_box_sizing_border_box', {
						property: declaration.property,
						value: declaration.value,
					}),
				);
			}

			// Special check: body/html setting margin/padding to 0
			if ((property === 'margin' || property === 'padding') && value === '0') {
				criticalDeclarations.push(
					i18next.t('css_issue_global_reset', {
						property: declaration.property,
						value: declaration.value,
					}),
				);
			}
		}
	}

	return criticalDeclarations;
}

/**
 * Detect overly complex selectors
 * @param {Object} file CSS file
 * @param {Object} rules Rule configuration
 * @returns {Array<Object>} Detected issues
 */
// Calculate selector complexity (simple implementation: count spaces, >, +, ~ in selector)
/**
 * Detect !important declarations
 * @param {Object} file CSS file
 * @param {Object} rules Rule configuration
 * @returns {Array<Object>} Detected issues
 */
/**
 * Detect duplicate CSS rules
 * @param {Object} file CSS file
 * @param {Object} rules Rule configuration
 * @returns {Array<Object>} Detected issues
 */
/**
 * Detect global rule side effects
 */
// Define high-risk CSS properties
// Check global rules
// Check each global rule's style declarations
// Check high-risk properties
// Especially dangerous styles
// Check !important declarations
/**
 * Analyze CSS side effects in files
 * @param {Array<Object>} parsedFiles List of parsed files
 * @param {Object} rules Rule configuration
 * @returns {Array<Object>} List of detected CSS side effects
 */
// Filter out disabled CSS and HTML files
// Analyze each CSS file
// Detect global selectors
// Detect global rule side effects
// Detect overly complex selectors
// Detect !important declarations
// Detect duplicate CSS rules
async function detectComplexSelectors(
	file: CssFile | HtmlFile,
	ignoreFilter: IgnoreFilter,
	options: Required<ScanOptions>,
): Promise<Issue[]> {
	const { asset } = file;
	const issues: Issue[] = [];
	const complexityThreshold = 4;

	if (file.ast.rules) {
		for (const rule of file.ast.rules) {
			if (filterCssModuleSelector(rule.selectors)) {
				continue;
			}
			const loc = await getSourceCodeLocation(
				asset,
				rule.location,
				undefined,
				{
					column: -1,
					line: 0,
				},
				options,
			);
			if (ignoreFilter.shouldIgnore(asset, loc?.start?.line, loc?.source)) {
				continue;
			}
			for (const selector of rule.selectors || []) {
				// Calculate selector complexity (simple implementation: count spaces, >, +, ~)
				const complexity = (selector.match(/\s+|>|\+|~/g) || []).length + 1;

				if (complexity > complexityThreshold) {
					issues.push(
						normalizeHtmlIssue(
							{
								type: 'complex_selector',
								severity: 'warning',
								message: i18next.t('css_issue_complex_selector', {
									selector,
									complexity,
								}),
								selector: selector,
								file: normalizeIssueFilePath({
									file,
									options,
									locSource: loc?.source,
								}),
								position: loc,
								code: loc?.actualCode,
								source: loc?.source,
							},
							file,
						),
					);
				}
			}
		}
	}

	return issues;
}

/**
 * Detect !important declarations
 * @param {Object} file CSS file
 * @param {Object} rules Rule configuration
 * @returns {Array<Object>} Detected issues
 */
async function detectImportantDeclarations(
	file: CssFile | HtmlFile,
	ignoreFilter: IgnoreFilter,
	options: Required<ScanOptions>,
): Promise<Issue[]> {
	const { asset } = file;
	const issues: Issue[] = [];
	if (file.type === 'html') {
		return issues;
	}
	if (file.ast.rules) {
		for (const rule of file.ast.rules) {
			if (filterCssModuleSelector(rule.selectors)) {
				continue;
			}
			const loc = await getSourceCodeLocation(
				asset,
				rule.location,
				undefined,
				{
					column: -1,
					line: 0,
				},
				options,
			);
			if (ignoreFilter.shouldIgnore(asset, loc?.start?.line, loc?.source)) {
				continue;
			}
			for (const declaration of rule.declarations || []) {
				if (declaration.important && options.importantDeclaration) {
					issues.push({
						type: 'important_declaration',
						severity: 'warning',
						message: i18next.t('css_issue_important_declaration', {
							property: declaration.property,
							value: declaration.value,
						}),
						selector: rule.selectors?.join(', ') || '',
						property: declaration.property,
						file: normalizeIssueFilePath({
							file,
							options,
							locSource: loc?.source,
						}),
						position: loc,
						code: loc?.actualCode,
						source: loc?.source,
					});
				}
			}
		}
	}

	return issues;
}

/**
 * Detect duplicate CSS rules
 * @param {Object} file CSS file
 * @param {Object} rules Rule configuration
 * @returns {Array<Object>} Detected issues
 */
async function detectDuplicateRules(
	file: CssFile | HtmlFile,
	ignoreFilter: IgnoreFilter,
	options: Required<ScanOptions>,
): Promise<Issue[]> {
	const { asset } = file;
	const issues: Issue[] = [];
	if (file.type === 'html') {
		return issues;
	}
	const selectorMap = new Map<string, CssRule>();

	if (file.ast.rules) {
		for (const rule of file.ast.rules) {
			if (filterCssModuleSelector(rule.selectors)) {
				continue;
			}
			const loc = await getSourceCodeLocation(
				asset,
				rule.location,
				undefined,
				{
					column: -1,
					line: 0,
				},
				options,
			);

			if (ignoreFilter.shouldIgnore(asset, loc?.start?.line, loc?.source)) {
				continue;
			}
			const selectorText = rule.selectors?.join(', ') || '';

			if (selectorMap.has(selectorText)) {
				issues.push({
					type: 'duplicate_rule',
					severity: 'warning',
					message: i18next.t('css_issue_duplicate_rule', {
						selector: selectorText,
					}),
					selector: selectorText,
					file: normalizeIssueFilePath({
						file,
						options,
						locSource: loc?.source,
					}),
					position: loc,
					code: loc?.actualCode,
					source: loc?.source,
				});
			} else {
				selectorMap.set(selectorText, rule);
			}
		}
	}

	return issues;
}

/**
 * Detect global rule side effects
 */
async function detectGlobalRuleSideEffects(
	file: CssFile | HtmlFile,
	ignoreFilter: IgnoreFilter,
	options: Required<ScanOptions>,
): Promise<Issue[]> {
	const { asset } = file;
	const issues: Issue[] = [];

	// // 定义高风险的CSS属性
	// const highRiskProperties = [
	// 	'margin',
	// 	'padding',
	// 	'width',
	// 	'height',
	// 	'display',
	// 	'position',
	// 	'background',
	// 	'color',
	// 	'font-family',
	// 	'font-size',
	// 	'border',
	// ];

	// 检查全局规则
	if (file.ast.globalRules) {
		for (const rule of file.ast.globalRules) {
			if (filterCssModuleSelector(rule.selectors)) {
				continue;
			}
			const loc = await getSourceCodeLocation(
				asset,
				rule.location,
				undefined,
				{
					column: -1,
					line: 0,
				},
				options,
			);
			if (ignoreFilter.shouldIgnore(asset, loc?.start?.line, loc?.source)) {
				continue;
			}
			// Check each global rule style declarations
			if (rule.declarations) {
				for (const declaration of rule.declarations) {
					// const property = declaration.property.toLowerCase();
					// const value = declaration.value.toLowerCase().trim();

					// // 检查高风险属性
					// if (
					// 	options.globalStyleSideEffect &&
					// 	highRiskProperties.includes(property)
					// ) {
					// 	let severity = 'warning' as 'warning' | 'error';
					// 	let message = i18next.t('css_issue_global_style_side_effect', {
					// 		selector: rule.selectors?.join(', ') || '',
					// 		property: declaration.property,
					// 		value: declaration.value,
					// 	});

					// 	// particularly dangerous style
					// 	if (
					// 		(property === 'display' && value === 'none') ||
					// 		(property === 'position' &&
					// 			['absolute', 'fixed'].includes(value)) ||
					// 		(property === 'width' && value === '100vw') ||
					// 		(property === 'height' && value === '100vh')
					// 	) {
					// 		severity = 'error';
					// 		message = i18next.t('css_issue_global_style_side_effect_severe', {
					// 			selector: rule.selectors?.join(', ') || '',
					// 			property: declaration.property,
					// 			value: declaration.value,
					// 		});
					// 	}

					// 	issues.push(
					// 		normalizeHtmlIssue(
					// 			{
					// 				type: 'global_style_side_effect',
					// 				severity,
					// 				message,
					// 				selector: rule.selectors?.join(', ') || '',
					// 				property: declaration.property,
					// 				value: declaration.value,
					// 				file: normalizeIssueFilePath({
					// 					file,
					// 					options,
					// 					locSource: loc?.source,
					// 				}),
					// 				position: loc,
					// 				code: loc?.actualCode,
					// 				source: loc?.source,
					// 			},
					// 			file,
					// 		),
					// 	);
					// }

					// Check !important declarations
					if (declaration.important && options.importantDeclaration) {
						issues.push(
							normalizeHtmlIssue(
								{
									type: 'global_important_declaration',
									severity: 'error',
									message: i18next.t('css_issue_global_important_declaration', {
										selector: rule.selectors?.join(', ') || '',
										property: declaration.property,
										value: declaration.value,
									}),
									selector: rule.selectors?.join(', ') || '',
									property: declaration.property,
									value: declaration.value,
									file: normalizeIssueFilePath({
										file,
										options,
										locSource: loc?.source,
									}),
									position: loc,
									code: loc?.actualCode,
									source: loc?.source,
								},
								file,
							),
						);
					}
				}
			}
		}
	}

	return issues;
}

/**
 * Analyze CSS file side effects
 * @param {Array<Object>} parsedFiles Parsed file list
 * @param {Object} rules Rule configuration
 * @returns {Array<Object>} Detected CSS side effect list
 */
async function analyze(
	parsedFiles: ParsedFile[],
	ignoreFilter: IgnoreFilter,
	options: Required<ScanOptions>,
): Promise<Issue[]> {
	const issues: Issue[] = [];

	// Filter out disabled CSS and HTML files
	const cssFiles = parsedFiles.filter(
		(file) => file.type === 'css' && file.ast && !file.disabled,
	) as CssFile[];
	const htmlFiles = parsedFiles.filter(
		(file) => file.type === 'html' && file.ast && !file.disabled,
	) as HtmlFile[];

	// Analyze each CSS file
	for (const file of [...cssFiles, ...htmlFiles]) {
		// Detect global selectors
		const globalSelectorIssues = await detectGlobalSelectors(
			file,
			ignoreFilter,
			options,
		);
		issues.push(...globalSelectorIssues);

		// Detect global rule side effects
		const globalRuleIssues = await detectGlobalRuleSideEffects(
			file,
			ignoreFilter,
			options,
		);
		issues.push(...globalRuleIssues);

		// Detect complex selectors
		const complexSelectorIssues = await detectComplexSelectors(
			file,
			ignoreFilter,
			options,
		);
		issues.push(...complexSelectorIssues);

		// Detect !important declarations
		const importantDeclarationIssues = await detectImportantDeclarations(
			file,
			ignoreFilter,
			options,
		);
		issues.push(...importantDeclarationIssues);

		// Detect duplicate CSS rules
		const duplicateRuleIssues = await detectDuplicateRules(
			file,
			ignoreFilter,
			options,
		);
		issues.push(...duplicateRuleIssues);
	}

	return issues;
}

export { analyze };
