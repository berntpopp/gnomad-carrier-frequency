# Requirements: gnomAD Carrier Frequency Calculator v1.6

**Defined:** 2026-02-26
**Core Value:** Accurate recurrence risk calculation from real gnomAD population data, with clinical documentation output that's ready to paste into patient letters.

## v1.6 Requirements

### Variant Quality Flags

- [ ] **QUAL-01**: Variants with AF >= 5% in any population flagged as "High AF (BA1)" with colored chip in variant table
- [ ] **QUAL-02**: Variants with unexpectedly high homozygote counts flagged as "High Hom" with chip in variant table
- [ ] **QUAL-03**: Variants that failed gnomAD quality filters flagged as "gnomAD Filtered" with chip in variant table
- [ ] **QUAL-04**: Variants present only in genome data (no exome) flagged as "Genomes Only" with chip in variant table
- [ ] **QUAL-05**: Quality flag thresholds configurable in settings (High AF default: 5%, configurable)
- [ ] **QUAL-06**: Summary count of flagged variants displayed in results overview
- [ ] **QUAL-07**: Option to exclude flagged variants from carrier frequency calculation (per flag type)
- [ ] **QUAL-08**: Tooltip on each flag explaining why it was raised and what the user should consider

### ClinVar vs pLoF Source Breakdown

- [ ] **SRC-01**: Each variant classified into non-overlapping source category: ClinVar-only, pLoF-only, or Both
- [ ] **SRC-02**: Source category displayed as badge/tag in variant table
- [ ] **SRC-03**: Carrier frequency split shown by source: ClinVar-only contribution, pLoF-only contribution, Both contribution
- [ ] **SRC-04**: Per-population source breakdown available in results
- [ ] **SRC-05**: Source classification function separate from existing filter pipeline (no modification to shouldIncludeVariantConfigurable)

### Display Formats

- [ ] **FMT-01**: Display format selector with 4 options: Percentage, Ratio (1:N), Scientific notation, Per 100,000
- [ ] **FMT-02**: Scientific notation displayed as Unicode superscript (e.g., 4.31 × 10⁻²)
- [ ] **FMT-03**: Per-100,000 format displayed as "X / 100,000" (e.g., 4,310 / 100,000)
- [ ] **FMT-04**: Selected format applied to population table, summary card, and export output
- [ ] **FMT-05**: Format preference persisted in Pinia store (not CalcConfig)
- [ ] **FMT-06**: Locale-aware formatting (German comma decimal, English period decimal)
- [ ] **FMT-07**: Clinical text templates adapt to selected display format

### TSV Export

- [ ] **EXP-01**: "Download TSV" button alongside existing JSON/Excel export options
- [ ] **EXP-02**: Population summary TSV with columns: Population, Carrier Frequency, Ratio, Recurrence Risk, AC, AN, Notes
- [ ] **EXP-03**: Variant detail TSV with columns: Variant ID, Consequence, AF, Carrier Frequency, ClinVar Significance, Stars, HGVS-c, HGVS-p, Source Category, Quality Flags
- [ ] **EXP-04**: UTF-8 BOM prefix for Excel compatibility on Windows with German characters
- [ ] **EXP-05**: TSV output available in CLI via `--format tsv` (already exists — verify compatibility with new columns)

### Orphanet Prevalence

- [ ] **ORPH-01**: Orphanet prevalence data fetched via API for the selected gene (api.orphadata.com)
- [ ] **ORPH-02**: All associated Orphanet diseases displayed with their prevalence ranges
- [ ] **ORPH-03**: Prevalence shown as reference card in results step alongside calculated carrier frequency
- [ ] **ORPH-04**: Link to Orphanet entry for each disease
- [ ] **ORPH-05**: Orphanet client module in @gnomad-cf/core (platform-neutral, fetch-based)
- [ ] **ORPH-06**: Response caching (same gene not fetched twice per session)
- [ ] **ORPH-07**: Graceful degradation when Orphanet API is unavailable (offline PWA, API errors)
- [ ] **ORPH-08**: Clear disclaimer that Orphanet prevalence reflects reported clinical prevalence, not genetic prevalence

### Subcontinental Populations

