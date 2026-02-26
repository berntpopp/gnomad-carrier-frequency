---
phase: 34-quality-flags-source-breakdown
plan: "01"
subsystem: core-filters
tags:
  - quality-flags
  - source-classification
  - graphql
  - pure-functions
  - typescript

dependency-graph:
  requires:
    - "33-01 (variant display types, GnomadVariant structure)"
    - "packages/core/src/filters/variant-filters.ts (isHighConfidenceLoF, isPathogenicClinVarWithThreshold)"
    - "packages/core/src/queries/clinvar-submissions.ts (meetsConflictingThreshold)"
  provides:
    - "QualityFlagType, QualityFlag, QualitySettings, QualityExclusionConfig types"
    - "FACTORY_QUALITY_DEFAULTS, FACTORY_EXCLUSION_DEFAULTS constants"
    - "computeQualityFlags pure function (QUAL-01 through QUAL-04, QUAL-08)"
    - "isHighAF, isHighHom, isGnomadFiltered, isGenomesOnly sub-functions"
    - "shouldExcludeByQuality, flagSeverityColor, flagTypeColor utilities"
    - "classifyVariantSource pure function (SRC-01)"
    - "SourceCategory type, sourceCategoryLabel, sourceCategoryColor helpers"
    - "GnomadVariant.exome.filters and GnomadVariant.genome.filters type fields"
    - "GraphQL query extension: filters field in exome and genome blocks"
  affects:
    - "34-02 (useQualityStore Pinia store will import FACTORY_QUALITY_DEFAULTS)"
    - "34-03 (VariantTable will call computeQualityFlags, classifyVariantSource)"
    - "34-04 (FilterPanel quality exclusion toggles use QualityExclusionConfig)"
    - "34-05 (population source breakdown uses classifyVariantSource)"

tech-stack:
  added: []
  patterns:
    - "joint-first data pattern (variant.joint?? fallback to exome+genome)"
    - "per-population AF check for ACMG BA1 completeness"
    - "HWE-relative formula: observed_hom > AF^2 * AN * multiplier"
    - "dynamic explanation strings with interpolated numeric values (QUAL-08)"

key-files:
  created:
    - packages/core/src/types/quality.ts
    - packages/core/src/filters/quality-flags.ts
    - packages/core/src/filters/source-classification.ts
    - packages/core/src/filters/__tests__/quality-flags.test.ts
    - packages/core/src/filters/__tests__/source-classification.test.ts
  modified:
    - packages/core/src/types/variant.ts
    - packages/core/src/types/index.ts
    - packages/core/src/filters/index.ts
    - packages/core/src/queries/gene-variants.ts

decisions:
  - id: "34-01-D1"
    decision: "computeQualityFlags returns dynamic explanation strings with interpolated values (AF%, filter names, hom counts) rather than static text"
    rationale: "QUAL-08 requirement; user needs to see actual numbers, not generic descriptions"
  - id: "34-01-D2"
    decision: "isHighAF checks per-population AF in addition to global AF (joint-first)"
    rationale: "ACMG BA1 applies in any well-powered population; founder effects can cause population-specific high frequencies (Pitfall 3)"
  - id: "34-01-D3"
    decision: "isGenomesOnly returns false if joint data is present (joint = exome+genome combined, so exome contributed)"
    rationale: "Pitfall 1 from RESEARCH.md; joint data means exome data contributed to the variant call"
  - id: "34-01-D4"
    decision: "classifyVariantSource accepts optional submissionsMap for conflicting-pathway classification, matching shouldIncludeVariantConfigurable signature"
    rationale: "Source must mirror inclusion reason accurately for conflicting variants"
  - id: "34-01-D5"
    decision: "FACTORY_EXCLUSION_DEFAULTS has all false — no exclusions by default"
    rationale: "User must opt in to excluding quality-flagged variants; default is informational only (from CONTEXT.md)"

metrics:
  duration: "5m 36s"
  completed: "2026-02-26"

---

# Phase 34 Plan 01: Core Quality Types, Functions, and Source Classification Summary

**One-liner:** Platform-neutral quality flag detection (High AF, High Hom, gnomAD Filtered, Genomes Only) and source attribution (ClinVar/pLoF/Both) as pure TypeScript functions in @gnomad-cf/core, with GraphQL query extended to fetch variant filter status.

