export type Nullable<T> = T | null;

export type NullableProperties<T extends Record<string, any>> = {
	[K in keyof T]: T[K] | null;
};

/**
 * Represents a single point in a source file.
 * Line and column numbers are 1-based.
 */
export interface Position {
	/** The line number in the source file (1-based). */
	line: number;
	/** The column number in the source file (1-based). */
	column: number;
}

/**
 * Represents a span of code in a source file, with a start and end position.
 */
export interface Location {
	/** The starting position of the code span. */
	start: Position;
	/** The ending position of the code span. */
	end: Position;
}

export interface HTMLLocation {
	startLine: number;
	startCol: number;
	endLine: number;
	endCol: number;
}

export type IssuePosition =
	| NullableProperties<Location>
	| Partial<HTMLLocation>;

export interface BaseIssue {
	severity: 'error' | 'warning' | 'info';
	message: string;
	file: string;
	position?: Nullable<IssuePosition>;
	selector?: string;
	property?: string;
	duplicatePosition?: IssuePosition;
	element?: string;
	code?: string;
	source?: string;
}