- [ ] **SUBP-01**: Toggle "Show subcontinental populations" in results view (default: off)
- [ ] **SUBP-02**: Subcontinental data displayed for gnomAD v2.1.1 queries only (NFE: 6 subgroups, EAS: 3 subgroups)
- [ ] **SUBP-03**: Subgroups nested under parent continental population in frequency table
- [ ] **SUBP-04**: Founder effect detection and low sample size warnings applied to subpopulations
- [ ] **SUBP-05**: Subcontinental population definitions added to gnomad.json config
- [ ] **SUBP-06**: Progress indicator during subcontinental data loading (per-variant queries)
- [ ] **SUBP-07**: UI clearly indicates subcontinental data is v2.1.1 only (hidden/disabled for v4 queries)

### Population Bar Chart

- [ ] **VIZ-01**: Horizontal bar chart showing carrier frequency per population in results step
- [ ] **VIZ-02**: Implemented as inline SVG (zero external dependencies)
- [ ] **VIZ-03**: Global frequency shown as reference line
- [ ] **VIZ-04**: Founder effect populations visually distinguished (different color or annotation)
- [ ] **VIZ-05**: Responsive design (horizontal bars work on mobile)
- [ ] **VIZ-06**: Respects Vuetify theme (dark/light mode colors)
- [ ] **VIZ-07**: Chart downloadable as SVG for publication use

## Future Requirements (v1.7+)

### Features

- **FEAT-01**: X-linked recessive inheritance calculation
- **FEAT-02**: X-linked dominant inheritance calculation
- **FEAT-03**: Structural variant (SV) support via gnomAD SV API (#8)
- **FEAT-04**: At-risk couple calculation (both partners)
- **FEAT-05**: Export results to PDF
- **FEAT-06**: npm registry publishing for @gnomad-cf/core and @gnomad-cf/cli
- **FEAT-07**: LOFTEE quality flag details (lof_flags, lof_filter from GraphQL — requires query extension)
- **FEAT-08**: Bayesian residual risk for negative carrier test

### Performance

- **PERF-01**: Tree-shakeable icons (@mdi/js migration)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Chart.js or other chart library | Inline SVG sufficient for ~8 population bars; zero-dependency approach preferred |
| gnomAD v4 subcontinental populations | v4 API does not include subcontinental data as of Feb 2026 |
| Orphanet static data bundle | Live API works (CORS confirmed); static fallback only needed for offline |
| LOFTEE flag details | Requires GraphQL query extension; deferred to v1.7+ |
| Automatic quality flag exclusion | Users should decide; tool flags but doesn't auto-exclude |
| npm registry publishing | GitHub Pages is primary distribution |
| Structural variant support | Different gnomAD API and data model; deferred to v1.7+ (#8) |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| QUAL-01 | — | Pending |
| QUAL-02 | — | Pending |
| QUAL-03 | — | Pending |
| QUAL-04 | — | Pending |
| QUAL-05 | — | Pending |
| QUAL-06 | — | Pending |
| QUAL-07 | — | Pending |
| QUAL-08 | — | Pending |
| SRC-01 | — | Pending |
| SRC-02 | — | Pending |
| SRC-03 | — | Pending |
| SRC-04 | — | Pending |
| SRC-05 | — | Pending |
| FMT-01 | — | Pending |
| FMT-02 | — | Pending |
| FMT-03 | — | Pending |
| FMT-04 | — | Pending |
| FMT-05 | — | Pending |
| FMT-06 | — | Pending |
| FMT-07 | — | Pending |
| EXP-01 | — | Pending |
| EXP-02 | — | Pending |
| EXP-03 | — | Pending |
| EXP-04 | — | Pending |
| EXP-05 | — | Pending |
| ORPH-01 | — | Pending |
| ORPH-02 | — | Pending |
| ORPH-03 | — | Pending |
| ORPH-04 | — | Pending |
| ORPH-05 | — | Pending |
| ORPH-06 | — | Pending |
| ORPH-07 | — | Pending |
| ORPH-08 | — | Pending |
| SUBP-01 | — | Pending |
| SUBP-02 | — | Pending |
| SUBP-03 | — | Pending |
| SUBP-04 | — | Pending |
| SUBP-05 | — | Pending |
| SUBP-06 | — | Pending |
| SUBP-07 | — | Pending |
| VIZ-01 | — | Pending |
| VIZ-02 | — | Pending |
| VIZ-03 | — | Pending |
| VIZ-04 | — | Pending |
| VIZ-05 | — | Pending |
| VIZ-06 | — | Pending |
| VIZ-07 | — | Pending |

**Coverage:**
- v1.6 requirements: 46 total
- Mapped to phases: 0 (pending roadmap)
- Unmapped: 46

---
*Requirements defined: 2026-02-26*
*Last updated: 2026-02-26 after initial definition*
