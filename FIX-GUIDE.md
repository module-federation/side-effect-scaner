# Fix Guide

## File Types

The report identifies three types of files:

1. **Source Files**: Source code files within the project
2. **Third-party Packages (node_modules)**: Third-party libraries that the project depends on
3. **Unknown Files**: Files whose origin cannot be determined during the scanning process

For side effects in source files, immediate fixes are required.

For side effects in third-party packages, fixes should be determined based on specific circumstances. If the third-party package is essential and cannot be fixed, you can configure this dependency as a [shared dependency](https://module-federation.io/configure/shared.html) or [External](https://rspack.rs/config/externals) to ensure only one instance exists, reducing side effect conflicts.

For unknown files, you need to first determine the file's origin, then apply the fix guide for either source files or third-party packages accordingly.

**How to Determine File Origin**

1. Search for the code snippet in source files according to the report
2. If the snippet is not found in source files, search within project dependencies (node_modules) to see if this code snippet exists
3. If still not found, set [optimization.moduleIds](https://rspack.rs/config/optimization#optimizationmoduleids) and [optimization.chunkIds](https://rspack.rs/config/optimization#optimizationchunkids) to `named` in the build configuration, then rebuild the project. The corresponding module IDs will display specific file paths, allowing you to determine the file's origin based on the path.
