# Side Effect Scanner

A frontend engineering side effect scanning tool for detecting CSS, global variables, and global event listener side effects.

# Detecting Project Side Effects

We provide a CLI tool to help detect side effects including CSS, global variables, and global event listeners.

## Quick Start

### Installation

```bash
npm install @module-federation/side-effect-scanner
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

## Advanced Usage

### Compile Mode

When using the `--compile` option (enabled by default), the tool will use Rsbuild to compile entry files and their dependencies, then scan the compiled code. This ensures that even when using TypeScript, JSX, or other syntax that requires compilation, side effects can be correctly identified.

If the `--compile` option is disabled, the tool will directly scan source files, which may not correctly handle syntax that requires compilation.

> Note: When using the `--dir` option, the `--compile` option will be automatically disabled.

### Custom Adapters

When using `--compile` mode but encountering build errors, you can specify a custom adapter via the `adapter` option to handle specific build tool configurations. An adapter is a function that receives scan options and optional adapter configuration parameters, returning an Rsbuild configuration object.

```ts
import { createScanConfig } from '@module-federation/side-effect-scanner';

export default createScanConfig({
  entry: 'src/index.ts',
  adapter: './my-adapter.js',
});
```

#### Adapter Formats

Adapters can be string paths or array format:

- **String format**: `"./my-adapter.js"` - uses default configuration
- **Array format**: `["./my-adapter.js", { customOption: true }]` - passes custom configuration

#### Adapter Function Signature

```typescript
interface Adapter {
  (scanOptions: ScanOptions, adapterOptions?: any): RsbuildConfig;
}
```

#### Creating Custom Adapters

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
        root: './.temp-dist',
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

#### Using Custom Adapters

**CLI usage:**

```bash
npx se-scan --entry src/index.ts --adapter ./my-adapter.js
```

**Configuration file usage:**

```typescript
// .serc.ts
import { createScanConfig } from '@module-federation/side-effect-scanner';

export default createScanConfig({
  entry: 'src/index.ts',
  adapter: './my-adapter.js',
});
```

#### Built-in Adapters

The project provides the following built-in adapters:

- `@module-federation/side-effect-modernjs-adapter` - suitable for Modern.js projects (version > 2.63.0)

Usage example:

```bash
npx se-scan --entry src/index.ts --adapter <require.resolve('@module-federation/side-effect-modernjs-adapter')>
```

### Ignoring Specific Code Segments

Use the `ignore` option to ignore specific files or specific lines within files.

#### Configuration Formats

The `ignore` configuration supports the following two formats:

##### 1. String Array (file paths or glob patterns)

```typescript
// .serc.ts
import { createScanConfig } from '@module-federation/side-effect-scanner';

export default createScanConfig({
  ignore: [
    '**/@modern-js/runtime/**', // ignore @modern-js/runtime dependencies
    '**/react*/**', // ignore all dependencies starting with react
    '**/lib-router*.js', // ignore all JS files starting with lib-router
    'src/utils/vendor/**', // ignore entire directory
    'src/test/**/*.test.js', // ignore all test files
    'src/legacy/old-code.js', // ignore specific file
  ],
});
```

##### 2. Object Array (precise control)

```typescript
// .serc.ts
import { createScanConfig } from '@module-federation/side-effect-scanner';

export default createScanConfig({
  ignore: [
    // ignore entire file
    'src/utils/vendor.js',

    // ignore specific lines in file
    {
      file: 'src/components/legacy.js',
      lines: [10, 15, 20, 25], // ignore lines 10, 15, 20, 25
    },

    // use glob pattern to ignore specific lines in files
    {
      pattern: 'src/styles/*.css',
      lines: [1, 2, 3], // ignore first 3 lines of CSS files
    },
  ],
});
```

### Path Aliases

When scanning source files, you can set the `alias` option to configure path aliases, ensuring correct module dependency resolution.

### Scan Depth Control

Use the `maxDepth` option to control the maximum depth of dependency resolution, avoiding excessive dependency parsing that may impact performance.

```markdown
# 📊 Frontend Project Side Effect Scan Report

## 📋 Report Overview

| Type           | Details            |
| -------------- | ------------------ |
| **Scan Entry** | `dist`             |
| **File Count** | 9 file count       |
| **Scan Time**  | 2025/8/26 11:04:39 |

## 📈 Issue Statistics

| Type                             | Count | Status |
| -------------------------------- | ----- | ------ |
| **CSS Side Effects**             | 7 7   | ❌     |
| **Global Variable Side Effects** | 10 10 | ❌     |
| **Event Listener Side Effects**  | 2 2   | ⚠️     |
| **Dynamic Element Side Effects** | 0 0   | ✅     |
| **Total**                        | 19 19 | ❌     |

---

## 📝 Source Files (3)

### src/routes/index.css (3)

#### 🎨 CSS Side Effects (3)

## ❓ Unknown Files (3)

### dist/static/js/lib-router.5404ac00.js (1)

#### 🌍 Global Variable Side Effects (1)

## 📦 Third-party Packages (node_modules) (4)

### modernjs-test

- 🟡 Global Variable Declaration (1)

[View Details](./node_modules/.se/modernjs-test.md)

## 💡 How to Fix

Reference documentation: https://lf3-static.bytednsdoc.com/obj/eden-cn/shloeh7nuhonuhog/FIX-GUIDE-zh.md

---

_Generated at: 2025/8/26 11:04:39_
_Frontend Project Side Effect Scan Tool v0.0.8_
```

## Common Issues

### Incorrect Source File Information?

Refer to the following configurations to achieve the best file positioning:

- Set devtool value to 'source-map', if using Rsbuild, set `output.sourcemap` to `true`
- Set `output.devtoolModuleFilenameTemplate` to `[resource-path]`
- For Rsbuild projects, set `tools.lightningcssLoader` to `false`
- For Rsbuild projects, set `output.legalComments` to `'none'`

### Using CSS Modules but Still Recognized as Side Effects?

CSS Modules will hash class names, causing the scanner to fail to recognize class name usage, thus identifying them as side effects.

You can set the format of CSS Module class names to prevent the scanner from recognizing them as side effects.

The Scanner exports a `CSS_MODULE_LOCAL_IDENT_NAME` constant for configuring CSS Module class name format. You can add this constant prefix to the name in your build configuration, so the Scanner will recognize it as a CSS Module class name and avoid identifying it as a side effect.

Example: Set `output.cssModules.localIdentName` to `${CSS_MODULE_LOCAL_IDENT_NAME}-[local]-[hash:base64:6]`.

```typescript
import { CSS_MODULE_LOCAL_IDENT_NAME } from '@module-federation/side-effect-scanner';

export default {
  output: {
    cssModules: {
      localIdentName: `${CSS_MODULE_LOCAL_IDENT_NAME}-[local]-[hash:base64:6]`,
    },
  },
};
```

## How to fix side effects

Refer to the [Fix Guide](./FIX-GUIDE.md) for specific steps to fix side effects.
