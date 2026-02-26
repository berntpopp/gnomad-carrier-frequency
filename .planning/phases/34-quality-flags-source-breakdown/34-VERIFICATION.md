---
phase: 34-quality-flags-source-breakdown
verified: 2026-02-26T21:57:40Z
status: passed
score: 5/5 must-haves verified
---

# Phase 34: Quality Flags & Source Breakdown Verification Report

**Phase Goal:** Users can see at a glance which variants have quality concerns (high AF, high homozygote count, gnomAD filtered, genomes-only) and understand whether each variant was identified via ClinVar, pLoF classification, or both -- with the option to exclude flagged variants from calculations.

**Verified:** 2026-02-26T21:57:40Z
**Status:** PASSED
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Variant table shows colored quality flag chips with tooltips | VERIFIED | VariantTable.vue lines 55-88: item.qualityFlags template renders v-badge+v-icon mdi-alert colored by worstFlagColor, tooltip lists each flag with flagTypeColorCss label and flag.explanation text |
| 2 | Results overview shows flagged count summary; settings has threshold controls | VERIFIED | StepResults.vue lines 236-238: flaggedVariantCount rendered in summary; SettingsDialog.vue lines 562-728: Quality tab with 4 cards (High AF slider, High Hom method/multiplier, gnomAD Filtered, Genomes Only) each bound to qualityStore.defaults |
| 3 | Users can exclude flagged variants per-type; frequency updates in real time | VERIFIED | FilterPanel.vue lines 390-449: 4 per-flag-type v-switch components emit update:qualityExclusionConfig; useCarrierFrequency.ts lines 278-302: qualityExcludedIds computed -> pathogenicVariants filters -> aggregatedPops + globalStats recompute reactively |
| 4 | Each variant shows a source badge (ClinVar/pLoF/Both); results split CF by source per population | VERIFIED | VariantTable.vue lines 91-105: colored chip via sourceCategoryLabel/sourceCategoryColor; StepResults.vue lines 385-479: expandable source-breakdown-row tr elements using computeSourceBreakdown per expanded population |
| 5 | Source classification is separate from the existing filter pipeline (SRC-05) | VERIFIED | source-classification.ts never calls or modifies shouldIncludeVariantConfigurable; variant-filters.ts is unchanged; classifyVariantSource mirrors the logic independently |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| packages/core/src/types/quality.ts | QualityFlagType, QualityFlag, QualitySettings, QualityExclusionConfig, FACTORY_QUALITY_DEFAULTS, FACTORY_EXCLUSION_DEFAULTS | VERIFIED | 76 lines, all 6 exports present, highAfThreshold: 0.05, all exclusions default false |
| packages/core/src/filters/quality-flags.ts | isHighAF, isHighHom, isGnomadFiltered, isGenomesOnly, computeQualityFlags, shouldExcludeByQuality, flagSeverityColor, flagTypeColor | VERIFIED | 277 lines, all functions with dynamic explanation strings (QUAL-08), joint-first data pattern, per-population AF check |
| packages/core/src/filters/source-classification.ts | classifyVariantSource, SourceCategory, sourceCategoryLabel, sourceCategoryColor | VERIFIED | 107 lines, HC LoF only check, optional submissionsMap, SRC-05 preserved |
| packages/core/src/calculations/source-frequency.ts | computeSourceBreakdown, SourceBreakdownRow | VERIFIED | 111 lines, groups variants by source category, per-population AC/AN with joint-first pattern, HWE/simplified formula support |
| apps/web/src/stores/useQualityStore.ts | Pinia store with QualitySettings, QualityExclusionConfig, persisted to localStorage | VERIFIED | 47 lines, defineStore with persist plugin (key: carrier-freq-quality), setDefaults, setExclusionDefaults, resetToFactoryDefaults |
| apps/web/src/composables/useCarrierFrequency.ts | qualityFlagsMap, qualityExcludedCount, flaggedVariantCount, filteredByPathogenicity, qualifyingVariants, setQualityExclusionConfig | VERIFIED | 629 lines, all quality fields in UseCarrierFrequencyReturn interface and singleton; qualityExclusionConfig reset on gene change |
| apps/web/src/components/VariantTable.vue | qualityFlags column with badge+tooltip; sourceCategory column with chip | VERIFIED | 677 lines, qualityFlags template (lines 55-88) and sourceCategory template (lines 91-105); headers computed includes both columns; singleton access via useCarrierFrequency |
| apps/web/src/components/SettingsDialog.vue | Quality tab (4th section) with 4 flag cards and threshold controls | VERIFIED | 1121 lines, v-window-item value=quality at line 562, all 4 cards with sliders/toggles bound to qualityStore, highAfPercent computed, Reset button |
| apps/web/src/components/FilterPanel.vue | Quality exclusion toggles section (4 per-type switches, conditional on prop) | VERIFIED | 621 lines, template v-if=qualityExclusionConfig at line 390, 4 typed switches with correct emit, backwards-compatible optional props |
| apps/web/src/components/wizard/StepResults.vue | qualityExcludedCount alert, flaggedVariantCount in summary, FilterPanel quality props, expandable population rows | VERIFIED | 1242 lines, quality alert (lines 31-39), flagged count in summary (lines 236-238), qualityFilterPanelProps computed (lines 660-664), expandable source breakdown rows (lines 444-479) |
| apps/web/e2e/phase34-quality-source.spec.ts | E2E test suite covering quality flags, source chips, expandable rows, settings tab, exclusion toggles | VERIFIED | 476 lines, 3 tests with fixture data (4 variants triggering all flag/source types) |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| VariantTable.vue | useCarrierFrequency singleton | useCarrierFrequency() at line 367 | WIRED | Destructures qualityFlagsMap, filteredByPathogenicity, clinvarVariants, filterConfig, submissions |
| VariantTable.vue | qualityFlagsMap | getVariantFlags(item.variant_id) in template | WIRED | Called at lines 56, 61, 66; renders badge content and icon color |
| VariantTable.vue | classifyVariantSource | sourceCategoryMap computed | WIRED | Iterates filteredByPathogenicity, calls classifyVariantSource with all required args |
| StepResults.vue | FilterPanel.vue | v-bind=qualityFilterPanelProps + @update:quality-exclusion-config | WIRED | Props spread at line 252; event handler at line 255 calls setQualityExclusionConfig |
| StepResults.vue | computeSourceBreakdown | sourceBreakdownCache computed | WIRED | Called per expanded population code using qualifyingVariants, filterConfig, calcStore.defaults, submissions |
| FilterPanel.vue | useCarrierFrequency.setQualityExclusionConfig | event chain through StepResults | WIRED | updateQualityExclusion emits update:qualityExclusionConfig; StepResults handler calls setQualityExclusionConfig |
| useCarrierFrequency.ts | useQualityStore.defaults | qualityFlagsMap computed line 266 | WIRED | computeQualityFlags(variant, qualityStore.defaults) |
| useCarrierFrequency.ts | qualityExclusionConfig | qualityExcludedIds computed line 281 | WIRED | shouldExcludeByQuality(flags, qualityExclusionConfig.value) -> filters pathogenicVariants |
| SettingsDialog.vue | useQualityStore.defaults | v-model binding | WIRED | Direct v-model on qualityStore.defaults fields; Pinia reactivity + persist plugin handles localStorage sync |
| qualityExclusionConfig (ref) | real-time frequency update | Vue computed chain | WIRED | qualityExclusionConfig -> qualityExcludedIds -> pathogenicVariants -> aggregatedPops / globalStats -> populations / globalFrequency |

