# Fix Guide

- For side effects in source files, immediate fixes are required.
- Fix methods: Different approaches based on error type:
  - Global variables: Prefer changing to const/let variables. If not possible, prefix with \_ to prevent duplicate definition conflicts, and add comments explaining. Avoid global variables whenever possible.
  - Event listeners: Change anonymous listeners to named functions and export them, adding comments for users to remove event listeners at appropriate places.
  - CSS side effects: Change to CSS Module approach to avoid global style conflicts, using standard {name}.module.css|less|scss filenames.
- For third-party package side effects, determine whether fixes are needed based on specific circumstances. If the third-party package is required and cannot be fixed, set this dependency as [shared dependency](https://module-federation.io/configure/shared.html) or [External](https://rspack.rs/config/externals) to ensure only one instance exists, reducing side effect conflicts.
  - Third-party packages that don't need handling: core-js
- For unknown files, first determine the file's source, then follow the source file and third-party package fix guidelines accordingly.

**How to determine file source**

1. Search source files based on code snippets in the report
2. If the snippet is not found in source files, check if it exists in project dependencies (node_modules)
3. If still not found, set [optimization.moduleIds](https://rspack.rs/config/optimization#optimizationmoduleids) and [optimization.chunkIds](https://rspack.rs/config/optimization#optimizationchunkids) to `named` in build configuration, then rebuild the project. The corresponding module IDs will display specific file paths, allowing you to determine the file's source based on the path.
