# Side Effect Scanner

A frontend engineering side effect scanning tool for detecting CSS, global variables, and global event listener side effects.

## Quick Start

### Installation

```bash
npm install @module-federation/se-scan
```

### Basic Usage

```bash
npx se-scan --entry src/index.ts
```

## CLI Command Reference

| Option                                  | Description                                                                                                                                                     | Default                 |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| `-c, --config <path>`                   | Configuration file path                                                                                                                                         | `.serc.ts`              |
| `-e, --entry <file>`                    | Entry file path - will scan all dependencies starting from this file                                                                                           | `index.ts`              |
| `-d, --dir <dir>`                       | Specify directory to scan - scans all files in the directory, ideal for complex projects with direct scanning of built output for most accurate results          | -                       |
| `--max-depth <number>`                  | Maximum dependency resolution depth                                                                                                                             | `Infinity`              |
| `--alias <aliases>`                     | Path alias configuration, JSON string format e.g. `'{"@":"./src"}'`                                                                                         | `{}`                    |
| `--compile`                             | Whether to compile entry file                                                                                                                                     | `true`                  |
| `-o, --output <path>`                   | Output report filename                                                                                                                                            | `side-effect-report.md` |
| `-f, --format <format>`                 | Output format (md, json, console)                                                                                                                                 | `md`                    |
| `--ignored-global-vars <vars>`          | Global variables to ignore, comma-separated                                                                                                                         | `''`                    |
| `-i, --ignore <patterns>`               | File patterns to ignore, comma-separated                                                                                                                            | `webpackChunk_*`        |
| `-u, --unknown-dir <dir>`               | Unknown directory shown in reports                                                                                                                                 | `dist`                  |
| `-v, --verbose`                         | Show detailed output                                                                                                                                                | `false`                 |
| `--exclude-global-selector-after-class` | Exclude global selectors after specified class names                                                                                                                | `true`                  |
| `--exclude-important-rule`              | Exclude !important rules                                                                                                                                            | `true`                  |
| `--high-risk-css-property`              | Whether to collect high-risk CSS properties like position: fixed                                                                                                     | `false`                 |
| `--un-removed-event-listener`           | Whether to collect unremoved event listeners                                                                                                                        | `true`                  |
| `--anonymous-event-handler`             | Whether to collect anonymous event handlers                                                                                                                         | `true`                  |
| `--dynamic-element-append`              | Whether to collect dynamic element append events: appendChild                                                                                                      | `false`                 |
| `--dynamic-element-remove`              | Whether to collect dynamic element remove events: removeChild                                                                                                      | `false`                 |
| `--dynamic-element-insert`              | Whether to collect dynamic element insert events: insertBefore                                                                                                     | `false`                 |
| `--untracked-dynamic-element`           | Whether to collect other dynamic element events: createTextNode, innerHTML, outerHTML, insertAdjacentHTML                                                          | `false`                 |
| `--global-var-declaration`              | Whether to collect global variable declarations                                                                                                                       | `true`                  |
| `--built-in-override`                   | Whether to collect built-in object overrides                                                                                                                        | `true`                  |
| `--critical-global-style`               | Whether to collect risky styles for global elements                                                                                                                  | `true`                  |
| `--global-selector`                     | Whether to collect global scope selectors                                                                                                                             | `true`                  |
| `--complex-selector`                    | Whether to collect complex selector style rules                                                                                                                      | `false`                 |
| `--important-declaration`               | Whether to collect !important declaration style rules                                                                                                                | `false`                 |
| `--duplicate-rule`                      | Whether to collect duplicate style rules                                                                                                                              | `true`                  |
| `--global-style-side-effect`            | Whether to collect high-risk CSS properties like position: fixed                                                                                                       | `true`                  |

## Configuration Options

Configuration options are defined through the `ScanOptions` interface:

```ts
interface ScanOptions {
  config?: string;
  entry?: string;
  dir?: string;
  output?: string;
  format?: "console" | "json" | "md";
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

## Configuration File

Configuration files use the `.serc.ts` format.

### TypeScript Configuration Example

```ts
import { createScanConfig } from "@module-federation/side-effect-scanner";

