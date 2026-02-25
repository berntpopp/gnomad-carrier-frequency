---
phase: 32-frequency-accuracy-fixes
plan: 01
subsystem: core, web, cli
tags: [frequency-accuracy, joint-field, gnomad-v4, ac-zero, variant-filters, wcag, eslint]

# Dependency graph
requires:
  - phase: 26-calculation-improvements
    provides: frequency-calc aggregation, variant-display, variant-filters
  - phase: 27-cli-package
    provides: CLI gene-query pipeline with global stats
  - phase: 29-test-suite
    provides: E2E fixtures, component tests
provides:
  - gnomAD v4 joint field support for accurate AN/AC values
  - AC=0 variant filtering (hasObservedAlleles)
  - JointPopulation and JointFrequencyData types
  - Backward-compatible fallback to exome+genome sum for v2/v3
  - WCAG AA compliant variant table expanded row labels
  - Zero ESLint warnings across all Vue templates
affects: [carrier-frequency-accuracy, variant-filtering, accessibility, code-quality]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Prefer joint data with exome+genome sum fallback for v2/v3 compatibility"
    - "hasObservedAlleles() guard applied before pathogenicity filters"
    - "joint uses homozygote_count (not ac_hom) — different field naming from exome/genome"

key-files:
  created: []
  modified:
    - packages/core/src/types/variant.ts
    - packages/core/src/types/index.ts
    - packages/core/src/queries/types.ts
    - packages/core/src/queries/gene-variants.ts
    - packages/core/src/filters/variant-display.ts
    - packages/core/src/filters/variant-filters.ts
    - packages/core/src/calculations/frequency-calc.ts
    - apps/web/src/composables/useCarrierFrequency.ts
    - packages/cli/src/utils/gene-query.ts
    - apps/web/e2e/fixtures/gnomad-responses.ts
    - apps/web/src/components/VariantTable.vue

key-decisions:
  - "Use gnomAD v4 joint field (site-level coverage combination) instead of naive exome+genome sum — matches gnomAD website values"
  - "joint is optional on all interfaces — absent for v2/v3, all code falls back gracefully"
  - "hasObservedAlleles() checks joint.ac > 0 first, then exome+genome sum — applied in both filterPathogenicVariants and filterPathogenicVariantsConfigurable"
  - "joint.homozygote_count maps to ac_hom in our model — gnomAD API uses different field names for joint vs exome/genome"
  - "Variant table labels: text-grey-darken-2 (#616161) on #FAFAFA — 5.93:1 contrast ratio exceeds WCAG AA 4.5:1 minimum"
  - "ESLint --fix applied after prettier formatting to resolve vue/max-attributes-per-line and vue/singleline-html-element-content-newline conflicts"

patterns-established:
  - "joint-first pattern: always check variant.joint before falling back to exome+genome"
  - "AC=0 guard: hasObservedAlleles() as pre-filter before pathogenicity classification"

# Metrics
completed: 2026-02-25
---

# Phase 32 Plan 01: Frequency Accuracy Fixes

**Three fixes: (1) use gnomAD v4 joint field for accurate AN/AC values matching the gnomAD website, (2) filter out AC=0 variants that contribute nothing to carrier frequency, (3) improve variant table label contrast for WCAG AA compliance.**

## Accomplishments

### Fix 1: gnomAD v4 Joint Field Support

The app previously naively summed exome + genome AC/AN values, which diverged from the gnomAD website. gnomAD v4 provides a `joint` field that properly combines exome and genome data using site-level coverage information.

