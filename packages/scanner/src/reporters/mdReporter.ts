import { createHash } from 'crypto';
// @ts-ignore this pkg miss types
import finder from 'find-pkg';
import fs from 'fs';
import path from 'path';
import type { IssuePosition, Nullable } from '@/types/common';
import type { ScanOptions } from '@/types/config';
import { outputReport } from '@/utils/file';
import i18next from '../i18n';
import type { Issue } from '../types/issues';
import type { ReportMap, ReportSummary } from '../types/reporter';

type SourceGroup = 'source' | 'node_modules' | 'unknown';

/**
 * Generate Markdown report
 * @param {Object} report Analysis report
 * @returns {string} Markdown report content
 */
function getSeverityBadge(count: number): string {
	if (count === 0) {
		return '✅';
	}
	if (count < 5) {
		return '⚠️';
	}
	return '❌';
}

const sourceGroupHeadings: Record<SourceGroup, string> = {
	source: `## 📝 ${i18next.t('source_files')}`,
	node_modules: `## 📦 ${i18next.t('node_modules_files')}`,
	unknown: `## ❓ ${i18next.t('unknown_files')}`,
};

/**
 * Generate Markdown content for CSS issues
 * @param {Array<Object>} issues CSS issues list
 * @returns {string} Markdown content
 */
function generateCssIssuesMarkdown(
	issues: Issue[] | null,
	level = 4,
): {
	markdown: string;
	issueTypes: Set<string>;
} {
	if (issues === null || issues.length === 0) {
		return {
			markdown: '',
			issueTypes: new Set(),
		};
	}

	const groupedByType = groupIssuesByType(issues);
	let markdown = `${'#'.repeat(level + 0)} 🎨 ${i18next.t('css_side_effects')} (${issues.length})\n\n`;
	const issueTypes: Set<string> = new Set();

	for (const [type, typeIssues] of Object.entries(groupedByType)) {
		const severity = typeIssues[0].severity || 'info';
		const emoji =
			severity === 'error' ? '🔴' : severity === 'warning' ? '🟡' : '🔵';
		const issueType = `${emoji} ${formatIssueType(type)} (${typeIssues.length})`;
		markdown += `${'#'.repeat(level + 1)} ${issueType}\n\n`;
		issueTypes.add(issueType);

		for (const issue of typeIssues) {
			const pos = formatPosition(issue.position);
			let details = '';
			if (issue.selector) {
				details += ` \`${issue.selector}\``;
			}
			if (issue.property) {
				details += ` \`${issue.property}\``;
			}
			markdown += `- ${pos}: ${issue.message}${details}\n`;
		}
		markdown += `\n`;
	}

	return {
		markdown,
		issueTypes,
	};
}

/**
 * Generate Markdown content for global variable issues
 * @param {Array<Object>} issues issues list
 * @returns {string} Markdown content
 */
function generateGlobalVarIssuesMarkdown(
	issues: Issue[] | null,
	level = 4,
	showSource=false
): {
	markdown: string;
	issueTypes: Set<string>;
} {
	if (issues === null || issues.length === 0) {
		return {
			markdown: '',
			issueTypes: new Set(),
		};
	}

	const groupedByType = groupIssuesByType(issues);
	let markdown = `${'#'.repeat(level + 0)} 🌍 ${i18next.t('global_var_side_effects')} (${issues.length})\n\n`;
	const issueTypes: Set<string> = new Set();

	for (const [type, typeIssues] of Object.entries(groupedByType)) {
		const severity = typeIssues[0].severity || 'info';
		const emoji =
			severity === 'error' ? '🔴' : severity === 'warning' ? '🟡' : '🔵';
		const issueType = `${emoji} ${formatIssueType(type)} (${typeIssues.length})`;
		markdown += `${'#'.repeat(level + 1)} ${issueType}\n\n`;
		issueTypes.add(issueType);

		for (const issue of typeIssues) {
			const pos = formatPosition(issue.position);
			let details = '';
			if ('varName' in issue) {
				details += ` \`${issue.varName}\``;
			}
			markdown += `- ${pos}: ${issue.message}${details}\n`;
			if (showSource && issue.source && issue.source !== 'unknown') {	
				markdown += `\nSource: ${issue.source}\n`;
			}
			if ('code' in issue && issue.code) {
				markdown += `\n\`\`\`javascript\n${issue.code}\n\`\`\`\n`;
			}
		}
		markdown += `\n`;
	}

	return {
		markdown,
		issueTypes,
	};
}

/**
 * Generate Markdown content for event listener issues
 * @param {Array<Object>} issues Event listener issues list
 * @returns {string} Markdown content
 */
