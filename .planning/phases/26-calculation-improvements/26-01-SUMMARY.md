---
phase: 26-calculation-improvements
plan: 01
subsystem: calculations
tags: [typescript, vitest, tdd, hardy-weinberg, carrier-frequency, prevalence, homozygote-exclusion, gnomad, clinical-genetics]

# Dependency graph
requires:
  - phase: 25-monorepo-foundation
    provides: packages/core package structure with src/calculations/, src/types/, tests/ directory

provides:
  - HWE 2pq carrier frequency formula (calculateHWECarrierFrequency)
  - Simplified 2*SumAF carrier frequency formula (calculateSimplifiedCarrierFrequency)
  - VCR per-variant homozygote-exclusion (calculateVCR)
  - GCR gene-level inclusion-exclusion aggregation (calculateGCR)
  - Genetic prevalence q^2 (calculateGeneticPrevalence)
  - Bayesian prevalence with penetrance (calculateBayesianPrevalence)
  - Prevalence formatter with ratio + percent (formatPrevalence)
  - CalcConfig, CalcResult, FACTORY_CALC_DEFAULTS types
  - 43 golden-value unit tests passing for CFTR, HEXA, GJB2 reference genes

affects:
  - 26-02: composable integration will use calculateHWECarrierFrequency and calculateGCR
  - 26-03: UI display will consume CalcResult output shape
  - 26-04: CLI will depend on all three calculation modules
  - 26-05: test suite validation depends on these functions existing and correct

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure TypeScript functions with no framework dependencies (no Vue/Pinia/browser)"
    - "TDD red-green-refactor: test files committed first as failing, then implementation"
    - "Golden-value tests with toBeCloseTo as primary assertion for floating-point"
    - "Inclusion-exclusion product for multi-variant gene carrier rate (GCR)"

key-files:
  created:
    - packages/core/src/calculations/carrier-frequency.ts
    - packages/core/src/calculations/homozygote-exclusion.ts
    - packages/core/src/calculations/prevalence.ts
    - packages/core/src/types/calculations.ts
    - packages/core/tests/carrier-frequency.test.ts
    - packages/core/tests/homozygote-exclusion.test.ts
    - packages/core/tests/prevalence.test.ts
  modified:
    - packages/core/src/calculations/index.ts
    - packages/core/src/types/index.ts
    - packages/core/vitest.config.ts
    - packages/core/package.json

key-decisions:
  - "GCR uses inclusion-exclusion product (1 - prod(1-VCRi)) not sum, to avoid double-counting compound heterozygotes"
  - "Genetic prevalence always from raw q=SumAF (never from carrier frequency 2pq) to avoid compounding approximation errors"
  - "formatPrevalence uses en-US locale for ratio number formatting (comma as thousands separator)"
  - "GCR test expected value for 3 variants corrected from plan: 0.034651 not 0.03471 (plan had arithmetic error)"

patterns-established:
  - "Formula functions are single-purpose: HWE and simplified are separate functions, not a branching single function"
  - "Edge case handling: empty array returns 0, AN=0 returns 0 — explicitly documented in JSDoc"
  - "All floating-point golden tests use toBeCloseTo as primary assertion, not range checks"

# Metrics
duration: ~5min
completed: 2026-02-24
---

# Phase 26 Plan 01: Core Calculation Functions Summary

**HWE 2pq carrier frequency, VCR/GCR homozygote-exclusion, and q^2 genetic prevalence implemented as pure TypeScript with 43 golden-value tests validating against CFTR, HEXA, and GJB2 published reference values.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-02-24T02:55:12Z
- **Completed:** 2026-02-24T02:59:48Z
- **Tasks:** TDD (RED commit + GREEN commit)
- **Files modified:** 11

## Accomplishments
- Three new calculation modules with clinically-correct formulas free of Vue/Pinia dependencies
- 43 golden-value tests across 3 test files, all passing — including CFTR (1:22), HEXA (1:3364), GJB2 (1:8264) reference values
- CalcConfig / CalcResult / FACTORY_CALC_DEFAULTS types for downstream composable integration
- Vitest config updated to pick up tests/ directory alongside src/**/*.test.ts
- All 130 core package tests passing (43 new + 87 previously existing)

## Task Commits

TDD plan — two atomic commits:

1. **RED — Failing tests** - `1caae2d` (test)
   - carrier-frequency.test.ts, homozygote-exclusion.test.ts, prevalence.test.ts
   - vitest.config.ts updated, package.json test script added

2. **GREEN — Implementation** - `a01085b` (feat)
   - carrier-frequency.ts, homozygote-exclusion.ts, prevalence.ts
   - types/calculations.ts, types/index.ts export, calculations/index.ts barrel

