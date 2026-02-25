---
phase: 29-test-suite-completion
plan: 01
subsystem: testing
tags: [vitest, pinia, vue-test-utils, happy-dom, vuetify, store-testing]

# Dependency graph
requires:
  - phase: 28-gene-config-system
    provides: completed Pinia stores and core package structure this tests against
  - phase: 25-monorepo-foundation
    provides: bun workspace structure, @gnomad-cf/core package, alias conventions
provides:
  - apps/web/vitest.config.ts with happy-dom env and all 3 alias groups
  - apps/web/src/test/setup.ts with minimal Vuetify instance + jsdom mocks
  - apps/web/src/test/helpers.ts with mountWithPlugins helper
  - 88 passing Pinia store unit tests covering all 5 primary stores
affects:
  - 29-02 (component tests depend on helpers.ts and vitest config)
  - 29-03 (composable tests use same infrastructure)
  - 29-04 (E2E tests use separate Playwright config)
  - 29-05 (CI pipeline relies on this test infrastructure)

# Tech tracking
tech-stack:
  added:
    - "@vue/test-utils@2.4.6"
    - "@pinia/testing@1.0.3"
    - "happy-dom@20.7.0"
    - "vitest@3.2.4"
    - "@vitest/coverage-v8@3.2.4"
    - "jsdom@28.1.0 (installed but replaced by happy-dom)"
  patterns:
    - "Store unit tests use real createPinia() (no persistence plugin) with setActivePinia in beforeEach"
    - "CSS imports from Vuetify avoided by not importing vuetify/components wholesale in setup.ts"
    - "happy-dom chosen over jsdom to avoid @exodus/bytes CJS/ESM incompatibility"

key-files:
  created:
    - apps/web/vitest.config.ts
    - apps/web/src/test/setup.ts
    - apps/web/src/test/helpers.ts
    - apps/web/src/stores/__tests__/useTemplateStore.test.ts
    - apps/web/src/stores/__tests__/useFilterStore.test.ts
    - apps/web/src/stores/__tests__/useCalcStore.test.ts
    - apps/web/src/stores/__tests__/useHistoryStore.test.ts
    - apps/web/src/stores/__tests__/useAppStore.test.ts
  modified:
    - apps/web/package.json (added test deps + test/test:watch scripts)
    - bun.lock

key-decisions:
  - "Use happy-dom instead of jsdom: jsdom@28.1.0 ships html-encoding-sniffer@6.0.0 which tries to require() @exodus/bytes ESM package, causing ERR_REQUIRE_ESM crash"
  - "Minimal createVuetify() in setup.ts (no wildcard component import): importing * as components from vuetify/components triggers 100s of CSS files that vitest cannot handle without full sass compilation pipeline"
  - "Store unit tests use real createPinia() not createTestingPinia(): isolation is achieved via setActivePinia(createPinia()) in beforeEach, not by stubbing store actions"

patterns-established:
  - "Vitest alias pattern: mirror all 3 alias groups from vite.config.ts exactly (gene-configs, @gnomad-cf/core regex, @ src)"
  - "Store test isolation: setActivePinia(createPinia()) in beforeEach with no persistence plugin"
  - "helpers.ts: mountWithPlugins wraps mount() with vuetify + createTestingPinia for component tests"

# Metrics
duration: 7min
completed: 2026-02-24
---

# Phase 29 Plan 01: Web Test Infrastructure + Pinia Store Unit Tests Summary

**Vitest infrastructure for apps/web using happy-dom + minimal Vuetify, with 88 store unit tests covering all 5 Pinia stores**

## Performance

- **Duration:** 7 min
- **Started:** 2026-02-24T13:14:47Z
- **Completed:** 2026-02-24T13:21:56Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments

- apps/web now has a working vitest.config.ts with happy-dom environment, all 3 alias groups (gene-configs, @gnomad-cf/core regex, @ src), and coverage settings
- Test setup provides a minimal Vuetify instance and stubs for ResizeObserver, matchMedia, and window.location
- mountWithPlugins helper exports clean component test factory with Vuetify + createTestingPinia
- 88 unit tests passing across 5 Pinia stores: useTemplateStore (22), useHistoryStore (21), useAppStore (15), useFilterStore (18), useCalcStore (12)
- Root `bun run test` now discovers and runs core + cli + web tests (314 total)

## Task Commits

Each task was committed atomically:

