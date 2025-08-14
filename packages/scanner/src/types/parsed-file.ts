import type { Asset } from '@/rsbuild-plugins/shake-plugin';

export type FileType = 'js' | 'css' | 'html';

// Base interface for all parsed files
export interface BaseParsedFile {
	path: string;
	fileName: string;
	extension: string;
	content: string;
	asset: Asset;
}

// Result for files disabled by magic comments
interface DisabledParsedFile extends BaseParsedFile {
	type: FileType | 'unknown';
	ast: null;
	disabled: true;
}

// A successfully parsed file will include magic comment info
interface SuccessParsedFile extends BaseParsedFile {}

// Specific result for HTML files
export interface HtmlParsedFile extends SuccessParsedFile {
	type: 'html';
	ast: any; // Result from htmlParse
	disabled?: boolean;
}

// Specific result for CSS/Preprocessor files
interface CssParsedFile extends SuccessParsedFile {
	type: 'css';
	ast: any; // Result from cssParse
	preprocessor?: string;
	disabled?: boolean;
}

// Specific result for JS/TS files
export interface JsParsedFile extends SuccessParsedFile {
	type: 'js';
	ast: any; // Result from jsParse
	typescript?: boolean;
	disabled?: boolean;
}

// Result for unknown file types
interface UnknownParsedFile extends SuccessParsedFile {
	type: 'unknown';
	ast: null;
}

// Result for when parsing fails
interface ErrorParsedFile extends BaseParsedFile {
	type: 'error';
	error: string;
}

// Union type for any possible result from the parse function
export type ParsedFile =
	| DisabledParsedFile
	| HtmlParsedFile
	| CssParsedFile
	| JsParsedFile
	| UnknownParsedFile
	| ErrorParsedFile;
