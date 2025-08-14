# Side Effect Scanner

前端工程副作用扫描工具，用于检测 CSS、全局变量和全局事件监听器的副作用。

## 快速开始

### 安装

```bash
npm install @module-federation/side-effect-scanner
```

### 使用示例

#### 扫描已构建的产物 （推荐）

对于复杂项目，建议直接扫描构建后的产物，以获取最精准的结果

```bash
npx se-scan --dir dist
```

#### 扫描入口文件及其依赖

指定入口源文件，会自动编译其依赖，并识别副作用

```bash
npx se-scan --entry src/index.ts
```

#### 使用复杂配置

```bash
npx se-scan --entry src/index.ts --alias '{"@": "./src"}' --max-depth 5
```

#### 使用配置文件

```bash
npx se-scan --config .serc.ts
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

你可以创建一个 `.serc.ts` 配置文件来自定义扫描选项。

配置选项类型如下：

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

## 输出产物

扫描成功后，会生成一个 `side-effect-report.md` 文件，文件中包含了扫描结果。其格式如下：

## 高级用法

### Compile 模式

当使用 `--compile` 选项（默认启用）时，工具会使用 Rsbuild 编译入口文件及其依赖，然后对编译后的代码进行扫描。这确保了即使使用了 TypeScript、JSX 或其他需要编译的语法，也能正确扫描副作用。

如果禁用 `--compile` 选项，工具将直接扫描源文件，这可能无法正确处理需要编译的语法。

> 注意：如果使用了 `--dir` 选项，`--compile` 选项将自动禁用。

### 自定义适配器

当使用 `--compile` 模式，但碰到构建报错的时候，可以通过 `adapter` 选项指定自定义适配器来处理特定构建工具的配置。适配器是一个函数，接收扫描选项和可选的适配器配置参数，返回 Rsbuild 配置对象。

```ts
import { createScanConfig } from '@module-federation/side-effect-scanner';

export default createScanConfig({
  entry: 'src/index.ts',
  adapter: './my-adapter.js',
});
```

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
npx se-scan --entry src/index.ts --adapter ./my-adapter.js
```

**配置文件使用：**

```typescript
// .serc.ts
import { createScanConfig } from '@module-federation/side-effect-scanner';

export default createScanConfig({
  entry: 'src/index.ts',
  adapter: './my-adapter.js',
});
```

#### 内置适配器

项目提供了以下内置适配器：

- `@module-federation/side-effect-modernjs-adapter` - 适用于 Modern.js 项目（版本大于 2.63.0）

使用示例：

```bash
npx se-scan --entry src/index.ts --adapter <require.resolve('@module-federation/side-effect-modernjs-adapter')>
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
    '**/@modern-js/runtime/**', // 忽略 @modern-js/runtime 依赖
    '**/react*/**', // 忽略所有 react 开头的依赖
    '**/lib-router*.js', // 忽略所有 lib-router 开头的 JS 文件
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

### 路径别名

当对源码文件扫描时，可以设置 `alias` 选项配置路径别名，确保正确解析模块依赖。

### 扫描深度控制

使用 `maxDepth` 选项控制依赖解析的最大深度，避免过深的依赖解析影响性能。

```markdown
# 📊 前端工程副作用扫描报告

## 📋 报告概览

| 类型         | details            |
| ------------ | ------------------ |
| **扫描入口** | `dist`             |
| **文件数量** | 9 文件数量         |
| **扫描时间** | 2025/8/26 11:04:39 |

## 📈 问题统计

| 类型                 | 数量  | 状态 |
| -------------------- | ----- | ---- |
| **CSS副作用**        | 7 7   | ❌   |
| **全局变量副作用**   | 10 10 | ❌   |
| **事件监听器副作用** | 2 2   | ⚠️   |
| **动态元素副作用**   | 0 0   | ✅   |
| **总计**             | 19 19 | ❌   |

---

## 📝 源文件 (3)

### src/routes/index.css (3)

#### 🎨 CSS副作用 (3)

## ❓ 未知文件 (3)

### dist/static/js/lib-router.5404ac00.js (1)

#### 🌍 全局变量副作用 (1)

## 📦 第三方包 (node_modules) (4)

### modernjs-test

- 🟡 全局变量声明 (1)

[View Details](./node_modules/.se/modernjs-test.md)

## 💡 如何修复

参考文档：https://lf3-static.bytednsdoc.com/obj/eden-cn/shloeh7nuhonuhog/FIX-GUIDE-zh.md

---

_生成时间：2025/8/26 11:04:39_
_前端工程副作用扫描工具 v0.0.8_
```

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