## What Was Built

### quality.ts — New type module

Defines the complete type system for quality flags:
- `QualityFlagType` union type for the four flag categories
- `QualityFlag` interface with label, dynamic explanation, and severity
- `QualitySettings` interface with 8 configurable thresholds and toggles
- `QualityExclusionConfig` interface for per-flag-type exclusion toggles
- `FACTORY_QUALITY_DEFAULTS` and `FACTORY_EXCLUSION_DEFAULTS` exported constants

### quality-flags.ts — Core flag detection functions

Five pure functions implementing QUAL-01 through QUAL-04:

| Function | QUAL | What It Checks |
|----------|------|----------------|
| `isHighAF` | 01 | Global + per-population AF >= threshold (ACMG BA1) |
| `isHighHom` | 02 | HWE-relative or absolute homozygote count |
| `isGnomadFiltered` | 03 | exome/genome filters array contains non-PASS values |
| `isGenomesOnly` | 04 | No exome data, genome data present, no joint data |
| `computeQualityFlags` | — | Master function returning array of QualityFlag objects |

Also provides `shouldExcludeByQuality`, `flagSeverityColor`, `flagTypeColor`.

**QUAL-08 implementation:** Each flag explanation is a dynamic sentence with interpolated values:
- `high_af`: "Allele frequency (6.00%) exceeds the 5% threshold (ACMG BA1)..."
- `high_hom`: "Observed 60 homozygotes vs 10.0 expected by Hardy-Weinberg (5x threshold)..."
- `gnomad_filtered`: "This variant failed gnomAD quality control filters (RF, AC0)..."
- `genomes_only`: Static explanation (no numeric values to interpolate)

### source-classification.ts — Source attribution function

`classifyVariantSource` classifies variants as `clinvar_only | plof_only | both`:
- Mirrors `shouldIncludeVariantConfigurable` logic for accuracy
- Only HC LoF (canonical, lof="HC") counts as pLoF source — LC LoF is not counted (Pitfall 5)
- Optional `submissionsMap` parameter enables conflicting-pathway ClinVar classification
- `sourceCategoryLabel` and `sourceCategoryColor` helpers for UI rendering

**SRC-05 preserved:** `shouldIncludeVariantConfigurable` was not touched.

### variant.ts + gene-variants.ts — Extended data model

- Added optional `filters?: string[]` to exome and genome sub-objects in `VariantFrequencyData`
- Added `filters` field to `GENE_VARIANTS_QUERY` exome and genome blocks
- This enables QUAL-03 (gnomAD QC filter check) to detect actual filter failures

### Test coverage

64 new unit tests across two files:
- `quality-flags.test.ts` (47 tests): All flag functions, edge cases, explanation string verification
- `source-classification.test.ts` (17 tests): All source categories, Pitfall 5, conflicting pathway, non-canonical LoF
- Full test suite: 508 tests passing (no regressions)

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Dynamic explanation strings with interpolated values | QUAL-08 requirement — users need to see actual numbers |
| Per-population AF check in isHighAF | ACMG BA1 applies in any well-powered population (Pitfall 3) |
| isGenomesOnly returns false when joint data present | Joint = exome+genome combined (Pitfall 1) |
| submissionsMap optional in classifyVariantSource | Mirrors shouldIncludeVariantConfigurable signature for accuracy |
| All FACTORY_EXCLUSION_DEFAULTS false | Default is informational only — user opts in to exclusion (CONTEXT.md) |

## Deviations from Plan

None — plan executed exactly as written.

Task 2 (source-classification.ts) was also created before the first typecheck since `filters/index.ts` referenced both modules, but this was done to keep a clean green build state rather than any structural deviation.

## Next Phase Readiness

Plan 34-02 (useQualityStore) can start immediately:
- `FACTORY_QUALITY_DEFAULTS` and `FACTORY_EXCLUSION_DEFAULTS` are exported from `@gnomad-cf/core/filters`
- `QualitySettings` and `QualityExclusionConfig` types are exported from `@gnomad-cf/core/types`

Plan 34-03 (VariantTable UI) can start after 34-02:
- `computeQualityFlags` and `classifyVariantSource` are ready
- `flagSeverityColor`, `flagTypeColor`, `sourceCategoryColor`, `sourceCategoryLabel` are ready

**No blockers.**
