---
phase: 34-quality-flags-source-breakdown
plan: "04"
subsystem: ui
tags: [vue3, vuetify, variant-table, quality-flags, source-classification, singleton-pattern, composable]

# Dependency graph
requires:
  - phase: 34-02
    provides: useCarrierFrequency singleton with qualityFlagsMap, filteredByPathogenicity, qualityExcludedCount, flaggedVariantCount, qualifyingVariantCount, qualityExclusionConfig

provides:
  - VariantTable with quality flags column (warning icon, count badge, severity tooltip) and source category column (ClinVar/pLoF/Both chip)
  - StepResults with quality exclusion alert, flagged count in summary, and FilterPanel quality prop wiring via v-bind spread
  - useCarrierFrequency mock in StepResults tests preventing villus client errors

affects:
  - 34-03 (FilterPanel will accept qualityExclusionConfig props wired by this plan)
  - 34-05 (settings integration builds on the same singleton pattern)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Singleton access in child components: VariantTable accesses useCarrierFrequency directly (no prop drilling through VariantModal)"
    - "sourceCategoryMap computed from filteredByPathogenicity (singleton's single-source filtered list)"
    - "v-bind spread for forward-compatible FilterPanel quality props (typed props added by 34-03)"
    - "qualifyingVariantCount replaces local filteredCount in StepResults (DRY, single source)"

key-files:
  created: []
  modified:
    - apps/web/src/components/VariantTable.vue
    - apps/web/src/components/wizard/StepResults.vue
    - apps/web/src/components/wizard/__tests__/StepResults.test.ts

# Decisions
decisions:
  - id: D1
    decision: "VariantTable accesses useCarrierFrequency singleton directly instead of receiving props via VariantModal"
    rationale: "VariantModal has no quality/source props in its interface; prop drilling would require touching VariantModal and adding 4+ new props. Singleton access is the same pattern used by useExclusionState in VariantTable."
    impact: "Zero changes to VariantModal.vue; cleaner component boundary"
  - id: D2
    decision: "FilterPanel quality props passed via v-bind spread (not named props)"
    rationale: "FilterPanel's defineProps does not yet include quality props (added by 34-03 in parallel wave). v-bind spread bypasses Volar's prop type checking, allowing wiring to succeed without TypeScript errors. Props become active when 34-03 adds the interface."
    impact: "Typecheck passes in 34-04 without waiting for 34-03; no runtime issues (unknown attrs passed as fallthrough)"
  - id: D3
    decision: "Removed local filteredCount computed from StepResults; replaced with qualifyingVariantCount from singleton"
    rationale: "filteredCount duplicated filter logic already computed by the singleton. qualifyingVariantCount is the authoritative count that includes quality exclusions."
    impact: "DRY; count shown in Variants button and summary text is now consistent with the actual calculation"
  - id: D4
    decision: "Second-column sticky CSS removed from VariantTable (previously froze variant_id column)"
    rationale: "Quality and source columns are inserted before variant_id, shifting all column indices. Freezing by nth-child(2) would freeze the quality column instead. Only the checkbox column (first) is frozen."
    impact: "Variant ID column scrolls with the table on small screens; this is acceptable given the new columns"

# Metrics
metrics:
  duration: "6m 7s"
  completed: "2026-02-26"
  tasks_completed: 2
  tasks_total: 2
  tests_at_completion: 508
---

# Phase 34 Plan 04: UI Wiring — Quality Flags Column and Source Badge Summary

**One-liner:** Quality flag warning icons and source category chips in VariantTable, plus flagged count, quality exclusion alert, and FilterPanel quality prop wiring in StepResults — all data accessed via the useCarrierFrequency singleton.

## What Was Built

### Task 1: VariantTable — quality flags column and source badge column

Modified `apps/web/src/components/VariantTable.vue` to add two new columns using the singleton composable pattern.

**Quality flags column (`qualityFlags` key):**
- Warning icon (`mdi-alert`) with count badge showing number of flags
- Badge and icon colored by worst severity: `error` (critical), `warning` (warning), `blue-grey` (info)
- Hover tooltip listing each flag with colored label and explanation text
- Unflagged variants show nothing in this column
- Data sourced from `qualityFlagsMap` in the useCarrierFrequency singleton

**Source category column (`sourceCategory` key):**
- Colored chip: blue for ClinVar, deep-purple for pLoF, green for Both
- Hover tooltip explains the inclusion reason
- `sourceCategoryMap` computed from `filteredByPathogenicity` (the singleton's already-filtered list)
- `classifyVariantSource` called with singleton's `clinvarVariants`, `filterConfig`, and `submissions`

**Headers:** Converted from `ref` to `computed`; quality and source columns inserted between include checkbox and variant_id.

**Sticky CSS:** Removed second-column freeze (was freezing variant_id by nth-child(2)); only checkbox column (first) remains frozen. This prevents index confusion from the two new columns.

**VariantModal.vue:** No changes required — VariantTable accesses the singleton directly.

### Task 2: StepResults — quality wiring, summary, and FilterPanel props

Modified `apps/web/src/components/wizard/StepResults.vue`:

1. **Import useCarrierFrequency** and destructure: `qualityExclusionConfig`, `setQualityExclusionConfig`, `qualityExcludedCount`, `flaggedVariantCount`, `qualifyingVariantCount`.

2. **Replaced local `filteredCount`** with `qualifyingVariantCount` from singleton. Removed the now-redundant `filteredCount` computed. `filteredVariants` kept for modal variant display only.

3. **Quality exclusion alert** added above summary card: shown when `qualityExcludedCount > 0`.

4. **Flagged count in summary** supporting text: shown alongside the manually excluded count when `flaggedVariantCount > 0`.

5. **FilterPanel quality props** forwarded via `v-bind="qualityFilterPanelProps"` (computed spreading `qualityExclusionConfig`, `qualityExcludedCount`, `flaggedVariantCount`). The `@update:quality-exclusion-config` event handler calls `setQualityExclusionConfig`. FilterPanel will activate these props when Plan 34-03 adds the interface.

6. **"Variants (N)" button** uses `qualifyingVariantCount`.

### Deviation: Auto-fixed bug in StepResults tests

**Type:** Rule 1 — Bug Fix

**Found during:** Task 2 — running tests after adding `useCarrierFrequency` import to StepResults

**Issue:** `StepResults.test.ts` tests failed with "Cannot detect villus Client" because calling `useCarrierFrequency()` from StepResults triggers the singleton's initialization (which calls `useGeneVariants`, which calls villus's `useQuery` — requiring a client provider not set up in unit tests).

**Fix:** Added `vi.mock("@/composables/useCarrierFrequency", ...)` returning a fully stubbed return value matching `UseCarrierFrequencyReturn`. Consistent with existing mocks for `useExclusionState`, `useGeneSearch`, etc.

**Files modified:** `apps/web/src/components/wizard/__tests__/StepResults.test.ts`

**Commit:** included in Task 2 commit (8481419)

## Verification Results

- `bun run typecheck` — passes (exit 0)
- `bun run build` — passes (exit 0, 15.1s)
- `bun run test -- --run` — 508/508 tests pass (all 5 StepResults tests pass with the new mock)

## Next Phase Readiness

- **34-03** (FilterPanel + SettingsDialog quality UI): FilterPanel props interface additions will activate the `v-bind` spread already wired in StepResults. No further changes to StepResults needed.
- **34-05** (settings integration): useQualityStore singleton is already available; no 34-04 blockers.
