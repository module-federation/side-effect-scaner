# Side Effect Scanner

前端工程副作用扫描工具，用于检测 CSS、全局变量和全局事件监听器的副作用。

## 快速开始

### 安装

```bash
npm install @module-federation/se-scan
```

### 基本使用

```bash
npx se-scan --entry src/index.ts
```

## CLI 命令详解

| 选项                                    | 描述                                                                                                             | 默认值                  |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ----------------------- |
| `-c, --config <path>`                   | 配置文件路径                                                                                                     | `.serc.ts`              |
| `-e, --entry <file>`                    | 入口文件路径，指定后将从该文件开始扫描所有依赖                                                                   | `index.ts`              |
| `-d, --dir <dir>`                       | 指定扫描的目录，设置后会将目录内所有的文件扫描，适用于有复杂构建配置的项目，直接对产物进行扫描以获取最精准的结果 | -                       |
| `--max-depth <number>`                  | 依赖解析的最大深度                                                                                               | `Infinity`              |
| `--alias <aliases>`                     | 路径别名配置，格式为 JSON 字符串，如 `'{"@":"./src"}'`                                                           | `{}`                    |
| `--compile`                             | 是否编译入口文件                                                                                                 | `true`                  |
| `-o, --output <path>`                   | 输出报告的文件名                                                                                                 | `side-effect-report.md` |
| `-f, --format <format>`                 | 输出格式 (md, json, console)                                                                                     | `md`                    |
| `--ignored-global-vars <vars>`          | 忽略的全局变量，用逗号分隔                                                                                       | `''`                    |
| `-i, --ignore <patterns>`               | 忽略的文件模式，用逗号分隔                                                                                       | `webpackChunk_*`        |
| `-u, --unknown-dir <dir>`               | 报告中展示的未知目录                                                                                             | `dist`                  |
| `-v, --verbose`                         | 显示详细输出                                                                                                     | `false`                 |
| `--exclude-global-selector-after-class` | 排除指定类名之后的全局选择器                                                                                     | `true`                  |
| `--exclude-important-rule`              | 排除!important 规则                                                                                              | `true`                  |
| `--high-risk-css-property`              | 是否收集高风险的 CSS 属性，例如 position: fixed                                                                  | `false`                 |
| `--un-removed-event-listener`           | 是否收集未移除的事件监听器                                                                                       | `true`                  |
| `--anonymous-event-handler`             | 是否收集匿名事件处理函数                                                                                         | `true`                  |
| `--dynamic-element-append`              | 是否收集动态添加元素事件：appendChild                                                                            | `false`                 |
| `--dynamic-element-remove`              | 是否收集动态删除元素事件：removeChild                                                                            | `false`                 |
| `--dynamic-element-insert`              | 是否收集动态插入元素事件：insertBefore                                                                           | `false`                 |
| `--untracked-dynamic-element`           | 是否收集其他的动态元素事件：createTextNode、innerHTML、outerHTML、insertAdjacentHTML                             | `false`                 |
| `--global-var-declaration`              | 是否收集全局变量的声明                                                                                           | `true`                  |
| `--built-in-override`                   | 是否收集内置对象的覆盖                                                                                           | `true`                  |
| `--critical-global-style`               | 是否收集对全局元素有风险的样式                                                                                   | `true`                  |
| `--global-selector`                     | 是否收集作用全局的选择器                                                                                         | `true`                  |
| `--complex-selector`                    | 是否收集具有复杂选择器的样式规则                                                                                 | `false`                 |
| `--important-declaration`               | 是否收集设置了 !important 声明的样式规则                                                                         | `false`                 |
| `--duplicate-rule`                      | 是否收集重复定义的样式规则                                                                                       | `true`                  |
| `--global-style-side-effect`            | 是否收集高风险的 CSS 属性，例如 position: fixed                                                                  | `false`                 |

## 配置选项

配置选项通过 `ScanOptions` 接口定义：

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

## 配置文件

配置文件是 `.serc.ts` 格式。

### TypeScript 配置示例

```ts
import { createScanConfig } from '@module-federation/side-effect-scanner';

export default createScanConfig({
  entry: 'src/index.ts',
  output: 'side-effect-report.md',
  format: 'md',
  alias: {
    '@': './src',
  },
});
```