export default createScanConfig({
  entry: "src/index.ts",
  output: "side-effect-report.md",
  format: "md",
  alias: {
    "@": "./src",
  },
});
```

## Usage Examples

### Scan Entry File and Dependencies

Specify entry source file, will automatically compile dependencies and identify side effects

```bash
npx se-scan --entry src/index.ts
```

### Scan Built Output

For complex projects, recommend directly scanning built output

```bash
npx se-scan --dir dist
```

### Use Complex Configuration

```bash
npx se-scan --entry src/index.ts --alias '{"@": "./src"}' --max-depth 5
```

### Use Configuration File

```bash
npx se-scan --config .serc.ts
```

## Advanced Usage

### Compile Mode

When using `--compile` option (enabled by default), the tool uses Rsbuild to compile entry file and dependencies, then scans compiled code. This ensures correct scanning of side effects even with TypeScript, JSX, or other syntax requiring compilation.

If `--compile` is disabled, the tool will directly scan source files, which may not properly handle syntax requiring compilation.

> Note: When using `--dir` option, `--compile` will be automatically disabled.

### Custom Adapters

Custom adapters can be specified via `adapter` option to handle specific build tool configurations. An adapter is a function that receives scan options and optional adapter configuration parameters, returning an Rsbuild configuration object.

#### Adapter Format

Adapters can be string paths or array format:

- **String format**: `"./my-adapter.js"` - uses default configuration
- **Array format**: `["./my-adapter.js", { customOption: true }]` - passes custom configuration

#### Adapter Function Signature

```typescript
interface Adapter {
  (scanOptions: ScanOptions, adapterOptions?: any): RsbuildConfig;
}
```

#### Creating Custom Adapter

Create a `my-adapter.js` file:

```javascript
module.exports = function myAdapter(scanOptions, adapterOptions = {}) {
  // Return Rsbuild configuration based on scan options and adapter configuration
  return {
    source: {
      entry: {
        index: scanOptions.entry,
      },
    },
    output: {
      distPath: {
        root: "./.temp-dist",
      },
    },
    tools: {
      rspack: {
        resolve: {
          alias: scanOptions.alias || {},
        },
      },
    },
    // Conditional configuration based on adapterOptions
    ...(adapterOptions.enableSourceMap && {
      output: {
        sourceMap: true,
      },
    }),
  };
};
```

#### Using Custom Adapter

**CLI Usage:**

```bash
# Using string format
npx se-scan --entry src/index.ts --adapter ./my-adapter.js

# Using array format with configuration
npx se-scan --entry src/index.ts --adapter '["./my-adapter.js", {"enableSourceMap": true}]'
```

**Configuration File Usage:**

```typescript
// .serc.ts
import { createScanConfig } from "@module-federation/side-effect-scanner";

export default createScanConfig({});
```

#### Built-in Adapters

Project provides the following built-in adapters:

- `@side-effect/edenx-adapter` - Suitable for EdenX projects (version > 1.63.0)

Usage example:

```bash
npx se-scan --entry src/index.ts --adapter node_modules/@side-effect/edenx-adapter/dist/cjs/index.js
```

### Ignoring Specific Code Sections

Use `ignore` option to ignore specific files or specific lines within files.

#### Configuration Format

`ignore` configuration supports two formats:

##### 1. String Array (file paths or glob patterns)

```typescript
// .serc.ts
import { createScanConfig } from "@module-federation/side-effect-scanner";

export default createScanConfig({
  ignore: [
    "src/utils/vendor/**", // Ignore entire directory
    "src/test/**/*.test.js", // Ignore all test files
    "src/legacy/old-code.js", // Ignore specific file
  ],
});
```

##### 2. Object Array (precise control)

```typescript
// .serc.ts
import { createScanConfig } from "@module-federation/side-effect-scanner";

export default createScanConfig({
  ignore: [
    // Ignore entire file
    "src/utils/vendor.js",

    // Ignore specific lines in file
    {
      file: "src/components/legacy.js",
      lines: [10, 15, 20, 25], // Ignore lines 10, 15, 20, 25
    },

    // Use glob pattern to ignore specific lines in files
    {
      pattern: "src/styles/*.css",
      lines: [1, 2, 3], // Ignore first 3 lines of CSS files
    },
  ],
});
```

#### Usage Examples

##### Example 1: Ignore Third-party Libraries

```typescript
// .serc.ts
import { createScanConfig } from "@module-federation/side-effect-scanner";

