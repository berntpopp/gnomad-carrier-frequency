---
phase: 25-monorepo-foundation
verified: 2026-02-24T06:33:48Z
status: passed
score: 5/5 must-haves verified
human_verification:
  - test: Load https://gnomad-carrier-frequency.kidney-genetics.org and complete CFTR wizard
    expected: App loads, CFTR search returns variants, frequency results display, German clinical text generates in Step 4
    why_human: GitHub Pages deployment runs on the main branch only. Current branch has not been merged. Build artifact and workflow are correct but live URL verification requires network access post-merge.
---

# Phase 25: Monorepo Foundation & Core Extraction -- Verification Report

**Phase Goal:** The repository is restructured as a bun workspaces monorepo and the web app builds and deploys identically from the new structure.
**Verified:** 2026-02-24T06:33:48Z
**Status:** PASSED
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | bun install at repo root installs all workspace dependencies without errors | VERIFIED | bun install completed: Checked 1040 installs across 1023 packages (no changes) [14.48s] |
| 2 | bun run build builds packages/core then apps/web in dependency order, producing a dist artifact | VERIFIED | Both packages built: core via tsdown (47 files, 3329ms), web via Vite (929 modules, 14.87s). apps/web/dist/index.html (555 lines) and all JS/CSS assets produced. |
| 3 | @gnomad-cf/core import paths are transparent -- web app builds without unresolved import errors | VERIFIED | 73 import references across web app use @gnomad-cf/core. Strings do not appear in final bundle (resolved via Vite alias to packages/core/src/). Build exits code 0. |
| 4 | packages/core has zero imports from Vue, Pinia, or villus | VERIFIED | Grep across packages/core/src/**/*.ts returns zero matches for vue, pinia, villus. Core package.json lists only zod and lz-string as dependencies. tsc --build packages/core exits 0. Core dist JS files contain no framework strings. |
| 5 | bun run test runs Vitest at monorepo root with per-package project configs and exits without errors | VERIFIED | vitest --passWithNoTests runs core project: 5 test files, 130 tests passed, exit 0. Root vitest.config.ts uses projects array. packages/core/vitest.config.ts defines name: core, environment: node. |

**Score:** 5/5 truths verified
### Required Artifacts

