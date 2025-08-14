import type { Issue } from './issues';

export interface ReportSummaryIssues {
	css: number;
	globalVars: number;
	eventListeners: number;
	dynamicElements: number;
	total: number;
}

export interface ReportSummary {
	entry: string;
	directory: string;
	totalFiles: number;
	scannedAt: string;
	issues: ReportSummaryIssues;
}

export interface ReportResults {
	css: Issue[];
	globalVars: Issue[];
	eventListeners: Issue[];
	dynamicElements: Issue[];
}

export interface Report {
	summary: ReportSummary;
	results: ReportResults;
}

export interface ReportMap {
	unknown: {
		[filepath: string]: ReportResults;
	};
	source: {
		[filepath: string]: ReportResults;
	};
	node_modules: {
		[filepath: string]: ReportResults;
	};
}
