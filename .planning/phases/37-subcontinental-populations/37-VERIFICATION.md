---
phase: 37-subcontinental-populations
verified: 2026-02-27T15:52:34Z
status: passed
score: 4/4 must-haves verified
---

# Phase 37: Subcontinental Populations Verification Report

**Phase Goal:** Users analyzing gnomAD v2.1.1 data can expand continental populations to see subcontinental breakdowns (NFE into subgroups, EAS into subgroups), with quality warnings for smaller sample sizes.
**Verified:** 2026-02-27T15:52:34Z
**Status:** passed
**Re-verification:** No - initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Sub toggle in results expands NFE (6 subgroups) and EAS (3 subgroups) nested rows | VERIFIED | v-btn data-testid=subcontinental-toggle at StepResults line 365; v-for over getSubcontinentalRows renders .subcontinental-row; runtime: getSubpopulations returns 9, NFE=6, EAS=3 |
| 2 | Subcontinental data is v2.1.1 only; non-v2 queries show a disabled chip not a toggle | VERIFIED | v-if=isV2 on toggle; v-else renders chip data-testid=subcontinental-v2-only with tooltip; hasSubcontinentalData returns false for v4 and v3 at runtime |
| 3 | Founder effect and low sample size warnings on subpopulation rows; progress indicator during loading | VERIFIED | v-chip v-if=sub.isLowSampleSize (warning) and v-chip v-if=sub.isFounderEffect (info) in template; v-progress-linear with subcontinentalProgress; both flags in computeAggregatedFrequencies |
| 4 | Subcontinental population definitions are config-driven in gnomad.json | VERIFIED | gnomad.json v2 populations have subpopulations arrays (NFE: 6, EAS: 3); v3/v4 have none; getSubpopulations uses flatMap; adding groups requires JSON-only edit |

**Score:** 4/4 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| packages/core/src/config/types.ts | SubpopulationConfig type, optional subpopulations field | VERIFIED | 56 lines; SubpopulationConfig with code and label; PopulationConfig.subpopulations optional |
| packages/core/src/config/gnomad.json | 9 subcontinental definitions for v2 (NFE: 6, EAS: 3) | VERIFIED | NFE: nfe_bgr nfe_est nfe_nwe nfe_seu nfe_swe nfe_onf; EAS: eas_jpn eas_kor eas_oea; v3/v4 have none |
| packages/core/src/config/index.ts | 4 subcontinental helpers exported | VERIFIED | getSubpopulations, hasSubcontinentalData, getSubpopulationParent, getSubpopulationLabel; runtime confirmed |
| packages/core/src/queries/subcontinental-variant.ts | VARIANT_SUBCONTINENTAL_QUERY + typed interfaces | VERIFIED | 55 lines; real GraphQL query with variantId+dataset vars; VariantSubcontinentalResponse typed; re-exported |
| apps/web/src/stores/useSubcontinentalStore.ts | Pinia session store with gene-scoped cache | VERIFIED | 82 lines; setVariantData, hasVariant, clearForGene, reset actions; no persistence |
| apps/web/src/composables/useSubcontinentalData.ts | N+1 fetch composable with batching and aggregation | VERIFIED | 459 lines; BATCH_SIZE=5, INTER_BATCH_DELAY_MS=500, MAX_RETRIES=4 backoff; exome+genome combine; 2*sumAF; both quality flags |
| apps/web/src/components/wizard/StepResults.vue | Toggle, nested rows, progress bar, v2-only chip | VERIFIED | 1400+ lines; all subcontinental template elements present and wired |
| apps/web/e2e/phase37-subcontinental.spec.ts | 9 E2E tests covering all SUBP requirements | VERIFIED | 700 lines; version gating, toggle ON/OFF, row count=9, Low sample chip, Founder effect chip, gene switching |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| StepResults.vue | useSubcontinentalData | import + destructure at line 835 | WIRED | isLoading, progress, error, subcontinentalFrequencies, fetchForVariants, clear all destructured and used |
| showSubcontinental toggle | fetchForVariants call | watch at line 845 | WIRED | Guard: enabled AND isV2 AND qualifyingVariants.length > 0; parentFreqs Map from props.result.populations |
| fetchForVariants | Pinia store cache | store.clearForGene + store.hasVariant | WIRED | Cache invalidation on gene change; cache-first; empty array stored for v2-absent variants |
| fetchSingleVariant | gnomAD v2 API | fetch POST with VARIANT_SUBCONTINENTAL_QUERY | WIRED | Real POST to GNOMAD_API_URL; variantId+dataset; retry on 429/5xx with exponential backoff |
| subcontinentalFrequencies | template rows | v-for in getSubcontinentalRows(item.code) | WIRED | Filters by parentCode; renders inline in table slot for each population row |
| isLowSampleSize + isFounderEffect | quality chips | v-if directives in subcontinental row template | WIRED | Both chips at lines 582-601; values from computeAggregatedFrequencies |
| props.result watcher | toggle reset + cache clear | watch at line 929 | WIRED | Gene change sets showSubcontinental=false, calls clearSubcontinental() |

