import * as csstree from 'css-tree';
import type { ScanOptions } from '@/types/config';
import type {
	Declaration,
	ExtractedCssInfo,
	ImportRule,
	Keyframe,
	MediaQuery,
	NestedRule,
	Rule,
} from '@/types/css';

interface ParseResult extends ExtractedCssInfo {
	ast: csstree.CssNode;
}

async function parse(
	content: string,
	options: Required<ScanOptions>,
): Promise<ParseResult> {
	try {
		const ast = csstree.parse(content, {
			positions: true,
			filename: 'source.css',
		});

		const extractedInfo = extractCssInfo(ast, options);

		return {
			ast,
			...extractedInfo,
		};
	} catch (error: any) {
		throw new Error(`CSS parsing error: ${error.message}`);
	}
}

function extractCssInfo(
	ast: csstree.CssNode,
	options: Required<ScanOptions>,
): ExtractedCssInfo {
	const selectors = new Set<string>();
	const rules: Rule[] = [];
	const mediaQueries: MediaQuery[] = [];
	const importRules: ImportRule[] = [];
	const keyframes: Keyframe[] = [];
	const globalRules: Rule[] = [];

	// Define global selector patterns
	const globalSelectors = ['body', 'html', '*', ':root'];
	const { excludeGlobalSelectorAfterClass } = options;

	csstree.walk(ast, {
		visit: 'Rule',
		enter: (node: csstree.Rule) => {
			if (node.prelude && node.prelude.type === 'SelectorList') {
				const selectorList: string[] = [];
				let isGlobalRule = false;

				csstree.walk(node.prelude, {
					visit: 'Selector',
					enter: (selectorNode: csstree.Selector) => {
						const selectorText = csstree.generate(selectorNode);
						selectors.add(selectorText);
						selectorList.push(selectorText);

						// Check if it's top-level global selector (like body, html, *, :root)
						const isTopLevelGlobal = globalSelectors.some(
							(global) => selectorText.trim() === global,
						);

						// Only apply exclusion rules to top-level global selectors
						// Nested selectors (like .className h3) are not affected by this rule
						// Default include all top-level global selectors
						// If it's a global rule, add to global rules list
						if (!isTopLevelGlobal) {
							if (excludeGlobalSelectorAfterClass) {
								if (
									selectorText
										.split(' ')
										.slice(0, -1)
										.some((item) => item.startsWith('.'))
								) {
									isGlobalRule = false;
								} else {
									isGlobalRule = true;
								}
							} else {
								// 默认包含所有顶级全局选择器
								isGlobalRule = true;
							}
						} else {
							isGlobalRule = true;
						}
					},
				});

				if (node.block && node.block.type === 'Block') {
					const declarations: Declaration[] = [];

					csstree.walk(node.block, {
						visit: 'Declaration',
						enter: (declNode: csstree.Declaration) => {
							declarations.push({
								property: declNode.property,
								value: csstree.generate(declNode.value),
								important: declNode.important,
							});
						},
					});

					const ruleObj: Rule = {
						selectors: selectorList,
						declarations,
						location: node.loc
							? {
									start: {
										line: node.loc.start.line,
										column: node.loc.start.column,
									},
									end: { line: node.loc.end.line, column: node.loc.end.column },
								}
							: {
									start: null,
									end: null,
								},
					};

					rules.push(ruleObj);

					// 如果是全局规则，添加到全局规则列表
					if (isGlobalRule) {
						globalRules.push(ruleObj);
					}
				}
			}
		},
	});

	csstree.walk(ast, {
		visit: 'Atrule',
		enter: (node: csstree.Atrule) => {
			if (node.name === 'media' && node.prelude) {
				const mediaQuery = csstree.generate(node.prelude);
				const nestedRules: NestedRule[] = [];

				if (node.block) {
					csstree.walk(node.block, {
						visit: 'Rule',
						enter: (ruleNode: csstree.Rule) => {
							const selectorList: string[] = [];

							csstree.walk(ruleNode.prelude, {
								visit: 'Selector',
								enter: (selectorNode: csstree.Selector) => {
									const selectorText = csstree.generate(selectorNode);
									selectorList.push(selectorText);
								},
							});

							nestedRules.push({
								selectors: selectorList,
								location: ruleNode.loc
									? {
											start: {
												line: ruleNode.loc.start.line,
												column: ruleNode.loc.start.column,
											},
											end: {
												line: ruleNode.loc.end.line,
												column: ruleNode.loc.end.column,
											},
										}
									: {
											start: null,
											end: null,
										},
							});
						},
					});
				}

				mediaQueries.push({
					query: mediaQuery,
					rules: nestedRules,
					location: node.loc
						? {
								start: {
									line: node.loc.start.line,
									column: node.loc.start.column,
								},
								end: { line: node.loc.end.line, column: node.loc.end.column },
							}
						: {
								start: null,
								end: null,
							},
				});
			} else if (node.name === 'import' && node.prelude) {
				importRules.push({
					import: csstree.generate(node.prelude),
					location: node.loc
						? {
								start: {
									line: node.loc.start.line,
									column: node.loc.start.column,
								},
								end: { line: node.loc.end.line, column: node.loc.end.column },
							}
						: {
								start: null,
								end: null,
							},
				});
			} else if (node.name === 'keyframes' && node.prelude) {
				const prelude = node.prelude;
				const name = csstree.generate(prelude);
				keyframes.push({
					name,
					location: node.loc
						? {
								start: {
									line: node.loc.start.line,
									column: node.loc.start.column,
								},
								end: { line: node.loc.end.line, column: node.loc.end.column },
							}
						: {
								start: null,
								end: null,
							},
				});
			}
		},
	});

	return {
		selectors: Array.from(selectors),
		rules,
		mediaQueries,
		importRules,
		keyframes,
		globalRules,
	};
}

export { parse };
