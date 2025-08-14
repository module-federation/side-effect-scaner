import type {
	AssignmentExpression,
	CallExpression,
	ExportAllDeclaration,
	ExportDeclaration,
	ExportDefaultDeclaration,
	ExportNamedDeclaration,
	FunctionDeclaration,
	ImportDeclaration,
	MemberExpression,
	Module,
	Node,
	VariableDeclaration,
} from '@swc/core';
import * as swc from '@swc/core';
import type { ParseOptions } from '@swc/types';
import { matchPattern } from '@/IgnoreFilter';
import type { ScanOptions } from '@/types/config';
import type {
	DynamicElementOperation,
	DynamicElements,
	Export,
	ExtractedInfo,
	Func,
	GlobalVariable,
	Import,
	ParseResult,
} from '@/types/js';

function correctPosition(ast: Module, position: number) {
	if (ast.span.start !== 1) {
		return position - ast.span.start + 1;
	}
	return position;
}

/**
 * Convert byte offset to line and column number
 * @param source Source code content
 * @param offset Byte offset position
 * @returns Line and column number information
 */
function getLineColumnFromOffset(
	source: string,
	offset: number,
): { line: number; column: number } | null {
	if (offset < 0 || offset > source.length) {
		return null;
	}

	const lines = source.substring(0, offset).split('\n');
	const line = lines.length;
	const column = lines[lines.length - 1].length + 1;

	return { line, column };
}

function isNodeOfType<T extends Node['type']>(
	node: Node | undefined | null,
	type: T,
): node is Extract<Node, { type: T }> {
	return node?.type === type;
}

const isImportDeclaration = (node: Node): node is ImportDeclaration =>
	isNodeOfType(node, 'ImportDeclaration');
const isExportDeclaration = (node: Node): node is ExportDeclaration =>
	isNodeOfType(node, 'ExportDeclaration');
const isExportNamedDeclaration = (node: Node): node is ExportNamedDeclaration =>
	isNodeOfType(node, 'ExportNamedDeclaration');
const isExportDefaultDeclaration = (
	node: Node,
): node is ExportDefaultDeclaration =>
	isNodeOfType(node, 'ExportDefaultDeclaration');
const isVariableDeclaration = (node: Node): node is VariableDeclaration =>
	isNodeOfType(node, 'VariableDeclaration');
const isFunctionDeclaration = (node: Node): node is FunctionDeclaration =>
	isNodeOfType(node, 'FunctionDeclaration');
const isAssignmentExpression = (node: Node): node is AssignmentExpression =>
	isNodeOfType(node, 'AssignmentExpression');
const isCallExpression = (node: Node): node is CallExpression =>
	isNodeOfType(node, 'CallExpression');

async function parse(
	content: string,
	isTypeScript = false,
	options: Required<ScanOptions>,
): Promise<ParseResult> {
	try {
		const parserOptions: ParseOptions = {
			syntax: isTypeScript ? 'typescript' : 'ecmascript',
			tsx: isTypeScript,
			target: 'es2022',
			comments: false,
		};

		const ast = await swc.parse(content, parserOptions);

		const extractedInfo = extractJsInfo(ast, content, options);

		return {
			ast,
			...extractedInfo,
		};
	} catch (error: any) {
		throw new Error(`JavaScript parsing error: ${error.message}`);
	}
}

