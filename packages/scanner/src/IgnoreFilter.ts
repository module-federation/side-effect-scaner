import path from 'path';
import type { Asset } from '@/rsbuild-plugins/shake-plugin';

export interface IgnoreRule {
	file?: string;
	lines?: number[];
	pattern?: string;
}

export function matchPattern(pattern: string, filePath: string): boolean {
	const regexPattern = pattern.replace(/\*/g, '.*').replace(/\?/g, '.');
	const regex = new RegExp(`^${regexPattern}$`);
	return regex.test(filePath);
}

export class IgnoreFilter {
	private rules: IgnoreRule[] = [];
	private defaultIgnoreConfig: string[] = ['webpack/runtime/*'];

	constructor(
		ignoreConfig: Array<string | { file: string; lines?: number[] }>,
	) {
		this.rules = [...ignoreConfig, ...this.defaultIgnoreConfig].map((rule) => {
			if (typeof rule === 'string') {
				/**
				 * Handle file path patterns
				 */
				/**
				 * Handle object format
				 */
				/**
				 * Simple wildcard matching
				 */
				/**
				 * Get the list of line numbers that should be ignored for a specific file
				 * @param filePath File path
				 * @returns Array of line numbers that should be ignored
				 */
				/**
				 * Check if there are line-specific ignore rules for this file
				 */
				return { pattern: rule };
			} else {
				return { file: rule.file, lines: rule.lines };
			}
		});
	}

	shouldIgnoreFile(filePath: string): boolean {
		return this.rules.some((rule) => {
			if (rule.lines) {
				return false;
			}
			if (rule.pattern) {
				// 简单的通配符匹配
				const pattern = rule.pattern.replace(/\*/g, '.*');
				const regex = new RegExp(`^${pattern}$`);
				return regex.test(filePath);
			}
			if (rule.file) {
				return path.resolve(filePath) === path.resolve(rule.file);
			}
			return false;
		});
	}

	shouldIgnoreLine(filePath: string, lineNumber: number): boolean {
		const rule = this.rules.find(
			(rule) =>
				(rule.file && path.resolve(filePath) === path.resolve(rule.file)) ||
				(rule.pattern && this.matchPattern(filePath, rule.pattern)),
		);

		return rule?.lines?.includes(lineNumber) ?? false;
	}

	/**
	 * 获取特定文件应该忽略的行号列表
	 * @param filePath 文件路径
	 * @returns 应该忽略的行号数组
	 */
	getIgnoreLinesForFile(filePath: string): number[] {
		for (const rule of this.rules) {
			if (typeof rule !== 'string' && rule.lines) {
				if (this.matchPattern(rule.file || rule.pattern || '', filePath)) {
					return rule.lines;
				}
			}
		}
		return [];
	}

	private matchPattern(pattern: string, filePath: string): boolean {
		return matchPattern(pattern, filePath);
	}

	shouldIgnore(asset: Asset, lineNumber?: number, source?: string) {
		if (asset.name.endsWith('.html')) {
			return false;
		}
		if (source && source !== 'unknown') {
			return this.shouldIgnoreFile(source);
		}
		for (const rule of this.rules) {
			if (this.matchPattern(rule.file || rule.pattern || '', asset.name)) {
				return true;
			}
		}

		if (!lineNumber) {
			return false;
		}
		const sources = [...JSON.parse(asset.map).sources];
		const ignoreLines = sources.flatMap((source) =>
			this.getIgnoreLinesForFile(source),
		);
		if (!ignoreLines) return false;

		// 检查是否有针对此文件的行忽略规则
		return ignoreLines.includes(lineNumber);
	}
}
