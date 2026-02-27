# Roadmap: gnomAD Carrier Frequency Calculator

## Milestones

- **v1.0 MVP** - Phases 1-4 (shipped 2026-01-19)
- **v1.1 Release-Ready** - Phases 5-10 (shipped 2026-01-19)
- **v1.2 Sharing** - Phases 11-15 (shipped 2026-01-20)
- **v1.3 Documentation Site** - Phases 16-20 (shipped 2026-02-23)
- **v1.4 Discoverability & Polish** - Phases 21-24 (shipped 2026-02-23)
- **v1.5 Core Extraction & CLI** - Phases 25-32 (shipped 2026-02-25)
- **v1.6 Analysis & Export** - Phases 33-37 (in progress)

## Phases

<details>
<summary>v1.0 MVP (Phases 1-4) - SHIPPED 2026-01-19</summary>

4 phases, 15 plans, 32 requirements. See milestone archive.

</details>

<details>
<summary>v1.1 Release-Ready (Phases 5-10) - SHIPPED 2026-01-19</summary>

6 phases, 27 plans, 69 requirements. See milestone archive.

</details>

<details>
<summary>v1.2 Sharing (Phases 11-15) - SHIPPED 2026-01-20</summary>

5 phases, 15 plans, 38 requirements. See milestone archive.

</details>

<details>
<summary>v1.3 Documentation Site (Phases 16-20) - SHIPPED 2026-02-23</summary>

5 phases, 14 plans, 52 requirements. See milestone archive.

</details>

<details>
<summary>v1.4 Discoverability & Polish (Phases 21-24) - SHIPPED 2026-02-23</summary>

4 phases, 12 plans, 37 requirements. See milestone archive.

</details>

<details>
<summary>v1.5 Core Extraction & CLI (Phases 25-32) - SHIPPED 2026-02-25</summary>

8 phases, 26 plans, 47 requirements. See milestone archive.

</details>

### v1.6 Analysis & Export (In Progress)

**Milestone Goal:** Improve data quality transparency with variant quality flags and source contribution breakdown, add new display formats (scientific notation, per-100k) and TSV export, integrate Orphanet prevalence reference data, enable subcontinental population breakdown for gnomAD v2.1.1, and add population frequency bar chart visualization.

#### Phase 33: Display Formats & TSV Export

**Goal**: Users can view carrier frequencies in their preferred display format (scientific notation, per-100k, percentage, ratio) and export results as TSV files compatible with bioinformatics pipelines and Excel.
**Depends on**: Phase 32 (v1.5 complete)
**Requirements**: FMT-01, FMT-02, FMT-03, FMT-04, FMT-05, FMT-06, FMT-07, EXP-01, EXP-02, EXP-03, EXP-04, EXP-05
**Success Criteria** (what must be TRUE):
  1. A format selector in the results step lets the user switch between Percentage, Ratio (1:N), Scientific notation, and Per 100,000 -- and the population table, summary card, and range text all update to reflect the selected format
  2. Scientific notation displays with proper Unicode superscript characters (e.g., 4.31 x 10^-2) and per-100k displays as "X / 100,000", with locale-aware decimal separators (comma for German, period for English)
  3. The default format preference persists across browser sessions (survives page reload), and clinical text always uses dual format (ratio + percentage) regardless of the display format selector
  4. Two separate TSV download options (Populations TSV and Variants TSV) produce UTF-8 BOM-prefixed files that open correctly in Excel on Windows with German characters intact, using raw decimal values for machine parseability
  5. The CLI `--format tsv` output includes the new source category and quality flag columns alongside existing columns
**Plans:** 3 plans

Plans:
- [x] 33-01-PLAN.md -- Core formatters, format store, and display format composable
- [x] 33-02-PLAN.md -- TSV export functions (web + CLI column expansion)
- [x] 33-03-PLAN.md -- Format selector UI, TSV export buttons, settings dialog

---