function extractJsInfo(
	ast: Module,
	source: string,
	options: Required<ScanOptions>,
): ExtractedInfo {
	const globalVariables: GlobalVariable[] = [];
	const eventListeners: ExtractedInfo['eventListeners'] = {
		add: [],
		remove: [],
	};
	const dynamicElements: DynamicElements = {
		create: [],
		append: [],
		insert: [],
		remove: [],
		innerHTML: [],
	};
	const imports: Import[] = [];
	const exports: Export[] = [];
	const functions: Func[] = [];

	function traverse(node: Node) {
		if (isAssignmentExpression(node)) {
			if (isGlobalAssignment(node)) {
				const startLocation = getLineColumnFromOffset(
					source,
					correctPosition(ast, node.span.start),
				);
				const globalVarName = getGlobalVarName(node);
				if (
					startLocation &&
					options.ignoredGlobalVars.every(
						(ignoredGlobalVar) =>
							!matchPattern(ignoredGlobalVar, globalVarName),
					)
				) {
					globalVariables.push({
						name: getGlobalVarName(node),
						type: 'assignment',
						code: source.substring(
							correctPosition(ast, node.span.start),
							correctPosition(ast, node.span.end),
						),
						location: {
							start: startLocation,
							end: getLineColumnFromOffset(
								source,
								correctPosition(ast, node.span.end),
							),
						},
					});
				}
			}
		}

		if (isCallExpression(node)) {
			if (isAddEventListener(node)) {
				const startLocation = getLineColumnFromOffset(
					source,
					correctPosition(ast, node.span.start),
				);
				if (startLocation) {
					eventListeners.add.push({
						type: getEventListenerType(node),
						event: getEventName(node),
						element: getElementInfo(node),
						hasRemoveListener: false,
						definition: getListenerName(node),
						code: source.substring(
							correctPosition(ast, node.span.start),
							correctPosition(ast, node.span.end),
						),
						location: {
							start: startLocation,
							end: getLineColumnFromOffset(
								source,
								correctPosition(ast, node.span.end),
							),
						},
					});
				}
			} else if (isRemoveEventListener(node)) {
				const startLocation = getLineColumnFromOffset(
					source,
					correctPosition(ast, node.span.start),
				);
				if (startLocation) {
					eventListeners.remove.push({
						type: getEventListenerType(node),
						event: getEventName(node),
						element: getElementInfo(node),
						hasRemoveListener: true,
						definition: getListenerName(node),
						code: source.substring(
							correctPosition(ast, node.span.start),
							correctPosition(ast, node.span.end),
						),
						location: {
							start: startLocation,
							end: getLineColumnFromOffset(
								source,
								correctPosition(ast, node.span.end),
							),
						},
					});
				}
			} else {
				// Handling dynamic element operations
				const dynamicOperation = extractDynamicElementOperation(
					node,
					source,
					ast,
				);
				if (dynamicOperation) {
					dynamicElements[dynamicOperation.category].push(
						dynamicOperation.operation,
					);
				}
			}
		}

		if (isFunctionDeclaration(node)) {
			if (node.identifier) {
				const startLocation = getLineColumnFromOffset(
					source,
					correctPosition(ast, node.span.start),
				);
				if (startLocation) {
					functions.push({
						name: node.identifier.value,
						params: node.params.map((param) =>
							param.pat.type === 'Identifier'
								? param.pat.value
								: 'complex_param',
						),
						location: {
							start: startLocation,
							end: getLineColumnFromOffset(
								source,
								correctPosition(ast, node.span.end),
							),
						},
					});
				}
			}
		}

		if (isImportDeclaration(node)) {
			const startLocation = getLineColumnFromOffset(
				source,
				correctPosition(ast, node.span.start),
			);
			if (startLocation) {
				imports.push({
					source: node.source.value,
					specifiers: node.specifiers.map((specifier) => {
						if (specifier.type === 'ImportDefaultSpecifier') {
							return { type: 'default', local: specifier.local.value };
						}
						if (specifier.type === 'ImportSpecifier') {
							return {
								type: 'named',
								imported: specifier.imported?.value,
								local: specifier.local.value,
							};
						}
						if (specifier.type === 'ImportNamespaceSpecifier') {
							return { type: 'namespace', local: specifier.local.value };
						}
						return { type: 'unknown', local: 'unknown' };
					}),
				});
			}
		}

		if (isExportDeclaration(node)) {
			const startLocation = getLineColumnFromOffset(
				source,
				correctPosition(ast, node.span.start),
			);
			if (startLocation) {
				if (node.declaration) {
					let name = 'unknown';
					const decl = node.declaration;
					if (isVariableDeclaration(decl)) {
						const varDecl = decl.declarations[0];
						if (varDecl?.id.type === 'Identifier') name = varDecl.id.value;
					} else if (
						(isFunctionDeclaration(decl) || decl.type === 'ClassDeclaration') &&
						decl.identifier
					) {
						name = decl.identifier.value;
					}
					exports.push({ type: 'named', declaration: name });
				}
			}
		}

		if (isExportNamedDeclaration(node)) {
			const startLocation = getLineColumnFromOffset(
				source,
				correctPosition(ast, node.span.start),
			);
			if (startLocation) {
				exports.push({
					type: 'named',
					specifiers: node.specifiers.map((specifier) => {
						if (specifier.type === 'ExportDefaultSpecifier') {
							return specifier.exported.value;
						}
						if (specifier.type === 'ExportNamespaceSpecifier') {
							return specifier.name.value;
						}
						return 'unknown';
					}),
				});
			}
		}

		if (isExportDefaultDeclaration(node)) {
			const startLocation = getLineColumnFromOffset(
				source,
				correctPosition(ast, node.span.start),
			);
			if (startLocation) {
				exports.push({ type: 'default', declaration: node.decl });
			}
		}

		for (const key in node) {
			const value = node[key as keyof Node];
			if (Array.isArray(value)) {
				value.forEach((item) => {
					if (item && typeof item === 'object') {
						traverse(item as Node);
					}
				});
			} else if (typeof value === 'object' && value) {
				traverse(value as Node);
			}
		}
	}

	ast.body.forEach(traverse);

	return {
		globalVariables,
		eventListeners,
		dynamicElements,
		imports,
		exports,
		functions,
	};
}

