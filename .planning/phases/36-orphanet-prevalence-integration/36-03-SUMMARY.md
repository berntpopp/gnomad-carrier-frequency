---
phase: 36-orphanet-prevalence-integration
plan: "03"
subsystem: integration
tags: [wizard, watcher, composable-instance, pinia-cache, cli-integration, workbox, stale-while-revalidate]

requires:
  - phase: 36-01
    provides: "@gnomad-cf/core/orphanet subpath with fetchOrphanetData, selectPrimaryDisease, OrphanetDisease, OrphanetResult types"
  - phase: 36-02
    provides: "useOrphanetStore (Pinia session cache), useOrphanetData (reactive composable), OrphanetSection.vue component"

provides:
  - "WizardStepper.vue: eager Orphanet fetch triggered on gene selection at Step 1 (watch state.gene)"
  - "StepResults.vue: second useOrphanetData instance, watch result.value.gene.symbol, OrphanetSection integrated at bottom of summary card"
  - "CLI Orphanet integration: fetchOrphanetData in query.ts, formatOrphanetSection in text-formatter.ts, orphanetDiseases field in QueryResult"
  - "Workbox runtimeCaching: StaleWhileRevalidate for api.orphadata.com with 24h expiry and 50-entry cap"

affects:
  - "Phase 37: depends on Phase 36 for complete Orphanet integration; can assume Orphanet data available in clinical calculations"

tech-stack:
  added: []
  patterns:
    - "Two composable instances pattern: WizardStepper and StepResults each initialize useOrphanetData independently, with Pinia store as shared cache"
    - "Eager prefetch in parent container: WizardStepper watches step 1 gene selection and fires fetchForGene early; StepResults inherits warm cache"
    - "Cache-first fetch: composable checks Pinia store first (instant if hit), skips if pending, else fetches. No duplicate network requests across two instances."
    - "Watch immediate:true on both WizardStepper (state.gene) and StepResults (result.value?.gene?.symbol) — handles fresh page loads and component remounts"
    - "CLI Orphanet fetch wrapped in try/catch — non-blocking, silent failure, supplementary data"
    - "Workbox StaleWhileRevalidate for Orphanet API — serves stale cache while requesting fresh in background, suitable for slow-changing reference data"

key-files:
  created: []
  modified:
    - apps/web/src/components/wizard/WizardStepper.vue
    - apps/web/src/components/wizard/StepResults.vue
    - apps/web/vite.config.ts
    - packages/cli/src/types.ts
    - packages/cli/src/commands/query.ts
    - packages/cli/src/output/text-formatter.ts

key-decisions:
  - "WizardStepper watches state.gene (Step 1), NOT result (Step 4) — must trigger fetch before gnomAD query completes"
  - "StepResults watches result.value?.gene?.symbol (Step 4 resolved gene) — reads from Pinia cache instantly (no duplicate network request)"
  - "Two separate useOrphanetData() instances: WizardStepper prefills Pinia store cache at Step 1; StepResults reads same Pinia store at Step 4. Each has own loading/diseases refs."
  - "Pinia store is shared cache; composable instances don't duplicate network requests thanks to fetchForGene cache-first logic"
  - "CLI Orphanet fetch is try/catch silent failure — supplementary reference data, not critical"
  - "formatOrphanetSection uses labelLine helper for consistent alignment; shows all diseases (not just primary) with prevalence and URL"
  - "Workbox StaleWhileRevalidate for api.orphadata.com (24h expiry, 50 entries max) — offline resilience while allowing fresh background refresh"
  - "Orphanet data NOT added to clinical letter templates (template-renderer.ts, de.json, en.json) — only analytical CLI text and web summary card"
  - "OrphanetSection hidden entirely on error/zero diseases (no empty state UI) — per CONTEXT.md"

patterns-established:
  - "Multi-instance composable pattern: same composable used in multiple components with shared Pinia store for deduplication"
  - "CLI supplementary data pattern: fetch wrapped in try/catch, silent failure, included in analytical output but not templates"
  - "Web + CLI parity: both receive Orphanet data from same @gnomad-cf/core/orphanet client, formatted appropriately per output type"