function generateEventListenerIssuesMarkdown(
	issues: Issue[] | null,
	level = 4,
): {
	markdown: string;
	issueTypes: Set<string>;
} {
	if (issues === null || issues.length === 0) {
		return {
			markdown: '',
			issueTypes: new Set(),
		};
	}

	const groupedByType = groupIssuesByType(issues);
	let markdown = `${'#'.repeat(level + 0)} 🎯 ${i18next.t('event_listener_side_effects')} (${issues.length})\n\n`;
	const issueTypes: Set<string> = new Set();

	for (const [type, typeIssues] of Object.entries(groupedByType)) {
		const severity = typeIssues[0].severity || 'info';
		const emoji =
			severity === 'error' ? '🔴' : severity === 'warning' ? '🟡' : '🔵';
		const issueType = `${emoji} ${formatIssueType(type)} (${typeIssues.length})`;
		markdown += `${'#'.repeat(level + 1)} ${issueType}\n\n`;
		issueTypes.add(issueType);
		for (const issue of typeIssues) {
			const pos = formatPosition(issue.position);
			let details = '';
			if ('event' in issue) {
				details += ` event: \`${issue.event}\``;
			}
			if ('element' in issue) {
				details += ` element: \`${issue.element}\``;
			}
			markdown += `- ${pos}: ${issue.message}${details}\n`;
			if ('code' in issue && issue.code) {
				markdown += `\n\`\`\`javascript\n${issue.code}\n\`\`\`\n`;
			}
		}
		markdown += `\n`;
	}

	return {
		markdown,
		issueTypes,
	};
}

/**
 * Generate Markdown content for dynamic element issues
 * @param {Array<Object>} issues Dynamic element issues list
 * @returns {string} Markdown content
 */
function generateDynamicElementIssuesMarkdown(
	issues: Issue[] | null,
	level = 4,
): {
	markdown: string;
	issueTypes: Set<string>;
} {
	if (issues === null || issues.length === 0) {
		return {
			markdown: '',
			issueTypes: new Set(),
		};
	}

	const groupedByType = groupIssuesByType(issues);
	let markdown = `${'#'.repeat(level + 0)} 🧩 ${i18next.t('dynamic_element_side_effects')} (${issues.length})\n\n`;
	const issueTypes: Set<string> = new Set();

	for (const [type, typeIssues] of Object.entries(groupedByType)) {
		const severity = typeIssues[0].severity || 'info';
		const emoji =
			severity === 'error' ? '🔴' : severity === 'warning' ? '🟡' : '🔵';
		const issueType = `${emoji} ${formatIssueType(type)} (${typeIssues.length})`;
		markdown += `${'#'.repeat(level + 1)} ${issueType}\n\n`;
		issueTypes.add(issueType);
		for (const issue of typeIssues) {
			const pos = formatPosition(issue.position);
			let details = '';
			if ('element' in issue) {
				details += ` element: \`${issue.element}\``;
			}
			if ('method' in issue) {
				details += ` method: \`${issue.method}\``;
			}
			markdown += `- ${pos}: ${issue.message}${details}\n`;
			if ('code' in issue && issue.code) {
				markdown += `\n\`\`\`javascript\n${issue.code}\n\`\`\`\n`;
			}
		}
		markdown += `\n`;
	}

	return {
		markdown,
		issueTypes,
	};
}

/**
 * Group issues by type
 * @param {Array<Object>} issues Issues list
 * @returns {Object} Issues grouped by type
 */
function groupIssuesByType(issues: Issue[]): { [key: string]: Issue[] } {
	const grouped: { [key: string]: Issue[] } = {};

	for (const issue of issues) {
		if (!grouped[issue.type]) {
			grouped[issue.type] = [];
		}
		grouped[issue.type].push(issue);
	}

	return grouped;
}

/**
 * Format issue type
 * @param {string} type Issue type
 * @returns {string} Formatted type name
 */
