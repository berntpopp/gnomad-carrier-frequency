---
phase: 29-test-suite-completion
plan: 02
subsystem: testing
tags: [vitest, vue-test-utils, pinia, vuetify, happy-dom, component-tests, wizard]

# Dependency graph
requires:
  - phase: 29-01
    provides: test infrastructure (helpers.ts, setup.ts, happy-dom environment, mountWithPlugins)
provides:
  - 6 wizard step component test files with 33 tests
  - Patterns for mocking Vuetify useDisplay in tests
  - Pattern for mocking virtual:pwa-register (vitest alias)
  - Pattern for mocking villus/API composables with real Vue refs
affects:
  - future component tests that use Vuetify useDisplay
  - future tests with virtual Vite modules

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Mock vuetify module useDisplay for components using smAndDown/xs
    - Mock virtual:pwa-register via vitest.config.ts resolve alias
    - Use real Vue ref() in composable mocks to prevent Invalid watch source warnings
    - Check Vuetify disabled state via attribute === '' || === 'true' (not undefined check)
    - Stub heavy child components with data-testid stubs to keep tests focused

key-files:
  created:
    - apps/web/src/components/wizard/__tests__/StepGene.test.ts
    - apps/web/src/components/wizard/__tests__/StepStatus.test.ts
    - apps/web/src/components/wizard/__tests__/StepFrequency.test.ts
    - apps/web/src/components/wizard/__tests__/StepResults.test.ts
    - apps/web/src/components/wizard/__tests__/WizardStepper.test.ts
    - apps/web/src/components/wizard/__tests__/TextOutput.test.ts
    - apps/web/src/test/mocks/virtual-pwa-register.ts
  modified:
    - apps/web/vitest.config.ts
    - apps/web/src/test/helpers.ts
    - apps/web/src/test/setup.ts

key-decisions:
  - "Vuetify useDisplay mocked via vi.mock('vuetify', ...) factory in test files that use it — minimal Vuetify setup has no display injection"
  - "virtual:pwa-register mocked via vitest.config.ts resolve alias pointing to test/mocks/virtual-pwa-register.ts"
  - "Vuetify disabled attribute checked as === '' || === 'true' not undefined — Vuetify sets disabled=false string when enabled"
  - "Real Vue ref() used in composable mocks, not plain objects — prevents Invalid watch source Vue warnings"
  - "Importing Vuetify components individually (not wholesale) still triggers CSS imports — kept minimal setup with no component registration"

patterns-established:
  - "Mock composables with real Vue ref() so watch() in components works without warnings"
  - "Stub heavy child components (FilterPanel, VariantModal, TextOutput) in parent tests"
  - "Seed storeInitialState with 'calc-settings', 'filters', 'templates' store IDs"
  - "useDisplay mock: spread actual vuetify, override just useDisplay with ref()-based stub"

# Metrics
duration: 45min
completed: 2026-02-24
---

# Phase 29 Plan 02: Wizard Component Tests Summary

**6 wizard step component test files (33 tests) covering the complete 4-step wizard flow with proper Vuetify/Pinia/composable mocking patterns**

## Performance

- **Duration:** ~45 min
- **Started:** 2026-02-24T13:37:00Z
- **Completed:** 2026-02-24T13:56:00Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments

- StepGene (5 tests): container, next button, disabled state logic, complete emit
- StepStatus (6 tests): container, radio option data-testid, next/back buttons, all radio labels
- StepFrequency (8 tests): container, gnomAD tab, disabled state on validation, complete emit
- StepResults (5 tests): container, summary card visibility based on result prop, population table, gene name
- WizardStepper (4 tests): container, all 4 step header data-testids, content area, step 1 renders
- TextOutput (5 tests): container, section chips, text content area, language toggles, title text
- Fixed `createTestingPinia` by adding `createSpy: vi.fn` to helpers.ts
- Added `virtual:pwa-register` mock via vitest alias to prevent import failure
- Established Vuetify disabled state testing pattern (string attribute, not undefined)

## Task Commits

1. **Task 1: StepGene, StepStatus, StepFrequency tests** - `b4eaeab` (feat)
2. **Task 2: StepResults, WizardStepper, TextOutput tests** - `b4155f2`, `bfb0c61`, `a0e34d9` (feat/docs, committed by parallel 29-03 agent)

## Files Created/Modified