### Requirements Coverage

| Requirement | Status | Notes |
|-------------|--------|-------|
| QUAL-01 (High AF flag) | SATISFIED | isHighAF checks global + per-population AF with joint-first pattern |
| QUAL-02 (High Hom flag) | SATISFIED | isHighHom supports hwe_relative and absolute methods |
| QUAL-03 (gnomAD Filtered flag) | SATISFIED | isGnomadFiltered checks exome/genome filters arrays; filters field added to GraphQL query |
| QUAL-04 (Genomes Only flag) | SATISFIED | isGenomesOnly with correct joint-data check (Pitfall 1 from RESEARCH.md) |
| QUAL-05 (Quality settings configure thresholds) | SATISFIED | SettingsDialog Quality tab with 4 cards and persistent useQualityStore |
| QUAL-06 (Summary shows flagged count) | SATISFIED | flaggedVariantCount rendered in StepResults summary text at line 237 |
| QUAL-07 (Exclude flagged variants) | SATISFIED | FilterPanel quality exclusion toggles -> qualityExcludedIds -> filters pathogenicVariants |
| QUAL-08 (Tooltip explains flag with dynamic values) | SATISFIED | computeQualityFlags generates dynamic explanation strings with interpolated AF%, filter names, hom counts |
| SRC-01 (Source classification function) | SATISFIED | classifyVariantSource in source-classification.ts |
| SRC-02 (Source badge in variant table) | SATISFIED | sourceCategory column in VariantTable with colored chip and tooltip |
| SRC-03 (Source breakdown per population) | SATISFIED | computeSourceBreakdown pure function in source-frequency.ts |
| SRC-04 (Source breakdown displayed in results) | SATISFIED | Expandable population rows in StepResults with inline source breakdown rows |
| SRC-05 (Source classification separate from filter pipeline) | SATISFIED | shouldIncludeVariantConfigurable untouched; classifyVariantSource mirrors logic independently |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|---------|
| apps/web/src/components/SettingsDialog.vue | 55 | placeholder=Search settings... | Info | Vuetify v-text-field placeholder attribute -- intentional UX, not a stub |