## 使用示例

### 扫描入口文件及其依赖

指定入口源文件，会自动编译其依赖，并识别副作用

```bash
npx se-scan --entry src/index.ts
```

### 扫描已构建的产物

对于复杂项目，建议直接扫描构建后的产物

```bash
npx se-scan --dir dist
```

### 使用复杂配置

```bash
npx se-scan --entry src/index.ts --alias '{"@": "./src"}' --max-depth 5
```

### 使用配置文件

```bash
npx se-scan --config .serc.ts
```

## 高级用法

### Compile 模式

当使用 `--compile` 选项（默认启用）时，工具会使用 Rsbuild 编译入口文件及其依赖，然后对编译后的代码进行扫描。这确保了即使使用了 TypeScript、JSX 或其他需要编译的语法，也能正确扫描副作用。

如果禁用 `--compile` 选项，工具将直接扫描源文件，这可能无法正确处理需要编译的语法。

> 注意：如果使用了 `--dir` 选项，`--compile` 选项将自动禁用。

### 自定义适配器

可以通过 `adapter` 选项指定自定义适配器来处理特定构建工具的配置。适配器是一个函数，接收扫描选项和可选的适配器配置参数，返回 Rsbuild 配置对象。

#### 适配器格式

适配器可以是字符串路径或数组格式：

- **字符串格式**：`"./my-adapter.js"` - 使用默认配置
- **数组格式**：`["./my-adapter.js", { customOption: true }]` - 传入自定义配置

#### 适配器函数签名

```typescript
interface Adapter {
  (scanOptions: ScanOptions, adapterOptions?: any): RsbuildConfig;
}
```

#### 创建自定义适配器

创建一个 `my-adapter.js` 文件：

```javascript
module.exports = function myAdapter(scanOptions, adapterOptions = {}) {
  // 根据扫描选项和适配器配置返回 Rsbuild 配置
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
    // 可以基于 adapterOptions 进行条件配置
    ...(adapterOptions.enableSourceMap && {
      output: {
        sourceMap: true,
      },
    }),
  };
};
```

#### 使用自定义适配器

**CLI 使用：**

```bash
# 使用字符串格式
npx se-scan --entry src/index.ts --adapter ./my-adapter.js

# 使用数组格式传入配置
npx se-scan --entry src/index.ts --adapter '["./my-adapter.js", {"enableSourceMap": true}]'
```

**配置文件使用：**

```typescript
// .serc.ts
import { createScanConfig } from '@module-federation/side-effect-scanner';

export default createScanConfig({});
```

#### 内置适配器

项目提供了以下内置适配器：

- `@side-effect/edenx-adapter` - 适用于 EdenX 项目（版本大于 1.63.0）

使用示例：

```bash
npx se-scan --entry src/index.ts --adapter node_modules/@side-effect/edenx-adapter/dist/cjs/index.js
```

### 忽略特定代码段

使用 `ignore` 选项可以忽略特定文件或文件中的特定行。

#### 配置格式

`ignore` 配置支持以下两种格式：

##### 1. 字符串数组（文件路径或 glob 模式）

```typescript
// .serc.ts
import { createScanConfig } from '@module-federation/side-effect-scanner';

export default createScanConfig({
  ignore: [
    'src/utils/vendor/**', // 忽略整个目录
    'src/test/**/*.test.js', // 忽略所有测试文件
    'src/legacy/old-code.js', // 忽略特定文件
  ],
});
```

##### 2. 对象数组（精确控制）

```typescript
// .serc.ts
import { createScanConfig } from '@module-federation/side-effect-scanner';

export default createScanConfig({
  ignore: [
    // 忽略整个文件
    'src/utils/vendor.js',

    // 忽略文件中的特定行
    {
      file: 'src/components/legacy.js',
      lines: [10, 15, 20, 25], // 忽略第10、15、20、25行
    },

    // 使用glob模式忽略文件中的特定行
    {
      pattern: 'src/styles/*.css',
      lines: [1, 2, 3], // 忽略CSS文件的前3行
    },
  ],
});
```

#### 使用示例

