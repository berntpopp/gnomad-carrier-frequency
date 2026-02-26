# Project Research Summary

**Project:** gnomAD Carrier Frequency Calculator -- v1.6 Analysis & Export Milestone
**Domain:** Clinical genomics SPA (carrier frequency calculation, data export, external data integration)
**Researched:** 2026-02-26
**Confidence:** HIGH

## Executive Summary

The v1.6 milestone adds seven features to an existing Vue 3 + Vuetify 3 monorepo: variant quality flags (#12), ClinVar vs pLoF source breakdown (#11), scientific notation and per-100k display (#10), TSV export (#9), Orphanet prevalence integration (#6), gnomAD v2 subcontinental populations (#5), and a population bar chart (#2). Research confirms that **all seven features can be implemented with zero new production dependencies**. The existing stack (Vue 3, Vuetify 3, Vite 7, Zod, native fetch) covers every requirement. Charts should use inline SVG (not Chart.js), Orphanet data should come via live API calls (CORS is confirmed working), scientific notation uses native `Intl.NumberFormat`, and TSV is trivial string concatenation. Estimated total bundle increase is approximately 5-8 KB.

The recommended approach is a four-phase build order driven by dependency analysis: start with foundational formatters and low-risk exports (TSV, scientific notation, source breakdown, quality flags), then add the bar chart visualization, then integrate Orphanet as an external data source, and finally tackle subcontinental populations as the broadest-scope change. This ordering ensures each phase builds on stable foundations and isolates risk. The most complex features (Orphanet, subcontinental populations) come last so their integration challenges do not block simpler, high-value deliverables.

The top risks are: (1) source breakdown double-counting variants that qualify via both LoF HC and ClinVar P/LP -- mitigated by implementing classification as a separate function from the existing filter pipeline; (2) URL state schema changes breaking existing shared bookmarks -- mitigated by requiring `.optional().default()` on all new Zod parameters; and (3) subcontinental population data being v2.1.1-only with no v4 availability -- mitigated by designing the feature as version-gated from the start. Orphanet CORS was confirmed working via live testing, resolving a key uncertainty.

## Key Findings

### Recommended Stack

**Zero new production dependencies.** The existing monorepo stack handles all v1.6 requirements. This is exceptional for a seven-feature milestone.

**Core technologies (all existing):**
- **Native `fetch` + Zod**: Orphanet REST API integration -- CORS confirmed working, no proxy needed, Zod provides runtime response validation
- **Native `Intl.NumberFormat`**: Scientific notation display -- `formatToParts()` with `notation: 'scientific'` produces publication-quality output with locale awareness
- **Inline SVG Vue components**: Population bar chart -- zero bundle cost, full Vuetify theme integration, complete accessibility control
- **Native `Blob` + `URL.createObjectURL`**: TSV export -- matches existing JSON/Excel export pattern, requires only UTF-8 BOM prefix for Excel compatibility
- **Existing gnomAD GraphQL client**: Subcontinental population queries -- v2.1.1 already returns subcontinental codes in population arrays

**What NOT to add:**
- Chart.js / vue-chartjs (~65 KB) -- overkill for 8 horizontal bars; inline SVG is approximately 50 lines of Vue template
- Apache ECharts (~270 KB) -- completely disproportionate
- D3.js (~90 KB) -- low-level abstraction not justified for simple bar charts
- papaparse, file-saver, numbro -- native APIs cover all needs

**Details:** [STACK-v1.6.md](./STACK-v1.6.md)

### Expected Features

**Must have (table stakes):**
- BA1 (AF >= 5%) and BS1 (AF > 1%) warning chips on variants -- ACMG thresholds, prevents clinical errors
- Source badges visible in main variant table row (not just expanded view) -- LoF-only, ClinVar-only, Both
- Summary counts by source above variant count -- standard in published methodology
- TSV export for variants, populations, and summary -- GeniE parity, bioinformatics standard format
- Scientific notation for small prevalence values -- prevents misleading "0.00%" displays
- Per-100,000 prevalence display -- Orphanet comparison format, epidemiology standard
- Orphanet prevalence as side-by-side comparison value -- GeniE parity feature
- Subcontinental population display for v2 (eas: 3, nfe: 6 subgroups) -- hierarchical expandable rows
- Horizontal bar chart of population carrier frequencies with founder effect highlighting

**Should have (differentiators):**
- Auto-exclude BA1 variants with prominent override warning
- AF contribution breakdown by source (what % of total comes from LoF vs ClinVar)
- Source column in TSV/Excel export
- Log scale toggle on bar chart
- Prevalence discrepancy alert (calculated vs Orphanet > 10x difference)
- LOFTEE `lof_flags` display on HC variants (~14% carry flags)

**Defer to post-v1.6:**
- ClinVar-only / LoF-only carrier frequency toggle (sensitivity analysis)
- World map / geographic visualization (misleading for genetic ancestry)
- Population-specific variant TSV with per-population AF columns
- Full Orphanet disease profile (age of onset, clinical features)
- Aggregate quality score badge (requires scoring rubric definition)
- Downloadable chart as PNG/SVG (revisit if requested)

**Details:** [FEATURES-v1.6.md](./FEATURES-v1.6.md)

### Architecture Approach

The architecture follows the established core/web boundary. All new pure logic (quality assessment, source classification, scientific notation formatting, Orphanet client, subpopulation config) goes in `@gnomad-cf/core`. All Vue-specific code (composables, components, Pinia stores) stays in `apps/web`. The critical pattern is **extend, do not replace**: every feature integrates by adding optional fields to existing types and creating new parallel functions rather than modifying the tested calculation pipeline. The aggregation function `aggregatePopulationFrequenciesWithConfig()` remains untouched; source breakdown and subpopulation calculations run as separate computations on the same input data.

**Major components:**
1. **`@gnomad-cf/core/orphanet`** (NEW subpath) -- OrphanetClient using native fetch, Zod-validated response types, `lookupPrevalence(geneSymbol)` chaining gene-to-disease-to-prevalence API calls
2. **`core/filters/variant-quality.ts`** (NEW) -- Pure `assessVariantQuality()` function deriving quality flags from existing `GnomadVariant` data (no new API fields needed for AF thresholds)
3. **`core/calculations/source-breakdown.ts`** (NEW) -- `calculateSourceBreakdown()` classifying variants into non-overlapping source categories and summing AF contributions
4. **`core/calculations/formatters.ts`** (EXTEND) -- `formatScientific()` and `formatFrequencyAs()` adding scientific notation and per-100k display alongside existing percent/ratio formatters
5. **`web/components/PopulationChart.vue`** (NEW) -- Inline SVG bar chart consuming existing `PopulationFrequency[]` data
6. **`web/components/OrphanetCard.vue`** (NEW) -- Disease and prevalence display with graceful degradation

**Key architecture decisions:**
- Orphanet client in core (CLI reusable), reactive caching wrapper in web
- Subpopulation aggregation as a SEPARATE function from main aggregation (safety)
- TSV serializer in web only (display concern, like existing XLSX export)
- Quality flags are informational annotations, NOT filter criteria in v1.6
- New `PopulationConfig.subpopulations?: PopulationConfig[]` is optional and backward-compatible

**Details:** [ARCHITECTURE.md](./ARCHITECTURE.md)

### Critical Pitfalls

1. **Source breakdown double-counting** -- Variants can be both LoF HC AND ClinVar P/LP. The existing filter uses short-circuit logic (returns true on first match). Source classification MUST be a separate function that checks ALL criteria per variant and assigns non-overlapping categories: `lof_only`, `clinvar_only`, `lof_and_clinvar`, `missense_clinvar`. Test with CFTR variants known to have dual classification.

2. **URL state backward compatibility** -- The Zod `UrlStateSchema` powers shareable bookmarks used in clinical workflows. Every new parameter (display format, subcontinental selection) MUST use `.optional().default()`. Zod `safeParse` is all-or-nothing at the schema level; one required field breaks ALL old URLs. Add backward-compatibility tests with v1.5 URL fixtures.

3. **gnomAD v4 has no subcontinental data** -- Confirmed by all researchers. The v4 GraphQL API returns only continental-level populations. Subcontinental populations are v2.1.1 only (eas: 3 subgroups, nfe: 6 subgroups). Design must be version-gated. Show "not available for v4" rather than empty space.

4. **TSV encoding for German text in Excel** -- Without UTF-8 BOM prefix (`\uFEFF`), Excel on Windows corrupts German characters (umlauts, gender-inclusive markers). Also use `\r\n` line endings. This is critical because the app generates German clinical documentation.

5. **Variant type changes ripple through entire pipeline** -- `GnomadVariant` flows through normalization, filtering, display transform, and export. Adding a field requires updating 5-7 files. Make new fields required in types first, then let TypeScript errors guide every necessary change.

**Details:** [PITFALLS-v1.6.md](./PITFALLS-v1.6.md)

## Disagreements Resolved

Three points of disagreement emerged across research files:

| Topic | Conflicting Recommendations | Resolution |
|-------|---------------------------|------------|
| Charts | Stack + Architecture recommend inline SVG (zero deps). Features recommends Chart.js (~65 KB). Pitfalls warns about CSS conflicts with SVG libraries but suggests Chart.js Canvas as safe. | **Inline SVG.** Requirements are minimal (8 bars, static, print-friendly). Zero bundle cost. Vuetify theme integration is trivial with CSS variables. No CSS conflicts because we control the SVG directly. Revisit if interactive features are needed post-v1.6. |
| Orphanet data source | Stack researcher tested CORS live and confirmed it works (direct API). Features recommends static bundled JSON. Architecture flags CORS as uncertain. Pitfalls assumes CORS is blocked and recommends static file pattern. | **Live API as primary.** Stack researcher verified CORS with actual curl requests confirming `Access-Control-Allow-Origin` headers. Use session-level Pinia cache. Consider static fallback only for offline/PWA scenarios as a future enhancement. |
| Subcontinental availability | All four researchers agree: v4 does NOT have subcontinental data. v2.1.1 does. Stack verified via live API testing. | **v2.1.1 only, version-gated.** No disagreement. Design `PopulationConfig` with optional `subpopulations` array so v4 support can be added when gnomAD releases the data. |

## Implications for Roadmap

Based on combined research, the suggested phase structure follows the dependency graph identified in ARCHITECTURE.md and minimizes risk by front-loading independent, well-understood features.

### Phase 1: Formatters, Quality Flags, Source Breakdown, TSV Export

**Rationale:** These four features are independent of each other, require zero new dependencies, touch only the formatter/display/export layers, and deliver immediate clinical value. They form the foundation that later features build on (bar chart uses formatters, Orphanet comparison needs per-100k display).

**Delivers:**
- BA1/BS1 allele frequency warning chips in variant table
- LOFTEE `lof_flags` and `lof_filter` display on HC/LC variants (requires adding fields to GraphQL query response handling)
- Source classification and summary counts (LoF-only, ClinVar-only, Both)
- Source badge column in main variant table
- `formatScientific()` with text/HTML/Unicode outputs via `Intl.NumberFormat`
- Per-100,000 prevalence display
- `formatFrequencyAs(freq, format)` with display format preference in calc store
- TSV export for variants, populations, and summary with UTF-8 BOM and Windows line endings
- TSV option in export dropdown menu

**Addresses features:** #12, #11, #10, #9
**Avoids pitfalls:** P1 (double-counting via separate classification function), P4 (URL state with `.optional().default()`), P6 (BOM for Excel), P9 (new format functions alongside existing), P10 (explicit locale convention)

### Phase 2: Population Bar Chart

**Rationale:** Independent UI component consuming existing `PopulationFrequency[]` data. Benefits from Phase 1 formatters being available for labels and tooltips. Zero dependency approach (inline SVG) keeps this low-risk.

**Delivers:**
- `PopulationChart.vue` -- horizontal bar chart with population labels, carrier frequency values, founder effect color coding
- Sorted by frequency descending
- Low sample size visual indicator (translucent bars)
- Global frequency reference line
- Responsive sizing with explicit min-height
- Vuetify theme integration via CSS variables (dark/light mode compatible)
- `aria-label` and `role="img"` for accessibility

**Addresses features:** #2
**Avoids pitfalls:** P5 (no CSS conflicts -- inline SVG, not external library), P12 (explicit sizing, conditional rendering)

### Phase 3: Orphanet Prevalence Integration

**Rationale:** New external data source requiring API client, caching strategy, and graceful degradation. Isolated from the core calculation pipeline (supplementary data only). Benefits from Phase 1 per-100k formatter for side-by-side comparison display.

**Delivers:**
- `@gnomad-cf/core/orphanet` subpath with OrphanetClient and Zod-validated types
- `useOrphanetPrevalence` composable with session-level Pinia cache
- `OrphanetCard.vue` showing disease name, ORPHA number, prevalence class, geographic scope
- Side-by-side display: "Calculated: 1:X. Published (Orphanet): 1-9 / 100,000"
- Source attribution with link to Orphanet disease page
- Graceful "no data" and "loading" states
- Handles multi-disease genes (CFTR returns 6 diseases, filter on causative association)

**Addresses features:** #6
**Avoids pitfalls:** P2 (CORS confirmed -- use live API with caching; add service worker cache entry for offline), P8 (runtime caching for offline PWA)

**Implementation notes:**
- Gene symbols must be **lowercase** in Orphadata API calls (uppercase returns 404)
- `ValMoy` is per 100,000 -- convert to 1:X via `Math.round(100000 / valMoy)`
- Filter on `PrevalenceType === "Prevalence at birth"` and `PrevalenceGeographic === "Europe"` as primary display
- Filter on `DisorderGeneAssociationType === "Disease-causing germline mutation(s) in"` for causative disorders

### Phase 4: Subcontinental Populations

**Rationale:** Broadest scope, touching config, types, calculations, queries, and UI. v2.1.1 only (version-gated). Benefits from all previous phases being stable. The existing gene-level query already returns subcontinental population codes for v2 -- they are currently ignored because `getPopulationCodes()` only returns top-level codes.

**Delivers:**
- Extended `PopulationConfig` with optional `subpopulations` array
- Updated `gnomad.json` with v2 subcontinental populations (eas: 3, nfe: 6)
- Separate `aggregateSubpopulationFrequencies()` function (main aggregation untouched)
- For detail view: variant-level queries (`VARIANT_DETAIL_QUERY`) to fetch full subcontinental breakdown
- Hierarchical expandable rows in population table (collapsed by default)
- Low sample size warnings on subpopulations (most have < 2000 samples)
- "Subcontinental data not available for gnomAD v4" message
- Subpopulation rows in TSV/Excel exports with parent population reference

**Addresses features:** #5
**Avoids pitfalls:** P3 (version-gated, v2 only), P7 (add types first, let TypeScript errors guide), P14 (store defaults for new state)

### Phase Ordering Rationale

- **Phase 1 first** because formatters, quality flags, source breakdown, and TSV export are all independent leaf nodes in the dependency graph with zero cross-feature dependencies. They also establish the locale convention and format infrastructure that Phases 2-4 consume.
- **Phase 2 second** because the bar chart is a standalone UI component consuming existing data. It benefits from Phase 1 formatters but has no other dependencies.
- **Phase 3 third** because Orphanet integration introduces an external API dependency and caching complexity that should be isolated from the core calculation pipeline. It benefits from Phase 1 per-100k formatter.
- **Phase 4 last** because subcontinental populations is the broadest-scope feature, touching config, types, calculations, queries, and UI across both core and web packages. It also has the v2-only limitation, making it lower priority than features that work across all gnomAD versions.

### Research Flags

**Phases likely needing deeper research during planning:**
- **Phase 3 (Orphanet):** While CORS is confirmed working, the caching strategy (session vs localStorage vs service worker) needs design-time decisions. The gene-to-disease mapping can return multiple diseases per gene -- UI/UX for multi-disease display needs wireframing.
- **Phase 4 (Subcontinental):** The N+1 query pattern (one variant-level query per qualifying variant) needs performance profiling with a real gene. Batch size and parallelism strategy (5-10 concurrent requests to avoid gnomAD rate limiting at 10 queries/minute) needs validation.

**Phases with standard patterns (skip deep research):**
- **Phase 1 (Formatters, Flags, Export):** All well-documented patterns. `Intl.NumberFormat` is a stable browser API. TSV is trivial. Quality flags derive from existing data.
- **Phase 2 (Bar Chart):** Inline SVG bar charts in Vue are a straightforward pattern with many open-source references.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Zero new dependencies. All APIs verified live (Orphanet CORS, gnomAD subpopulations, Intl.NumberFormat). |
| Features | HIGH | Feature scope well-defined against competitor tools (GeniE, gnomAD browser). ACMG thresholds documented in literature. |
| Architecture | HIGH | Based on direct codebase analysis of all relevant source files. Extension points clearly identified. Core/web boundary established. |
| Pitfalls | HIGH | Top pitfalls verified from source code (filter short-circuit, URL state schema, variant type pipeline). External pitfalls (TSV BOM, locale formatting) well-documented in community. |

**Overall confidence:** HIGH

### Gaps to Address

- **Orphanet API stability:** The API is backed by Elasticsearch with no documented SLA or rate limits. For a clinical tool, consider adding a static fallback JSON for the most commonly queried genes (CFTR, HEXA, etc.) in case the API is temporarily unavailable.
- **gnomAD rate limiting for subcontinental queries:** The N+1 variant query pattern (Phase 4) could hit the 10 queries/minute rate limit documented in gnomAD forums. Need to implement request batching with delays. Profile with CFTR (~30 qualifying variants) during implementation.
- **LOFTEE `lof_flags` and `lof_filter` display:** These fields are already fetched in the GraphQL query but never displayed. Need to define the exact UI treatment (tooltip vs chip vs expandable section) during Phase 1 design.
- **Display format toggle UX:** The exact control (three-way button group, dropdown, or settings panel) for switching between percent/ratio/scientific notation needs UX decisions during Phase 1.
- **Existing `toLocaleString()` inconsistency:** `formatters.ts` uses default locale while `prevalence.ts` uses explicit `en-US`. This should be normalized as part of Phase 1 before adding new formatters.

## Sources

### Primary (HIGH confidence -- verified live)
- [Orphadata REST API](https://api.orphadata.com/) -- endpoints, CORS, response format tested with curl
- [gnomAD GraphQL API](https://gnomad.broadinstitute.org/api) -- gene-level and variant-level queries tested; subcontinental population IDs verified
- [MDN Intl.NumberFormat.formatToParts()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat/formatToParts) -- scientific notation API
- Direct codebase analysis -- all source files in packages/core and apps/web reviewed for integration points

### Secondary (HIGH confidence -- official documentation)
- [gnomAD v2.1 release notes](https://gnomad.broadinstitute.org/news/2018-10-gnomad-v2-1/) -- subcontinental population descriptions
- [gnomAD v4.0 release notes](https://gnomad.broadinstitute.org/news/2023-11-gnomad-v4-0/) -- confirmed subcontinental data not in v4
- [LOFTEE GitHub](https://github.com/konradjk/loftee) -- lof_filter and lof_flags value definitions
- [Gudmundsson et al. 2022](https://pmc.ncbi.nlm.nih.gov/articles/PMC9160216/) -- BA1/BS1 thresholds, LOFTEE flag prevalence
- [ACMG carrier screening 2021](https://pmc.ncbi.nlm.nih.gov/articles/PMC8488021/) -- frequency display conventions, tier thresholds
- [Orphadata API GitHub](https://github.com/Orphanet/API_Orphadata) -- source code and OpenAPI spec
- [Chart.js tree-shaking docs](https://www.chartjs.org/docs/latest/getting-started/integration.html) -- bundle size analysis (evaluated and rejected)

### Tertiary (MEDIUM confidence -- community sources)
- [GeniE blog post](https://gnomad.broadinstitute.org/news/2024-06-genie/) -- competitor features and Orphanet integration approach
- [gnomAD API rate limiting discussion](https://discuss.gnomad.broadinstitute.org/t/blocked-when-using-api-to-get-af/149) -- 10 queries/minute limit
- [TSV Excel encoding issues](https://github.com/opentargets/genetics/issues/322) -- UTF-8 BOM requirement documented
- [Chart library comparison (Luzmo 2025)](https://www.luzmo.com/blog/vue-chart-libraries) -- Vue charting ecosystem overview

---
*Research completed: 2026-02-26*
*Ready for roadmap: yes*