// Extracting the listener name
function getListenerName(node: CallExpression): string {
	if (node.arguments.length < 2) return 'unknown';

	const listenerArg = node.arguments[1];
	if (!listenerArg) return 'unknown';

	// Use type assertions to simplify type checking
	const arg = listenerArg as any;

	// Handling direct function names
	if (arg.type === 'Identifier' && arg.value) {
		return arg.value;
	}

	// Handling anonymous functions
	if (
		arg.type === 'ArrowFunctionExpression' ||
		arg.type === 'FunctionExpression'
	) {
		return 'anonymous';
	}

	// Handling object method binding
	if (arg.type === 'MemberExpression') {
		let result = '';
		if (arg.object?.type === 'Identifier' && arg.object.value) {
			result += arg.object.value;
		}
		if (arg.property?.type === 'Identifier' && arg.property.value) {
			result += '.' + arg.property.value;
		}
		return result || 'unknown';
	}

	// Handling bind calls
	if (arg.type === 'CallExpression' && arg.callee) {
		const callee = arg.callee;
		if (
			callee.type === 'MemberExpression' &&
			callee.property?.type === 'Identifier' &&
			callee.property.value === 'bind' &&
			callee.object
		) {
			const bindTarget = callee.object;
			if (bindTarget.type === 'MemberExpression') {
				let result = '';
				if (
					bindTarget.object?.type === 'Identifier' &&
					bindTarget.object.value
				) {
					result += bindTarget.object.value;
				}
				if (
					bindTarget.property?.type === 'Identifier' &&
					bindTarget.property.value
				) {
					result += '.' + bindTarget.property.value;
				}
				return result || 'unknown';
			} else if (bindTarget.type === 'Identifier' && bindTarget.value) {
				return bindTarget.value;
			}
		}
	}

	return 'unknown';
}

function isGlobalAssignment(node: AssignmentExpression): boolean {
	return (
		node.left.type === 'MemberExpression' &&
		node.left.object.type === 'Identifier' &&
		['window', 'globalThis', 'global'].includes(node.left.object.value)
	);
}

function getGlobalVarName(node: AssignmentExpression): string {
	return node.left.type === 'MemberExpression' &&
		node.left.property.type === 'Identifier'
		? node.left.property.value
		: 'unknown';
}

function isAddEventListener(node: CallExpression): boolean {
	return (
		node.callee.type === 'MemberExpression' &&
		node.callee.property.type === 'Identifier' &&
		(node.callee.property.value === 'addEventListener' ||
			node.callee.property.value === 'on') &&
		node.arguments.length >= 2
	);
}

function isRemoveEventListener(node: CallExpression): boolean {
	return (
		node.callee.type === 'MemberExpression' &&
		node.callee.property.type === 'Identifier' &&
		(node.callee.property.value === 'removeEventListener' ||
			node.callee.property.value === 'off') &&
		node.arguments.length >= 2
	);
}