No blocker or warning anti-patterns found. Zero TODO/FIXME comments in Phase 34 files. No empty return stubs. No stub handlers.

### Human Verification Required

**1. Quality flag badge visual rendering**

Test: Load any gene, open variant table, hover over a warning icon in the Qual column
Expected: Badge colored red (High AF), orange (High Hom), amber (gnomAD Filtered), or blue-grey (Genomes Only); tooltip shows flag label with numeric values in explanation
Why human: Color rendering and tooltip positioning cannot be verified by code inspection

**2. Expandable population row layout**

Test: Click the chevron icon on any non-global population row in the results table
Expected: Source breakdown sub-rows appear inline with colored left-border accent (blue=ClinVar, deep-purple=pLoF, green=Both); chip shows source label and variant count
Why human: Visual layout and inline row insertion require browser inspection

**3. Real-time frequency update on quality exclusion toggle**

Test: Enable Exclude High AF in FilterPanel quality exclusion section; observe global carrier frequency
Expected: Carrier frequency decreases within ~500ms when a High AF variant is excluded; re-enabling restores the original value
Why human: Reactivity timing and visual feedback require actual browser testing

**4. Quality settings persistence across page reload**

Test: Change High AF threshold in Settings Quality tab to 2%, save and reload page, open Settings again
Expected: Threshold retained at 2% (localStorage key: carrier-freq-quality)
Why human: localStorage persistence not verifiable by code inspection; e2e tests do not cover reload persistence

## Build and Test Status

- bun run typecheck: PASSED (exit 0) -- both @gnomad-cf/core and gnomad-cf-web
- bun run test --run: PASSED -- 508/508 tests across 31 test files, zero regressions
- Anti-patterns: 1 info-level (Vuetify placeholder attribute, not a stub)
- E2E tests: 3 Phase 34 tests written in apps/web/e2e/phase34-quality-source.spec.ts

## Gaps Summary

No gaps. All 5 must-haves are fully verified across all three levels (exists, substantive, wired). The quality flag and source breakdown feature set is complete and integrated throughout the component tree from pure core functions through Pinia store through composable through UI components.

---

_Verified: 2026-02-26T21:57:40Z_
_Verifier: Claude (gsd-verifier)_
