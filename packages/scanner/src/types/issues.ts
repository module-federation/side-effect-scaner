import type { BaseIssue } from './common';

export interface UnremovedEventListenerIssue extends BaseIssue {
	type: 'unremoved_event_listener';
	event: string;
	element: string;
	code: string;
}

export interface AnonymousEventHandlerIssue extends BaseIssue {
	type: 'anonymous_event_handler';
	event: string;
	element: string;
	code: string;
}

export interface DuplicateEventListenerIssue extends BaseIssue {
	type: 'duplicate_event_listener';
	event: string;
	element: string;
	occurrences: number;
}

export interface GlobalEventListenerIssue extends BaseIssue {
	type: 'global_event_listener';
	event: string;
	element: string;
	code: string;
}

export interface InlineScriptEventListenerIssue extends BaseIssue {
	type: 'inline_script_event_listener';
	event: string;
	element: string;
	scriptType: string;
}

export interface PotentialInlineEventListenerIssue extends BaseIssue {
	type: 'potential_inline_event_listener';
	scriptType: string;
}

export interface InlineEventHandlerIssue extends BaseIssue {
	type: 'inline_event_handler';
	event: string;
	element: string;
	attribute: string;
}

export interface GlobalVarDeclarationIssue extends BaseIssue {
	type: 'global_var_declaration';
	varName: string;
	varType: string;
	code: string;
}

export interface GlobalVarOverrideIssue extends BaseIssue {
	type: 'global_var_override';
	varName: string;
	otherOccurrences: { file: string; type: string }[];
}

export interface BuiltInOverrideIssue extends BaseIssue {
	type: 'built_in_override';
	varName: string;
	code: string;
}

export interface SimpleGlobalNameIssue extends BaseIssue {
	type: 'simple_global_name';
	varName: string;
	code: string;
}

export interface InlineScriptGlobalIssue extends BaseIssue {
	type: 'inline_script_global';
	varName: string;
	scriptType: string;
}

export interface UnparseableScriptIssue extends BaseIssue {
	type: 'unparseable_script';
	scriptType: string;
	error: string;
}

export interface GlobalSelectorIssue extends BaseIssue {
	type: 'global_selector';
}

export interface LowSpecificityIssue extends BaseIssue {
	type: 'low_specificity';
}

export interface ComplexSelectorIssue extends BaseIssue {
	type: 'complex_selector';
}

export interface ImportantDeclarationIssue extends BaseIssue {
	type: 'important_declaration';
}

export interface UnusedRuleIssue extends BaseIssue {
	type: 'unused_rule';
}

export interface DuplicateRuleIssue extends BaseIssue {
	type: 'duplicate_rule';
}

export interface InlineStyleIssue extends BaseIssue {
	type: 'inline_style';
}

export interface CriticalGlobalStyleIssue extends BaseIssue {
	type: 'critical_global_style';
	selector: string;
	declarations: string[];
}

export interface GlobalStyleSideEffectIssue extends BaseIssue {
	type: 'global_style_side_effect';
	selector: string;
	property: string;
	value: string;
}

export interface GlobalImportantDeclarationIssue extends BaseIssue {
	type: 'global_important_declaration';
	selector: string;
	property: string;
	value: string;
}

export interface UntrackedDynamicElementIssue extends BaseIssue {
	type: 'untracked_dynamic_element';
	element: string;
	method: string;
	code: string;
}

export interface DynamicElementAppendIssue extends BaseIssue {
	type: 'dynamic_element_append';
	element: string;
	parent: string;
	code: string;
	operation: string;
}

export interface DynamicElementInsertIssue extends BaseIssue {
	type: 'dynamic_element_insert';
	element: string;
	parent: string;
	reference?: string;
	code: string;
	operation: string;
}

export interface DynamicElementRemoveIssue extends BaseIssue {
	type: 'dynamic_element_remove';
	element: string;
	parent: string;
	code: string;
	operation: string;
}

export type Issue =
	| UnremovedEventListenerIssue
	| AnonymousEventHandlerIssue
	| DuplicateEventListenerIssue
	| GlobalEventListenerIssue
	| InlineScriptEventListenerIssue
	| PotentialInlineEventListenerIssue
	| InlineEventHandlerIssue
	| GlobalVarOverrideIssue
	| GlobalVarDeclarationIssue
	| BuiltInOverrideIssue
	| SimpleGlobalNameIssue
	| InlineScriptGlobalIssue
	| UnparseableScriptIssue
	| GlobalSelectorIssue
	| LowSpecificityIssue
	| ComplexSelectorIssue
	| ImportantDeclarationIssue
	| UnusedRuleIssue
	| DuplicateRuleIssue
	| InlineStyleIssue
	| CriticalGlobalStyleIssue
	| GlobalStyleSideEffectIssue
	| GlobalImportantDeclarationIssue
	| UntrackedDynamicElementIssue
	| DynamicElementAppendIssue
	| DynamicElementInsertIssue
	| DynamicElementRemoveIssue;
