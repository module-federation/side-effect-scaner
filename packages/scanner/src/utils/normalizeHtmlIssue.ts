import type { Issue } from '@/types/issues';
import type { ParsedFile } from '@/types/parsed-file';

export function normalizeHtmlIssue(issue: Issue, file: ParsedFile): Issue {
	if (file.type !== 'html') {
		return issue;
	}
	return {
		...issue,
		message: `Inline script in HTML ${issue.message}`,
		file: 'html',
		position: undefined,
	};
}
