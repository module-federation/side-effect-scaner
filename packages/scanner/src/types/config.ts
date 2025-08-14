import type { RsbuildConfig } from '@rsbuild/core';

export type AdapterOptions = Record<string, unknown>;

export interface ScanOptions {
	config?: string;
	entry?: string;
	dir?: string;
	output?: string;
	format?: 'md';
	ignore?: Array<string | { file: string; lines?: number[] }>;
	verbose?: boolean;
	maxDepth?: number;
	compile?: boolean;
	alias?: Record<string, string>;
	adapter?: string | [adapterPath: string, adapterOptions?: AdapterOptions];
	unknownDir?: string;
	ignoredGlobalVars?: string[];
	unRemovedEventListener?: boolean;
	anonymousEventHandler?: boolean;
	dynamicElementAppend?: boolean;
	dynamicElementInsert?: boolean;
	dynamicElementRemove?: boolean;
	untrackedDynamicElement?: boolean;
	globalVarDeclaration?: boolean;
	builtInOverride?: boolean;
	criticalGlobalStyle?: boolean;
	globalSelector?: boolean;
	excludeGlobalSelectorAfterClass?: boolean;
	complexSelector?: boolean;
	importantDeclaration?: boolean;
	duplicateRule?: boolean;
	globalStyleSideEffect?: boolean;
}

export type Adapter<T = AdapterOptions> = (
	scanOptions: Required<ScanOptions>,
	adapterOptions?: T,
) => Promise<RsbuildConfig>;
