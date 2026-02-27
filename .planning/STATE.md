# Project State: gnomAD Carrier Frequency Calculator

---

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-26)

**Core value:** Accurate recurrence risk calculation from gnomAD population data with clinical documentation output
**Current focus:** v1.6 Analysis & Export -- Phase 37 in progress (1/3 plans complete)

---

## Current Position

**Milestone:** v1.6 Analysis & Export
**Phase:** 37 of 37 (Subcontinental Populations) -- in progress
**Plan:** 1 of 3 complete
**Status:** Plan 37-01 complete — config foundation (SubpopulationConfig type, gnomad.json v2 subpopulations, helpers, VARIANT_SUBCONTINENTAL_QUERY)
**Last activity:** 2026-02-27 -- Plan 37-01 complete (config types, JSON subpopulations, helper functions, GraphQL query)

### Progress

```
v1.0 MVP:           [##########] 100% - SHIPPED 2026-01-19
v1.1 Release-Ready: [##########] 100% - SHIPPED 2026-01-19
v1.2 Sharing:       [##########] 100% - SHIPPED 2026-01-20
v1.3 Docs:          [##########] 100% - SHIPPED 2026-02-23 (14/14 plans)
v1.4 Discover:      [##########] 100% - SHIPPED 2026-02-23 (12/12 plans)
v1.5 Core & CLI:    [##########] 100% - SHIPPED 2026-02-25 (26/26 plans)
v1.6 Analysis:      [█████████░] ~97% - Phase 33-36 complete, Phase 37 in progress (1/3)
```

**Overall:** 129 plans complete across 37 phases in 6 milestones. Plans 37-02 and 37-03 remaining.

---

## Performance Metrics

**Velocity:**
- Total plans completed: 128
- v1.5 plans completed: 26
- v1.6 plans completed: 14

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

**34-02 decisions:**
- qualityExclusionConfig is per-analysis local ref: initialized from store defaults, not persisted back on toggle (Pitfall 7)
- filteredByPathogenicity replaces two separate filterPathogenicVariantsConfigurable calls — single source computed (DRY)
- qualityExcludedCount tracked separately from manual excludedCount (Pitfall 4) — UI can show them independently
- filteredByPathogenicity exposed in UseCarrierFrequencyReturn for source classification in Plan 04

**35-01 decisions:**
- HTML div tooltip positioned absolutely over SVG (not Vuetify v-tooltip — limited with SVG child elements)
- Responsive constants (barHeight, barGap, labelWidth) as computed refs from smAndDown — single reactive source
- Touch tooltip auto-dismiss: 3-second setTimeout (simpler than document-level tap detection)
- BAR_AREA computed from labelWidth — mobile labelWidth smaller means more bar area proportionally

**35-02 decisions:**
- Optional chaining on touches[0]?.clientX — touch array may be empty on touchend (pre-existing bug in PopulationBarChart)
- v-tabs + v-window (not v-tabs-window) — plan explicitly prohibits v-tabs-window (known Vuetify issues)
- result?.populations ?? [] null guard — TS type is CarrierFrequencyResult|null; v-if on tableItems.length doesn't narrow TS type
- Clone SVG before mutation (never touch live DOM) — applyPublicationColors + addPublicationMetadata operate on clone
- img.onload before img.src — prevents PNG rasterization race condition (Pitfall 5)
- viewBox expanded: 30px top + 20px bottom for title + footer text without clipping

**35-03 decisions:**
- vi.mock useAppTheme at module level in PopulationBarChart.test.ts — useDark from @vueuse/core needs matchMedia/localStorage not in happy-dom
- vi.mock useDisplayFormat in chart tests — returns (f * 100).toFixed(2) + '%' stub; avoids Pinia store setup
- PopulationBarChart added to StepResults.test.ts stubComponents — prevents Vuetify useTheme injection error from transitive dependency
- data-testid on root chart div and v-tab elements — enables stable E2E selectors without brittle text/role matching
- Orchestrator-level post-approval additions: default tab=Table (user preference), core SVG chart (generateSvgChart() in @gnomad-cf/core/chart), CLI --format svg (gnomad-cf query CFTR --format svg)

**36-01 decisions:**
- Gene symbol always lowercased before Orphanet API call — uppercase returns 404 (empirically verified)
- fetchEpidemiology + fetchNaturalHistory return [] on any error including 404 — disease subtypes commonly lack epi data (HEXA case)
- OrphanetURL constructed from orphacode: https://www.orpha.net/consor/cgi-bin/OC_Exp.php?lng=en&Expert={orphacode} (safe fallback)
- selectBestPrevalence priority: Validated > Point prevalence > Prevalence at birth > Europe preferred > Specific population deprioritized
- selectPrimaryDisease: AR diseases preferred over non-AR; among candidates sort by valMoy descending
- Promise.allSettled across orphacodes prevents single 404 failure from blocking all disease enrichment
- tsdown exports:true auto-rewrites package.json exports on each build — this is expected, not a bug

**36-02 decisions:**
- Record<string, OrphanetResult> in Pinia store state (not Map) — Pinia reactivity and JSON serialization both require plain objects
- additionalDiseases filtered to diseases with bestPrevalence !== null — diseases without prevalence add no clinical value
- expanded ref stays local to OrphanetSection.vue (not lifted to composable) — pure display concern
- v-expand-transition for +N more list — consistent with FilterPanel pattern used elsewhere in app
- No persist on useOrphanetStore — session-level cache per CONTEXT.md

