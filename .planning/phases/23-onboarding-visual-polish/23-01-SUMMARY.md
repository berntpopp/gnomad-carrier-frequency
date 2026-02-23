---
phase: 23-onboarding-visual-polish
plan: 01
subsystem: ui
tags: [vue3, pinia, vuetify, onboarding, welcome-card, gene-search, singleton-pattern]

# Dependency graph
requires:
  - phase: 22-cta-color-accessibility
    provides: primary/secondary color system and accessible Vuetify theme used by WelcomeCard
  - phase: 13-variant-exclusion
    provides: useExclusionState composable used in StepGene gene-change handler
provides:
  - onboarding state in useAppStore (onboardingDismissed, shouldShowOnboarding, dismissOnboarding)
  - WelcomeCard.vue inline tonal card with CFTR quick-start button
  - prefillGene(symbol) in useGeneSearch for programmatic gene search and auto-selection
  - useGeneSearch singleton promotion (searchTerm, debouncedTerm, selectedGene at module-level)
  - GeneSearch.vue display-only selectedGene watcher for external prefill sync
  - StepGene.vue single-watcher code path for gene selection (handles both manual and programmatic)
affects:
  - 23-02-onboarding-visual-polish (AppBar changes already in place)
  - 23-03-onboarding-visual-polish (useConfirmDialog already in place)
  - Any future feature using useGeneSearch (now singleton - shared state across all callers)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Singleton composable: searchTerm/debouncedTerm/selectedGene promoted to module-level refs (outside function body), matching existing sharedGeneConstraint pattern"
    - "prefillGene one-shot watcher: watch(results, handler, {immediate: false}) + clearTimeout pattern for async gene pre-selection"
    - "Display-only watcher: watch(selectedGene) in GeneSearch.vue syncs v-autocomplete local model without emitting, preventing double invocation"
    - "Single selection code path: StepGene watches selectedGene directly, removing @select emit dependency"

key-files:
  created:
    - src/components/WelcomeCard.vue
  modified:
    - src/stores/useAppStore.ts
    - src/composables/useGeneSearch.ts
    - src/components/GeneSearch.vue
    - src/components/wizard/StepGene.vue

key-decisions:
  - "prefillGene defined inside useGeneSearch() function body (not module-level) to access useQuery's data ref via closure — each caller gets their own query instance but shares debouncedTerm, so all queries fire simultaneously"
  - "One-shot watcher resolves on first non-empty results: clears timeout, stops watcher, finds exact symbol match or falls back to first result"
  - "GeneSearch display watcher does NOT emit select to prevent duplicate selectGene() and constraint fetch calls"
  - "StepGene uses watch(selectedGene) as single code path, removing @select handler dependency on GeneSearch emit"
  - "WelcomeCard dismisses immediately on click (before prefillGene completes) for instant visual feedback"

patterns-established:
  - "Onboarding state pattern: persist dismissal flag in Pinia store, shouldShow getter requires prerequisite (disclaimer) AND not-dismissed"
  - "prefillGene pattern: bypass debounce via direct debouncedTerm assignment, one-shot watcher with timeout for async resolution"

# Metrics
duration: 9min
completed: 2026-02-23
---

# Phase 23 Plan 01: Welcome Onboarding Card Summary

**First-time onboarding card with CFTR quick-start backed by persisted Pinia state and singleton useGeneSearch with programmatic prefillGene capability**

## Performance

- **Duration:** ~9 min
- **Started:** 2026-02-23T19:57:02Z
- **Completed:** 2026-02-23T20:05:52Z
- **Tasks:** 2
- **Files modified:** 5 (1 created, 4 modified)

## Accomplishments
- useAppStore extended with onboardingDismissed (persisted to localStorage), shouldShowOnboarding getter, and dismissOnboarding action
- WelcomeCard.vue created: tonal primary card with professional clinical description and "Try with CFTR" button with data-testid attributes
- useGeneSearch promoted to true singleton (searchTerm, debouncedTerm, selectedGene at module-level), matching existing sharedGeneConstraint pattern
- prefillGene(symbol) added: bypasses debounce, one-shot results watcher auto-selects matching gene within 5s timeout
- GeneSearch.vue gains display-only watch(selectedGene) to sync v-autocomplete local model on external changes
- StepGene.vue renders WelcomeCard and uses single watch(selectedGene) as authoritative gene-selection code path

## Task Commits

Each task was committed atomically:

1. **Task 1: Add onboarding state to useAppStore and create WelcomeCard component** - `2b97c4c` (feat)
2. **Task 2: Promote useGeneSearch to singleton, add prefillGene, sync GeneSearch display, wire WelcomeCard into StepGene** - `c93d392` (feat)

**Plan metadata:** (see final commit below)

## Files Created/Modified
- `src/stores/useAppStore.ts` - Added onboardingDismissed, shouldShowOnboarding getter, dismissOnboarding action
- `src/components/WelcomeCard.vue` - New: tonal primary card with CFTR quick-start, visibility via shouldShowOnboarding
- `src/composables/useGeneSearch.ts` - Singleton state promotion, prefillGene function added to interface and return
- `src/components/GeneSearch.vue` - Added display-only watch(selectedGene) for external prefill sync
- `src/components/wizard/StepGene.vue` - WelcomeCard rendered at top, replaced @select with watch(selectedGene) watcher

## Decisions Made
- prefillGene is defined inside `useGeneSearch()` (not module-level) to retain access to the `data`/`results` refs from that caller's `useQuery` instance. Since `debouncedTerm` is module-level, all active query instances fire simultaneously when prefillGene sets it — the calling instance's results watcher picks up the response.
- The one-shot watcher uses a non-immediate watch with 5-second timeout. Exact symbol match is preferred; falls back to `results[0]` if no exact match.
- GeneSearch's `watch(selectedGene)` does NOT emit `'select'` because `selectGene()` is already called by `prefillGene` — emitting would create a duplicate constraint fetch.
- WelcomeCard calls `appStore.dismissOnboarding()` BEFORE `prefillGene()` for immediate visual feedback (card disappears instantly, not after async search completes).
- StepGene's `watch(selectedGene, ...)` handles null (user cleared selection) by emitting `update:modelValue` with null, maintaining v-model contract.

## Deviations from Plan

None - plan executed exactly as written. The TypeScript error on `newResults.find()` returning `undefined` was resolved by using non-null assertion `newResults[0]!` (safe because the condition `newResults.length > 0` guards the block).

## Issues Encountered
- vue-tsc `--noEmit` mode uses incremental build and reported 0 files checked — used `vue-tsc -b` (build mode) for accurate full-project type checking, which correctly caught the `find()` return type issue.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Plans 23-02 (AppBar gene context chip) and 23-03 (useConfirmDialog) are already complete (pre-committed)
- Phase 23 is now fully complete (3/3 plans done)
- Phase 24 (Documentation Content) is the final remaining phase for v1.4

---
*Phase: 23-onboarding-visual-polish*
*Completed: 2026-02-23*
