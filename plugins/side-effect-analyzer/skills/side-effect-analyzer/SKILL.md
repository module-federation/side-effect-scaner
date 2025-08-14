---
name: side-effect-analyzer
description: "Run and interpret @module-federation/side-effect-scanner (se-scan) results to detect frontend side effects: CSS leaks/conflicts, global variable pollution, global event listener leaks, and risky DOM mutations. Use when you need a Markdown/JSON report, want to review a PR/build artifact for side effects, need help choosing scan mode (entry vs dist), configuring .serc.ts/alias/max-depth/ignore/adapter, or turning findings into actionable fixes."
---

# Side Effect Analyzer

## What to do

Use this skill to run `se-scan` and turn scan output into an actionable audit report + fix plan.

Focus areas:
- CSS side effects (global selectors, conflicts, risky rules)
- Global variable pollution (accidental globals, window/prototype overrides)
- Global event listeners (missing cleanup, duplicate listeners, anonymous handlers)
- Dynamic DOM mutations (append/remove/insert/innerHTML, when enabled)

## Workflow

### 1) Pick scan mode
- **Built artifacts (recommended):** when you have `dist/` or want production-truth.
  - `npx se-scan --dir dist`
- **Source entry:** when you want to analyze from an entry and dependencies.
  - `npx se-scan --entry src/index.ts`

If the project needs TS/JSX compilation, keep `--compile` (default). If you scan `--dir`, compile is off automatically.

### 2) Apply project config (optional)
Use `.serc.ts` (repo root has examples) when you need:
- `alias` for path mapping
- `maxDepth` to cap dependency traversal
- `ignore` to exclude files/lines
- `adapter` when compile mode fails for a custom build tool

### 3) Run scan and produce report
Common commands:
```bash
# Markdown report
npx se-scan --dir dist --format md --output side-effect-report.md

# JSON for further processing
npx se-scan --entry src/index.ts --format json --output side-effect-report.json
```

### 4) Interpret findings (how to respond)
For each finding:
- Quote the exact file + location when available
- Explain impact scope (global vs module-local)
- Assign severity (Critical/High/Medium/Low)
- Provide a concrete fix (code/config) + verification step

### 5) Verification checklist
- Re-run `se-scan` after fixes and ensure counts drop
- If location mapping is wrong, enable sourcemap and follow repo README “Common Issues” guidance
- For CSS Modules false positives, consider `CSS_MODULE_LOCAL_IDENT_NAME` guidance

## Repo pointers
- CLI options and config: see repo root `README.md`
- Fix strategies: `FIX-GUIDE.md` / `FIX-GUIDE-zh.md`

## Notes
Keep output concise: summary table + prioritized list + patch suggestions.

trees for complex workflows
- Concrete examples with realistic user requests
- References to scripts/templates/references as needed]

## Resources

This skill includes example resource directories that demonstrate how to organize different types of bundled resources:

### scripts/
Executable code (Python/Bash/etc.) that can be run directly to perform specific operations.

**Examples from other skills:**
- PDF skill: `fill_fillable_fields.py`, `extract_form_field_info.py` - utilities for PDF manipulation
- DOCX skill: `document.py`, `utilities.py` - Python modules for document processing

**Appropriate for:** Python scripts, shell scripts, or any executable code that performs automation, data processing, or specific operations.

**Note:** Scripts may be executed without loading into context, but can still be read by Claude for patching or environment adjustments.

### references/
Documentation and reference material intended to be loaded into context to inform Claude's process and thinking.

**Examples from other skills:**
- Product management: `communication.md`, `context_building.md` - detailed workflow guides
- BigQuery: API reference documentation and query examples
- Finance: Schema documentation, company policies

**Appropriate for:** In-depth documentation, API references, database schemas, comprehensive guides, or any detailed information that Claude should reference while working.

### assets/
Files not intended to be loaded into context, but rather used within the output Claude produces.

**Examples from other skills:**
- Brand styling: PowerPoint template files (.pptx), logo files
- Frontend builder: HTML/React boilerplate project directories
- Typography: Font files (.ttf, .woff2)

**Appropriate for:** Templates, boilerplate code, document templates, images, icons, fonts, or any files meant to be copied or used in the final output.

---

**Any unneeded directories can be deleted.** Not every skill requires all three types of resources.