function getEventListenerType(node: CallExpression): string {
	return node.callee.type === 'MemberExpression' &&
		node.callee.property.type === 'Identifier'
		? node.callee.property.value
		: 'unknown';
}

function getEventName(node: CallExpression): string {
	if (node.arguments.length === 0) return 'unknown';
	const eventArg = node.arguments[0].expression;
	return eventArg.type === 'StringLiteral'
		? eventArg.value
		: eventArg.type === 'Identifier'
			? `[variable: ${eventArg.value}]`
			: 'unknown';
}

function getElementInfo(node: CallExpression): string {
	if (node.callee.type === 'MemberExpression') {
		if (node.callee.object.type === 'Identifier') {
			return node.callee.object.value;
		}
		if (
			node.callee.object.type === 'CallExpression' &&
			node.callee.object.callee.type === 'Identifier' &&
			node.callee.object.callee.value === '$' &&
			node.callee.object.arguments[0]?.expression.type === 'StringLiteral'
		) {
			return `jQuery('${node.callee.object.arguments[0].expression.value}')`;
		}
	}
	return 'complex_element';
}

/**
 * Check if it is a React.createElement node
 */
function isReactCreateElement(
	node: CallExpression,
	methodName: string,
): boolean {
	if (methodName !== 'createElement') return false;

	// 1. If the caller is explicitly React, it is treated as a React element
	if (node.callee.type === 'MemberExpression') {
		const memberExpr = node.callee as MemberExpression;

		// React.createElement pattern
		if (
			memberExpr.object.type === 'MemberExpression' &&
			memberExpr.object.object.type === 'Identifier' &&
			memberExpr.object.object.value === 'React' &&
			memberExpr.object.property.type === 'Identifier' &&
			memberExpr.object.property.value === 'createElement'
		) {
			return true;
		}

		// React.createElement shorthand pattern
		if (
			memberExpr.object.type === 'Identifier' &&
			memberExpr.object.value === 'React' &&
			memberExpr.property.type === 'Identifier' &&
			memberExpr.property.value === 'createElement'
		) {
			return true;
		}
	}

	// 2. If there are more than 2 arguments, it is treated as a React element
	if (node.arguments.length > 2) {
		return true;
	}

	// 3. If there are only 2 arguments and the second is an is property, it is not a React element
	if (node.arguments.length === 2) {
		const secondArg = node.arguments[1];
		if (
			secondArg?.expression?.type === 'ObjectExpression' &&
			secondArg.expression.properties.some(
				(prop) =>
					typeof prop === 'object' &&
					prop &&
					// @ts-ignore
					prop.type === 'Property' &&
					'key' in prop &&
					// @ts-ignore
					prop.key.type === 'Identifier' &&
					// @ts-ignore
					prop.key.value === 'is',
			)
		) {
			return false;
		}
	}

	// 4. Other React.createElement features detection
	if (node.arguments.length >= 1) {
		if (
			node.arguments.length >= 2 &&
			node.arguments[1]?.expression?.type === 'ObjectExpression'
		) {
			return true;
		}

		// If null is the second argument
		if (
			node.arguments.length >= 2 &&
			node.arguments[1]?.expression?.type === 'NullLiteral'
		) {
			return true;
		}

		// If children is the second argument
		if (node.arguments.length >= 2) {
			return true;
		}
	}

	return false;
}

/**
 * Extract dynamic element operation information
 */
