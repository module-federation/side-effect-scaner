import type { DefaultTreeAdapterMap } from 'parse5';
import type { HTMLLocation } from './common';
import type { ExtractedCssInfo } from './css';
import type { DynamicElements, EventListener, GlobalVariable } from './js';
import type { BaseParsedFile } from './parsed-file';

interface InlineStyle {
	element: string;
	content: string;
	location: HTMLLocation | null;
}

interface StyleSheet {
	content: string;
	location: HTMLLocation | null;
}

interface ExternalStyle {
	href: string;
	location: HTMLLocation | null;
}

interface InlineScript {
	content: string;
	type: string;
	location: HTMLLocation | null;
}

interface ExternalScript {
	src: string;
	type: string;
	location: HTMLLocation | null;
}

export interface Resources {
	inlineStyles: InlineStyle[];
	styleSheets: StyleSheet[];
	externalStyles: ExternalStyle[];
	inlineScripts: InlineScript[];
	externalScripts: ExternalScript[];
}

export interface ParseResult extends ExtractedCssInfo {
	dom: DefaultTreeAdapterMap['document'];
	resources: Resources;
	globalVariables: GlobalVariable[];
	eventListeners: {
		add: EventListener[];
		remove: EventListener[];
	};
	dynamicElements: DynamicElements;
}

export interface HtmlFile extends BaseParsedFile {
	type: 'html';
	ast: ParseResult;
}
