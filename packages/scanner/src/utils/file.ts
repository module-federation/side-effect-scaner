import fs from 'fs';
import path from 'path';
import i18next from '@/i18n';

import type { ScanOptions } from '@/types/config';
import type { FileType, ParsedFile } from '@/types/parsed-file';

export function getEntryDir(options: Required<ScanOptions>) {
	return path.resolve(process.cwd(), options.entry);
}

export async function outputReport(
	report: string,
	options: Required<ScanOptions>,
	showPath = false,
): Promise<void> {
	try {
		const outputName = options.output || `side-effect-report.${options.format}`;
		const outputPath = path.resolve(process.cwd(), outputName);
		const outputDir = path.dirname(outputPath);
		if (!fs.existsSync(outputDir)) {
			fs.mkdirSync(outputDir, { recursive: true });
		}
		await fs.promises.writeFile(outputPath, report, 'utf8');
		if (showPath) {
			console.log(`Report saved to: ${outputPath}`);
		}
	} catch (error) {
		console.error(i18next.t('report_generation_error', { error }));
		throw error;
	}
}

/**
 * 根据文件扩展名获取文件类型
 * @param {string} fileExt 文件扩展名
 * @returns {FileType} 文件类型 ('js', 'css', 'html')
 */
export function getFileTypeFromExt(fileExt: string): FileType {
	switch (fileExt.toLowerCase()) {
		case '.js':
		case '.jsx':
		case '.ts':
		case '.tsx':
			return 'js';
		case '.css':
		case '.scss':
		case '.less':
			return 'css';
		case '.html':
		case '.htm':
			return 'html';
		default:
			return 'js';
	}
}

export function normalizeIssueFilePath({
	file,
	locSource,
}: {
	file: ParsedFile;
	locSource?: string;
	options: Required<ScanOptions>;
}) {
	if (locSource && locSource !== 'unknown') {
		return locSource;
	}
	return file.path;
}
