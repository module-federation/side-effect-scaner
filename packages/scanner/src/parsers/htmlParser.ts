import type { DefaultTreeAdapterMap } from 'parse5';
import { parse as parseHtml } from 'parse5';
import type { HTMLLocation } from '@/types/common';
import type { ScanOptions } from '@/types/config';
import type { ExtractedCssInfo } from '@/types/css';
import type { ParseResult, Resources } from '@/types/html';
import type { ExtractedInfo } from '@/types/js';
import { parse as parseCss } from './cssParser';
import { parse as parseJs } from './jsParser';

type Node = DefaultTreeAdapterMap['node'];
type Element = DefaultTreeAdapterMap['element'];
type Text = DefaultTreeAdapterMap['textNode'];
/**
 * Parse HTML content
 * @param {string} content HTML content
 * @returns {Object} Parse result, includes DOM tree and extracted resources
 */
async function parse(
	content: string,
	options: Required<ScanOptions>,
): Promise<ParseResult> {
	const dom = parseHtml(content, {
		sourceCodeLocationInfo: true,
	});

	const resources: Resources = {
		inlineStyles: [],
		styleSheets: [],
		externalStyles: [],
		inlineScripts: [],
		externalScripts: [],
	};

	// The root is a Document, its children are the top-level nodes.
	extractResources(dom, resources);

	// Parsing global variables, event listeners, and dynamic elements in inline scripts
	const globalVariables = [];
	const eventListeners: ExtractedInfo['eventListeners'] = {
		add: [],
		remove: [],
	};
	const dynamicElements: ExtractedInfo['dynamicElements'] = {
		create: [],
		append: [],
		insert: [],
		remove: [],
		innerHTML: [],
	};

	// Parsing CSS information
	const cssInfo: ExtractedCssInfo = {
		selectors: [],
		rules: [],
		mediaQueries: [],
		importRules: [],
		keyframes: [],
		globalRules: [],
	};

	// Processing each inline script
	for (const script of resources.inlineScripts) {
		if (script.content && script.content.trim()) {
			try {
				const jsParseResult = await parseJs(script.content, false, options);

				// Merging global variables
				if (jsParseResult.globalVariables) {
					globalVariables.push(...jsParseResult.globalVariables);
				}

				// Merging event listeners
				if (jsParseResult.eventListeners) {
					eventListeners.add.push(...jsParseResult.eventListeners.add);
					eventListeners.remove.push(...jsParseResult.eventListeners.remove);
				}

				// 合并动态元素
				if (jsParseResult.dynamicElements) {
					dynamicElements.create.push(...jsParseResult.dynamicElements.create);
					dynamicElements.append.push(...jsParseResult.dynamicElements.append);
					dynamicElements.insert.push(...jsParseResult.dynamicElements.insert);
					dynamicElements.remove.push(...jsParseResult.dynamicElements.remove);
					dynamicElements.innerHTML.push(
						...jsParseResult.dynamicElements.innerHTML,
					);
				}
			} catch (error) {
				// If inline script parsing fails, record error but don't interrupt main flow
				console.warn('Failed to parse inline script:', error);
			}
		}
	}

	// Processing inline styles
	for (const style of resources.inlineStyles) {
		if (style.content && style.content.trim()) {
			try {
				const cssParseResult = await parseCss(style.content, options);

				// Merging CSS information
				cssInfo.selectors.push(...cssParseResult.selectors);
				cssInfo.rules.push(...cssParseResult.rules);
				cssInfo.mediaQueries.push(...cssParseResult.mediaQueries);
				if (cssParseResult.globalRules) {
					cssInfo.globalRules.push(...cssParseResult.globalRules);
				}
			} catch (error) {
				console.warn('Failed to parse inline style:', error);
			}
		}
	}

	// Processing style sheets
	for (const styleSheet of resources.styleSheets) {
		if (styleSheet.content && styleSheet.content.trim()) {
			try {
				const cssParseResult = await parseCss(styleSheet.content, options);

				// Merging CSS information
				cssInfo.selectors.push(...cssParseResult.selectors);
				cssInfo.rules.push(...cssParseResult.rules);
				cssInfo.mediaQueries.push(...cssParseResult.mediaQueries);
				cssInfo.importRules.push(...cssParseResult.importRules);
				cssInfo.keyframes.push(...cssParseResult.keyframes);
				if (cssParseResult.globalRules) {
					cssInfo.globalRules.push(...cssParseResult.globalRules);
				}
			} catch (error) {
				console.warn('Failed to parse style sheet:', error);
			}
		}
	}

	return {
		dom,
		resources,
		globalVariables,
		eventListeners,
		dynamicElements,
		...cssInfo,
	};
}