#### Phase 34: Quality Flags & Source Breakdown

**Goal**: Users can see at a glance which variants have quality concerns (high AF, high homozygote count, gnomAD filtered, genomes-only) and understand whether each variant was identified via ClinVar, pLoF classification, or both -- with the option to exclude flagged variants from calculations.
**Depends on**: Phase 33
**Requirements**: QUAL-01, QUAL-02, QUAL-03, QUAL-04, QUAL-05, QUAL-06, QUAL-07, QUAL-08, SRC-01, SRC-02, SRC-03, SRC-04, SRC-05
**Success Criteria** (what must be TRUE):
  1. The variant table shows colored quality flag chips (High AF, High Hom, gnomAD Filtered, Genomes Only) on applicable variants, each with a tooltip explaining why the flag was raised and what the user should consider
  2. The results overview displays a summary count of flagged variants, and users can configure quality flag thresholds (e.g., High AF default 5%) in settings
  3. Users can exclude flagged variants per flag type from the carrier frequency calculation, and the frequency updates in real time when exclusions change
  4. Each variant displays a source badge (ClinVar-only, pLoF-only, or Both) and the results view shows carrier frequency split by source contribution for each population
  5. Source classification operates as a separate function from the existing filter pipeline -- enabling or disabling source breakdown does not alter which variants pass the inclusion filter
**Plans:** 5 plans

Plans:
- [x] 34-01-PLAN.md -- Core quality types, quality flag functions, source classification, GraphQL query extension
- [x] 34-02-PLAN.md -- Quality settings store and carrier frequency composable integration
- [x] 34-03-PLAN.md -- SettingsDialog Quality tab and FilterPanel exclusion toggles
- [x] 34-04-PLAN.md -- VariantTable quality/source columns, StepResults wiring, summary enhancements
- [x] 34-05-PLAN.md -- Per-population source frequency breakdown with expandable rows

---

#### Phase 35: Population Bar Chart

**Goal**: Users can visually compare carrier frequencies across populations via a horizontal bar chart in the results step, with founder effect populations visually distinguished and the chart usable for publication.
**Depends on**: Phase 33
**Requirements**: VIZ-01, VIZ-02, VIZ-03, VIZ-04, VIZ-05, VIZ-06, VIZ-07
**Success Criteria** (what must be TRUE):
  1. The results step shows a horizontal bar chart with one bar per population, displaying carrier frequency values, with a reference line indicating the global frequency
  2. Founder effect populations are visually distinguished (different color or annotation) so users can immediately identify elevated frequencies
  3. The chart renders correctly on mobile (horizontal bars remain readable on narrow screens) and respects Vuetify dark/light theme colors
  4. The chart is implemented as inline SVG with zero external dependencies, and users can download it as an SVG file for publication use
**Plans:** 3 plans

Plans:
- [x] 35-01-PLAN.md -- PopulationBarChart component (inline SVG, theme colors, tooltips, mobile responsive)
- [x] 35-02-PLAN.md -- StepResults tab integration and SVG/PNG export composable
- [x] 35-03-PLAN.md -- Tests and human verification of chart quality

---

#### Phase 36: Orphanet Prevalence Integration

**Goal**: Users see published Orphanet disease prevalence data alongside their calculated carrier frequency, providing a clinical reference point for the gene under analysis -- with graceful degradation when the Orphanet API is unavailable.
**Depends on**: Phase 33
**Requirements**: ORPH-01, ORPH-02, ORPH-03, ORPH-04, ORPH-05, ORPH-06, ORPH-07, ORPH-08
**Success Criteria** (what must be TRUE):
  1. After a gene is selected, all associated Orphanet diseases are fetched and displayed as a reference card in the results step, with each disease showing its prevalence range and a link to the Orphanet entry
  2. The Orphanet client lives in @gnomad-cf/core (platform-neutral, fetch-based) so both web and CLI can use it, and responses are cached per session so the same gene is not fetched twice
  3. When the Orphanet API is unavailable (offline PWA, network errors), the app degrades gracefully with an informative message rather than breaking the results display
  4. A clear disclaimer states that Orphanet prevalence reflects reported clinical prevalence, not genetic prevalence, to prevent misinterpretation of the side-by-side comparison