| Artifact | Purpose | Status | Details |
|----------|---------|--------|---------|
| /package.json | Root workspace config | VERIFIED | Defines workspaces: [packages/*, apps/*], bun@1.3.9 packageManager, monorepo scripts |
| /packages/core/package.json | @gnomad-cf/core package with subpath exports | VERIFIED | 9 subpath exports: ., ./calculations, ./client, ./config, ./filters, ./queries, ./templates, ./types, ./utils |
| /packages/core/tsdown.config.ts | tsdown build config with all entry points | VERIFIED | 9 entry points, format: [esm], dts: true, exports: true, platform: neutral |
| /packages/core/src/ | Core module source (8 subpackage directories) | VERIFIED | calculations/, client/, config/, filters/, queries/, templates/, types/, utils/ -- all substantive |
| /packages/core/dist/ | Built ESM artifacts and declaration files | VERIFIED | 47 files including .js, .d.ts, .js.map, .d.ts.map for all subpaths |
| /packages/core/vitest.config.ts | Per-package Vitest config for core | VERIFIED | name: core, environment: node, include: src/**/*.test.ts and tests/**/*.test.ts |
| /packages/core/tests/ | Core unit tests | VERIFIED | 5 test files, 130 tests: carrier-frequency, homozygote-exclusion, prevalence, template-renderer, variant-filters |
| /apps/web/package.json | Web app with @gnomad-cf/core workspace dependency | VERIFIED | @gnomad-cf/core: workspace:* in dependencies; villus/Vue/Pinia remain web-only |
| /apps/web/vite.config.ts | Vite alias resolving @gnomad-cf/core to core source | VERIFIED | Regex alias for @gnomad-cf/core/* to packages/core/src/; @/ alias for apps/web/src/ |
| /apps/web/src/composables/ | Vue composables using @gnomad-cf/core imports | VERIFIED | All composables import from @gnomad-cf/core/* subpaths (73 total import references) |
| /tsconfig.json | Root TypeScript project references | VERIFIED | References packages/core and apps/web |
| /apps/web/tsconfig.json | Web tsconfig referencing core package | VERIFIED | References ../../packages/core |
| /vitest.config.ts | Root Vitest workspace config | VERIFIED | projects: [packages/*/vitest.config.ts, apps/*/vitest.config.ts] |
| /.github/workflows/deploy.yml | Monorepo-aware GitHub Pages deploy workflow | VERIFIED | Separate core/web build steps, artifact path ./apps/web/dist, CNAME in public/ copies to dist |
| /.github/workflows/ci.yml | CI workflow for all branches | VERIFIED | Lint, typecheck, bun run build (builds core then web in order) |
### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| apps/web composables | @gnomad-cf/core/* subpaths | Vite alias at dev; workspace symlink at build | WIRED | 73 import refs; useCarrierFrequency uses filters/calculations/config/types; useGeneVariants uses queries/config; useTextGenerator uses templates |
| apps/web/src/api/client.ts | @gnomad-cf/core/config | Vite alias | WIRED | getApiEndpoint, getGnomadVersion from core; villus stays in web only |
| packages/core build | packages/core/dist/ | bun run --filter @gnomad-cf/core build in root script | WIRED | Runs first in root build script before web build; 47 files produced |
| apps/web build | packages/core via workspace | bun workspaces symlink in node_modules/@gnomad-cf/core/ | WIRED | Core symlinked to workspace package; Vite also resolves alias to source for dev HMR |
| GitHub Actions deploy | apps/web/dist artifact | actions/upload-pages-artifact@v4 path: ./apps/web/dist | WIRED | Correct path confirmed; CNAME present in apps/web/public/ and copies to dist |

### Requirements Coverage

| Requirement | Status | Notes |
|-------------|--------|-------|
| MONO-01: Repository as bun workspaces monorepo | SATISFIED | packages/core, apps/web, root package.json with workspaces |
| MONO-02: Root package.json with workspace config and shared dev dependencies | SATISFIED | tsdown, typescript, vitest in root devDependencies |
| MONO-03: @gnomad-cf/core with typed barrel export | SATISFIED | src/index.ts re-exports all submodules; 9 subpath exports in package.json |
| MONO-04: Core uses tsdown for build with declaration files | SATISFIED | tsdown.config.ts produces ESM only (not dual ESM/CJS -- intentional deviation per CONTEXT.md: ESM only output is sufficient since Bun natively handles ESM) |
| MONO-05: TypeScript project references across workspace | SATISFIED | Root tsconfig.json references packages/core and apps/web |
| MONO-06: Pure fetch()-based gnomAD client in core | SATISFIED | packages/core/src/client/index.ts uses standard fetch() API, no villus import |
| MONO-07: All shared types moved to core | SATISFIED | 14 type files in packages/core/src/types/ covering all domain types |
| MONO-08: All config files moved to core with typed loaders | SATISFIED | gnomad.json, settings.json, templates in packages/core/src/config/ |
| MONO-09: All pure utility functions moved to core | SATISFIED | variant-filters, calculations, template-renderer, formatters all in core src |
| MONO-10: Web app imports from @gnomad-cf/core | SATISFIED | 73 import references; zero relative ../ imports crossing package boundary |
| MONO-11: Web composables remain in apps/web/src/composables/ | SATISFIED | 20 composable files as Vue-specific wrappers around core functions |
| MONO-12: GitHub Actions deploy.yml updated for monorepo | SATISFIED | Separate core/web build steps; corrected artifact path to ./apps/web/dist |
| MONO-13: Web app deploys to same GitHub Pages URL | SATISFIED (structural) | CNAME present in dist, base: /, deploy workflow correct; live URL needs human verify post-merge |
| TEST-01: Vitest configured at monorepo root with per-package project configs | SATISFIED | Root and per-package vitest configs; 130 tests pass |
### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| packages/core/src/templates/template-renderer.ts | 4, 7 | Word placeholder in JSDoc | Info | Legitimate documentation describing the template {{variable}} syntax. Not a code stub. Zero functional impact. |

No blockers or warnings found.

### Human Verification Required

#### 1. Live GitHub Pages App Loads and Wizard Completes

**Test:** Navigate to https://gnomad-carrier-frequency.kidney-genetics.org, search for CFTR, complete all 4 wizard steps.
**Expected:** App loads without console errors, gnomAD API returns variant data, carrier frequency is computed and displayed, Step 4 generates German clinical text.
**Why human:** GitHub Pages deployment runs on the main branch only. The current branch (v1.5/core-extraction-cli) has not been merged and deployed. A screenshot of the completed wizard was taken locally during development (saved as phase25-verification.png in repo root) showing CFTR results with frequency 1:17 (1.41%) -- confirming the app functions correctly with the monorepo structure. Live URL verification requires a human with network access after the branch is merged to main.

### Gaps Summary

No gaps. All 5 must-haves are verified against the actual codebase.

**Must-have 1 (bun install):** 1040 installs resolved, no errors. Workspace symlink for @gnomad-cf/core present in node_modules.

**Must-have 2 (bun run build end-to-end):** Root build script runs core first (tsdown, 47 files, ESM + DTS), then web (Vite, 929 modules, dist/index.html produced). Correct dependency order enforced by the && operator in the build script.

**Must-have 3 (web app import transparency):** Vite alias resolves @gnomad-cf/core/* to packages/core/src/ at dev/build time. Zero unresolved imports in build output. @gnomad-cf/core strings absent from final bundle (all resolved and bundled). Local screenshot (phase25-verification.png) confirms wizard functions end-to-end including CFTR frequency calculation and Step 4 clinical text generation.

**Must-have 4 (core is Vue/Pinia/villus-free):** Grep across all .ts files in packages/core/src/ returns zero matches for vue, pinia, villus. Core package.json has only zod and lz-string as runtime dependencies. tsc --build packages/core exits 0 cleanly. Core dist JS files contain no framework strings.

**Must-have 5 (bun run test passes):** Vitest workspace with per-package project configs; 130 tests across 5 files all pass in core project; --passWithNoTests correctly handles the fact that apps/web has no unit tests yet.

**Intentional deviation from requirement text:** MONO-04 specifies dual ESM/CJS but the implementation delivers ESM-only output. This was a documented decision in the phase context (25-CONTEXT.md line 32: ESM only output). The CLI (Phase 27) runs in Bun which natively supports ESM, so CJS output is unnecessary. The decision was made during phase research and supersedes the original requirement wording.

---

_Verified: 2026-02-24T06:33:48Z_
_Verifier: Claude (gsd-verifier)_