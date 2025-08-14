import type { CssNode } from 'css-tree';
import type { Location, NullableProperties } from './common';
import type { BaseParsedFile } from './parsed-file';

export interface Declaration {
	property: string;
	value: string;
	important?: boolean | string;
}

export interface CssRule {
	selectors?: string[];
	declarations?: Declaration[];
	location?: NullableProperties<Location>;
	detectGlobalSelectors?: boolean;
	detectUnusedCss?: boolean;
	detectImportant?: boolean;
	selectorComplexityThreshold?: number;
}

export interface NestedRule {
	selectors: string[];
	location: NullableProperties<Location>;
}

export interface MediaQuery {
	query: string;
	rules: NestedRule[];
	location: NullableProperties<Location>;
}

export interface ImportRule {
	import: string;
	location: NullableProperties<Location>;
}

export interface Keyframe {
	name: string;
	location: NullableProperties<Location>;
}

export interface Rule {
	selectors: string[];
	declarations: Declaration[];
	location: NullableProperties<Location>;
}

export interface ExtractedCssInfo {
	selectors: string[];
	rules: Rule[];
	mediaQueries: MediaQuery[];
	importRules: ImportRule[];
	keyframes: Keyframe[];
	globalRules: Rule[];
}

export interface CssAnalyzerRules {
	globalSelectorsThreshold?: number;
	selectorComplexityThreshold?: number;
	detectUnusedRules?: boolean;
	ignoredSelectors?: (string | RegExp)[];
}

export interface ParseResult extends ExtractedCssInfo {
	ast: CssNode;
}
export interface CssFile extends BaseParsedFile {
	type: 'css';
	ast: {
		ast: CssNode;
	} & ExtractedCssInfo;
}
