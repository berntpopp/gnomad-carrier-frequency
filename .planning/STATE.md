# Project State: gnomAD Carrier Frequency Calculator

---

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-26)

**Core value:** Accurate recurrence risk calculation from gnomAD population data with clinical documentation output
**Current focus:** v1.6 Analysis & Export -- Phase 34 in progress (1/5 plans done)

---

## Current Position

**Milestone:** v1.6 Analysis & Export
**Phase:** 34 of 37 (Quality Flags & Source Breakdown)
**Plan:** 1/5 complete
**Status:** In progress
**Last activity:** 2026-02-26 -- Completed 34-01-PLAN.md (core types, pure functions, GraphQL extension)

### Progress

```
v1.0 MVP:           [##########] 100% - SHIPPED 2026-01-19
v1.1 Release-Ready: [##########] 100% - SHIPPED 2026-01-19
v1.2 Sharing:       [##########] 100% - SHIPPED 2026-01-20
v1.3 Docs:          [##########] 100% - SHIPPED 2026-02-23 (14/14 plans)
v1.4 Discover:      [##########] 100% - SHIPPED 2026-02-23 (12/12 plans)
v1.5 Core & CLI:    [##########] 100% - SHIPPED 2026-02-25 (26/26 plans)
v1.6 Analysis:      [███░░░░░░░]  25% - Phase 33 complete (3/3), Phase 34 in progress (1/5)
```

**Overall:** 118 plans complete across 32+ phases in 6 milestones. 5 new phases for v1.6 (Phase 33 complete, Phase 34 in progress).

---

## Performance Metrics

**Velocity:**
- Total plans completed: 118
- v1.5 plans completed: 26
- v1.6 plans completed: 4

---

## Accumulated Context

### Decisions

See PROJECT.md Key Decisions table for full history.

v1.5 decisions archived. Starting fresh for v1.6.

**33-01 decisions:**
- DisplayFormat type co-located in formatters.ts, re-exported via calculations barrel
- safeResetFormat() guard (getActivePinia() check) prevents Pinia errors in test beforeEach hooks
- Per-100k denominator locale-formatted with toLocaleString(locale) for consistent separators
- SUPERSCRIPT_MAP explicit entries (Unicode superscript digits not contiguous)

**33-02 decisions:**
- BOM added in composable (download layer), not in pure builder functions
- Recurrence risk in populations TSV = carrierFrequency / 4 (assumes carrier index status)
- Carrier frequency per variant = alleleFrequency * 2 (approximate for single variant)
- Phase 34 columns (Source Category, Quality Flags, Stars) exported as empty strings for schema stability
- VariantDetail fields use camelCase hgvsC/hgvsP (capital C/P) matching ExportVariant convention

**33-03 decisions:**
- Local formatPercent/formatRatio removed from StepResults — useDisplayFormat is single source
- summaryDetail shows complementary format: ratio active shows percent detail, else shows ratio detail
- effectiveFrequency used in hero stat computeds (not globalFrequency prop) — consistent with rest of component
- Default Frequency Format card placed before Data Cache section in Settings General tab
- v-model directly on formatStore.defaultFormat — Pinia reactive stores trigger localStorage sync automatically
- Clinical text (TextOutput) untouched — always dual format per locked CONTEXT.md decision

**34-01 decisions:**
- computeQualityFlags returns dynamic explanation strings with interpolated values (AF%, filter names, hom counts) — QUAL-08
- isHighAF checks per-population AF in addition to global AF (joint-first) — ACMG BA1 applies per population (Pitfall 3)
- isGenomesOnly returns false when joint data is present — joint = exome+genome combined (Pitfall 1)
- classifyVariantSource accepts optional submissionsMap to mirror shouldIncludeVariantConfigurable signature
- FACTORY_EXCLUSION_DEFAULTS has all false — no exclusions by default (user opts in per CONTEXT.md)

### Pending Todos

None.

### Blockers/Concerns

- gnomAD API rate limits undocumented -- `--concurrency 3` is empirical (carried from v1.5)
- Orphanet API has no documented SLA or rate limits -- consider static fallback for common genes
- Subcontinental N+1 query pattern needs performance profiling with real gene data

---

## Session Continuity

### Last Session

**Date:** 2026-02-26
**Completed:** 34-01 executed (3/3 tasks). Core quality types, pure flag functions (isHighAF, isHighHom, isGnomadFiltered, isGenomesOnly, computeQualityFlags), source classification (classifyVariantSource), GraphQL query extended with filters field. 64 new unit tests, 508 total passing.
**Status:** Phase 34 in progress. Plan 34-02 (useQualityStore) is next.
**Resume file:** None

### Handoff Notes

v1.6 phase order: 33 (FMT+EXP) -> 34 (QUAL+SRC) -> 35 (VIZ) -> 36 (ORPH) -> 37 (SUBP).
Phase 33 establishes format infrastructure that Phases 34-37 consume.
Phases 35 and 36 depend only on Phase 33 (could theoretically run in parallel).
Phase 37 depends on Phase 34 (quality flags inform subpopulation display).

---

*State initialized: 2026-01-18*
*v1.0 shipped: 2026-01-19*
*v1.1 shipped: 2026-01-19*
*v1.2 shipped: 2026-01-20*
*v1.3 shipped: 2026-02-23*
*v1.4 shipped: 2026-02-23*
*v1.5 shipped: 2026-02-25*
*v1.6 started: 2026-02-26*
