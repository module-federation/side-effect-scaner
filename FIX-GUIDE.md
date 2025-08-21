# Fix Guide

Different file types require different fix approaches based on the scan results.

## Source Files

Different approaches based on error types:

- **Global Variables**: Prioritize converting to const/let variables. If not possible, prefix with `_` to prevent variable redefinition conflicts, and add comments for explanation. It's best to avoid global variables entirely.
- **Event Listeners**: Convert anonymous listeners to named function exports, and add comments to remind users to remove event listeners at appropriate places.
- **CSS Side Effects**:
  1. **File Naming**: Rename all CSS files with global side effects to standard CSS Module format: `{name}.module.css` (or `.module.less`, `.module.scss`)
  2. **Global Tag Handling**:
     Determine if the tag needs to take effect globally:
     - Not needed (recommended): **Create new class names** (e.g., `.pageWrapper`, `.bodyReset`), **migrate the original tag selector styles to the new class names**
     - Needed: Create dedicated global style files to clearly separate global styles from component styles, making code structure clearer for future maintenance and optimization
  3. **Usage**:
     - In the application entry file (e.g., `App.tsx` or `main.tsx`)
     - **Import CSS Module**: `import globalStyles from './styles/global.module.css'`
     - **Explicitly apply class names**: `<div className={globalStyles.bodyReset}>...</div>`

## Third-party Packages (node_modules)

For side effects in third-party packages, fixes depend on the package source.

If the current project is in a Monorepo and this third-party package is a local project dependency within the Monorepo, then fix the source files according to the [Source Files](#source-files) approach.

If not, you need to determine whether the current project uses Module Federation:

- **Uses Module Federation**: Set side-effect packages as shared dependencies to ensure only one instance exists, reducing side effect conflicts
- **No Module Federation but uses Garfish** (micro-frontend solution): Set this third-party package as an [External](https://rspack.rs/config/externals) dependency to ensure only one instance exists, reducing side effect conflicts
- **Neither**: Handle based on the following third-party package types:
  - **Component Libraries**: antd, @arco-design/web-react - For CSS side effects, set prefixCls prefix for the current project to avoid global style conflicts
  - **Polyfills**: core-js, @babel/polyfill, regenerator-runtime, etc. - No handling needed
  - **Others**: Cannot be fixed, clarify side effects, try to avoid multiple instances, reduce multiple side effect conflicts

## Unknown Files

First determine the file source, then apply fixes according to source files or third-party package fix guides.

**How to Determine File Source**

1. Based on code snippets in the report, search source files
2. If the snippet is not found in source files, search project dependencies (node_modules) for this code snippet
3. If still not found, set [optimization.moduleIds](https://rspack.rs/config/optimization#optimizationmoduleids) and [optimization.chunkIds](https://rspack.rs/config/optimization#optimizationchunkids) to `named` in the build configuration, then rebuild the project. The corresponding module ID will display the specific file path, allowing you to determine the file source
