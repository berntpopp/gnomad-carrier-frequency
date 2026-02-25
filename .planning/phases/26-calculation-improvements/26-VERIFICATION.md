---
phase: 26-calculation-improvements
verified: 2026-02-24T03:29:15Z
status: passed
score: 5/5 must-haves verified
---

# Phase 26: Calculation Improvements Verification Report

**Phase Goal:** The carrier frequency calculations in packages/core use clinically-correct published formulas (Hardy-Weinberg 2pq, homozygote exclusion, genetic prevalence) validated against reference values from peer-reviewed literature, and these formulas are the default in the web app.
**Verified:** 2026-02-24T03:29:15Z
**Status:** passed
**Re-verification:** No - initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Web app results step shows HWE 2pq carrier frequency by default with toggle to simplified formula | VERIFIED | FACTORY_CALC_DEFAULTS.useHWEFormula=true; FilterPanel HWE toggle wired to useCalcStore; Simplified formula warning chip when HWE off |
| 2 | Enabling homozygote exclusion toggle updates displayed carrier frequency in real time using VCR/GCR | VERIFIED | useCarrierFrequency globalStats computed reads calcStore.defaults.useHomExclusion; when ON: calculateVCR then calculateGCR; reactive recompute |
| 3 | Web app results step shows genetic prevalence and Bayesian prevalence alongside carrier frequency | VERIFIED | StepResults.vue renders geneticPrevalenceFormatted (always) and bayesianPrevalenceFormatted (penetrance less than 1); population table Prevalence column |
| 4 | Core package tests execute with CFTR, GJB2, HEXA reference values and all pass | VERIFIED | 130 tests pass; GOLDEN-labeled: CFTR HWE toBeCloseTo(0.044942,4), GJB2 HWE toBeCloseTo(0.021758,4), HEXA prevalence toBeCloseTo(0.000297,6) |
| 5 | No calculation change merged without a corresponding golden-value test | VERIFIED | Three test files with GOLDEN-labeled tests using toBeCloseTo; TDD RED-GREEN commits enforced tests-before-implementation |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| packages/core/src/calculations/carrier-frequency.ts | HWE 2pq and simplified functions | VERIFIED | 44 lines; exports calculateHWECarrierFrequency and calculateSimplifiedCarrierFrequency |
| packages/core/src/calculations/homozygote-exclusion.ts | VCR and GCR formulas | VERIFIED | 52 lines; exports calculateVCR and calculateGCR; PMC9763236 cited |
| packages/core/src/calculations/prevalence.ts | Genetic and Bayesian prevalence | VERIFIED | 66 lines; exports calculateGeneticPrevalence, calculateBayesianPrevalence, formatPrevalence |
| packages/core/src/calculations/index.ts | Barrel re-export | VERIFIED | Re-exports all 3 calculation modules plus frequency-calc and formatters |
| packages/core/src/types/calculations.ts | CalcConfig, CalcResult, FACTORY_CALC_DEFAULTS | VERIFIED | All three exported; FACTORY_CALC_DEFAULTS: useHWEFormula=true, useHomExclusion=true, penetrance=1.0 |
| packages/core/tests/carrier-frequency.test.ts | Golden-value tests for HWE + simplified | VERIFIED | 13 tests; CFTR and GJB2 GOLDEN-labeled; all pass |
| packages/core/tests/homozygote-exclusion.test.ts | Golden-value tests for VCR and GCR | VERIFIED | 12 tests; all edge cases; all pass |
| packages/core/tests/prevalence.test.ts | Golden-value tests for prevalence | VERIFIED | 18 tests; CFTR, HEXA, GJB2 GOLDEN-labeled; all pass |
| packages/core/src/queries/gene-variants.ts | GraphQL query with ac_hom at 4 locations | VERIFIED | 4 occurrences of ac_hom confirmed in query string |
| packages/core/src/queries/types.ts | ac_hom as required number on query population/exome-genome types | VERIFIED | ac_hom: number on both interfaces |
| packages/core/src/types/variant.ts | ac_hom as required number on variant types | VERIFIED | ac_hom: number at lines 30, 37, 43 |
| apps/web/src/stores/useCalcStore.ts | Pinia store with persistence | VERIFIED | defineStore; persist key carrier-freq-calc; 5 typed actions |
| packages/core/src/types/url-state.ts | UrlStateSchema with optional calc params | VERIFIED | hweFormula, homExclusion, penetrance all optional; calcMatchesDefaults() exported |
| apps/web/src/composables/useUrlState.ts | URL bidirectional sync for calc settings | VERIFIED | Restore reads hweFormula/homExclusion/penetrance; write encodes when not default; watch on calcStore.defaults |
| packages/core/src/calculations/frequency-calc.ts | aggregatePopulationFrequenciesWithConfig | VERIFIED | Handles all 4 CalcConfig combinations; old function removed |
| packages/core/src/types/frequency.ts | CarrierFrequencyResult and PopulationFrequency with prevalence fields | VERIFIED | geneticPrevalence, bayesianPrevalence, formula, homExclusionActive on result; geneticPrevalence on population |
| apps/web/src/composables/useCarrierFrequency.ts | Composable reactive to CalcConfig | VERIFIED | Imports useCalcStore; globalStats computed reads calcStore.defaults; exposes geneticPrevalenceFormatted and bayesianPrevalenceFormatted |
| apps/web/src/components/FilterPanel.vue | 3 calc controls | VERIFIED | HWE toggle, hom exclusion toggle, penetrance slider; calcConfig prop and update:calcConfig emit |
| apps/web/src/components/wizard/StepResults.vue | Summary card with prevalence and warning chip; Prevalence table column | VERIFIED | Warning chip on !useHWEFormula; genetic/Bayesian prevalence displayed; Prevalence column in table |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| carrier-frequency.test.ts | carrier-frequency.ts | import | WIRED | imports calculateHWECarrierFrequency, calculateSimplifiedCarrierFrequency |
| homozygote-exclusion.test.ts | homozygote-exclusion.ts | import | WIRED | imports calculateVCR, calculateGCR |
| prevalence.test.ts | prevalence.ts | import | WIRED | imports calculateGeneticPrevalence, calculateBayesianPrevalence, formatPrevalence |
| useCarrierFrequency.ts | core calculations | import | WIRED | All 6 calculation functions imported and called from core/calculations |
| useCarrierFrequency.ts | useCalcStore.ts | reads calcStore.defaults inside computed | WIRED | Automatic Vue reactivity via globalStats computed |
| FilterPanel.vue via StepResults.vue | useCalcStore.ts | update:calcConfig emit | WIRED | update:calc-config handler calls calcStore.setDefaults in StepResults.vue |
| useUrlState.ts | useCalcStore.ts | bidirectional sync | WIRED | Restore reads hweFormula/homExclusion/penetrance; write watches calcStore.defaults deep |
| frequency-calc.ts | calculateVCR and calculateGCR | import from homozygote-exclusion.js | WIRED | Used in aggregatePopulationFrequenciesWithConfig |
| StepResults.vue | buildExportData | call-site with calcStore.defaults | WIRED | calcStore.defaults passed as 4th argument to buildExportData |

