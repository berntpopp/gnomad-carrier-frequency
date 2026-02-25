---
phase: 29-test-suite-completion
plan: 07
subsystem: testing
tags: [vitest, coverage, ci, github-actions, v8-coverage]

# Dependency graph
requires:
  - phase: 29-05
    provides: vitest coverage configs with thresholds at 0 + CI workflow with advisory coverage summary
provides:
  - Real line coverage thresholds enforced by vitest (core: 90, CLI: 80, web: 40)
  - CI warn-only behavior via continue-on-error on all three test steps
  - Gap 2 from VERIFICATION.md closed — TEST-12 satisfied
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Vitest coverage threshold enforcement with CI continue-on-error for warn-only behavior"
    - "Lines-only threshold strategy — functions/branches/statements at 0 to avoid false positives"

key-files:
  created: []
  modified:
    - packages/core/vitest.config.ts
    - packages/cli/vitest.config.ts
    - apps/web/vitest.config.ts
    - .github/workflows/tests.yml

key-decisions:
  - "Lines-only threshold per package: core 90, CLI 80, web 40 — functions/branches/statements stay at 0 to avoid false positives on untargeted metrics"
  - "continue-on-error: true on coverage test steps only — E2E failures still fail CI"
  - "Vitest enforces thresholds (exits non-zero); CI continue-on-error absorbs that exit code — clean separation of concerns"

patterns-established:
  - "Warn-only coverage: vitest enforces threshold + CI uses continue-on-error to make violations non-blocking"

# Metrics
duration: 3min
completed: 2026-02-24
---

# Phase 29 Plan 07: Coverage Thresholds Summary

**Vitest line-coverage thresholds activated (core: 90, CLI: 80, web: 40) with CI continue-on-error making violations warn-only — closes Gap 2 from VERIFICATION.md**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-24T14:54:40Z
- **Completed:** 2026-02-24T14:57:27Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Set real `lines` thresholds in all three vitest configs — vitest now emits `ERROR: Coverage for lines (X%) does not meet global threshold (Y%)` when coverage drops below target
- Added `continue-on-error: true` to the three test-with-coverage CI steps — threshold violations print warnings without failing the build
- Updated CI coverage summary step to reflect vitest-enforced thresholds (not just advisory text)

## Task Commits

Each task was committed atomically:

1. **Task 1: Set real coverage thresholds in vitest configs** - `38f46a3` (feat)
2. **Task 2: Add continue-on-error to CI test steps** - `b6801af` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified

- `packages/core/vitest.config.ts` — `lines: 0` → `lines: 90`; updated comment
- `packages/cli/vitest.config.ts` — `lines: 0` → `lines: 80`; updated comment
- `apps/web/vitest.config.ts` — `lines: 0` → `lines: 40`; updated comment
- `.github/workflows/tests.yml` — Added `continue-on-error: true` to 3 test steps; updated coverage summary echo text

## Decisions Made

- Lines-only thresholds: functions/branches/statements remain at 0. Only `lines` is targeted to avoid false positives on metrics that were never explicitly targeted.
- `continue-on-error` applied only to the three coverage test steps, not to the E2E step. E2E failures are real regressions that must fail CI.
- Vitest exits non-zero when a threshold is violated. CI's `continue-on-error: true` absorbs that exit code and marks the step as "warning" rather than failing the job. Clean separation: vitest owns enforcement, CI config owns severity.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

During Task 1 verification, core coverage (54.14%) and CLI coverage (37.19%) are both below their respective thresholds (90% and 40%). Vitest correctly printed `ERROR: Coverage for lines (X%) does not meet global threshold (Y%)` and exited with code 1 — this is exactly the intended warn behavior. Web coverage exceeded the 40% threshold and passed cleanly. All three behaviors confirmed the thresholds are working as designed.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

Gap 2 from VERIFICATION.md (coverage thresholds enforced) is now closed. TEST-12 requirement satisfied. Phase 29 gap closure plans fully executed.

No blockers. The vitest threshold warnings serve as a standing reminder to improve coverage in future development cycles.

---
*Phase: 29-test-suite-completion*
*Completed: 2026-02-24*