##### 示例 1：忽略第三方库

```typescript
// .serc.ts
import { createScanConfig } from '@module-federation/side-effect-scanner';

export default createScanConfig({
  entry: 'src/index.js',
  ignore: ['node_modules/**', 'src/vendor/**', '**/*.min.js'],
});
```

##### 示例 2：忽略测试文件和特定行

```typescript
// .serc.ts
import { createScanConfig } from '@module-federation/side-effect-scanner';

export default createScanConfig({
  entry: 'src/index.js',
  ignore: [
    '**/*.test.js',
    '**/*.spec.ts',
    {
      file: 'src/utils/debug.js',
      lines: [42, 43, 44], // 忽略调试代码
    },
  ],
});
```

##### 示例 3：混合使用

```typescript
// .serc.ts
import { createScanConfig } from '@module-federation/side-effect-scanner';

export default createScanConfig({
  entry: 'src/index.js',
  ignore: [
    'dist/**',
    'build/**',
    'src/legacy/**',
    {
      file: 'src/components/App.js',
      lines: [100, 101, 102], // 忽略特定的初始化代码
    },
    {
      pattern: 'src/styles/*.css',
      lines: [1], // 忽略CSS文件的版权注释
    },
  ],
});
```

#### 注意事项

1. **路径匹配**：路径可以是相对路径或绝对路径，支持 glob 模式（\* 和 \*\*）
2. **行号索引**：行号从 1 开始计数
3. **优先级**：配置中的规则按顺序匹配，第一个匹配的规则生效
4. **与魔法注释共存**：忽略配置可以与魔法注释一起使用，魔法注释优先级更高

#### 调试技巧

要验证忽略配置是否正确生效，可以使用以下命令：

```bash
# 运行扫描并查看详细输出
npx se-scan --config .serc.ts --verbose

# 检查特定文件是否被忽略
npx se-scan --config .serc.ts --check-ignore src/path/to/file.js
```

#### 配置验证

确保你的配置文件格式正确：

```typescript
// 正确的配置格式
import { createScanConfig } from '@module-federation/side-effect-scanner';

export default createScanConfig({
  entry: 'src/index.js',
  ignore: [
    'string/path.js', // ✅ 正确：字符串
    {
      // ✅ 正确：对象
      file: 'path.js',
      lines: [1, 2, 3],
    },
    {
      // ✅ 正确：使用pattern
      pattern: '**/*.test.js',
      lines: [10, 20],
    },
  ],
});
```

### 路径别名

使用 `alias` 选项配置路径别名，确保正确解析模块依赖。

### 扫描深度控制

使用 `maxDepth` 选项控制依赖解析的最大深度，避免过深的依赖解析影响性能。

## 输出格式

### Markdown (默认)

生成 Markdown 格式的报告文件。

### Console

直接在控制台输出扫描结果。

## 常见问题

### 源文件信息不正确？

参考下列配置一一设置以达到最佳的文件定位效果：

- devtool 值 设置为 'source-map'，如果使用的是 Rsbuild，那么设置 `output.sourcemap` 为 `true`
- 设置 `output.devtoolModuleFilenameTemplate` 为 `[resource-path]`
- Rsbuild 项目设置 `tools.lightningcssLoader` 为 `false`
- Rsbuild 项目设置 `output.legalComments` 为 `'none'`

### 使用了 CSS Module ，但是仍然被扫描识别成副作用

CSS Module 会将类名进行哈希处理，导致扫描器无法识别到类名的使用，从而将其识别为副作用。

可以通过设置 CSS Module 类名的格式，来避免扫描器识别到类名的使用。

Scanner 导出了 `CSS_MODULE_LOCAL_IDENT_NAME` 常量，用于配置 CSS Module 类名的格式，你可以在构建配置中将其常量添加到名称前，这样 Scanner 就会识别到这是 CSS Module 类名，从而避免识别为副作用。

举例说明：设置 `output.cssModules.localIdentName` 为 `${CSS_MODULE_LOCAL_IDENT_NAME]-[local]-[hash:base64:6]` 。

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

## 如何修复副作用

参考 [修复指南](./FIX-GUIDE-zh.md) 进行修复。