function formatIssueType(type: string): string {
	const typeMap = {
		// CSS
		global_selector: i18next.t('issue_type_global_selector'),
		low_specificity: i18next.t('issue_type_low_specificity'),
		complex_selector: i18next.t('issue_type_complex_selector'),
		important_declaration: i18next.t('issue_type_important_declaration'),
		unused_rule: i18next.t('issue_type_unused_rule'),
		duplicate_rule: i18next.t('issue_type_duplicate_rule'),
		inline_style: i18next.t('issue_type_inline_style'),

		// Global var
		global_var_declaration: i18next.t('issue_type_global_var_declaration'),
		global_var_override: i18next.t('issue_type_global_var_override'),
		built_in_override: i18next.t('issue_type_built_in_override'),
		simple_global_name: i18next.t('issue_type_simple_global_name'),
		inline_script_global: i18next.t('issue_type_inline_script_global'),
		unparseable_script: i18next.t('issue_type_unparseable_script'),

		// Event listener
		unremoved_event_listener: i18next.t('issue_type_unremoved_event_listener'),
		anonymous_event_handler: i18next.t('issue_type_anonymous_event_handler'),
		duplicate_event_listener: i18next.t('issue_type_duplicate_event_listener'),
		global_event_listener: i18next.t('issue_type_global_event_listener'),
		inline_script_event_listener: i18next.t(
			'issue_type_inline_script_event_listener',
		),
		potential_inline_event_listener: i18next.t(
			'issue_type_potential_inline_event_listener',
		),
		inline_event_handler: i18next.t('issue_type_inline_event_handler'),

		// Dynamic element
		untracked_dynamic_element: i18next.t(
			'issue_type_untracked_dynamic_element',
		),
		dynamic_element_append: i18next.t('issue_type_dynamic_element_append'),
		dynamic_element_insert: i18next.t('issue_type_dynamic_element_insert'),
		dynamic_element_remove: i18next.t('issue_type_dynamic_element_remove'),
	};

	return typeMap[type as keyof typeof typeMap] || type;
}

/**
 * Format position information
 * @param {Object} position Position information
 * @returns {string} Formatted position string
 */
function formatPosition(position?: Nullable<IssuePosition>): string {
	if (!position) return '';

	if ('start' in position && 'end' in position && position.start) {
		return i18next.t('line_number', { line: position.start.line });
	}

	if ('startLine' in position && 'endLine' in position) {
		return i18next.t('line_number', { line: position.startLine });
	}

	return '';
}

function collectReportMapAndSummary(
	options: Required<ScanOptions>,
	issues: {
		css: Issue[];
		globalVars: Issue[];
		eventListeners: Issue[];
		dynamicElements: Issue[];
	},
	totalFiles: number,
	scannedAt: string,
) {
	const reportMap: ReportMap = {
		source: {},
		unknown: {},
		node_modules: {},
	};
	const hashSet: Set<string> = new Set();

	const groupedByType = (
		issues: Issue[],
		type: 'css' | 'globalVars' | 'eventListeners' | 'dynamicElements',
	) => {
		for (const issue of issues) {
			if (!issue.source) {
				continue;
			}
			const hash = createHash('md5')
				.update(`${issue.file} | ${issue.message}`)
				.digest('hex');
			if (hashSet.has(hash)) {
				continue;
			}
			let group: SourceGroup = 'unknown';

			if (issue.source === 'unknown') {
				group = 'unknown';
			} else if (issue.source.includes('node_modules')) {
				group = 'node_modules';
			} else if (
				!(
					path.relative(process.cwd(), issue.source).split(path.sep)[0] ===
					options.unknownDir
				)
			) {
				group = 'source';
			}
			hashSet.add(hash);

			reportMap[group][issue.file] ||= {
				css: [],
				globalVars: [],
				eventListeners: [],
				dynamicElements: [],
			};
			reportMap[group][issue.file][type].push(issue);
		}
	};
	groupedByType(issues.css, 'css');
	groupedByType(issues.globalVars, 'globalVars');
	groupedByType(issues.eventListeners, 'eventListeners');
	groupedByType(issues.dynamicElements, 'dynamicElements');

	const summary: ReportSummary = {
		entry: options.dir || options.entry,
		directory: options.dir || path.dirname(options.entry),
		totalFiles,
		scannedAt,
		issues: {
			css: issues.css.length,
			globalVars: issues.globalVars.length,
			eventListeners: issues.eventListeners.length,
			dynamicElements: issues.dynamicElements.length,
			total:
				issues.css.length +
				issues.globalVars.length +
				issues.eventListeners.length +
				issues.dynamicElements.length,
		},
	};
	return { reportMap, summary };
}

/**
 * Generate Markdown report
 * @param {Object} report Analysis report
 * @returns {string} Markdown report content
 */
