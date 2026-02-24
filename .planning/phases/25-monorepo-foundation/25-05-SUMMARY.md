---
phase: 25-monorepo-foundation
plan: "05"
subsystem: infra
tags: [ci, github-actions, gitignore, documentation, monorepo, typecheck, vue-tsc]

# Dependency graph
requires:
  - phase: 25-04
    provides: all web imports rewired to @gnomad-cf/core/*, fetch-based core client, duplicate files deleted
provides:
  - Updated deploy.yml with monorepo-aware build steps and artifact paths
  - Updated .gitignore with monorepo paths and proper trailing slashes
  - Updated CLAUDE.md with monorepo structure, commands, and data flow
  - Fixed root typecheck script to handle .vue files via vue-tsc delegation
  - package-lock.json removed from git tracking
affects:
  - phase-26-stable-calc-api
  - phase-27-cli
  - phase-29-test-suite

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Root typecheck: tsc for core (no .vue files) + vue-tsc for web (.vue aware)"
    - "CI: separate build steps for core and web with monorepo filter flags"

key-files:
  created: []
  modified:
    - .github/workflows/deploy.yml
    - .gitignore
    - CLAUDE.md
    - package.json

key-decisions:
  - "Root typecheck delegates to vue-tsc for web (tsc alone cannot resolve .vue files in composite build)"

patterns-established:
  - "bun run --filter @gnomad-cf/core build then bun run --filter gnomad-cf-web build is the canonical CI build sequence"

# Metrics
duration: ~15min
completed: 2026-02-24
---

# Phase 25 Plan 05: CI/Deploy Update, Cleanup, and Documentation Summary

**Monorepo-aware CI pipeline, updated .gitignore for workspace paths, and rewritten CLAUDE.md reflecting the @gnomad-cf/core extraction**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-02-24T00:13:24Z
- **Completed:** 2026-02-24T00:28:00Z (estimated)
- **Tasks:** 1/2 (Task 2 is human-verify checkpoint)
- **Files modified:** 4

## Accomplishments

- Updated GitHub Actions deploy.yml with separate build steps for core and web packages, corrected artifact path from `./dist` to `./apps/web/dist`, fixed docs merge path
- Updated .gitignore: trailing slashes on directories, monorepo vitepress paths (`apps/web/docs/.vitepress/`), removed stale `docs/.vitepress/` entries
- Rewritten CLAUDE.md: monorepo tree structure, updated commands, data flow mentioning @gnomad-cf/core, tech stack with tsdown, deployment URL
- Removed package-lock.json from git tracking (was tracked but gitignored since migration to bun.lock)
- Fixed pre-existing typecheck breakage: root `tsc --build` fails on `.vue` files; fixed to `tsc --build packages/core && bun run --filter gnomad-cf-web typecheck`

## Task Commits

1. **Task 1: Update CI/deploy, cleanup, and documentation** - `bdae023` (feat)

## Files Created/Modified

- `.github/workflows/deploy.yml` - Monorepo-aware CI: separate core/web/docs build steps, corrected artifact path to `./apps/web/dist`
- `.gitignore` - Monorepo vitepress paths, trailing slashes on directories, removed stale entries
- `CLAUDE.md` - Complete rewrite for monorepo: structure tree, commands, data flow, tech stack
- `package.json` - Fixed `typecheck` script: delegates vue to vue-tsc

## Decisions Made

- Root `typecheck` script changed from `tsc --build` to `tsc --build packages/core && bun run --filter gnomad-cf-web typecheck` — plain tsc cannot resolve `.vue` imports; this was a pre-existing breakage caught during verification

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed root typecheck script failing on .vue files**
- **Found during:** Task 1 (Step 5 - verification battery)
- **Issue:** Root `package.json` had `"typecheck": "tsc --build"`. TypeScript composite project build (tsc) does not understand `.vue` file extensions, causing `Cannot find module './App.vue'` error. This broke `bun run typecheck` and the CI `Type Check` step.
- **Fix:** Changed script to `tsc --build packages/core && bun run --filter gnomad-cf-web typecheck`. Core package uses plain tsc (no .vue files). Web uses vue-tsc via its own typecheck script.
- **Files modified:** package.json
- **Verification:** `bun run typecheck` exits with code 0
- **Committed in:** bdae023

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug)
**Impact on plan:** Essential fix — typecheck was silently broken in CI. No scope creep.

## Issues Encountered

None beyond the auto-fixed typecheck bug.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 25 infrastructure cleanup complete; monorepo foundation fully documented
- CI pipeline correctly builds core then web in sequence
- Human verification (Task 2) needed to confirm app loads and wizard flow works in dev mode
- Phase 26 (stable calculation API) can proceed once human verification passes

---
*Phase: 25-monorepo-foundation*
*Completed: 2026-02-24*