---

### Requirements Coverage

| Requirement | Status | Evidence |
|-------------|--------|----------|
| SUBP-01: Toggle in results view (default off) | SATISFIED | v-btn data-testid=subcontinental-toggle; showSubcontinental defaults false via useUrlState |
| SUBP-02: v2.1.1 only, NFE 6 subgroups, EAS 3 subgroups | SATISFIED | Runtime confirmed: 9 total (6 NFE, 3 EAS); v4/v3 return 0 |
| SUBP-03: Subgroups nested under parent continental population | SATISFIED | getSubcontinentalRows(parentCode) filters by parentCode; rows rendered in table slot |
| SUBP-04: Founder effect and low sample size warnings | SATISFIED | Both flags computed in computeAggregatedFrequencies; rendered as tonal chips |
| SUBP-05: Config-driven population definitions | SATISFIED | gnomad.json v2 subpopulations arrays; SubpopulationConfig type; JSON-only edit to add groups |
| SUBP-06: Progress indicator during loading | SATISFIED | v-progress-linear with subcontinentalProgress; 0-100 updated per batch |
| SUBP-07: UI indicates v2.1.1 only for non-v2 queries | SATISFIED | v-if/v-else on isV2: toggle for v2, grayed chip with tooltip for v3/v4 |

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| useSubcontinentalData.ts | 174 | return null | Info | Not a stub - documented: variant absent from gnomAD v2; caller stores [] to prevent re-fetch |

No blocker or warning anti-patterns found.

---

### Human Verification Required

#### 1. Subcontinental toggle visual appearance in v2 results

**Test:** Load app with v2.1.1 selected, search CFTR or HEXA, reach Step 4 Results, observe population table toolbar.
**Expected:** Small Sub button (outlined when off, filled primary when on) with sitemap icon, next to export menu.
**Why human:** Visual styling cannot be verified by grep.

#### 2. Progress bar visible during N+1 fetch

**Test:** Enable subcontinental toggle on a gene with qualifying variants, observe NFE/EAS rows.
**Expected:** Thin progress bar appears under NFE and EAS rows during fetch, disappears when 9 rows render.
**Why human:** Timing and animation during live network fetch cannot be verified statically.

#### 3. Founder effect chip on real gnomAD v2 data

**Test:** Query a gene where a subcontinental population has elevated carrier frequency vs parent, enable toggle.
**Expected:** Elevated-frequency subpopulation row shows blue Founder effect chip.
**Why human:** Detection depends on real gnomAD v2 data; E2E tests use engineered fixtures.

#### 4. Shareable URL preserves subcontinental state

**Test:** Enable subcontinental toggle with v2 query, copy URL, paste in new tab.
**Expected:** New tab restores v2 version and subcontinental toggle enabled.
**Why human:** URL state round-trip requires browser navigation.

---

### Summary

No gaps found. All 4 must-haves verified at all three levels (existence, substantive, wired).

- Config layer (Plan 01): gnomad.json v2 has 9 subcontinental definitions (6 NFE + 3 EAS); 4 helpers in gnomad-cf/core/config; VARIANT_SUBCONTINENTAL_QUERY created and re-exported.
- Data layer (Plan 02): useSubcontinentalStore provides gene-scoped session cache; useSubcontinentalData orchestrates N+1 fetch with BATCH_SIZE=5, exponential backoff retry, exome+genome combination, 2*sumAF aggregation, both quality flags.
- UI layer (Plan 03): StepResults wires toggle, progress bar, nested rows, quality chips, and v2-only gating; reset on gene change confirmed at watch line 929.
- Test coverage: 519 unit tests pass, typecheck clean; 9 E2E tests in apps/web/e2e/phase37-subcontinental.spec.ts cover all SUBP requirements.

---

*Verified: 2026-02-27T15:52:34Z*
*Verifier: Claude (gsd-verifier)*