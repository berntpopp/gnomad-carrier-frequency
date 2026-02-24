---
phase: 29-test-suite-completion
plan: "04"
subsystem: testing
tags: [playwright, e2e, cftr, wizard, url-state, api-mocking, browser-testing]

# Dependency graph
requires:
  - phase: 28-gene-config-system
    provides: Full wizard flow (steps 1-4) with gene config, CFTR profile support
  - phase: 25-core-types-extraction
    provides: UrlState schema, wizard state composables
provides:
  - Playwright E2E config targeting apps/web/e2e/ with bun dev server
  - TypeScript gnomAD API fixtures for GeneSearch, GeneDetails, GeneVariants
  - CFTR wizard happy path E2E test (full 4-step flow)
  - URL state roundtrip E2E test (shared URL restores Step 4)
affects:
  - 29-05 (CI pipeline — needs E2E tests to reference)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "page.route('https://gnomad.broadinstitute.org/api') for request interception — exact URL string, not glob"
    - "dismissDisclaimer() helper called before interactions — persistent v-dialog blocks all clicks"
    - "getByTestId('gene-search-input').locator('input') — v-autocomplete data-testid is on outer div, not inner input"
    - "getByRole('option', { name: /^CFTR\\b/ }).first() — prevents strict mode violation from multiple CFTR-family genes"
    - "Playwright reuseExistingServer=true for dev — tests run against existing bun dev server"

key-files:
  created:
    - playwright.config.ts
    - apps/web/e2e/fixtures/gnomad-responses.ts
    - apps/web/e2e/cftr-wizard.spec.ts
    - apps/web/e2e/url-sharing.spec.ts
  modified: []

key-decisions:
  - "page.route exact URL 'https://gnomad.broadinstitute.org/api' — glob pattern ** prefix/suffix unnecessary for exact match"
  - "Disclaimer must be dismissed first — persistent v-dialog blocks all interaction in fresh browser context"
  - "Use .locator('input') inside v-autocomplete wrapper — data-testid on outer div, not the actual <input> element"
  - "Use .first() for CFTR option — gnomAD returns CFTR, CFTRP1, CFTRP2, CFTR-AS1 etc., strict mode requires unique match"
  - "StepFrequency success text is 'Carrier frequency calculated from gnomAD data.' (not 'Calculated carrier...')"
  - "reuseExistingServer=!CI — allows running against already-running dev server locally"
  - "ClinGen CSV intercepted with minimal stub fixture — avoids external network dependency"

patterns-established:
  - "E2E test pattern: interceptAllApis() + dismissDisclaimer() + navigateToStepN() helper functions"
  - "Fixture shape: { data: { operationName_field: [...] } } matching villus/GraphQL response format"

# Metrics
duration: 16min
completed: 2026-02-24
---

# Phase 29 Plan 04: Playwright E2E Tests Summary

**Playwright E2E tests for CFTR wizard happy path (4-step flow) and URL state roundtrip, with full gnomAD API mocking via page.route**

## Performance

- **Duration:** 16 min
- **Started:** 2026-02-24T13:16:46Z
- **Completed:** 2026-02-24T13:33:03Z
- **Tasks:** 2
- **Files modified:** 4 created

## Accomplishments

- Playwright config recreated at repo root with `testDir=./apps/web/e2e` and webServer targeting bun dev server
- TypeScript gnomAD API fixtures for 3 operations (GeneSearch, GeneDetails, GeneVariants) with realistic CFTR variants (p.Phe508del LoF HC, p.Gly542* stop_gained)
- CFTR wizard happy path E2E test: selects gene, navigates all 4 wizard steps, asserts clinical text contains CFTR
- URL state roundtrip test: reaches Step 4, captures URL with `gene=CFTR&step=4`, opens fresh page, verifies state restoration without manual navigation
- All 3 tests pass (22.4s) using mocked gnomAD API — no real network dependency

## Task Commits

1. **Task 1: Create Playwright config and gnomAD API fixtures** - `f7d7dea` (chore)
2. **Task 2: Write CFTR wizard happy path and URL roundtrip E2E tests** - `d8441ed` (feat)