- `apps/web/src/components/wizard/__tests__/StepGene.test.ts` - Gene search step tests with mocked composables
- `apps/web/src/components/wizard/__tests__/StepStatus.test.ts` - Carrier status radio selection tests
- `apps/web/src/components/wizard/__tests__/StepFrequency.test.ts` - Frequency source tab tests
- `apps/web/src/components/wizard/__tests__/StepResults.test.ts` - Results display tests with stubbed children
- `apps/web/src/components/wizard/__tests__/WizardStepper.test.ts` - Orchestrator stepper tests
- `apps/web/src/components/wizard/__tests__/TextOutput.test.ts` - Clinical text output tests
- `apps/web/src/test/mocks/virtual-pwa-register.ts` - No-op registerSW mock for test environment
- `apps/web/vitest.config.ts` - Added virtual:pwa-register alias
- `apps/web/src/test/helpers.ts` - Added createSpy: vi.fn to createTestingPinia

## Decisions Made

- **Vuetify useDisplay mock**: `vi.mock('vuetify', ...)` with factory preserving all original exports but overriding `useDisplay` — the minimal Vuetify test setup has no display injection context
- **Vuetify disabled state**: `btn.attributes('disabled')` returns `"false"` string when not disabled, not `undefined` — tests use `=== '' || === 'true'` check
- **Real refs in mocks**: Mocking composables that return `ref(null)` instead of `{ value: null }` prevents Vue's `watch()` from emitting "Invalid watch source" warnings
- **virtual:pwa-register**: Added vitest alias rather than global mock file — simpler than creating `__mocks__` directory, consistent with other alias patterns

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Fixed createTestingPinia missing createSpy option**
- **Found during:** Task 1 (StepGene tests)
- **Issue:** `@pinia/testing` `createTestingPinia` requires `createSpy` option when `vi.fn` auto-detection fails
- **Fix:** Added `createSpy: vi.fn` to `helpers.ts` createTestingPinia call
- **Files modified:** `apps/web/src/test/helpers.ts`
- **Committed in:** `b4eaeab` (Task 1 commit)

**2. [Rule 3 - Blocking] Added virtual:pwa-register mock alias**
- **Found during:** Task 1 (StepGene tests) — import fails in test env since Vite plugin not active
- **Issue:** `usePwaUpdate.ts` imports from `virtual:pwa-register` (Vite PWA plugin virtual module)
- **Fix:** Added resolve alias in `vitest.config.ts` pointing to a no-op mock file
- **Files modified:** `apps/web/vitest.config.ts`, `apps/web/src/test/mocks/virtual-pwa-register.ts`
- **Committed in:** `b4eaeab` (Task 1 commit)

**3. [Rule 1 - Bug] Fixed Vuetify disabled state assertion**
- **Found during:** Task 1 (StepGene, StepFrequency tests)
- **Issue:** Expected `btn.attributes('disabled')` to be `undefined` when enabled, but Vuetify sets `disabled="false"` string
- **Fix:** Changed assertion to check `=== '' || === 'true'` which correctly identifies disabled state
- **Files modified:** `StepGene.test.ts`, `StepFrequency.test.ts`
- **Committed in:** `b4eaeab` (Task 1 commit)

**4. [Rule 1 - Bug] Fixed useDisplay injection missing error**
- **Found during:** Task 2 (StepResults tests)
- **Issue:** `useDisplay()` from Vuetify requires display injection that minimal `createVuetify()` doesn't provide
- **Fix:** Added `vi.mock('vuetify', ...)` factory in test files that use components with `useDisplay()`
- **Files modified:** `StepResults.test.ts`, `WizardStepper.test.ts`, `TextOutput.test.ts`
- **Committed in:** parallel commits by 29-03 agent

---

**Total deviations:** 4 auto-fixed (1 missing critical, 1 blocking, 2 bugs)
**Impact on plan:** All auto-fixes necessary for test correctness. No scope creep.

## Issues Encountered

- Parallel execution of plan 29-03 agent committed Task 2 files (StepResults, WizardStepper, TextOutput) before Task 2 commit — files were already committed when Task 2 completed. TextOutput was committed by parallel agent via `a0e34d9`.
- Vuetify component CSS imports prevent registering individual components in test setup — kept minimal `createVuetify()` with no components; unresolved components render as custom HTML elements but `data-testid` attributes still findable.

## Next Phase Readiness

- All 6 wizard component test files passing (33 tests)
- Full web test suite: 154 tests, 16 files, all passing
- Phase 29 wizard tests complete — covers the most critical app flow
- Patterns established for mocking Vuetify, composables, and virtual modules

---
*Phase: 29-test-suite-completion*
*Completed: 2026-02-24*
