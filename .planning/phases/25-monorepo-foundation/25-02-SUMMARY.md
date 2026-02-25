---
phase: 25-monorepo-foundation
plan: 02
status: complete
subsystem: core-package
tags: [typescript, monorepo, extraction, types, config, queries, tsdown]
requires: ["25-01"]
provides: ["packages/core types, config, and queries modules"]
affects: ["25-03", "25-04", "25-05", "26-01"]
tech-stack:
  added: []
  patterns: ["module extraction with relative ESM imports", "tsdown multi-entry build"]
key-files:
  created:
    - packages/core/src/types/ (14 files)
    - packages/core/src/config/ (8 files + 2 subdirs)
    - packages/core/src/queries/ (5 files)
  modified:
    - packages/core/src/index.ts
    - packages/core/tsdown.config.ts
    - packages/core/tsconfig.json
    - packages/core/package.json (exports auto-updated by tsdown)
decisions:
  - "@/ imports in types/export.ts, types/frequency.ts, types/history.ts rewritten to ../config/types.js"
  - "types/wizard.ts @/api/queries/types rewritten to ../queries/types.js"
  - "config/exclusion-reasons.ts @/types rewritten to ../types/exclusion.js"
  - "tsconfig.json include extended to src/**/*.json for resolveJsonModule to work with composite project"
metrics:
  duration: ~5 minutes
  completed: "2026-02-24"
---

# Plan 25-02 Summary: Extract types, config, and queries to core

## What Was Built

Extracted the three foundation modules — types, config, and queries — from `apps/web/src/` into `packages/core/src/`. All `@/` path alias imports were rewritten to explicit relative ESM paths (with `.js` extension) so the core package is fully self-contained with no dependency on the web app's Vite alias configuration. The core package now compiles with `tsc --noEmit` and builds four subpath bundles (index, types, config, queries) via tsdown.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Extract types module to core | 357f5a2 | packages/core/src/types/ (14 files), packages/core/src/index.ts |
| 2 | Extract config module to core | 1e82c55 | packages/core/src/config/ (8 files + help/ + templates/ subdirs) |
| 3 | Extract queries module to core, build verified | 5037ed7 | packages/core/src/queries/ (5 files), tsdown.config.ts, tsconfig.json, package.json |

## Deviations

### Auto-fixed Issues

**1. [Rule 1 - Bug] @/ imports in types directory (undocumented in plan)**

- **Found during:** Task 1
- **Issue:** Plan stated "No `@/` import rewiring should be needed in the types directory itself" — but 4 type files had `@/` imports: `export.ts`, `frequency.ts`, `history.ts` (all importing `GnomadVersion` from `@/config`), and `wizard.ts` (importing `GeneSearchResult` from `@/api/queries/types`)
- **Fix:** Rewrote to relative paths: `../config/types.js` and `../queries/types.js`
- **Files modified:** packages/core/src/types/export.ts, frequency.ts, history.ts, wizard.ts
- **Commit:** 357f5a2

**2. [Rule 3 - Blocking] tsconfig.json did not include JSON files**

- **Found during:** Task 3 (tsc --noEmit after all modules extracted)
- **Issue:** `packages/core/tsconfig.json` had `"include": ["src/**/*.ts"]` — excluded JSON files. Since `config/index.ts` imports `gnomad.json` and `settings.json`, the composite project mode (`"composite": true`) requires JSON files to be listed in the project.
- **Fix:** Extended include to `["src/**/*.ts", "src/**/*.json"]`
- **Files modified:** packages/core/tsconfig.json
- **Commit:** 5037ed7

## Verification

- `cd packages/core && npx tsc --noEmit` — zero errors
- `cd packages/core && bun run build` — dist/ contains index.js, types.js, config.js, queries.js with matching .d.ts files
- `bun run build` (root) — both @gnomad-cf/core and gnomad-cf-web build successfully
- `grep -r "from 'vue'" packages/core/src/` — no matches
- `grep -r "from 'villus'" packages/core/src/` — no matches
- `grep -r "from 'pinia'" packages/core/src/` — no matches
- `grep -r "@/" packages/core/src/` — no matches
- packages/core/package.json exports field auto-updated by tsdown with all 4 subpath exports