**Plans:** 3 plans

Plans:
- [ ] 36-01-PLAN.md -- Core Orphanet client: types, REST API functions, prevalence selection, tsdown entry
- [ ] 36-02-PLAN.md -- Web integration: Pinia store, composable, OrphanetSection component
- [ ] 36-03-PLAN.md -- StepResults wiring, CLI text output, PWA Workbox cache, human verification

---

#### Phase 37: Subcontinental Populations

**Goal**: Users analyzing gnomAD v2.1.1 data can expand continental populations to see subcontinental breakdowns (e.g., NFE into Finnish, Italian, Estonian; EAS into Japanese, Korean), with appropriate quality warnings for smaller sample sizes.
**Depends on**: Phase 34
**Requirements**: SUBP-01, SUBP-02, SUBP-03, SUBP-04, SUBP-05, SUBP-06, SUBP-07
**Success Criteria** (what must be TRUE):
  1. A "Show subcontinental populations" toggle in the results view expands the population table to show nested subgroups under their parent continental population (NFE: 6 subgroups, EAS: 3 subgroups)
  2. Subcontinental data is only available for gnomAD v2.1.1 queries -- for v4 queries, the toggle is hidden or disabled with a clear "not available for v4" indicator
  3. Founder effect detection and low sample size warnings are applied to subpopulations, and a progress indicator shows during subcontinental data loading
  4. Subcontinental population definitions are driven by the gnomad.json config file, making it straightforward to add new subgroups when gnomAD releases updated data
**Plans**: TBD

---

## Progress

**Execution Order:** 33 -> 34 -> 35 -> 36 -> 37

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1-4 | v1.0 | 15/15 | Complete | 2026-01-19 |
| 5-10 | v1.1 | 27/27 | Complete | 2026-01-19 |
| 11-15 | v1.2 | 15/15 | Complete | 2026-01-20 |
| 16-20 | v1.3 | 14/14 | Complete | 2026-02-23 |
| 21-24 | v1.4 | 12/12 | Complete | 2026-02-23 |
| 25. Monorepo Foundation & Core Extraction | v1.5 | 5/5 | Complete | 2026-02-24 |
| 26. Calculation Improvements in Core | v1.5 | 5/5 | Complete | 2026-02-24 |
| 27. CLI Package | v1.5 | 7/7 | Complete | 2026-02-24 |
| 28. Gene Config System | v1.5 | 4/4 | Complete | 2026-02-24 |
| 29. Test Suite Completion & Web App Validation | v1.5 | 7/7 | Complete | 2026-02-24 |
| 30. CLI Integration Fixes | v1.5 | 1/1 | Complete | 2026-02-24 |
| 31. Runtime Gene Config Loading & Submission Modal | v1.5 | 1/1 | Complete | 2026-02-25 |
| 32. Frequency Accuracy Fixes | v1.5 | 1/1 | Complete | 2026-02-25 |
| 33. Display Formats & TSV Export | v1.6 | 3/3 | Complete | 2026-02-26 |
| 34. Quality Flags & Source Breakdown | v1.6 | 5/5 | Complete | 2026-02-26 |
| 35. Population Bar Chart | v1.6 | 3/3 | Complete | 2026-02-27 |
| 36. Orphanet Prevalence Integration | v1.6 | 0/3 | Not started | - |
| 37. Subcontinental Populations | v1.6 | 0/TBD | Not started | - |

**Total:** 125 plans complete across 35 phases in 6 milestones. 2 phases remaining for v1.6.

---
*Roadmap created: 2026-01-18*
*Last updated: 2026-02-27 (Phase 36 planned: 3 plans in 3 waves)*