1. **Task 1: Install dependencies and create vitest config + setup + helpers** - `7598532` (chore)
2. **Task 2: Write Pinia store unit tests** - `ac6152d` (test)

## Files Created/Modified

- `apps/web/vitest.config.ts` - Vitest config with happy-dom env, 3 alias groups, coverage settings
- `apps/web/src/test/setup.ts` - Global setup: minimal vuetify instance, ResizeObserver/matchMedia/location mocks
- `apps/web/src/test/helpers.ts` - mountWithPlugins helper exporting component test factory
- `apps/web/src/stores/__tests__/useTemplateStore.test.ts` - 22 tests: language, genderStyle, sections, customizations, getters
- `apps/web/src/stores/__tests__/useFilterStore.test.ts` - 18 tests: defaults, filter toggles, ClinVar star threshold, reset
- `apps/web/src/stores/__tests__/useCalcStore.test.ts` - 12 tests: HWE formula, homExclusion, penetrance clamping, reset
- `apps/web/src/stores/__tests__/useHistoryStore.test.ts` - 21 tests: addEntry, deleteEntry, clearAll, ring buffer, groupByDate
- `apps/web/src/stores/__tests__/useAppStore.test.ts` - 15 tests: disclaimer lifecycle, timestamp, onboarding gating
- `apps/web/package.json` - Added test deps and test/test:watch scripts

## Decisions Made

1. **happy-dom over jsdom**: jsdom@28.1.0 uses html-encoding-sniffer@6.0.0 which tries to `require()` `@exodus/bytes` (an ES module), causing `ERR_REQUIRE_ESM` on import. happy-dom@20.7.0 has no such issue.

2. **Minimal createVuetify() in setup.ts**: The plan called for `import * as components from 'vuetify/components'` which triggers ~200 individual CSS file imports that vitest's Node.js pipeline cannot handle without sass compilation. Using `createVuetify()` alone (no components/directives arguments) is sufficient since Vuetify auto-registers components globally when mounted.

3. **vitest@3.x pinned to match root**: Root workspace runs vitest@3.2.4; apps/web initially got @vitest/coverage-v8@4.0.18 (incompatible peer) which was downgraded to 3.2.4.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Switched from jsdom to happy-dom**
- **Found during:** Task 1/2 (first test run)
- **Issue:** jsdom@28.1.0 includes html-encoding-sniffer@6.0.0 which CJS-requires @exodus/bytes (pure ESM), causing `ERR_REQUIRE_ESM` crash before any tests run
- **Fix:** Installed happy-dom@20.7.0, changed `environment: 'jsdom'` to `environment: 'happy-dom'`
- **Files modified:** apps/web/vitest.config.ts, apps/web/package.json
- **Verification:** All 88 store tests run to completion
- **Committed in:** ac6152d (Task 2 commit)

**2. [Rule 3 - Blocking] Minimal Vuetify init to avoid CSS pipeline error**
- **Found during:** Task 2 (first test run with setup.ts importing vuetify/components)
- **Issue:** `import * as components from 'vuetify/components'` triggers `TypeError: Unknown file extension ".css"` for every Vuetify component CSS file — vitest Node.js runner cannot process CSS without vite CSS pipeline
- **Fix:** Changed setup.ts to `createVuetify()` without wildcard component import; removed `import 'vuetify/styles'` and `import * as directives from 'vuetify/directives'`; added `css: true` to vitest config (though the key fix was removing the wildcard import)
- **Files modified:** apps/web/src/test/setup.ts, apps/web/vitest.config.ts
- **Verification:** All 88 store tests pass without CSS errors
- **Committed in:** ac6152d (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 3 - Blocking)
**Impact on plan:** Both fixes were necessary to get tests running at all. No scope creep — test behavior is identical to what plan specified.

## Issues Encountered

- Store `setMaxEntries` clamps to minimum 10, so a test using `setMaxEntries(3)` was expecting trimming to 3 but got 5 entries (clamped to 10). Fixed test to use 15 entries reduced to 10 (within clamping range).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 29-02 (component tests) can proceed: vitest config, helpers.ts, and setup.ts are all ready
- Plan 29-03 (composable tests) can proceed: alias resolution confirmed, store mocking pattern established
- The `mountWithPlugins` helper in helpers.ts is ready for component tests
- Key pattern for component tests: import specific Vuetify components rather than using global registration to avoid CSS pipeline issues

---
*Phase: 29-test-suite-completion*
*Completed: 2026-02-24*
