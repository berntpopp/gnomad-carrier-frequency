---
phase: 34-quality-flags-source-breakdown
plan: "02"
subsystem: ui
tags: [pinia, vue3, composable, quality-flags, carrier-frequency, localStorage]

# Dependency graph
requires:
  - phase: 34-01
    provides: QualitySettings, QualityExclusionConfig, FACTORY_QUALITY_DEFAULTS, FACTORY_EXCLUSION_DEFAULTS, computeQualityFlags, shouldExcludeByQuality types and functions
provides:
  - useQualityStore Pinia store persisted to localStorage with QualitySettings and QualityExclusionConfig defaults
  - useCarrierFrequency composable with quality exclusion integration (qualityFlagsMap, qualityExcludedCount, flaggedVariantCount, filteredByPathogenicity, qualityExclusionConfig)
affects:
  - 34-03-quality-flags-ui (uses qualityFlagsMap, qualityExcludedCount from composable)
  - 34-04-source-breakdown (uses filteredByPathogenicity from composable)
  - 34-05-settings-integration (uses useQualityStore for settings persistence)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Per-analysis local ref pattern: qualityExclusionConfig initialized from store defaults, not persisted on every toggle (Pitfall 7)"
    - "Single source computed: filteredByPathogenicity feeds all downstream exclusion computeds (DRY)"
    - "Separate exclusion count tracking: qualityExcludedCount distinct from manual excludedCount (Pitfall 4)"

key-files:
  created:
    - apps/web/src/stores/useQualityStore.ts
  modified:
    - apps/web/src/composables/useCarrierFrequency.ts

key-decisions:
  - "qualityExclusionConfig is per-analysis local ref (not reactive to store) — avoids shared state pollution across genes (Pitfall 7)"
  - "filteredByPathogenicity replaces two separate filterPathogenicVariantsConfigurable calls (DRY + performance)"
  - "qualityExcludedCount tracked separately from excludedCount (manual) to enable separate display in UI (Pitfall 4)"
  - "All exclusions default OFF — FACTORY_EXCLUSION_DEFAULTS all-false means zero behavior change for existing users"

patterns-established:
  - "Quality store pattern: defineStore with persist key 'carrier-freq-quality' following useFilterStore convention"
  - "Quality exclusion pipeline: filteredByPathogenicity -> qualityFlagsMap -> qualityExcludedIds -> pathogenicVariants"

# Metrics
duration: 4min
completed: 2026-02-26
---

# Phase 34 Plan 02: useQualityStore and useCarrierFrequency Quality Integration Summary

**useQualityStore Pinia store with localStorage persistence + quality flag exclusion wired into carrier frequency calculation, exposing filteredByPathogenicity for downstream source classification**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-02-26T15:53:44Z
- **Completed:** 2026-02-26T15:57:37Z
- **Tasks:** 2
- **Files modified:** 2 (1 created, 1 modified)

## Accomplishments

- Created useQualityStore with persisted QualitySettings defaults and QualityExclusionConfig defaults, following exact useFilterStore pattern
- Wired quality flag exclusions into useCarrierFrequency: qualityFlagsMap computed from filteredByPathogenicity, qualityExcludedIds drives exclusion from pathogenicVariants
- Exposed filteredByPathogenicity in UseCarrierFrequencyReturn interface for downstream source classification (Plan 04)
- Maintained zero behavior change for existing users (all exclusions default OFF)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create useQualityStore Pinia store** - `f25b413` (feat)
2. **Task 2: Wire quality exclusions into useCarrierFrequency** - `cb95f3b` (feat)

## Files Created/Modified

- `apps/web/src/stores/useQualityStore.ts` - New Pinia store with persisted QualitySettings and QualityExclusionConfig defaults; actions: setDefaults, setExclusionDefaults, resetToFactoryDefaults
- `apps/web/src/composables/useCarrierFrequency.ts` - Added quality exclusion pipeline: filteredByPathogenicity, qualityFlagsMap, qualityExcludedIds, qualityExcludedCount, flaggedVariantCount; pathogenicVariants now filters both manual and quality exclusions; qualityExclusionConfig is per-analysis local ref reset on gene change

## Decisions Made

- **qualityExclusionConfig as per-analysis local ref**: Initialized from store defaults but not persisted back on every toggle. This prevents shared state pollution when switching between genes (Pitfall 7 in RESEARCH.md). Users who want persistent exclusion defaults can change them in Settings (Plan 05).
- **filteredByPathogenicity as single source**: Replaced two separate calls to `filterPathogenicVariantsConfigurable` (one for count, one for the actual filter) with a single computed. Both totalPathogenicCount and pathogenicVariants now derive from this single source — cleaner and avoids double computation.
- **Separate exclusion counts**: qualityExcludedCount is tracked independently from the manual excludedCount. This enables the UI to show "3 excluded manually, 2 excluded by quality flags" rather than a combined total (Pitfall 4 in RESEARCH.md).
- **All exclusions default OFF**: FACTORY_EXCLUSION_DEFAULTS has all fields false. Users explicitly opt in to excluding flagged variants. Zero behavioral change for existing users.

## Deviations from Plan

None - plan executed exactly as written. The unused `FACTORY_EXCLUSION_DEFAULTS` import was removed (clean-up during implementation — it was specified in the plan but qualityStore.exclusionDefaults is used instead of the constant directly).

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- useQualityStore is ready for Plan 05 (Settings integration) to expose quality flag threshold controls in the UI
- qualityFlagsMap and qualityExcludedCount are ready for Plan 03 (Quality Flags UI) to render flag badges and exclusion toggles on variant rows
- filteredByPathogenicity is ready for Plan 04 (Source Breakdown) to classify variants by source category
- All 508 tests pass, build succeeds — no regressions

---
*Phase: 34-quality-flags-source-breakdown*
*Completed: 2026-02-26*
