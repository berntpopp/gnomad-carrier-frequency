---
phase: 25
plan: 03
subsystem: core-extraction
tags: [monorepo, core, filters, calculations, templates, utils, tsdown, typescript]

dependency-graph:
  requires: ["25-02"]
  provides: ["packages/core/src/filters/", "packages/core/src/calculations/", "packages/core/src/templates/", "packages/core/src/utils/"]
  affects: ["25-04", "26-01", "27-01"]

tech-stack:
  added: []
  patterns: ["barrel-exports", "esm-relative-imports", "tsdown-subpath-entries"]

key-files:
  created:
    - packages/core/src/filters/variant-filters.ts
    - packages/core/src/filters/variant-display.ts
    - packages/core/src/filters/index.ts
    - packages/core/src/calculations/frequency-calc.ts
    - packages/core/src/calculations/formatters.ts
    - packages/core/src/calculations/index.ts
    - packages/core/src/templates/template-renderer.ts
    - packages/core/src/templates/template-parser.ts
    - packages/core/src/templates/index.ts
    - packages/core/src/utils/exclusion-url.ts
    - packages/core/src/utils/index.ts
  modified:
    - packages/core/src/index.ts
    - packages/core/tsdown.config.ts

decisions:
  - "variant-display.ts placed in filters/ module (co-located with variant-filters.ts it depends on)"
  - "formatters.ts placed in calculations/ module (frequency display utilities)"
  - "exclusion-url.ts placed in utils/ module as a dedicated utils subpath (lz-string dep already in core)"
  - "export-utils.ts left in apps/web (uses import.meta.env.VITE_APP_VERSION — Vite-specific)"
  - "tsdown entry count expanded from 4 to 8 (added filters, calculations, templates, utils)"

metrics:
  duration: "~6 minutes"
  completed: "2026-02-24"
---

# Phase 25 Plan 03: Filters, Calculations, and Templates Extraction Summary

**One-liner:** Extracted variant-filters, frequency-calc, template-renderer/parser, formatters, variant-display, and exclusion-url to core — all business logic now lives in packages/core with zero vue/pinia/villus imports.

## What Was Done

Moved all pure business logic modules from `apps/web/src/utils/` to `packages/core/src/`, rewriting `@/` alias imports to relative ESM paths with `.js` extensions throughout. The core package now contains the complete domain logic needed by both the web app and the upcoming CLI.

### Modules Extracted

| Module | Core Path | Files |
|--------|-----------|-------|
| Filters | `src/filters/` | variant-filters.ts, variant-display.ts |
| Calculations | `src/calculations/` | frequency-calc.ts, formatters.ts |
| Templates | `src/templates/` | template-renderer.ts, template-parser.ts |
| Utils | `src/utils/` | exclusion-url.ts |

### File Left in Web App

- `apps/web/src/utils/export-utils.ts` — uses `import.meta.env.VITE_APP_VERSION` (Vite-specific runtime); belongs in web layer

### Verification Results

- `tsc --noEmit` — passes clean after both tasks
- `bun run build` (core only) — 8 subpath bundles: index, types, config, queries, filters, calculations, templates, utils
- `bun run build` (root monorepo) — core + web both build successfully
- `grep -rn "from '@/"` in core/src — zero matches
- `grep -rn "from 'vue'"` in core/src — zero matches
- `grep -rn "from 'villus'"` in core/src — zero matches

## Tasks

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Extract filters module | 21eb3d1 | variant-filters.ts, filters/index.ts, src/index.ts |
| 2 | Extract calculations, templates, utils | 0e175d8 | +11 files, tsdown.config.ts |

## Decisions Made

1. **variant-display.ts in filters/** — It imports directly from `./variant-filters` so co-locating in the filters module keeps the dependency graph clean.

2. **formatters.ts in calculations/** — Frequency formatting utilities logically belong with frequency calculations.

3. **exclusion-url.ts in utils/** — A dedicated `utils` subpath keeps URL compression logic separate from domain modules. lz-string was already declared as a core dependency.

4. **export-utils.ts stays in web** — `buildExportMetadata` calls `import.meta.env.VITE_APP_VERSION`, a Vite-specific runtime value. Moving it to a neutral core package would break at build time or require injecting the version differently. Deferred to when the web app composables are reviewed.

5. **tsdown expanded to 8 entry points** — Each logical subpath gets its own bundle: index, types, config, queries, filters, calculations, templates, utils. The CLI can import specific subpaths without pulling in the full bundle.

## Deviations from Plan

### Extra Files Extracted (Rule 2 - Missing Critical)

**variant-display.ts** — Plan mentioned checking this file and moving if pure. It is pure (no Vue/Pinia/villus imports), so it was extracted and placed in `filters/` alongside its dependency `variant-filters.ts`. Added to `filters/index.ts` barrel.

**formatters.ts** — Plan mentioned checking this file. It is pure (only uses config), so it was extracted and placed in `calculations/` as a natural companion to frequency-calc.ts.

**exclusion-url.ts** — Plan mentioned checking this file. It is pure (uses lz-string, already in core deps), so it was extracted to a new `utils/` module with its own tsdown entry point.

**tsdown entry count = 8 (not 7)** — Plan specified 7 entries. The additional `utils` entry was added for the exclusion-url module, resulting in 8 subpath bundles.

None of these required user input (all Rule 2 — missing critical extractions implied by the plan's own "check and move if pure" instructions).

## Next Phase Readiness

**Phase 25 Plan 04** can proceed. The core package now exports all pure business logic. The next plan (25-04) will wire the web app to consume from `@gnomad-cf/core` instead of its local `@/utils/` copies.

**State of core after 25-03:**
- `packages/core/src/types/` — 14 type files
- `packages/core/src/config/` — 8 files + help/ + templates/ subdirs
- `packages/core/src/queries/` — 5 query files
- `packages/core/src/filters/` — variant-filters.ts, variant-display.ts
- `packages/core/src/calculations/` — frequency-calc.ts, formatters.ts
- `packages/core/src/templates/` — template-renderer.ts, template-parser.ts
- `packages/core/src/utils/` — exclusion-url.ts
- `packages/core/tsdown.config.ts` — 8 entry points
- Web app still uses @/ imports from apps/web/src/ (rewiring is Plan 25-04)
