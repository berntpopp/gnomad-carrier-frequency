---
phase: 23-onboarding-visual-polish
plan: 02
subsystem: ui
tags: [vuetify, vue3, responsive, appbar, useDisplay, useWizard, mobile]

# Dependency graph
requires:
  - phase: 22-cta-color-accessibility
    provides: AppBar component and wizard state foundation
provides:
  - Responsive AppBar with xs title hiding and gene context chip
  - Mobile UX: gene+version context visible without using precious vertical space
affects: [23-onboarding-visual-polish]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "useDisplay().xs for Vuetify xs breakpoint reactive detection"
    - "useWizard singleton state accessed in AppBar for cross-component context"

key-files:
  created: []
  modified:
    - src/components/AppBar.vue

key-decisions:
  - "v-if='!xs' on v-tooltip wrapper (not just v-app-bar-title) hides both tooltip and title together on mobile"
  - "Chip placed before OfflineIndicator so context chip is leftmost element on mobile"
  - "goToStep(1) used for chip click navigation (not resetWizard) to preserve gene for re-selection"

patterns-established:
  - "AppBar context chip pattern: v-if on xs && step > 1 && gene for conditional mobile context"

# Metrics
duration: 5min
completed: 2026-02-23
---

# Phase 23 Plan 02: Responsive AppBar Gene Context Chip Summary

**AppBar title hidden on mobile (xs) breakpoint; gene context chip shows selected gene and gnomAD version on Steps 2-4 with tap-to-navigate-back behavior**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-02-23T19:57:31Z
- **Completed:** 2026-02-23T20:02:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- App title "gCFCalc" hidden on xs breakpoint via `v-if="!xs"` on its wrapping v-tooltip
- Gene context chip added showing "GENE · version" on mobile Steps 2-4 when a gene is selected
- Chip click calls `goToStep(1)` to navigate back to gene selection step
- Desktop layout unchanged (title visible, no chip)
- No chip on Step 1 (mobile or desktop) since `state.currentStep > 1` guard

## Task Commits

Each task was committed atomically:

1. **Task 1: Add responsive title hiding and gene context chip to AppBar** - `aae0c58` (feat)

**Plan metadata:** (see below)

## Files Created/Modified
- `src/components/AppBar.vue` - Added useDisplay xs detection, useWizard state/goToStep, useGnomadVersion; v-if="!xs" on title tooltip; v-chip for mobile gene context

## Decisions Made
- `v-if="!xs"` placed on the outer `v-tooltip` wrapper (not just `v-app-bar-title`) so both the tooltip and title are hidden together on mobile
- Chip positioned before `<OfflineIndicator>` so it appears leftmost in the app bar on mobile
- `goToStep(1)` used for chip navigation rather than `resetWizard()` — preserves the gene symbol so user can choose to keep it or change

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- AppBar responsive behavior complete, ready for Phase 23 Plan 03 (remaining polish tasks)
- No blockers

---
*Phase: 23-onboarding-visual-polish*
*Completed: 2026-02-23*
