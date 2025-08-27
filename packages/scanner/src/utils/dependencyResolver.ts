import type {
  CallExpression,
  ExportAllDeclaration,
  ExportNamedDeclaration,
  Identifier,
  ImportDeclaration,
  Module,
  Node,
  StringLiteral,
} from '@swc/core';
import * as swc from '@swc/core';
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import type { Asset, AssetMap } from '@/rsbuild-plugins/shake-plugin';
import { getFileTypeFromExt } from './file';

interface ResolveDependenciesOptions {
  maxDepth?: number;
  baseDir?: string;
  aliases?: Record<string, string>;
  ignorePaths?: string[];
  extensions?: string[];
  verbose?: boolean;
}

interface PendingFile {
  file: string;
  depth: number;
}

//  clean license comment
function cleanLicenseComment(content: string): string {
  // Match and remove common license comment formats
  const licensePatterns = [
    // /*! ... */ format
    /\/\*![\s\S]*?\*\//g,
    // /** @license ... */ format
    /\/\*\*?\s*@license[\s\S]*?\*\//g,
    // /* For license information ... */ format
    /\/\*[\s\S]*?For license information[\s\S]*?\*\//g,
    // // @license ... format
    /\/\/\s*@license.*$/gm,
    // License information in multi-line comments
    /\/\*[\s\S]*?license[\s\S]*?\*\//gi,
  ];

  let cleanedContent = content;

  // Apply all cleaning modes
  licensePatterns.forEach((pattern) => {
    cleanedContent = cleanedContent.replace(pattern, '');
  });

  // Clean up extra blank lines
  cleanedContent = cleanedContent.replace(/\n\s*\n\s*\n/g, '\n\n').trim();

  return cleanedContent;
}

/**
 * Parse the entry file and its all dependencies
 * @param {string} entryFile Entry file path
 * @param {Object} options Parsing options
 * @returns {Promise<Array<string>>} List of paths of all dependent files
 */
export async function resolveDependencies(
  entryFile: string,
  options: ResolveDependenciesOptions = {},
): Promise<string[]> {
  const {
    maxDepth = Number.POSITIVE_INFINITY,
    baseDir = process.cwd(),
    aliases = {},
    ignorePaths = ['node_modules'],
    extensions = ['.js', '.jsx', '.ts', '.tsx', '.css', '.scss', '.less'],
    verbose = false,
  } = options;

  const normalizedEntryFile = path.resolve(baseDir, entryFile);

  const resolvedFiles = new Set<string>();
  const dependencies: string[] = [];
  const pendingFiles: PendingFile[] = [{ file: normalizedEntryFile, depth: 0 }];

  if (verbose) {
    console.log(
      `Start parsing dependencies from entry file: ${normalizedEntryFile}`,
    );
  }

  while (pendingFiles.length > 0) {
    const { file, depth } = pendingFiles.shift()!;

    if (resolvedFiles.has(file)) {
      continue;
    }

    if (depth > maxDepth) {
      if (verbose) {
        console.log(`Reach max depth ${maxDepth}, skip file: ${file}`);
      }
      continue;
    }

    if (!fs.existsSync(file)) {
      if (verbose) {
        console.log(`File not exist, skip: ${file}`);
      }
      continue;
    }

    if (shouldIgnoreFile(file, ignorePaths)) {
      if (verbose) {
        console.log(`Ignore file: ${file}`);
      }
      continue;
    }

    try {
      resolvedFiles.add(file);
      dependencies.push(file);

      if (verbose) {
        console.log(`Parse file: ${file} (depth: ${depth})`);
      }

      const content = fs.readFileSync(file, 'utf-8');
      const fileExt = path.extname(file).toLowerCase();

      let fileDependencies: string[] = [];
      if (['.js', '.jsx', '.ts', '.tsx'].includes(fileExt)) {
        fileDependencies = await parseJavaScriptDependencies(file, content, {
          baseDir,
          aliases,
          extensions,
          isTypeScript: ['.ts', '.tsx'].includes(fileExt),
        });
      } else if (['.css', '.scss', '.less'].includes(fileExt)) {
        fileDependencies = parseCssDependencies(file, content);
      } else if (['.html', '.htm'].includes(fileExt)) {
        fileDependencies = parseHtmlDependencies(file, content);
      }

      for (const dep of fileDependencies) {
        pendingFiles.push({ file: dep, depth: depth + 1 });
      }
    } catch (error) {
      if (verbose && error instanceof Error) {
        console.error(`解析文件失败 ${file}: ${error.message}`);
      }
    }
  }

  return dependencies;
}