duration: 45min
completed: "2026-02-27"
---

# Phase 36 Plan 03: Orphanet Integration in Web + CLI Summary

**Complete end-to-end Orphanet prevalence integration: eager prefetch in wizard step 1, display in results summary card, CLI analytical text output, and PWA offline cache**

## Performance

- **Duration:** 45 min
- **Started:** 2026-02-27T08:42:30Z
- **Completed:** 2026-02-27T09:27:45Z
- **Tasks:** 2 (+ human verification checkpoint + orchestrator-added E2E tests)
- **Files created/modified:** 6
- **Tests:** 9 new Playwright E2E tests added by orchestrator post-approval (all passing)

## Accomplishments

- **WizardStepper.vue:** Added `useOrphanetData` composable initialization and eager-prefetch watcher on `state.gene` (Step 1 gene selection). Fetch fires immediately when user selects gene, before clicking Next or starting gnomAD query.

- **StepResults.vue:** Added second `useOrphanetData` instance and `OrphanetSection` component at bottom of summary card. Watcher on `result.value?.gene?.symbol` triggers `fetchForGene` on mount — reads from Pinia store cache (no duplicate network request). Section shows skeleton → content or hides on error.

- **CLI integration:** Added `orphanetDiseases` optional field to `QueryResult` type. Modified `query.ts` to fetch Orphanet data post-gnomAD (try/catch silent failure). Created `formatOrphanetSection` function in `text-formatter.ts` with consistent alignment via `labelLine` helper, showing all diseases with prevalence and Orphanet URLs.

- **PWA Workbox cache:** Added `StaleWhileRevalidate` handler for `api.orphadata.com` with 24-hour expiry and 50-entry cap in `vite.config.ts`.

- **All verification passed:** `bun run typecheck`, `bun run build`, `bun run test` (519 unit tests pass). Web app: Orphanet section visible in summary card for CFTR with correct data and eager fetch confirmed in DevTools Network tab (fires at Step 1, not Step 4). CLI: `bun run src/cli.ts query CFTR` shows Orphanet Prevalence section with disease names, [AR] tags, prevalence classes, and URLs. Error handling: section hides gracefully on API failure.

- **Orchestrator-added E2E tests:** 9 Playwright tests covering clinical accuracy (CFTR disease count), eager fetch timing (API call before Step 4), graceful degradation (API failure hides section), and accessibility (data-testid attributes).

## Task Commits

Each task was committed atomically:

1. **Task 1: Eager fetch in WizardStepper + OrphanetSection in StepResults** - `51af50c` (feat)
   - WizardStepper.vue: import useOrphanetData, initialize composable, add watch on state.gene with immediate:true
   - StepResults.vue: import useOrphanetData and OrphanetSection.vue, initialize composable, watch on result.value?.gene?.symbol, render OrphanetSection with props

2. **Task 2: CLI Orphanet integration + PWA Workbox cache** - `c28122d` (feat)
   - types.ts: add orphanetDiseases optional field to QueryResult
   - query.ts: import fetchOrphanetData, add try/catch fetch after queryGene, populate result.orphanetDiseases
   - text-formatter.ts: add formatOrphanetSection function with labelLine alignment, integrate into formatText output
   - vite.config.ts: add Workbox runtimeCaching entry for api.orphadata.com

3. **Orchestrator E2E tests** - `29af49c` (test)
   - phase36-orphanet.spec.ts: 9 Playwright tests covering web UI accuracy, eager fetch, degradation, accessibility

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- **apps/web/src/components/wizard/WizardStepper.vue** - Added useOrphanetData import, composable initialization, eager-prefetch watcher on state.gene (Step 1 trigger)
- **apps/web/src/components/wizard/StepResults.vue** - Added useOrphanetData import, OrphanetSection.vue import, composable initialization, immediate watcher on result.value?.gene?.symbol, OrphanetSection component in template at bottom of summary card
- **apps/web/vite.config.ts** - Added Workbox runtimeCaching for api.orphadata.com with StaleWhileRevalidate handler, 24h expiry, 50-entry cap
- **packages/cli/src/types.ts** - Added optional orphanetDiseases field to QueryResult interface with type OrphanetDisease[]
- **packages/cli/src/commands/query.ts** - Added import fetchOrphanetData from @gnomad-cf/core/orphanet, try/catch Orphanet fetch post-gnomAD query, populate result.orphanetDiseases
- **packages/cli/src/output/text-formatter.ts** - Added formatOrphanetSection function with labelLine alignment and disease/prevalence/URL formatting, integrated into formatText output after population sections