**Plan metadata:** (see final docs commit)

_Note: TDD plan produces 2 atomic commits (test/feat) with no refactor needed — code was clean from GREEN phase._

## Files Created/Modified
- `packages/core/src/calculations/carrier-frequency.ts` - calculateHWECarrierFrequency (2pq), calculateSimplifiedCarrierFrequency (2*sumAF)
- `packages/core/src/calculations/homozygote-exclusion.ts` - calculateVCR (per-variant, excludes homozygotes), calculateGCR (inclusion-exclusion product)
- `packages/core/src/calculations/prevalence.ts` - calculateGeneticPrevalence (q^2), calculateBayesianPrevalence, formatPrevalence (ratio + percent)
- `packages/core/src/types/calculations.ts` - CalcConfig, CalcResult, FACTORY_CALC_DEFAULTS
- `packages/core/src/calculations/index.ts` - barrel re-export of all calculation modules
- `packages/core/src/types/index.ts` - exports CalcConfig, CalcResult, FACTORY_CALC_DEFAULTS
- `packages/core/vitest.config.ts` - added tests/ to include glob
- `packages/core/package.json` - added test script (vitest run)
- `packages/core/tests/carrier-frequency.test.ts` - 13 tests, HWE + simplified golden values
- `packages/core/tests/homozygote-exclusion.test.ts` - 12 tests, VCR and GCR cases
- `packages/core/tests/prevalence.test.ts` - 18 tests, CFTR/HEXA/GJB2 golden values + formatPrevalence

## Decisions Made
- **Inclusion-exclusion for GCR**: GCR = 1 - ∏(1 - VCRᵢ) avoids double-counting compound heterozygotes who carry multiple pathogenic variants. Simple summation would overcount.
- **Prevalence from raw q, not 2pq**: Computing q^2 directly from SumAF avoids compounding the HWE approximation. (2pq)^2/4 gives a different result and would be wrong.
- **formatPrevalence uses en-US locale**: Comma as thousands separator (1:1,890) matches plan specification for ratio format.
- **Plan arithmetic corrected**: The plan spec said GCR([0.02, 0.01, 0.005]) ≈ 0.03471 but the correct value is 0.034651. The test was corrected to match the actual mathematical formula.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Corrected GCR test expected value**
- **Found during:** GREEN phase (running tests)
- **Issue:** Plan spec stated GCR([0.02, 0.01, 0.005]) toBeCloseTo(0.03471, 5), but 1 - 0.98*0.99*0.995 = 0.034651, not 0.03471. The plan had an arithmetic error in the expected value.
- **Fix:** Updated test to use toBeCloseTo(0.034651, 5) which matches the correct mathematical result.
- **Files modified:** packages/core/tests/homozygote-exclusion.test.ts
- **Verification:** Test passes with corrected value; formula is mathematically correct.
- **Committed in:** a01085b (GREEN feat commit)

**2. [Rule 1 - Bug] Revised "not computed from carrier frequency" test logic**
- **Found during:** GREEN phase (running tests)
- **Issue:** Plan specified `expect(prevalence).not.toBeCloseTo(incorrectFormula, 4)` but the difference between q^2=0.000529 and (2pq)^2/4=0.000505 is ~0.000024, which IS within the toBeCloseTo(4) tolerance of 0.00005. The test would fail with correct implementation.
- **Fix:** Replaced with `expect(Math.abs(prevalence - incorrectFormula)).toBeGreaterThan(0.00002)` to explicitly assert the values differ by a meaningful margin.
- **Files modified:** packages/core/tests/prevalence.test.ts
- **Verification:** Test passes and correctly validates that prevalence is not computed from carrier frequency.
- **Committed in:** a01085b (GREEN feat commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1 - Bug in test specifications)
**Impact on plan:** Correcting test arithmetic errors ensures tests actually validate the mathematical formulas correctly. No scope creep — all functions implement exactly the formulas specified in the plan.

## Issues Encountered
- None during implementation. TypeScript compiled cleanly on first attempt.
- The plan's `bun run test --filter @gnomad-cf/core` syntax was invalid for this vitest setup; used `bun run --filter @gnomad-cf/core test` instead (required adding `test` script to core package.json).

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All three calculation modules are ready for composable integration in Phase 26 plan 02
- CalcConfig type defines the interface for user-configurable formula selection
- CalcResult type defines the output shape for downstream UI display in plan 03
- No blockers. typecheck and all tests pass clean.

---
*Phase: 26-calculation-improvements*
*Completed: 2026-02-24*