interface ParseJavaScriptDependenciesOptions {
  baseDir: string;
  aliases: Record<string, string>;
  extensions: string[];
  isTypeScript?: boolean;
  verbose?: boolean;
}

/**
 * Parse JavaScript/TypeScript file dependencies
 * @param {string} filePath File path
 * @param {string} content File content
 * @param {Object} options Parsing options
 * @returns {Promise<Array<string>>} List of paths of all dependent files
 */
async function parseJavaScriptDependencies(
  filePath: string,
  content: string,
  options: ParseJavaScriptDependenciesOptions,
): Promise<string[]> {
  const { baseDir, aliases, extensions, isTypeScript = false } = options;

  const dependencies: string[] = [];
  const fileDir = path.dirname(filePath);

  try {
    const ast: Module = await swc.parse(content, {
      syntax: isTypeScript ? 'typescript' : 'ecmascript',
      tsx: isTypeScript && content.includes('<') && content.includes('</'),
      jsx: !isTypeScript,
      comments: false,
    });

    const visitor = (node: Node) => {
      if (!node) return;

      if (node.type === 'ImportDeclaration') {
        const importDecl = node as ImportDeclaration;
        if (importDecl.source) {
          const importPath = importDecl.source.value;
          const resolvedPath = resolveImportPath(
            importPath,
            fileDir,
            baseDir,
            aliases,
            extensions,
          );
          if (resolvedPath) {
            dependencies.push(resolvedPath);
          }
        }
      } else if (node.type === 'ExportNamedDeclaration') {
        const exportDecl = node as ExportNamedDeclaration;
        if (exportDecl.source) {
          const importPath = exportDecl.source.value;
          const resolvedPath = resolveImportPath(
            importPath,
            fileDir,
            baseDir,
            aliases,
            extensions,
          );
          if (resolvedPath) {
            dependencies.push(resolvedPath);
          }
        }
      } else if (node.type === 'ExportAllDeclaration') {
        const exportAllDecl = node as ExportAllDeclaration;
        if (exportAllDecl.source) {
          const importPath = exportAllDecl.source.value;
          const resolvedPath = resolveImportPath(
            importPath,
            fileDir,
            baseDir,
            aliases,
            extensions,
          );
          if (resolvedPath) {
            dependencies.push(resolvedPath);
          }
        }
      } else if (node.type === 'CallExpression') {
        const callExpr = node as CallExpression;
        let importPath: string | null = null;
        if (
          callExpr.callee.type === 'Import' &&
          callExpr.arguments.length > 0 &&
          callExpr.arguments[0].expression.type === 'StringLiteral'
        ) {
          importPath = (callExpr.arguments[0].expression as StringLiteral)
            .value;
        } else if (
          callExpr.callee.type === 'Identifier' &&
          (callExpr.callee as Identifier).value === 'require' &&
          callExpr.arguments.length > 0 &&
          callExpr.arguments[0].expression.type === 'StringLiteral'
        ) {
          importPath = (callExpr.arguments[0].expression as StringLiteral)
            .value;
        }

        if (importPath) {
          const resolvedPath = resolveImportPath(
            importPath,
            fileDir,
            baseDir,
            aliases,
            extensions,
          );
          if (resolvedPath) {
            dependencies.push(resolvedPath);
          }
        }
      }

      Object.keys(node).forEach((key) => {
        const child = (node as any)[key];
        if (child && typeof child === 'object') {
          if (Array.isArray(child)) {
            child.forEach(visitor);
          } else {
            visitor(child);
          }
        }
      });
    };

    visitor(ast);
  } catch (error) {
    if (error instanceof Error) {
      console.error(`解析JavaScript依赖失败 ${filePath}: ${error.message}`);
    }
  }

  return dependencies;
}

