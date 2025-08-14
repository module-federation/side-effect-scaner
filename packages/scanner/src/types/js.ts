import type { Module } from '@swc/core';
import type { Location, NullableProperties } from './common';

export interface GlobalVariable {
	name: string;
	type: 'assignment' | 'var';
	code: string;
	location: NullableProperties<Location>;
}

export interface EventListener {
	type: string;
	event: string;
	element: string;
	hasRemoveListener: boolean;
	code: string;
	location: NullableProperties<Location>;
	definition: string;
}

export interface DynamicElementOperation {
	element: string;
	method: string;
	parent?: string;
	reference?: string;
	code?: string;
	location: NullableProperties<Location>;
}

export interface DynamicElements {
	create: DynamicElementOperation[];
	append: DynamicElementOperation[];
	insert: DynamicElementOperation[];
	remove: DynamicElementOperation[];
	innerHTML: DynamicElementOperation[];
}

export interface Import {
	source: string;
	specifiers: any[];
}

export interface Export {
	type: 'named' | 'default';
	specifiers?: string[];
	declaration?: any;
}

export interface Func {
	name: string;
	params: string[];
	location: NullableProperties<Location>;
}

export interface ExtractedInfo {
	globalVariables: GlobalVariable[];
	eventListeners: { add: EventListener[]; remove: EventListener[] };
	dynamicElements?: DynamicElements;
	imports: Import[];
	exports: Export[];
	functions: Func[];
}
export interface ParseResult extends ExtractedInfo {
	ast: Module;
}
