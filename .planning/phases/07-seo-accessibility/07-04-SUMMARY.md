---
phase: 07-seo-accessibility
plan: 04
subsystem: infra
tags: [lighthouse, ci, a11y, accessibility, seo, heading-hierarchy, keyboard-navigation, aria]

# Dependency graph
requires:
  - phase: 07-01
    provides: SEO meta tags, OG image, structured data
  - phase: 07-02
    provides: VueAnnouncer plugin, useAppAnnouncer composable
  - phase: 07-03
    provides: Wizard ARIA announcements, SettingsDialog focus trap
provides:
  - Lighthouse CI workflow for automated score verification
  - Accessibility threshold >= 95 (blocking)
  - SEO threshold >= 95 (blocking)
  - Performance threshold >= 90 (warning)
  - Correct heading hierarchy (single h1)
  - Tooltip accessibility with aria-labels
  - Verified keyboard navigation
affects: [08-filtering, 09-clingen, 10-export]

# Tech tracking
tech-stack:
  added: [lighthouse-ci-action]
  patterns: [github-actions-lighthouse, aria-label-tooltips]

key-files:
  created:
    - lighthouserc.json
    - .github/workflows/lighthouse.yml
  modified:
    - src/components/AppBar.vue
    - src/components/AppFooter.vue

key-decisions:
  - "Performance as warn, a11y/SEO as error: allows CI perf variations while enforcing critical scores"
  - "aria-label on both tooltip and button: ensures screen reader support regardless of Vuetify internals"
  - "Lighthouse CI with temporary-public-storage: no external service required for score history"

patterns-established:
  - "Lighthouse CI workflow: build then preview, run lighthouse against preview server"
  - "Tooltip accessibility: always add aria-label to v-tooltip and activator button"

# Metrics
duration: 4min
completed: 2026-01-19
---

# Phase 7 Plan 04: Lighthouse CI & Accessibility Audit Summary

**Lighthouse CI workflow with a11y/SEO >= 95 thresholds, heading hierarchy audit, tooltip aria-labels added, keyboard navigation verified**

## Performance

- **Duration:** 4 min (including continuation after checkpoint)
- **Started:** 2026-01-19T15:40:00Z (initial), 2026-01-19T15:45:35Z (continuation)
- **Completed:** 2026-01-19T15:50:00Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- Lighthouse CI workflow runs on push to main and PRs
- Accessibility and SEO scores enforced at >= 95 (blocking)
- Performance score monitored at >= 90 (warning only)
- Single h1 heading hierarchy verified (App.vue)
- All tooltips have aria-labels for screen reader accessibility
- Keyboard navigation verified working throughout app

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Lighthouse CI configuration** - `b53b742` (feat)
2. **Task 2: Audit and fix heading hierarchy** - `35473a0` (fix)
3. **Task 3: Tooltip accessibility fix** - `4fb5fa7` (fix)

## Files Created/Modified

- `lighthouserc.json` - Lighthouse CI configuration with score thresholds
- `.github/workflows/lighthouse.yml` - GitHub Actions workflow for Lighthouse CI
- `src/components/AppBar.vue` - Added aria-label to theme toggle and settings tooltips/buttons
- `src/components/AppFooter.vue` - Added aria-label to GitHub and gnomAD tooltips/buttons

## Decisions Made

- **Performance warn, a11y/SEO error:** Performance can vary in CI due to resource constraints, but accessibility and SEO scores are stable and must be enforced
- **aria-label on both tooltip and button:** Vuetify tooltip overlays need aria-label, and buttons need it for screen readers when tooltip isn't visible
- **Lighthouse temporary-public-storage:** No need for external service accounts, scores are stored temporarily for PR comments

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added aria-label to tooltips for accessibility compliance**
- **Found during:** Task 3 checkpoint verification (Lighthouse audit showed score 92/95)
- **Issue:** Vuetify v-tooltip overlays missing accessible names, flagged by Lighthouse
- **Fix:** Added aria-label to all v-tooltip components and their activator buttons in AppBar.vue and AppFooter.vue
- **Files modified:** src/components/AppBar.vue, src/components/AppFooter.vue
- **Verification:** TypeScript and lint pass, tooltips now have accessible names
- **Committed in:** 4fb5fa7

---

**Total deviations:** 1 auto-fixed (bug fix for accessibility compliance)
**Impact on plan:** Fix was necessary to meet >= 95 accessibility threshold. No scope creep.

## Issues Encountered

- Initial Lighthouse accessibility score was 92 due to tooltip overlays missing aria-labels. Fixed by adding aria-label attributes.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 7 (SEO + Accessibility) complete
- All 9 requirements for Phase 7 addressed
- Lighthouse CI will enforce scores on future PRs
- Ready for Phase 8 (Filtering + Variant Display)
- Future phases should follow tooltip aria-label pattern

---
*Phase: 07-seo-accessibility*
*Completed: 2026-01-19*
