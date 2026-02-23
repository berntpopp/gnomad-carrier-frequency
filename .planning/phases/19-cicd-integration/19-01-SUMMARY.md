---
phase: 19-cicd-integration
plan: 01
subsystem: infra
tags: [vitepress, github-pages, github-actions, bun, lighthouse, playwright]

# Dependency graph
requires:
  - phase: 18-documentation-content
    provides: VitePress docs site fully built and verified, ready for deployment pipeline
  - phase: 17-screenshot-automation
    provides: screenshot generation script with BASE_URL dependency
  - phase: 16-vitepress-setup
    provides: VitePress config with base path, docs structure
provides:
  - VitePress config corrected for custom domain (base '/docs/', absolute app URLs)
  - Unified GitHub Pages deploy workflow building app + docs into single artifact
  - packageManager field in package.json for bun version pinning
  - ENV-configurable BASE_URL in screenshot script for CI compatibility
  - Lighthouse configs updated to correct local dev URLs
affects:
  - 19-02 and later CI/CD plans (workflow is baseline for subsequent phases)
  - 20-readme-streamlining (custom domain URLs now canonical)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Merged artifact pattern: app at GitHub Pages root, docs at /docs/ via single cp -r merge step
    - Bun version pinning via packageManager field (oven-sh/setup-bun@v2 reads automatically)
    - Absolute URLs for cross-context navigation in VitePress (prevents base-relative resolution to docs index)

key-files:
  created: []
  modified:
    - docs/.vitepress/config.ts
    - docs/index.md
    - lighthouserc.json
    - lighthouserc.local.json
    - package.json
    - scripts/generate-screenshots.ts
    - .github/workflows/deploy.yml

key-decisions:
  - "Open Calculator nav link uses absolute URL https://gnomad-carrier-frequency.kidney-genetics.org/ (not relative /) because VitePress resolves relative links against base '/docs/', which would navigate to docs index"
  - "Landing page hero action link uses absolute URL for same VitePress base path resolution reason"
  - "packageManager: bun@1.3.9 in package.json is single source of truth — oven-sh/setup-bun@v2 reads it automatically, no bun-version input needed"
  - "Deploy workflow is self-contained: runs lint + typecheck + both builds internally, does not trust prior CI checks"
  - "Merged artifact uses cp -r docs/.vitepress/dist dist/docs (after app build creates dist/) so app is at root and docs at /docs/"

patterns-established:
  - "Absolute URLs for app links from VitePress docs: always use https://gnomad-carrier-frequency.kidney-genetics.org/ not relative /"
  - "ENV-configurable tool URLs: process.env.BASE_URL || default for CI-friendly scripts"

# Metrics
duration: 2min
completed: 2026-02-23
---

# Phase 19 Plan 01: CI/CD Base Path Fixes and Unified Deploy Workflow Summary

**Custom domain base path fixes across 6 files and unified GitHub Pages deploy workflow building app + VitePress docs into single merged artifact via bun**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-02-23T14:17:16Z
- **Completed:** 2026-02-23T14:19:30Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Eliminated all stale `/gnomad-carrier-frequency/` path references from config files — VitePress base is now `/docs/`, favicon is `/favicon.svg`, app nav links use absolute URLs
- Rewrote deploy.yml from npm/node single-build to bun-based dual-build with docs merge step: `cp -r docs/.vitepress/dist dist/docs` produces single artifact with app at root and docs at `/docs/`
- Added `packageManager: "bun@1.3.9"` to package.json — single source of truth for bun pinning read by `oven-sh/setup-bun@v2`

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix all base path references for custom domain** - `78ec560` (feat)
2. **Task 2: Rewrite deploy workflow with docs build and merge** - `e0c5880` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `docs/.vitepress/config.ts` - base changed to `/docs/`, favicon to `/favicon.svg`, Open Calculator nav link changed to absolute URL `https://gnomad-carrier-frequency.kidney-genetics.org/`
- `docs/index.md` - hero action link changed to absolute URL `https://gnomad-carrier-frequency.kidney-genetics.org/`
- `lighthouserc.json` - URL updated from `/gnomad-carrier-frequency/` to `http://localhost:4173/`
- `lighthouserc.local.json` - URL updated same; startServerCommand changed from npm to bun
- `package.json` - added `"packageManager": "bun@1.3.9"` field after "type"
- `scripts/generate-screenshots.ts` - BASE_URL changed from hardcoded to `process.env.BASE_URL || 'http://localhost:5173/'`
- `.github/workflows/deploy.yml` - complete rewrite: npm/node replaced with bun, added lint+typecheck gates, added docs:build step and cp merge, kept same permissions/concurrency/environment structure

## Decisions Made
- Open Calculator nav link and landing page hero link both use absolute URL `https://gnomad-carrier-frequency.kidney-genetics.org/` instead of relative `/` — VitePress resolves relative links against its own `base` (`/docs/`), so `/` navigates to the docs index, not the app root. Absolute URL is the correct solution.
- `packageManager: "bun@1.3.9"` field added after the `"type"` field in package.json — `oven-sh/setup-bun@v2` reads this automatically, so no `bun-version` input needed in the workflow.
- Deploy workflow is self-contained with lint and typecheck before building — deploy doesn't trust that prior CI jobs have passed.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- `bun` command not on PATH in bash environment (Windows host). Used `node_modules/.bin/vue-tsc.cmd` to verify typecheck passes. VitePress docs build required `npm install @rollup/rollup-win32-x64-msvc --no-save` (known Windows-only dev environment issue documented in STATE.md blockers). Neither issue affects CI which uses ubuntu-latest.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Base paths are now correct for `gnomad-carrier-frequency.kidney-genetics.org` custom domain
- Deploy workflow is complete and ready to use
- Phase 19 Plan 02 and subsequent plans can build on this deploy foundation
- No blockers

---
*Phase: 19-cicd-integration*
*Completed: 2026-02-23*