export async function generateReport(
	options: Required<ScanOptions>,
	issues: {
		css: Issue[];
		globalVars: Issue[];
		eventListeners: Issue[];
		dynamicElements: Issue[];
	},
	totalFiles: number,
	scannedAt: string,
): Promise<void> {
	const now = new Date();
	const { reportMap, summary } = collectReportMapAndSummary(
		options,
		issues,
		totalFiles,
		scannedAt,
	);

	let markdown = `# 📊 ${i18next.t('report_title')}

## 📋 ${i18next.t('overview_title')}

| ${i18next.t('type')} | ${i18next.t('details')} |
|---|---|
| **${i18next.t('scan_entry')}** | \`${summary.entry}\` |
| **${i18next.t('file_count')}** | ${summary.totalFiles} ${i18next.t('file_count')} |
| **${i18next.t('scan_time')}** | ${now.toLocaleString()} |

## 📈 ${i18next.t('issue_statistics_title')}

| ${i18next.t('type')} | ${i18next.t('quantity')} | ${i18next.t('status')} |
|---|---|---|
| **${i18next.t('css_side_effects')}** | ${summary.issues.css} ${summary.issues.css} | ${getSeverityBadge(
		summary.issues.css,
	)} |
| **${i18next.t('global_var_side_effects')}** | ${summary.issues.globalVars} ${summary.issues.globalVars} | ${getSeverityBadge(
		summary.issues.globalVars,
	)} |
| **${i18next.t('event_listener_side_effects')}** | ${summary.issues.eventListeners} ${summary.issues.eventListeners} | ${getSeverityBadge(
		summary.issues.eventListeners,
	)} |
| **${i18next.t('dynamic_element_side_effects')}** | ${summary.issues.dynamicElements} ${summary.issues.dynamicElements} | ${getSeverityBadge(
		summary.issues.dynamicElements || 0,
	)} |
| **${i18next.t('total')}** | ${summary.issues.total} ${summary.issues.total} | ${getSeverityBadge(
		summary.issues.total,
	)} |

---

`;

	const thirdPartyMarkdownDir = path.join(process.cwd(), 'node_modules/.se');

	for (const group in reportMap) {
		markdown += `${sourceGroupHeadings[group as SourceGroup]} (${Object.keys(reportMap[group as keyof ReportMap]).length})\n\n`;
		let id = 0;
		for (const filepath in reportMap[group as keyof ReportMap]) {
			let pkgOrFilePath = filepath;
			const isThirdParty = group === 'node_modules';
			if (isThirdParty) {
				try {
					fs.mkdirSync(thirdPartyMarkdownDir, {
						recursive: true,
					});
				} catch (e) {
					//noop
				}
				try {
					const pkgPath = finder.sync(filepath);
					pkgOrFilePath = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
						.name.replace(/@/g, '')
						.replace(/\//g, '.');
				} catch (e) {
					pkgOrFilePath = `unknown-pkg-${id}`;
				}
			}
			let blockMarkDown = '';
			const headingLevel = 3 - (isThirdParty ? 2 : 0);
			const fileIssues = reportMap[group as keyof ReportMap][filepath];
			const totalIssues =
				fileIssues.css.length +
				fileIssues.globalVars.length +
				fileIssues.eventListeners.length +
				fileIssues.dynamicElements.length;
			blockMarkDown += `${'#'.repeat(headingLevel)} ${pkgOrFilePath} (${totalIssues})\n\n`;
			const { markdown: cssMarkdown, issueTypes: cssIssueTypes } =
				generateCssIssuesMarkdown(fileIssues.css, headingLevel + 1);
			const { markdown: globalVarMarkdown, issueTypes: globalVarIssueTypes } =
				generateGlobalVarIssuesMarkdown(
					fileIssues.globalVars,
					headingLevel + 1,
					isThirdParty
				);
			const {
				markdown: eventListenerMarkdown,
				issueTypes: eventListenerIssueTypes,
			} = generateEventListenerIssuesMarkdown(
				fileIssues.eventListeners,
				headingLevel + 1,
			);
			const {
				markdown: dynamicElementMarkdown,
				issueTypes: dynamicElementIssueTypes,
			} = generateDynamicElementIssuesMarkdown(
				fileIssues.dynamicElements,
				headingLevel + 1,
			);

			blockMarkDown += cssMarkdown;
			blockMarkDown += globalVarMarkdown;
			blockMarkDown += eventListenerMarkdown;
			blockMarkDown += dynamicElementMarkdown;

			const issueTypes = new Set([
				...cssIssueTypes,
				...globalVarIssueTypes,
				...eventListenerIssueTypes,
				...dynamicElementIssueTypes,
			]);

			if (isThirdParty) {
				await outputReport(blockMarkDown, {
					...options,
					output: path.join(thirdPartyMarkdownDir, `${pkgOrFilePath}.md`),
				});
				markdown += `### ${pkgOrFilePath}\n\n`;
				markdown += `${[...issueTypes].map((issueType) => `* ${issueType}\n`).join(' ')}`;
				markdown += `[View Details](./node_modules/.se/${pkgOrFilePath}.md)\n\n`;
			} else {
				markdown += blockMarkDown;
			}
			id++;
		}
	}

	markdown += `## 💡 ${i18next.t('fix_guide')}\n\n`;
	markdown += `${i18next.t('fix_refer')}\n\n`;

	markdown += `\n\n---\n\n*${i18next.t('generated_at')}：${now.toLocaleString()}*
*${i18next.t('tool_version')}*
`;

	await outputReport(markdown, options, true);
}
