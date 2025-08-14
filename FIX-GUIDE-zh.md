# 修复指南

根据扫描出的文件类型，有不同的修复方式。

## 源文件

根据错误类型有不同的方式：

- 全局变量：优先改为 const/let 变量，改不了就改为 \_ 开头，防止变量重复定义覆盖，并增加注释说明，最好不要有全局变量
- 事件监听：把匿名的 listener 改为具名函数导出，并增加注释让用户在合适的地方删除事件监听。
- CSS 副作用：
  1. **文件命名**：将所有含全局副作用的 CSS 文件重命名为标准 CSS Module 格式：`{name}.module.css`（或 `.module.less`、`.module.scss`）
  2. **全局标签处理**：
     判定该标签是否需要全局生效：
     - 不需要（推荐）：改为**创建新的类名**（如 `.pageWrapper`、`.bodyReset`），将原标签选择器的样式**迁移到新建的类名下**
     - 需要：通过创建专门的全局样式文件，明确区分全局样式和组件样式，使代码结构更清晰，方便后续维护和优化
  3. **使用方式**：
     - 在应用的入口文件（如 `App.tsx` 或 `main.tsx`）中
     - **导入 CSS Module**：`import globalStyles from './styles/global.module.css'`
     - **显式应用类名**：`<div className={globalStyles.bodyReset}>...</div>`

## 第三方包（node_modules）

对于第三方包的副作用，需要根据第三方包来源进行修复。

如果当前项目处于 Monorepo 中，并且此第三方包是 Monorepo 中的本地项目依赖，那么按照[源文件](#源文件)的方式对源文件进行修复。

如果不是，那么需要判断当前项目是否使用了模块联邦：

- 使用了模块联邦：将有副作用的第三方包设置为共享依赖，使其只有一个实例，减少副作用覆盖的情况
- 没有使用模块联邦，但使用了 Garfish（微前端解决方案），那么将此第三方包设置为外部依赖[External](https://rspack.rs/config/externals)，使其只有一个实例，减少副作用覆盖的情况
- 如果都不是，那么根据下列第三方包类型有不同的处理：
  - 组件库：antd, @arco-design/web-react，对于 CSS 副作用，为当前项目设置 prefixCls 前缀，避免全局样式冲突
  - Polyfill：core-js, @babel/polyfill, regenerator-runtime 等，不需要处理
  - 其他：无法修复，明确副作用，尽量避免多实例，减少多个副作用覆盖的问题

## 未知文件

需要先确定文件的来源，然后根据来源从源文件和第三包的修复指南进行修复。

**如何确定文件来源**

1. 根据报告中的代码片段，查询源文件
2. 如果源文件中没有此片段，在项目的依赖（node_modules）中查找是否有此代码片段
3. 如果仍然找不到，那么在构建配置中设置 [optimization.moduleIds](https://rspack.rs/config/optimization#optimizationmoduleids) 和 [optimization.chunkIds](https://rspack.rs/config/optimization#optimizationchunkids) 为 `named`，然后重新构建项目，此时对应的模块 id 会显示具体的文件路径，根据路径可以确定文件的来源
