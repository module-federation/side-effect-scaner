# @module-federation/side-effect-scanner

## Quick Start

### Installation

```bash
npm install @module-federation/se-scan
```

### Usage Examples

#### Scan Built Artifacts (Recommended)

For complex projects, we recommend scanning the built artifacts directly to get the most accurate results.

```bash
npx se-scan --dir dist
```

#### Scan Entry Files and Dependencies

Specify the source entry file, and the tool will automatically compile its dependencies and identify side effects.

```bash
npx se-scan --entry src/index.ts
```

#### Use Complex Configuration

```bash
npx se-scan --entry src/index.ts --alias '{"@": "./src"}' --max-depth 5
```

#### Use Configuration File

```bash
npx se-scan --config .serc.ts
```

## CLI Command Details

| Option                                  | Description                                                                                                                                                                                             | Default                 |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| `-c, --config <path>`                   | Configuration file path                                                                                                                                                                                 | `.serc.ts`              |
| `-e, --entry <file>`                    | Entry file path. When specified, scanning will start from this file and all its dependencies                                                                                                            | `index.ts`              |
| `-d, --dir <dir>`                       | Specify the directory to scan. When set, all files in the directory will be scanned. Suitable for projects with complex build configurations, directly scanning artifacts for the most accurate results | -                       |
| `--max-depth <number>`                  | Maximum dependency resolution depth                                                                                                                                                                     | `Infinity`              |
| `--alias <aliases>`                     | Path alias configuration, formatted as JSON string, e.g., `'{"@":"./src"}'`                                                                                                                             | `{}`                    |
| `--compile`                             | Whether to compile entry files                                                                                                                                                                          | `true`                  |
| `-o, --output <path>`                   | Output report filename                                                                                                                                                                                  | `side-effect-report.md` |
| `-f, --format <format>`                 | Output format (md, json, console)                                                                                                                                                                       | `md`                    |
| `--ignored-global-vars <vars>`          | Global variables to ignore, comma-separated                                                                                                                                                             | `''`                    |
| `-i, --ignore <patterns>`               | File patterns to ignore, comma-separated                                                                                                                                                                | `webpackChunk_*`        |
| `-u, --unknown-dir <dir>`               | Unknown directory shown in the report                                                                                                                                                                   | `dist`                  |
| `-v, --verbose`                         | Show detailed output                                                                                                                                                                                    | `false`                 |
| `--exclude-global-selector-after-class` | Exclude global selectors after specified class names                                                                                                                                                    | `true`                  |
| `--exclude-important-rule`              | Exclude !important rules                                                                                                                                                                                | `true`                  |
| `--high-risk-css-property`              | Whether to collect high-risk CSS properties, e.g., position: fixed                                                                                                                                      | `false`                 |
| `--un-removed-event-listener`           | Whether to collect unremoved event listeners                                                                                                                                                            | `true`                  |
| `--anonymous-event-handler`             | Whether to collect anonymous event handler functions                                                                                                                                                    | `true`                  |
| `--dynamic-element-append`              | Whether to collect dynamic element append events: appendChild                                                                                                                                           | `false`                 |
| `--dynamic-element-remove`              | Whether to collect dynamic element remove events: removeChild                                                                                                                                           | `false`                 |
| `--dynamic-element-insert`              | Whether to collect dynamic element insert events: insertBefore                                                                                                                                          | `false`                 |
| `--untracked-dynamic-element`           | Whether to collect other dynamic element events: createTextNode, innerHTML, outerHTML, insertAdjacentHTML                                                                                               | `false`                 |
| `--global-var-declaration`              | Whether to collect global variable declarations                                                                                                                                                         | `true`                  |
| `--built-in-override`                   | Whether to collect built-in object overrides                                                                                                                                                            | `true`                  |
| `--critical-global-style`               | Whether to collect risky styles for global elements                                                                                                                                                     | `true`                  |
| `--global-selector`                     | Whether to collect global selectors                                                                                                                                                                     | `true`                  |
| `--complex-selector`                    | Whether to collect style rules with complex selectors                                                                                                                                                   | `false`                 |
| `--important-declaration`               | Whether to collect style rules with !important declarations                                                                                                                                             | `false`                 |
| `--duplicate-rule`                      | Whether to collect duplicate style rules                                                                                                                                                                | `true`                  |
| `--global-style-side-effect`            | Whether to collect high-risk CSS properties, e.g., position: fixed                                                                                                                                      | `false`                 |

## Configuration Options

You can create a `.serc.ts` configuration file to customize scanning options.

Configuration options type:

```ts
interface ScanOptions {
  config?: string;
  entry?: string;
  dir?: string;
  output?: string;
  format?: 'console' | 'json' | 'md';
  ignore?: Array<string | { file: string; lines?: number[] }>;
  verbose?: boolean;
  maxDepth?: number;
  compile?: boolean;
  alias?: Record<string, string>;
  adapter?: string | [adapterPath: string, adapterOptions?: AdapterOptions];
  excludeGlobalSelectorAfterClass?: boolean;
  excludeImportantRule?: boolean;
  highRiskCssProperty?: boolean;
  ignoredGlobalVars?: string[];
  unRemovedEventListener?: boolean;
  anonymousEventHandler?: boolean;
  dynamicElementAppend?: boolean;
  dynamicElementRemove?: boolean;
  dynamicElementInsert?: boolean;
  untrackedDynamicElement?: boolean;
  globalVarDeclaration?: boolean;
  builtInOverride?: boolean;
  criticalGlobalStyle?: boolean;
  globalSelector?: boolean;
  complexSelector?: boolean;
  importantDeclaration?: boolean;
  duplicateRule?: boolean;
  globalStyleSideEffect?: boolean;
}
```

## Output

After successful scanning, a `side-effect-report.md` file will be generated containing the scan results. The format is as follows:

## More Information

View [docs](https://github.com/module-federation/side-effect-scaner) for more details.