/**
 * Parse CSS file dependencies (e.g. @import statements)
 * @param {string} filePath File path
 * @param {string} content File content
 * @returns {Array<string>} List of paths of all dependent files
 */
function parseCssDependencies(filePath: string, content: string): string[] {
  const dependencies: string[] = [];
  const fileDir = path.dirname(filePath);

  const importRegex = /@import\s+(?:url\s*\(\s*)?['"]([^'"]+)['"]\s*\)?/g;
  let match: RegExpExecArray | null;

  // biome-ignore lint/suspicious/noAssignInExpressions: use assignment in loop condition
  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1];
    if (
      !importPath.startsWith('http://') &&
      !importPath.startsWith('https://')
    ) {
      const resolvedPath = path.resolve(fileDir, importPath);
      if (fs.existsSync(resolvedPath)) {
        dependencies.push(resolvedPath);
      }
    }
  }

  return dependencies;
}

/**
 * Parse HTML file dependencies (e.g. script and style tags)
 * @param {string} filePath File path
 * @param {string} content File content
 * @returns {Array<string>} List of paths of all dependent files
 */
function parseHtmlDependencies(filePath: string, content: string): string[] {
  const dependencies: string[] = [];
  const fileDir = path.dirname(filePath);

  const scriptRegex = /<script\s+[^>]*src\s*=\s*['"]([^'"]+)['"]/g;
  let scriptMatch: RegExpExecArray | null;

  // biome-ignore lint/suspicious/noAssignInExpressions: use assignment in loop condition
  while ((scriptMatch = scriptRegex.exec(content)) !== null) {
    const scriptPath = scriptMatch[1];
    if (
      !scriptPath.startsWith('http://') &&
      !scriptPath.startsWith('https://')
    ) {
      const resolvedPath = path.resolve(fileDir, scriptPath);
      if (fs.existsSync(resolvedPath)) {
        dependencies.push(resolvedPath);
      }
    }
  }

  const linkRegex = /<link\s+[^>]*href\s*=\s*['"]([^'"]+)['"][^>]*>/g;
  let linkMatch: RegExpExecArray | null;

  // biome-ignore lint/suspicious/noAssignInExpressions: use assignment in loop condition
  while ((linkMatch = linkRegex.exec(content)) !== null) {
    const linkTag = linkMatch[0];
    const linkPath = linkMatch[1];
    if (
      !linkPath.startsWith('http://') &&
      !linkPath.startsWith('https://') &&
      (linkPath.endsWith('.css') ||
        /rel\s*=\s*['"]?stylesheet['"]?/i.test(linkTag))
    ) {
      const resolvedPath = path.resolve(fileDir, linkPath);
      if (fs.existsSync(resolvedPath)) {
        dependencies.push(resolvedPath);
      }
    }
  }

  return dependencies;
}

/**
 * Resolve import path, handle aliases and path mapping
 * @param {string} importPath Import path
 * @param {string} fileDir Current file directory
 * @param {string} baseDir Base directory
 * @param {Object} aliases Path alias mapping
 * @param {Array<string>} extensions File extension list
 * @returns {string|null} Resolved file path, or null if cannot resolve
 */
function resolveImportPath(
  importPath: string,
  fileDir: string,
  baseDir: string,
  aliases: Record<string, string>,
  extensions: string[],
): string | null {
  if (importPath.startsWith('.') || importPath.startsWith('/')) {
    let resolvedPath = importPath;
    for (const [alias, aliasPath] of Object.entries(aliases)) {
      if (importPath.startsWith(alias)) {
        resolvedPath = path.join(aliasPath, importPath.substring(alias.length));
        break;
      }
    }

    if (resolvedPath.startsWith('.')) {
      resolvedPath = path.resolve(fileDir, resolvedPath);
    } else if (resolvedPath.startsWith('/')) {
      resolvedPath = path.join(baseDir, resolvedPath);
    }

    if (fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isFile()) {
      return resolvedPath;
    }

    for (const ext of extensions) {
      const pathWithExt = `${resolvedPath}${ext}`;
      if (fs.existsSync(pathWithExt) && fs.statSync(pathWithExt).isFile()) {
        return pathWithExt;
      }
    }

    // index file
    for (const ext of extensions) {
      const indexPath = path.join(resolvedPath, `index${ext}`);
      if (fs.existsSync(indexPath) && fs.statSync(indexPath).isFile()) {
        return indexPath;
      }
    }
  }

  return null;
}

/**
 * Check if the file should be ignored
 * @param {string} filePath File path
 * @param {Array<string>} ignorePaths Ignored path patterns
 * @returns {boolean} Whether to ignore
 */
function shouldIgnoreFile(filePath: string, ignorePaths: string[]): boolean {
  return ignorePaths.some((ignorePath) => filePath.includes(ignorePath));
}

interface ResolveOptions {
  maxDepth?: number;
  baseDir?: string;
  aliases?: Record<string, string>;
  ignorePaths?: string[];
  extensions?: string[];
  verbose?: boolean;
}

interface PendingFile {
  file: string;
  depth: number;
}

/**
 * Parse entry file and all its dependencies synchronously
 * @param {string} entryFile Entry file path
 * @param {ResolveOptions} options Resolve options
 * @returns {Array<string>} List of paths of all dependent files
 */
export async function resolveASync(
  entryFile: string,
  options: ResolveOptions = {},
): Promise<string[]> {
  const {
    maxDepth = Number.POSITIVE_INFINITY,
    baseDir = process.cwd(),
    aliases = {},
    ignorePaths = ['node_modules'],
    extensions = ['.js', '.jsx', '.ts', '.tsx', '.css', '.scss', '.less'],
    verbose = false,
  } = options;

  // Normalize entry file path
  const normalizedEntryFile = path.resolve(baseDir, entryFile);

  // Store resolved file paths to avoid circular dependencies
  const resolvedFiles = new Set<string>();
  // Store all dependent file paths
  const dependencies: string[] = [];
  // Store files to be parsed
  const pendingFiles: PendingFile[] = [{ file: normalizedEntryFile, depth: 0 }];

  if (verbose) {
    console.log(
      `Start synchronously parsing dependencies from entry file: ${normalizedEntryFile}`,
    );
  }

  while (pendingFiles.length > 0) {
    const current = pendingFiles.shift();
    if (!current) continue;

    const { file, depth } = current;

    // 检查是否已解析过该文件
    if (resolvedFiles.has(file)) {
      continue;
    }

    // Check if the depth exceeds the maximum depth
    if (depth > maxDepth) {
      if (verbose) {
        console.log(
          `Exceeded maximum depth ${maxDepth}, skipping file: ${file}`,
        );
      }
      continue;
    }

    // Check if the file exists
    if (!fs.existsSync(file)) {
      if (verbose) {
        console.log(`File does not exist, skipping: ${file}`);
      }
      continue;
    }

    // Check if the file should be ignored
    if (shouldIgnoreFile(file, ignorePaths)) {
      if (verbose) {
        console.log(`Ignoring file: ${file}`);
      }
      continue;
    }

    try {
      // Add to resolved files set
      resolvedFiles.add(file);
      dependencies.push(file);

      if (verbose) {
        console.log(`Parsing file: ${file} (depth: ${depth})`);
      }

      // Read file content
      const content = fs.readFileSync(file, 'utf-8');
      const fileExt = path.extname(file).toLowerCase();

      // Parse dependencies based on file type
      let fileDependencies: string[] = [];
      if (['.js', '.jsx', '.ts', '.tsx'].includes(fileExt)) {
        fileDependencies = await parseJavaScriptDependencies(file, content, {
          baseDir,
          aliases,
          extensions,
          isTypeScript: ['.ts', '.tsx'].includes(fileExt),
          verbose,
        });
      } else if (['.css', '.scss', '.less'].includes(fileExt)) {
        fileDependencies = parseCssDependencies(file, content);
      } else if (['.html', '.htm'].includes(fileExt)) {
        fileDependencies = parseHtmlDependencies(file, content);
      }

      // Add dependencies to pending files queue
      for (const dep of fileDependencies) {
        pendingFiles.push({ file: dep, depth: depth + 1 });
      }
    } catch (error: any) {
      if (verbose) {
        console.error(`Error parsing file ${file}: ${error.message}`);
      }
    }
  }

  return dependencies;
}

/**
 * Collect all files in the specified directory, return AssetMap format
 * @param {string} directory Directory path to collect
 * @param {Array<string>} [extensions=['.js', '.jsx', '.ts', '.tsx', '.css', '.scss', '.less', '.html', '.htm']] File extensions to collect
 * @param {Array<string>} [ignorePaths=['node_modules', '.git', 'dist', 'build']] Paths to ignore
 * @returns {Promise<AssetMap>} Collected files classified by type in AssetMap format
 */
export async function collectDirectoryFiles(
  directory: string,
  extensions: string[] = [
    '.js',
    '.jsx',
    '.ts',
    '.tsx',
    '.css',
    '.scss',
    '.less',
    '.html',
    '.htm',
  ],
): Promise<AssetMap> {
  const assetMap: AssetMap = {
    js: [],
    css: [],
    html: [],
  };

  async function collectFiles(dir: string): Promise<void> {
    const items = await fsp.readdir(dir, { withFileTypes: true });

    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      if (item.isDirectory()) {
        await collectFiles(fullPath);
      } else if (item.isFile()) {
        const ext = path.extname(item.name).toLowerCase();

        // Process only specified extensions
        if (extensions.includes(ext)) {
          try {
            const rawContent = await fsp.readFile(fullPath, 'utf-8');
            const content = cleanLicenseComment(rawContent);
            const mapPath = `${fullPath}.map`;
            let mapContent = '';

            if (fs.existsSync(mapPath)) {
              mapContent = await fsp.readFile(mapPath, 'utf-8');
            }

            const asset: Asset = {
              name: fullPath,
              content,
              map: mapContent,
            };

            // Classify assets by file type
            if (['.js', '.jsx', '.ts', '.tsx'].includes(ext)) {
              assetMap.js.push(asset);
            } else if (['.css', '.scss', '.less'].includes(ext)) {
              assetMap.css.push(asset);
            } else if (['.html', '.htm'].includes(ext)) {
              assetMap.html.push(asset);
            }
          } catch (error) {
            console.warn(`Error reading file ${fullPath}:`, error);
          }
        }
      }
    }
  }

  try {
    await collectFiles(directory);
  } catch (error) {
    console.error(`Error collecting files in directory ${directory}:`, error);
    throw error;
  }

  return assetMap;
}

export async function resolveAssetMap(
  dirOrFile: string,
  options: ResolveDependenciesOptions = {},
): Promise<AssetMap> {
  if (fs.statSync(dirOrFile).isDirectory()) {
    return collectDirectoryFiles(dirOrFile);
  }
  const deps = await resolveDependencies(dirOrFile, options);

  const assetMap: AssetMap = {
    js: [],
    css: [],
    html: [],
  };
  await Promise.all(
    deps.map(async (dep) => {
      const depMapPath = `${dep}.map`;
      let mapContent: string = '';
      if (fs.existsSync(depMapPath)) {
        const rawMapContent = await fsp.readFile(depMapPath, 'utf-8');
        mapContent = cleanLicenseComment(rawMapContent);
      }
      const ext = getFileTypeFromExt(path.extname(dep).slice(1));
      assetMap[ext as keyof AssetMap].push({
        name: dep,
        content: fs.readFileSync(dep, 'utf-8'),
        map: mapContent,
      });
    }),
  );

  return assetMap;
}