/**
 * Recursively traverse the DOM tree to extract resources
 * @param {Node} node DOM node
 * @param {Resources} resources Resource object
 */
function extractResources(
	node: DefaultTreeAdapterMap['node'],
	resources: Resources,
): void {
	if (!node) return;

	if ('tagName' in node && node.tagName) {
		const element = node;
		const location = getNodeLocation(element);

		const inlineStyleAttr = element.attrs?.find(
			(attr) => attr.name === 'style',
		);
		if (inlineStyleAttr) {
			resources.inlineStyles.push({
				element: getNodeName(element),
				content: inlineStyleAttr.value,
				location: location,
			});
		}

		if (element.tagName === 'style') {
			const content = getNodeContent(element);
			if (content) {
				resources.styleSheets.push({
					content,
					location: location,
				});
			}
		}

		const hrefAttr = element.attrs?.find((attr) => attr.name === 'href');
		if (
			element.tagName === 'link' &&
			element.attrs &&
			element.attrs.find((attr) => attr.name === 'rel')?.value ===
				'stylesheet' &&
			hrefAttr
		) {
			resources.externalStyles.push({
				href: hrefAttr.value,
				location: location,
			});
		}

		if (element.tagName === 'script') {
			const srcAttr = element.attrs?.find((attr) => attr.name === 'src');
			const typeAttr = element.attrs?.find((attr) => attr.name === 'type');
			if (srcAttr) {
				resources.externalScripts.push({
					src: srcAttr.value,
					type: typeAttr?.value || 'text/javascript',
					location: location,
				});
			} else {
				const content = getNodeContent(element);
				if (content) {
					resources.inlineScripts.push({
						content,
						type: typeAttr?.value || 'text/javascript',
						location: location,
					});
				}
			}
		}
	}

	const childNodes = 'childNodes' in node && node.childNodes;
	if (childNodes && childNodes.length > 0) {
		for (const child of childNodes) {
			extractResources(child, resources);
		}
	}
}

/**
 * Get node content
 * @param {Node} node DOM node
 * @returns {string} Node content
 */
function getNodeContent(node: Node): string {
	const element = node as Element;
	if (!element.childNodes || element.childNodes.length === 0) {
		return '';
	}

	return element.childNodes
		.filter((child): child is Text => child.nodeName === '#text')
		.map((child) => child.value)
		.join('');
}

/**
 * Get node name
 * @param {Node} node DOM node
 * @returns {string} Node name
 */
function getNodeName(node: Node): string {
	const element = node as Element & Node;
	if (!element || !element.nodeName) {
		return 'unknown';
	}

	let name = element.nodeName;

	const idAttr = element.attrs?.find((attr) => attr.name === 'id');
	if (idAttr) {
		name += `#${idAttr.value}`;
	}

	const classAttr = element.attrs?.find((attr) => attr.name === 'class');
	if (classAttr) {
		name += `.${classAttr.value.split(' ').join('.')}`;
	}

	return name;
}

/**
 * Get node location information
 * @param {Node} node DOM node
 * @returns {Object|null} Location information
 */
function getNodeLocation(node: Node): HTMLLocation | null {
	if (node.sourceCodeLocation) {
		return {
			startLine: node.sourceCodeLocation.startLine,
			startCol: node.sourceCodeLocation.startCol,
			endLine: node.sourceCodeLocation.endLine,
			endCol: node.sourceCodeLocation.endCol,
		};
	}
	return null;
}

export { parse };