- **New types** (`variant.ts`): Added `JointPopulation` and `JointFrequencyData` interfaces with `homozygote_count` (not `ac_hom`)
- **Query update** (`gene-variants.ts`): Added `joint { ac an homozygote_count hemizygote_count populations { id ac an homozygote_count } }` to GraphQL query
- **Display layer** (`variant-display.ts`): `toDisplayVariant()` and `getPopulationVariants()` prefer joint data with exome+genome fallback
- **Frequency calc** (`frequency-calc.ts`): Population aggregation prefers joint populations, simplified from `maxExomeAN + maxGenomeAN` to single `maxAN`
- **Web composable** (`useCarrierFrequency.ts`): `globalStats` computed prefers `variant.joint` for AC/AN/homozygote_count, including VCR/GCR path
- **CLI pipeline** (`gene-query.ts`): `computeGlobalStats()` and `computeVariantGlobalAF()` prefer joint data

### Fix 2: AC=0 Variant Filtering

Variants with zero allele count (e.g., `7-117504254-TG-T` for CFTR) passed through filters despite contributing nothing to carrier frequency. These likely represent failed genotype filters or regions with no observed carriers.

- **New filter** (`variant-filters.ts`): `hasObservedAlleles()` — checks `joint.ac > 0` first, then `(exome.ac + genome.ac) > 0`
- **Applied in pipeline**: Both `filterPathogenicVariants()` and `filterPathogenicVariantsConfigurable()` apply `hasObservedAlleles` before pathogenicity filters
- **E2E fixtures**: Added `joint: null` to mock variant objects for backward compatibility

### Fix 3: Variant Table Label Contrast (WCAG AA)

Expanded row labels in the variant table were nearly invisible (`text-caption text-medium-emphasis` on `bg-grey-lighten-5`).

- Changed 4 label divs to `text-caption font-weight-bold text-grey-darken-2` — #616161 on #FAFAFA = 5.93:1 contrast ratio (exceeds WCAG AA 4.5:1 minimum for 12px text)

### Fix 4: ESLint Vue Template Warnings

Prettier formatting introduced 485 ESLint warnings (vue/max-attributes-per-line, vue/singleline-html-element-content-newline).

- `eslint --fix` resolved all 440 auto-fixable warnings; remaining 45 resolved to 0 total

## Verification

- `bun run typecheck` — all 3 packages pass (0 errors)
- `bun run test` — 388/388 tests pass (26 files)
- `bun run lint` — 0 errors, 0 warnings
- `bun run build` — succeeds (core tsdown + web Vite)

## Commits

| Commit | Description |
|--------|-------------|
| `cb69a3b` | fix: improve variant table expanded row label contrast for WCAG AA compliance |
| `3d5ed40` | fix: use gnomAD v4 joint field for accurate AN values and exclude AC=0 variants |
| `b847a86` | style: fix 485 ESLint vue template warnings from prettier formatting |

## Files Modified

| File | Change |
|------|--------|
| `packages/core/src/types/variant.ts` | Added JointPopulation, JointFrequencyData interfaces; joint? field on VariantFrequencyData and GnomadVariant |
| `packages/core/src/types/index.ts` | Exported JointPopulation, JointFrequencyData |
| `packages/core/src/queries/types.ts` | Added GeneVariantJointPopulation, GeneVariantJoint interfaces; joint field on GeneVariant |
| `packages/core/src/queries/gene-variants.ts` | Added joint block to GraphQL query |
| `packages/core/src/filters/variant-display.ts` | Prefer joint in toDisplayVariant, getPopulationVariants, filterVariantsByPopulation |
| `packages/core/src/filters/variant-filters.ts` | Added hasObservedAlleles(); applied in both filter pipelines |
| `packages/core/src/calculations/frequency-calc.ts` | Prefer joint populations; simplified maxAN tracking |
| `apps/web/src/composables/useCarrierFrequency.ts` | Prefer joint in globalStats + VCR/GCR path |
| `packages/cli/src/utils/gene-query.ts` | Prefer joint in computeGlobalStats + computeVariantGlobalAF |
| `apps/web/e2e/fixtures/gnomad-responses.ts` | Added joint: null to mock variants |
| `apps/web/src/components/VariantTable.vue` | WCAG AA label contrast fix |
| 29 Vue files | ESLint auto-fix for template formatting |

---
*Phase: 32-frequency-accuracy-fixes*
*Completed: 2026-02-25*
