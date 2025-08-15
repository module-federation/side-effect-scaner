# 修复指南

## 文件类型

报告总共有三种文件类型：

1. 源文件：项目中的源代码文件
2. 第三方包（node_modules）：项目中依赖的第三方库
3. 未知文件：扫描过程中无法确定来源的文件

对于源文件的副作用，需要立刻修复。

对于第三方包的副作用，需要根据具体情况判断是否需要修复。如果该第三方包是必须使用且无法修复的，那么可以将此依赖设置为 [共享依赖](https://module-federation.io/configure/shared.html) 或者 [External](https://rspack.rs/config/externals)，使其只有一个实例，减少副作用覆盖的情况。

对于未知文件，需要先确定文件的来源，然后根据来源从源文件和第三包的修复指南进行修复。

**如何确定文件来源**

1. 根据报告中的代码片段，查询源文件
2. 如果源文件中没有此片段，在项目的依赖（node_modules）中查找是否有此代码片段
3. 如果仍然找不到，那么在构建配置中设置 [optimization.moduleIds](https://rspack.rs/config/optimization#optimizationmoduleids) 和 [optimization.chunkIds](https://rspack.rs/config/optimization#optimizationchunkids) 为 `named`，然后重新构建项目，此时对应的模块 id 会显示具体的文件路径，根据路径可以确定文件的来源
