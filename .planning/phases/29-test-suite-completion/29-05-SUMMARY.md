---
phase: 29-test-suite-completion
plan: 05
subsystem: infra
tags: [github-actions, vitest, coverage, playwright, ci-cd, v8-coverage]

# Dependency graph
requires:
  - phase: 29-01
    provides: vitest infrastructure for all 3 packages (core, CLI, web)
  - phase: 29-04
    provides: Playwright E2E tests and playwright.config.ts
provides:
  - GitHub Actions tests workflow running all unit/component/E2E tests on CI
  - Coverage configuration (v8, text+json reporter) for core and CLI vitest configs
  - Warn-only coverage thresholds across all 3 packages (0 threshold, advisory targets)
  - playwright.config.ts CI/dev environment split (preview/4173 vs dev/5173)
affects: [future-phases, ci-maintenance, coverage-tracking]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Coverage thresholds set to 0 (warn-only) with advisory targets in comments"
    - "E2E gated to PRs to main only via GitHub Actions if condition"
    - "CI uses production preview build for E2E; dev uses dev server"

key-files:
  created:
    - .github/workflows/tests.yml
  modified:
    - packages/core/vitest.config.ts
    - packages/cli/vitest.config.ts
    - playwright.config.ts

key-decisions:
  - "Coverage thresholds at 0 in vitest (warn-only) — advisory targets 90%/80%/40% documented in comments and CI summary step"
  - "E2E tests gated to pull_request events targeting main — avoids playwright install on every push"
  - "playwright.config.ts uses isCI flag to switch between preview server (port 4173) in CI and dev server (5173) locally"
  - "@vitest/coverage-v8 already hoisted at workspace root — no new package.json entries needed for core or CLI"
  - "tests.yml is additive to ci.yml — tests-only workflow, ci.yml keeps lint/typecheck/build"

patterns-established:
  - "Per-package coverage: bun run --filter <package> test -- --coverage"
  - "E2E only on PRs to main: github.event_name == 'pull_request' && github.base_ref == 'main'"

# Metrics
duration: 4min
completed: 2026-02-24
---

# Phase 29 Plan 05: CI Tests Workflow Summary

**GitHub Actions tests.yml with per-package v8 coverage (warn-only) for core/CLI/web, E2E gated to PRs to main**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-24T14:00:09Z
- **Completed:** 2026-02-24T14:04:13Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Added v8 coverage configuration to packages/core and packages/cli vitest configs (web already had it from Plan 01)
- Created .github/workflows/tests.yml — unit/component tests on every push, E2E only on PRs to main
- Updated playwright.config.ts to use production preview server on CI (port 4173) vs dev server locally (5173)
- All 3 packages print coverage tables when run with --coverage and exit 0

## Task Commits

Each task was committed atomically:

1. **Task 1: Add coverage configuration to core and CLI vitest configs** - `9e2c35a` (feat)
2. **Task 2: Create GitHub Actions tests workflow** - `46d8bd4` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `.github/workflows/tests.yml` - New CI workflow: unit tests on push, E2E on PRs to main, coverage printed to console
- `packages/core/vitest.config.ts` - Added coverage block (v8, text+json, include src/**/*.ts, exclude index.ts barrels, thresholds 0)
- `packages/cli/vitest.config.ts` - Added coverage block (v8, text+json, include src/**/*.ts, exclude __tests__, thresholds 0)
- `playwright.config.ts` - Added isCI flag to switch baseURL/webServer between preview:4173 and dev:5173

## Decisions Made
- Coverage thresholds set to 0 (warn-only) — build never fails on coverage; advisory targets (90%/80%/40%) documented in config comments and CI summary step
- @vitest/coverage-v8 already hoisted at workspace root from apps/web dep — no new package.json entries needed
- E2E gated to PRs to main to avoid playwright browser install overhead on every push (chromium only)
- tests.yml is a separate workflow from ci.yml (lint/typecheck/build) — clear separation of concerns
- playwright.config.ts uses `isCI` boolean (not inline ternary) for readability

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 29 is now complete (5/5 plans done): core tests, CLI tests, web component tests, E2E tests, CI workflow
- v1.5 milestone is fully complete
- CI pipeline will run on next push to any branch
- Coverage targets are advisory and documented; future work can increase thresholds as coverage improves

---
*Phase: 29-test-suite-completion*
*Completed: 2026-02-24*