function extractDynamicElementOperation(
	node: CallExpression,
	source: string,
	ast: Module,
): {
	category: keyof DynamicElements;
	operation: DynamicElementOperation;
} | null {
	if (node.callee.type !== 'MemberExpression') return null;

	const memberExpr = node.callee as MemberExpression;
	if (memberExpr.property.type !== 'Identifier') return null;

	const methodName = memberExpr.property.value;
	const startLocation = getLineColumnFromOffset(
		source,
		correctPosition(ast, node.span.start),
	);

	if (!startLocation) return null;

	const code = source.substring(
		correctPosition(ast, node.span.start),
		correctPosition(ast, node.span.end),
	);
	const operation: DynamicElementOperation = {
		element: 'unknown',
		method: methodName,
		code,
		location: {
			start: startLocation,
			end: getLineColumnFromOffset(source, correctPosition(ast, node.span.end)),
		},
	};

	// parse element info
	if (memberExpr.object.type === 'Identifier') {
		operation.element = memberExpr.object.value;
	} else if (memberExpr.object.type === 'CallExpression') {
		const callObj = memberExpr.object;
		if (
			callObj.callee.type === 'Identifier' &&
			callObj.callee.value === 'document'
		) {
			operation.element = 'document';
		}
	}

	switch (methodName) {
		case 'createElement':
			if (isReactCreateElement(node, methodName)) {
				return null; // skip React.createElement
			}
			// continue handle normal createElement
			return { category: 'create', operation };

		case 'createTextNode':
			return { category: 'create', operation };

		case 'appendChild':
			operation.parent = getParentElement(node);
			return { category: 'append', operation };

		case 'insertBefore':
			operation.parent = getParentElement(node);
			operation.reference = getReferenceElement(node);
			return { category: 'insert', operation };

		case 'removeChild':
			operation.parent = getParentElement(node);
			return { category: 'remove', operation };

		case 'innerHTML':
		case 'outerHTML':
		case 'insertAdjacentHTML':
			return { category: 'innerHTML', operation };

		default:
			return null;
	}
}

/**
 * Get parent element information
 */
function getParentElement(node: CallExpression): string {
	if (
		node.callee.type === 'MemberExpression' &&
		node.callee.object.type === 'Identifier'
	) {
		return node.callee.object.value;
	}
	return 'unknown';
}

/**
 * Get reference element information (for insertBefore)
 */
function getReferenceElement(node: CallExpression): string | undefined {
	if (node.arguments.length >= 2) {
		const refArg = node.arguments[1];
		if (refArg?.expression?.type === 'Identifier') {
			return refArg.expression.value;
		}
	}
	return undefined;
}

export { parse, findTargetListenerDefinition };

/**
 * Find the definition of a specified line number of event listeners
 * @param ast - AST module
 * @param line - Source code line number
 * @param type - Listener type
 * @param sourceCode - Source code content (optional, used for row and column calculations)
 * @returns If defined in the current AST, return the specific row and column information; if defined in the imported module, return the FROM path
 */
function findTargetListenerDefinition(
	ast: Module,
	line: number,
	type: 'removeEventListener' | 'addEventListener',
	sourceCode?: string,
):
	| {
			found: true;
			location: {
				start: { line: number; column: number };
				end: { line: number; column: number };
			};
			source: string;
	  }
	| { found: false; fromPath: string }
	| { found: false; reason: string } {
	const source = sourceCode || '';

	// Find the event listener call for the specified line number
	let targetListener: CallExpression | null = null;

	function traverseForListener(node: Node): void {
		if (node.type === 'CallExpression') {
			const callExpr = node as CallExpression;
			const listenerType = getEventListenerType(callExpr);

			// Check if it matches the specified listener type
			const isTargetType =
				(type === 'addEventListener' &&
					(listenerType === 'addEventListener' || listenerType === 'on')) ||
				(type === 'removeEventListener' &&
					(listenerType === 'removeEventListener' || listenerType === 'off'));

			if (isTargetType) {
				let offset = 0;
				if (
					'span' in node &&
					node.span &&
					typeof node.span === 'object' &&
					'start' in node.span &&
					Number.isNaN(Number(node.span.start))
				) {
					offset = Number(node.span.start);
				}
				// Check if the line number matches
				const startLocation = getLineColumnFromOffset(
					source,
					correctPosition(ast, offset),
				);
				if (startLocation && startLocation.line === line) {
					targetListener = callExpr;
					return;
				}
			}
		}

		// Recursively traverse child nodes
		for (const key in node) {
			const value = (node as any)[key];
			if (Array.isArray(value)) {
				value.forEach((item) => {
					if (item && typeof item === 'object' && 'type' in item) {
						traverseForListener(item as Node);
						if (targetListener) return;
					}
				});
			} else if (typeof value === 'object' && value && 'type' in value) {
				traverseForListener(value as Node);
				if (targetListener) return;
			}
		}
	}

	// Traverse the AST to find the target listener
	ast.body.forEach(traverseForListener);

	if (targetListener) {
		// Found the matching listener, return the location information
		const startLocation = getLineColumnFromOffset(
			source,
			correctPosition(ast, (targetListener as CallExpression).span.start),
		);
		const endLocation = getLineColumnFromOffset(
			source,
			correctPosition(ast, (targetListener as CallExpression).span.end),
		);

		if (startLocation && endLocation) {
			return {
				found: true,
				location: {
					start: startLocation,
					end: endLocation,
				},
				source: 'current',
			};
		}
	}

	// Check if it is an imported listener definition
	const imports = findImportsForListener(ast);
	for (const imp of imports) {
		// Check if the imported module may contain listener definitions
		if (imp.source && imp.source.includes('event')) {
			return {
				found: false,
				fromPath: imp.source,
			};
		}
	}

	// Check if it is an exported listener
	const exports = findExportsForListener(ast);
	for (const exp of exports) {
		// 检查导出的模块是否可能包含监听器定义
		if (exp.source && exp.source.includes('event')) {
			return {
				found: false,
				fromPath: exp.source,
			};
		}
	}

	return {
		found: false,
		reason: 'No event listener definition found for the specified line number',
	};
}