export default createScanConfig({
  entry: "src/index.js",
  ignore: ["node_modules/**", "src/vendor/**", "**/*.min.js"],
});
```

##### Example 2: Ignore Test Files and Specific Lines

```typescript
// .serc.ts
import { createScanConfig } from "@module-federation/side-effect-scanner";

export default createScanConfig({
  entry: "src/index.js",
  ignore: [
    "**/*.test.js",
    "**/*.spec.ts",
    {
      file: "src/utils/debug.js",
      lines: [42, 43, 44], // Ignore debug code
    },
  ],
});
```

##### Example 3: Mixed Usage

```typescript
// .serc.ts
import { createScanConfig } from "@module-federation/side-effect-scanner";

export default createScanConfig({
  entry: "src/index.js",
  ignore: [
    "dist/**",
    "build/**",
    "src/legacy/**",
    {
      file: "src/components/App.js",
      lines: [100, 101, 102], // Ignore specific initialization code
    },
    {
      pattern: "src/styles/*.css",
      lines: [1], // Ignore copyright comments in CSS files
    },
  ],
});
```

#### Notes

1. **Path matching**: Paths can be relative or absolute, supports glob patterns (* and **)
2. **Line indexing**: Line numbers start from 1
3. **Priority**: Rules in configuration are matched in order, first matching rule takes effect
4. **Coexistence with magic comments**: Ignore configuration can be used together with magic comments, magic comments have higher priority

#### Debugging Tips

To verify if ignore configuration works correctly, use these commands:

```bash
# Run scan and view detailed output
npx se-scan --config .serc.ts --verbose

# Check if specific file is ignored
npx se-scan --config .serc.ts --check-ignore src/path/to/file.js
```

#### Configuration Validation

Ensure your configuration file format is correct:

```typescript
// Correct configuration format
import { createScanConfig } from "@module-federation/side-effect-scanner";

export default createScanConfig({
  entry: "src/index.js",
  ignore: [
    "string/path.js", // ✅ Correct: string
    {
      // ✅ Correct: object
      file: "path.js",
      lines: [1, 2, 3],
    },
    {
      // ✅ Correct: using pattern
      pattern: "**/*.test.js",
      lines: [10, 20],
    },
  ],
});
```

### Path Aliases

Use `alias` option to configure path aliases, ensuring correct module dependency resolution.

### Scan Depth Control

Use `maxDepth` option to control maximum dependency resolution depth, avoiding performance impact from overly deep dependency parsing.

## Output Formats

### Markdown (Default)

Generates Markdown format report file.

### Console

Directly outputs scan results to console.

## Common Issues

### Source file information incorrect?

Refer to the following configurations to achieve optimal file positioning:

- Set devtool value to 'source-map', if using Rsbuild, set `output.sourcemap` to `true`
- Set `output.devtoolModuleFilenameTemplate` to `[resource-path]`
- Rsbuild projects set `tools.lightningcssLoader` to `false`
- Rsbuild projects set `output.legalComments` to `'none'`

### Using CSS Modules but still identified as side effects

CSS Modules will hash class names, causing the scanner to be unable to recognize class name usage, thus identifying it as side effects.

You can set CSS Module class name format to avoid the scanner recognizing class name usage.

The Scanner exports `CSS_MODULE_LOCAL_IDENT_NAME` constant for configuring CSS Module class name format. You can add this constant to the name prefix in build configuration, so the Scanner will recognize this as a CSS Module class name, thus avoiding identification as side effects.

Example: Set `output.cssModules.localIdentName` to `${CSS_MODULE_LOCAL_IDENT_NAME}-[local]-[hash:base64:6]`.

```typescript
import { CSS_MODULE_LOCAL_IDENT_NAME } from "@module-federation/side-effect-scanner";

export default {
  output: {
    cssModules: {
      localIdentName: `${CSS_MODULE_LOCAL_IDENT_NAME}-[local]-[hash:base64:6]`,
    },
  },
};
```