## Decisions Made

- **WizardStepper watcher target:** Watch `state.gene` (Step 1), NOT `result` (Step 4). Ensures fetch fires immediately when user selects gene, before proceeding through wizard or starting gnomAD query.

- **StepResults watcher target:** Watch `result.value?.gene?.symbol` (resolved Step 4 query result), NOT `state.gene`. By Step 4, WizardStepper's eager fetch has already completed and Pinia store cache is warm. This fetchForGene call hits cache instantly — no network request, no loading state.

- **Two composable instances with shared Pinia cache:** Both WizardStepper and StepResults initialize independent `useOrphanetData()` instances. Each gets its own reactive refs (loading, diseases, etc.). The Pinia store (`useOrphanetStore`) is the shared cache that deduplicates network requests. This pattern allows each component to have local loading states and lifecycle independence while avoiding duplicate API calls.

- **CLI fetch try/catch silent failure:** Orphanet data is supplementary reference information. Wrapping in try/catch with silent catch block ensures API failure/timeout doesn't crash the CLI. Missing Orphanet data is acceptable; the user gets analysis results without it.

- **formatOrphanetSection uses labelLine:** Consistent left-aligned formatting with same helper used elsewhere in CLI output. Shows all diseases (not just primary) — CLI is comprehensive, web UI filters to primary + expandable list.

- **Workbox StaleWhileRevalidate strategy:** Orphanet prevalence data changes slowly. Serving stale cache while requesting fresh in background is appropriate. 24-hour expiry balances freshness and offline resilience. 50-entry cap prevents unbounded cache growth for genes with multiple diseases.

- **Orphanet NOT in clinical letter templates:** CONTEXT.md decision "summary card only, not included in clinical text output" specifically refers to clinical patient letters (template-renderer.ts, de.json, en.json). The Orphanet section is added to CLI analytical text (text-formatter.ts), which is separate from clinical letter templates. No changes to template system.

- **OrphanetSection hides entirely on error:** Per CONTEXT.md, component has no empty state UI. On API failure, error, or zero diseases, the section renders nothing — no error message, no skeleton, just hidden.

- **immediate:true on both watchers:** Handles edge cases: WizardStepper remounting with gene already selected (immediate fetch), StepResults remounting after browser refresh (immediate cache read or network fetch). Ensures data consistency.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. Orphanet API is public (CORS-enabled), no authentication needed. Workbox runs automatically in production PWA.

## Next Phase Readiness

- Phase 36 complete (3/3 plans).
- Orphanet prevalence data available across web (summary card) and CLI (analytical text) with offline PWA caching.
- Phase 37 (Subcontinental analysis) ready to proceed — can assume Orphanet context available for population-level calculations if needed.

## Quality & Testing

- **Unit tests:** All 519 existing tests pass (no regressions).
- **E2E tests:** 21 total passing (12 existing + 9 new Playwright tests added by orchestrator post-approval).
  - CFTR prevalence accuracy (1-5 / 10 000, Europe)
  - HEXA graceful degradation (subtypes lack epi data, section hides)
  - Eager fetch timing (API call visible in Network tab before Step 4)
  - Link click behavior (opens orpha.net in new tab)
  - [AR] badge display for autosomal recessive diseases
  - Expand/collapse behavior for +N more list
  - Disclaimer text presence
  - Accessibility: data-testid attributes for E2E selectors
- **TypeCheck:** ✓ tsc --build passes
- **Lint:** ✓ ESLint passes
- **Build:** ✓ bun run build succeeds for core, web, CLI

---

*Phase: 36-orphanet-prevalence-integration*
*Completed: 2026-02-27*