## Files Created/Modified

- `playwright.config.ts` — Playwright config: testDir=./apps/web/e2e, chromium only, reuseExistingServer locally
- `apps/web/e2e/fixtures/gnomad-responses.ts` — TypeScript fixtures for GeneSearch, GeneDetails, GeneVariants operations
- `apps/web/e2e/cftr-wizard.spec.ts` — CFTR 4-step wizard happy path test
- `apps/web/e2e/url-sharing.spec.ts` — URL state roundtrip test (captures and restores URL with gene=CFTR)

## Decisions Made

- `page.route('https://gnomad.broadinstitute.org/api')` — exact URL string works; glob `**` wildcards not needed for exact match
- `dismissDisclaimer()` helper required — `DisclaimerBanner` is a persistent Vuetify v-dialog that blocks all clicks in fresh browser contexts
- `.locator('input')` inside `data-testid="gene-search-input"` — Vuetify v-autocomplete has `data-testid` on the outer div wrapper, not the actual `<input>` element
- `.first()` for CFTR autocomplete option — gnomAD returns CFTR, CFTRP1, CFTRP2, CFTRP3, CFTR-AS1; Playwright strict mode requires unique match
- StepFrequency success text verified from source: `"Carrier frequency calculated from gnomAD data."` (not "Calculated carrier frequency...")
- ClinGen CSV also intercepted with stub data to avoid external network dependency

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed wrong alert text assertion in step 3**

- **Found during:** Task 2 (running tests)
- **Issue:** Test expected `"Calculated carrier frequency from gnomAD data."` but StepFrequency.vue shows `"Carrier frequency calculated from gnomAD data."`
- **Fix:** Corrected string in both cftr-wizard.spec.ts and url-sharing.spec.ts
- **Files modified:** apps/web/e2e/cftr-wizard.spec.ts, apps/web/e2e/url-sharing.spec.ts
- **Verification:** Tests pass after correction
- **Committed in:** d8441ed (Task 2 commit)

**2. [Rule 1 - Bug] Added disclaimer dismissal before all interactions**

- **Found during:** Task 2 (first test run)
- **Issue:** DisclaimerBanner persistent v-dialog blocked all page interactions — `click()` timed out because `<li>Variant classifications...</li>` intercepted pointer events
- **Fix:** Added `dismissDisclaimer()` helper called at start of each test
- **Files modified:** apps/web/e2e/cftr-wizard.spec.ts, apps/web/e2e/url-sharing.spec.ts
- **Verification:** Tests pass after fix
- **Committed in:** d8441ed (Task 2 commit)

**3. [Rule 1 - Bug] Fixed v-autocomplete input targeting**

- **Found during:** Task 2 (initial click timeout)
- **Issue:** `data-testid="gene-search-input"` targets outer v-autocomplete div, not the actual `<input>` element — click failed
- **Fix:** Used `.locator('input')` to target inner input element
- **Files modified:** apps/web/e2e/cftr-wizard.spec.ts, apps/web/e2e/url-sharing.spec.ts
- **Verification:** Input accepts text and triggers search
- **Committed in:** d8441ed (Task 2 commit)

---

**Total deviations:** 3 auto-fixed (3 bugs discovered during test execution)
**Impact on plan:** All auto-fixes required for tests to run correctly. No scope creep.

## Issues Encountered

- gnomAD API returns multiple CFTR-family genes (CFTR, CFTRP1, CFTRP2, etc.) causing Playwright strict mode violation — resolved by using `.first()` and regex `/^CFTR\b/`
- Real gnomAD API called despite mock (initial glob pattern confusion) — resolved by debugging with page.on('request') logging; confirmed exact URL interception works correctly

## Next Phase Readiness

- Playwright E2E infrastructure ready for use in plan 29-05 (CI pipeline)
- 3 passing tests: cftr-wizard happy path + 2 URL roundtrip tests
- All API calls mocked — tests are network-independent and CI-safe
- `reuseExistingServer: !process.env.CI` requires CI to start its own dev server (standard Playwright CI pattern)

---
*Phase: 29-test-suite-completion*
*Completed: 2026-02-24*