### Requirements Coverage

| Requirement | Status | Notes |
|-------------|--------|-------|
| CALC-01 HWE 2pq formula | SATISFIED | calculateHWECarrierFrequency in carrier-frequency.ts |
| CALC-02 Simplified formula | SATISFIED | calculateSimplifiedCarrierFrequency in carrier-frequency.ts |
| CALC-03 Recurrence risk | SATISFIED | calculateRisk in useCarrierFrequency composable |
| CALC-04 VCR | SATISFIED | calculateVCR in homozygote-exclusion.ts |
| CALC-05 GCR | SATISFIED | calculateGCR in homozygote-exclusion.ts |
| CALC-06 Genetic prevalence | SATISFIED | calculateGeneticPrevalence in prevalence.ts |
| CALC-07 Bayesian prevalence | SATISFIED | calculateBayesianPrevalence in prevalence.ts |
| CALC-08 Penetrance slider | SATISFIED | Penetrance slider in FilterPanel; setPenetrance action in useCalcStore |
| CALC-09 Golden-value tests | SATISFIED | 43 golden-value tests; CFTR, HEXA, GJB2 with toBeCloseTo |
| TEST-02 through TEST-06 | SATISFIED | 130 total tests pass |

### Anti-Patterns Found

None found.

Notes:
- No Vue/Pinia imports in packages/core/src/calculations/ (verified by grep)
- No ac_hom optional-chaining fallback patterns (verified by grep)
- No TODO/FIXME/placeholder patterns in calculation files
- Only return null in calculations is calculateAlleleFrequency when AN=0 (correct behavior)

### Human Verification Required

**1. CFTR NFE approximately 1:23 displayed value**

**Test:** Load the app, search for CFTR, use gnomAD v4.1, apply LoF HC and ClinVar P/LP filters, check the NFE population row with HWE formula ON and homozygote exclusion ON.
**Expected:** NFE carrier frequency ratio close to 1:23 (reference approximately 0.0431).
**Why human:** Depends on live gnomAD v4.1 API response; cannot verify without actual browser query.

**2. Real-time UI reactivity when toggling homozygote exclusion**

**Test:** On results step with CFTR loaded, toggle Homozygote Exclusion switch OFF then ON.
**Expected:** Global carrier frequency and population carrier frequencies update immediately without page reload.
**Why human:** Vue reactive behavior requires browser DOM interaction to observe.

**3. LocalStorage persistence of calc settings**

**Test:** Set penetrance to 80 percent and HWE formula OFF, close and reopen the browser tab.
**Expected:** Calc settings restored from localStorage; penetrance 80 percent, simplified formula warning chip visible.
**Why human:** Requires browser localStorage interaction.

### Gaps Summary

No gaps found. All 5 phase success criteria are fully implemented and verified in the actual codebase:

1. HWE 2pq is the default (FACTORY_CALC_DEFAULTS.useHWEFormula=true); toggle exists; warning chip for simplified formula.
2. Homozygote exclusion toggle wired: FilterPanel emit -> CalcStore.setDefaults -> useCarrierFrequency computed reactive update.
3. Genetic prevalence and Bayesian prevalence displayed in summary card and population table.
4. 130 tests pass including golden-value tests for CFTR, HEXA, GJB2 with toBeCloseTo assertions.
5. TDD RED-GREEN commit structure enforced golden-value tests before implementation.

Typecheck and build both pass with zero TypeScript errors.

---

*Verified: 2026-02-24T03:29:15Z*
*Verifier: Claude (gsd-verifier)*
