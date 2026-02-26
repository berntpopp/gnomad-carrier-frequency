---
phase: 35-population-bar-chart
plan: 03
subsystem: testing
tags: [vitest, playwright, vue-test-utils, e2e, unit-tests, population-chart, svg]

# Dependency graph
requires:
  - phase: 35-02
    provides: PopulationBarChart component, StepResults tabbed view, useChartExport composable

provides:
  - Unit test suite for PopulationBarChart (10 tests)
  - E2E test suite for chart/table tab integration (5 tests)
  - data-testid attributes on chart UI elements for E2E targeting
  - Visual verification of chart quality by human reviewer

affects:
  - Future phases that extend PopulationBarChart or StepResults population tab

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "vi.mock for composables using external injection (useAppTheme → Vuetify useTheme)"
    - "Stub child components in parent unit tests to avoid transitive injection errors"
    - "E2E navigateToResults() helper pattern for wizard flow setup"

key-files:
  created:
    - apps/web/src/components/__tests__/PopulationBarChart.test.ts
    - apps/web/e2e/phase35-bar-chart.spec.ts
  modified:
    - apps/web/src/components/PopulationBarChart.vue
    - apps/web/src/components/wizard/StepResults.vue
    - apps/web/src/components/wizard/__tests__/StepResults.test.ts

key-decisions:
  - "vi.mock useAppTheme at module level in PopulationBarChart.test.ts — useDark from @vueuse/core needs matchMedia/localStorage not available in happy-dom"
  - "vi.mock useDisplayFormat in chart tests — avoids Pinia store setup for formatting; returns (f * 100).toFixed(2) + '%' stub"
  - "PopulationBarChart added to StepResults.test.ts stubComponents — prevents Vuetify theme injection error from transitive useAppTheme call"
  - "data-testid on root chart div and v-tab elements — enables E2E targeting without brittle text/role selectors"

patterns-established:
  - "Composables using Vuetify internal hooks (useTheme, useDisplay) must be mocked at module level in unit tests"
  - "Parent component tests stub child components that have external injection dependencies"

# Metrics
duration: 18min
completed: 2026-02-27
---

# Phase 35 Plan 03: Tests and Human Verification Summary

**10-test unit suite for PopulationBarChart (sort, color, reference line, empty state) + 5-test E2E suite for chart/table tab switching, with visual approval from human reviewer**

## Performance

- **Duration:** ~18 min (task 1: ~5 min, checkpoint wait + orchestrator additions: ~13 min)
- **Started:** 2026-02-26T23:21:10Z
- **Completed:** 2026-02-26T23:34:23Z
- **Tasks:** 2 (1 auto + 1 checkpoint:human-verify)
- **Files modified:** 5 (plan 35-03 scope) + 7 (orchestrator additions post-approval)

## Accomplishments

- Unit tests for PopulationBarChart covering: SVG rendering, descending sort order, founder effect color (#D55E00 light / #E69F00 dark), reference line presence/absence, empty state message, frequency formatting, defineExpose, data-testid, and zero-frequency AFR exclusion
- E2E tests for chart integration: Chart tab visibility, SVG/PNG download buttons, Table/Chart tab switching, population-chart SVG render
- data-testid attributes added to chart UI elements enabling stable E2E selectors
- Pre-existing StepResults.test.ts failure fixed (PopulationBarChart not in stubs caused Vuetify theme injection error)
- Human visual review passed: chart appearance, founders color, reference line, format toggle, dark mode, tooltip, mobile abbreviated codes, table tab, SVG/PNG export

## Task Commits

Each task was committed atomically:

1. **Task 1: Unit tests + E2E tests** - `423fc88` (test)

**Orchestrator corrections post-approval (not plan 35-03 scope):**

- `19531eb` fix(35): default population tab to Table instead of Chart (user preference: chart is opt-in)
- `007cb46` fix(35): reorder tabs to Table first, Chart second (visual consistency with default)
- `bbc3df6` feat(35): add pure SVG chart generator to @gnomad-cf/core (platform-neutral generateSvgChart())
- `b3a1c18` feat(35): add --format svg to CLI query and batch commands (gnomad-cf query CFTR --format svg)

## Files Created/Modified

- `apps/web/src/components/__tests__/PopulationBarChart.test.ts` — 10 unit tests for chart component
- `apps/web/e2e/phase35-bar-chart.spec.ts` — 5 E2E tests for chart/table tab integration
- `apps/web/src/components/PopulationBarChart.vue` — added data-testid="population-chart" to root div
- `apps/web/src/components/wizard/StepResults.vue` — added data-testid="chart-tab" and data-testid="table-tab" to v-tab elements
- `apps/web/src/components/wizard/__tests__/StepResults.test.ts` — added PopulationBarChart to stubComponents (bug fix)

## Decisions Made

- `vi.mock useAppTheme` at module level in chart unit tests — `useDark` from `@vueuse/core` uses `matchMedia`/`localStorage` unavailable in happy-dom test environment
- `vi.mock useDisplayFormat` in chart tests — avoids full Pinia store setup; stub returns `(f * 100).toFixed(2) + '%'` for predictable assertions
- `PopulationBarChart` added to `StepResults.test.ts` stubComponents — prevents transitive Vuetify `useTheme` injection error that was introduced when PopulationBarChart was added to StepResults in Plan 35-02

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed pre-existing StepResults.test.ts failure**

- **Found during:** Task 1 (running test suite to verify PopulationBarChart tests pass)
- **Issue:** StepResults.test.ts was already failing before Plan 35-03 changes. Plan 35-02 added PopulationBarChart to StepResults.vue but did not add it to the unit test stubComponents list. The component's `useAppTheme` composable calls Vuetify's `useTheme()` which requires theme injection — not available in the minimal test Vuetify instance.
- **Fix:** Added `PopulationBarChart: { template: '<div data-testid="population-bar-chart-stub" />' }` to stubComponents in StepResults.test.ts
- **Files modified:** `apps/web/src/components/wizard/__tests__/StepResults.test.ts`
- **Verification:** All 519 tests pass (32 test files)
- **Committed in:** 423fc88 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Bug fix restores pre-existing test correctness. No scope creep.

## Issues Encountered

None beyond the auto-fixed bug above.

## Next Phase Readiness

- Phase 35 (Population Bar Chart) fully complete: component (35-01), integration (35-02), tests + verification (35-03)
- Orchestrator-level additions (core SVG chart, CLI --format svg, default tab = Table) are committed and merged
- Phase 36 (Orphanet integration) can proceed — depends only on Phase 33 display format infrastructure
- Phase 37 (Subpopulation display) can proceed — depends on Phase 34 quality flags

---
*Phase: 35-population-bar-chart*
*Completed: 2026-02-27*