**37-01 decisions:**
- SubpopulationConfig is a standalone interface (not extending PopulationConfig) — subpopulations never have description or nesting
- VariantSubcontinentalPopulation extracted as named type for Plan 02 composable re-use
- No top-level ac/an on exome/genome in VARIANT_SUBCONTINENTAL_QUERY — composable aggregates from populations[] only, reduces payload
- $referenceGenome: ReferenceGenomeId! included in VARIANT_SUBCONTINENTAL_QUERY — gnomAD schema requires it (v2=GRCh37), consistent with GENE_VARIANTS_QUERY
- No joint field in VARIANT_SUBCONTINENTAL_QUERY — gnomAD v2.1.1 has no joint coverage for individual variants

**36-03 decisions:**
- WizardStepper watches state.gene (Step 1), NOT result (Step 4) — eager prefetch must trigger before gnomAD query completes
- StepResults watches result.value?.gene?.symbol (resolved Step 4 result) — reads from Pinia cache instantly (no duplicate network request)
- Two separate useOrphanetData() instances with shared Pinia store cache — each component has own loading/diseases refs, network deduplication via cache-first fetchForGene
- immediate:true on both watchers — handles remounts and fresh page loads correctly
- CLI Orphanet fetch wrapped in try/catch with silent failure — supplementary reference data only
- formatOrphanetSection uses labelLine helper for alignment; shows all diseases (not just primary) with prevalence and URL
- Workbox StaleWhileRevalidate for api.orphadata.com (24h expiry, 50 entries max) — offline resilience for slow-changing reference data
- Orphanet data NOT added to clinical letter templates — only analytical CLI text and web summary card per CONTEXT.md
- OrphanetSection hides entirely on error/zero diseases — no empty state UI per CONTEXT.md
- fetchForGene resets diseases/error before cache check — prevents stale data when switching genes (bugfix)
- isPending skip removed — each composable instance must populate its own local refs; duplicate fetches are idempotent
- 10 Playwright E2E tests including CFTR→HEXA gene-switching regression test

**34-03 decisions:**
- highAfPercent computed wraps 0-1 stored value in get/set for 0-100% slider display in SettingsDialog Quality tab
- FilterPanel quality exclusion section uses template v-if on qualityExclusionConfig prop — backwards-compatible, parent opts in
- v-model directly on qualityStore.defaults — Pinia persist handles localStorage sync (same pattern as filterStore, logStore)
- updateQualityExclusion typed helper emits full config spread via update:qualityExclusionConfig (mirrors updateFilter pattern)

**34-04 decisions:**
- VariantTable accesses useCarrierFrequency singleton directly — no prop drilling through VariantModal (VariantModal unchanged)
- FilterPanel quality props passed via v-bind spread (forward-compat with 34-03 which adds the props interface)
- Local filteredCount removed from StepResults — qualifyingVariantCount from singleton is single source of truth
- Second-column sticky CSS removed from VariantTable — new quality/source columns shift nth-child indices

**UI polish decisions:**
- SettingsDialog refactored: horizontal tabs → sidebar nav (220px) with search, fixed 810px height via `:deep(.v-overlay__content)` targeting Vuetify's flex container
- TemplateEditor refactored: removed VariablePicker side column, added inline variable toolbar with quick-access chips + searchable "More" dropdown, Edit/Preview tab toggle
- Variable-only template sections show info alert in Edit tab and example text in Preview tab
- Default template section changed from geneIntro (just `{{statusIntro}}`) to inheritance (has visible prose)
- FilterPanel: fixed "Excluding 0 variant(s)" showing when toggles ON but no variants match
- StepResults: source breakdown left-border color per category, flagged count icon, chevron tooltip
- VariantTable: screen reader accessibility for quality flag severity

### Pending Todos

None.

### Blockers/Concerns

- gnomAD API rate limits undocumented -- `--concurrency 3` is empirical (carried from v1.5)
- Orphanet API has no documented SLA or rate limits -- consider static fallback for common genes
- Subcontinental N+1 query pattern needs performance profiling with real gene data

---

## Session Continuity

### Last Session

**Date:** 2026-02-27
**Completed:** Phase 37 Plan 01 — Subcontinental Populations Foundation. SubpopulationConfig type, gnomad.json v2 NFE (6) + EAS (3) subpopulations, config helpers (getSubpopulations, hasSubcontinentalData, getSubpopulationParent, getSubpopulationLabel), VARIANT_SUBCONTINENTAL_QUERY with typed response.
**Status:** Plan 37-01 verified. 519 unit tests pass. Build and typecheck clean.
**Resume file:** None

### Handoff Notes

v1.6 phase order: 33 (FMT+EXP) -> 34 (QUAL+SRC) -> 35 (VIZ) -> 36 (ORPH) -> 37 (SUBP).
Phase 37-01 complete: config foundation in @gnomad-cf/core/config and @gnomad-cf/core/queries.
Next: Plan 37-02 (composable useSubcontinentalFrequency in apps/web), then Plan 37-03 (UI SubcontinentalPanel component).

---

*State initialized: 2026-01-18*
*v1.0 shipped: 2026-01-19*
*v1.1 shipped: 2026-01-19*
*v1.2 shipped: 2026-01-20*
*v1.3 shipped: 2026-02-23*
*v1.4 shipped: 2026-02-23*
*v1.5 shipped: 2026-02-25*
*v1.6 started: 2026-02-26*