/**
 * Extract all import declarations from the AST
 */
function findImportsForListener(
	ast: Module,
): Array<{ source: string; specifiers: string[] }> {
	const imports: Array<{ source: string; specifiers: string[] }> = [];

	function traverseForImports(node: Node): void {
		if (node.type === 'ImportDeclaration') {
			const importDecl = node as ImportDeclaration;
			const specifiers = importDecl.specifiers.map((spec) => {
				if (spec.type === 'ImportDefaultSpecifier') return spec.local.value;
				if (spec.type === 'ImportSpecifier')
					return spec.imported?.value || spec.local.value;
				if (spec.type === 'ImportNamespaceSpecifier') return spec.local.value;
				return 'unknown';
			});

			imports.push({
				source: importDecl.source.value,
				specifiers,
			});
		}

		// Recursively traverse child nodes
		for (const key in node) {
			const value = (node as any)[key];
			if (Array.isArray(value)) {
				value.forEach((item) => {
					if (item && typeof item === 'object' && 'type' in item) {
						traverseForImports(item as Node);
					}
				});
			} else if (typeof value === 'object' && value && 'type' in value) {
				traverseForImports(value as Node);
			}
		}
	}

	ast.body.forEach(traverseForImports);
	return imports;
}

/**
 * Extract all export declarations from the AST
 */
function findExportsForListener(
	ast: Module,
): Array<{ source: string; specifiers: string[] }> {
	const exports: Array<{ source: string; specifiers: string[] }> = [];

	function traverseForExports(node: Node): void {
		if (
			node.type === 'ExportNamedDeclaration' ||
			node.type === 'ExportAllDeclaration'
		) {
			const exportDecl = node as ExportNamedDeclaration | ExportAllDeclaration;
			if (exportDecl.source) {
				const specifiers: string[] = [];

				if (
					node.type === 'ExportNamedDeclaration' &&
					(node as ExportNamedDeclaration).specifiers
				) {
					specifiers.push(
						...(node as ExportNamedDeclaration).specifiers.map((spec) => {
							if (
								spec.type === 'ExportSpecifier' &&
								'exported' in spec &&
								spec.exported &&
								'value' in spec.exported
							)
								return spec.exported.value;
							return 'unknown';
						}),
					);
				}

				exports.push({
					source: exportDecl.source.value,
					specifiers,
				});
			}
		}

		// Recursively traverse child nodes
		for (const key in node) {
			const value = (node as any)[key];
			if (Array.isArray(value)) {
				value.forEach((item) => {
					if (item && typeof item === 'object' && 'type' in item) {
						traverseForExports(item as Node);
					}
				});
			} else if (typeof value === 'object' && value && 'type' in value) {
				traverseForExports(value as Node);
			}
		}
	}

	ast.body.forEach(traverseForExports);
	return exports;
}
