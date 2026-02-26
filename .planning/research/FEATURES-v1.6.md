# Feature Landscape: v1.6 Analysis & Export

**Domain:** Genomics carrier frequency calculator (clinical genetics)
**Researched:** 2026-02-26
**Overall confidence:** HIGH for standard thresholds and competitor behavior; MEDIUM for Orphanet integration details
**Scope:** Seven feature areas from GitHub issues #2, #5, #6, #9, #10, #11, #12

---

## Context: What Already Exists

The tool already has a robust feature set built in v1.5:

- gnomAD v4/v3/v2 integration with gene search + variant fetch
- HWE 2pq carrier frequency + simplified formula option + VCR/GCR homozygote exclusion
- Genetic prevalence (q^2) + Bayesian with penetrance
- Population frequency table: Carrier Freq %, Ratio, Prevalence, Recurrence Risk, AC, AN, Notes
- Variant table: variant_id, consequence, AF, carrier freq, ratio, ClinVar chip, gold stars, HGVS-c/p
- Expanded variant row: transcript, position, ref/alt, AC/AN, LoF HC/LC/OS chips, missense chip, ClinVar P/LP chip
- Manual variant exclusion with reasons
- JSON + Excel export (3 sheets: summary, populations, variants)
- Frequency display as percentage + 1:X ratio
- LOFTEE `lof` field display (HC/LC/OS) but NOT `lof_filter` or `lof_flags`
- Configurable filtering: LoF HC toggle, missense toggle, ClinVar toggle, star threshold, conflicting threshold
- Population-level `isLowSampleSize` (AN < 1000) and `isFounderEffect` flags
- Founder effect detection (population > 5x global)
- Shareable URLs with full state encoding
- `formatAlleleFrequency`: decimal with scientific notation for AF < 0.0001
- `formatPrevalence`: percentage + 1:X ratio

**Key types already defined:**
- `DisplayVariant`: variant_id, alleleFrequency, alleleCount, alleleNumber, isLoF, isClinvarPathogenic, isMissense, lof (HC/LC/OS), clinvarStatus, goldStars
- `PopulationFrequency`: code, label, carrierFrequency, alleleCount, alleleNumber, isLowSampleSize, isFounderEffect, geneticPrevalence
- `ExportVariant`: variantId, consequence, alleleFrequency, alleleCount, alleleNumber, hgvsC, hgvsP, clinvarStatus, isLoF, isClinvarPathogenic, excluded, exclusionReason
- `PopulationConfig`: code, label, description (currently no subpopulation support)

---

## Feature 1: Variant Quality Flags (#12)

### How Competitor Tools Handle This

**gnomAD Browser** displays variant quality through multiple flag categories:

1. **Region flags** (shown in Flags column of variant table):
   - `lcr` -- Low Complexity Region: identified by symmetric DUST algorithm at score threshold 30; allele frequencies may be skewed by artifact enrichment
   - `segdup` -- Segmental Duplication: variant in duplicated genomic region
   - `decoy` -- Decoy sequence region
   - `nonpar` -- Non-pseudoautosomal region of sex chromosomes
   - `monoallelic` -- All samples have homozygous alternate genotypes

2. **QC filter flags** (PASS vs filtered):
   - Hard filters: `InbreedingCoeff < -0.3`, `AC0` (no high-quality genotypes)
   - Random forest model probability thresholds (SNVs: >=0.1 exomes / >=0.4 genomes; Indels: >=0.2 exomes / >=0.4 genomes)
   - Non-PASS variants hidden by default, toggleable by user

3. **LOFTEE annotations** (partially implemented in this tool):
   - `lof_filter` values (reasons for LC classification): END_TRUNC, INCOMPLETE_CDS, EXON_INTRON_UNDEF, SMALL_INTRON, ANC_ALLELE, NON_DONOR_DISRUPTING, NON_ACCEPTOR_DISRUPTING, RESCUE_DONOR, RESCUE_ACCEPTOR, GC_TO_GT_DONOR, 5UTR_SPLICE, 3UTR_SPLICE
   - `lof_flags` values (warnings on HC variants): SINGLE_EXON, NAGNAG_SITE, PHYLOCSF_WEAK, PHYLOCSF_UNLIKELY_ORF, NON_CAN_SPLICE
   - ~14% of HC pLoF variants carry at least one flag (Gudmundsson et al. 2022)

4. **Allele frequency interpretation thresholds** (ACMG/AMP):
   - AF >= 5% (BA1): standalone benign evidence -- variant at this frequency is almost certainly benign
   - AF > 1% (BS1): strong evidence variant is benign
   - These are the most critical quality indicators for carrier frequency calculation

**GeniE** displays "variant level flags" for entries requiring additional scrutiny, specifically flagging low AN values.

**Franklin** shows aggregated frequency with subpopulation detail but does not display raw QC flags.

### What This Tool Should Display

Given the tool's purpose (carrier frequency calculation, not variant interpretation), the relevant quality flags are those that affect frequency reliability:

### Table Stakes

| Feature | Why Expected | Complexity | Dependencies |
|---------|-------------|------------|-------------|
| High AF warning (>=5% BA1) | Any variant with AF>=5% is almost certainly benign per ACMG. Including it in carrier frequency is a clinical error. gnomAD browser prominently flags these. Users must see this immediately. | Low | Existing `DisplayVariant.alleleFrequency`; add computed flag + warning chip in variant table |
| High AF caution (>1% BS1) | Strong benign evidence per ACMG. Not auto-excluded but user should be warned before including in calculation. | Low | Same field; different threshold; yellow warning chip |
| Low AN per-variant warning | GeniE flags this. Even if population-level AN is adequate, individual variants may have very low AN in specific data sources. Critical for rare variant interpretation. | Low | Existing `DisplayVariant.alleleNumber`; use `lowSampleSizeThreshold` from config (currently 1000) |

### Differentiators

| Feature | Value Proposition | Complexity | Dependencies |
|---------|------------------|------------|-------------|
| Auto-exclude BA1 variants | Prevent clinical errors by auto-excluding AF>=5% variants from carrier frequency calculation. User can manually re-include (existing exclusion/inclusion system). Show prominent warning when doing so. | Low | Existing exclusion system (`useExclusionState`); add auto-exclude logic in filter pipeline |
| LOFTEE flag display on HC variants | Show which HC variants carry flags like SINGLE_EXON or PHYLOCSF_WEAK, indicating the HC classification may be less reliable. ~14% of HC pLoF carry flags. | Medium | Requires adding `lof_flags` field to gnomAD GraphQL query and `TranscriptConsequence` type. Currently only `lof` (HC/LC/OS) is fetched. |
| LOFTEE filter reason for LC variants | Show WHY a variant is LC (e.g., "END_TRUNC: falls in last 5% of transcript"). Currently the expanded row shows "LoF LC" with no explanation. | Medium | Requires adding `lof_filter` field to gnomAD GraphQL query. Display as tooltip on the LC chip. |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|-------------|-----------|-------------------|
| Displaying all gnomAD QC flags (RF probability, InbreedingCoeff) | Users are genetic counselors, not bioinformaticians. Raw QC metrics are confusing and not actionable for carrier frequency. | Surface only clinically relevant flags (AF thresholds, LOFTEE flags) |
| Toggle for gnomAD PASS/non-PASS variants | Would expose non-QC-passing variants to clinical frequency calculations. The gnomAD API already returns only PASS variants for the queries this tool makes. | Keep current behavior (PASS only). Document this as a design decision. |
| Region flags (lcr, segdup, decoy) per variant | Requires genomic coordinate lookup not in current GraphQL response; low clinical impact specifically for carrier frequency use case | Link to gnomAD variant page for full QC detail (existing external link) |
| Aggregate quality score badge (red/yellow/green) | Requires defining a scoring rubric combining multiple flag sources; opinionated and potentially misleading | Show individual flags transparently; let clinical judgment drive interpretation |

### Standard Thresholds (HIGH confidence)

| Threshold | Value | Source |
|-----------|-------|--------|
| BA1 (benign standalone) | AF >= 0.05 (5%) | ACMG/AMP (Richards et al. 2015); Gudmundsson et al. 2022 |
| BS1 (benign strong) | AF > 0.01 (1%) | ACMG/AMP; disease-specific thresholds may vary |
| Low AN per-variant | AN < 1000 | Config setting `lowSampleSizeThreshold`; consistent with GeniE |
| LOFTEE flag prevalence | ~14% of HC pLoF | Gudmundsson et al. 2022 |

---

## Feature 2: ClinVar vs pLoF Source Breakdown (#11)

### How Competitor Tools Handle This

**GeniE** allows building variant lists from ClinVar, gnomAD (pLoF), or custom IDs. Users can see variant-level metadata including source. The tool provides TSV export with full variant attribution.

**Published studies** (Kandolin 2024, GIMOPEN 2024) report carrier frequencies with explicit methodology: "ClinVar P/LP with >= 1 star" and "LOFTEE HC pLoF" as separate categories, sometimes reporting each category's contribution to total frequency.

**gnomAD Browser** shows LOFTEE and ClinVar as separate annotation sections on variant pages. No combined source breakdown view exists because the browser is not a carrier frequency calculator.

### Current State

The tool already has the required data:
- `isLoF: boolean` on `DisplayVariant` -- true if LOFTEE HC
- `isClinvarPathogenic: boolean` on `DisplayVariant` -- true if ClinVar P/LP
- `isMissense: boolean` on `DisplayVariant`
- The expanded variant row shows chips for LoF HC, ClinVar P/LP, Missense
- Filtering uses OR logic: variant included if LoF HC OR ClinVar P/LP (counted once regardless of overlap)

What is missing: aggregate summary of how many variants come from each source and how much each contributes to total carrier frequency.

### Table Stakes

| Feature | Why Expected | Complexity | Dependencies |
|---------|-------------|------------|-------------|
| Source badge in main table row (not just expanded) | Whether a variant qualifies via LoF HC, ClinVar P/LP, or both should be visible at a glance without expanding. Currently requires expanding row. | Low | Existing flags; add icon/chip column to `VariantTable.vue` headers |
| Handle overlap correctly | Many variants (especially frameshift, stop-gained) are both LOFTEE HC AND ClinVar P/LP. Must not double-count in summary. Must show both badges. | Low | Already handled in filter logic (OR, counted once). Summary needs 3 categories: LoF-only, ClinVar-only, Both. |
| Summary counts by source | "X from LoF HC only, Y from ClinVar P/LP only, Z from both" displayed above or beside variant count in results summary. This is standard in published methodology sections. | Low | Computed from existing `isLoF` and `isClinvarPathogenic` flags on filtered variants array |

### Differentiators

| Feature | Value Proposition | Complexity | Dependencies |
|---------|------------------|------------|-------------|
| AF contribution by source | Show what % of total sumAF comes from LoF-only variants vs ClinVar-only vs both. Helps users understand whether carrier frequency is driven by a few ClinVar variants or many pLoF variants. | Medium | Sum AFs per source category from filtered variant list; display as text or mini chart |
| Source breakdown in export | Include `source` column in TSV/Excel export: "lof_only", "clinvar_only", "both" | Low | Add field to `ExportVariant` interface; compute from existing flags |
| Sensitivity analysis info | Text explanation: "If only ClinVar P/LP variants are used, carrier frequency would be 1:X. If only pLoF HC variants are used, carrier frequency would be 1:Y." For validation purposes. | Medium | Recalculate carrier frequency per source subset; display as secondary info |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|-------------|-----------|-------------------|
| Separate carrier frequency numbers per source | Misleading -- carrier frequency is the aggregate from all qualifying variants. Splitting suggests independent calculations when variants can overlap. | Show ONE carrier frequency with attribution breakdown underneath |
| Complex Venn diagram of source overlap | Over-engineered for typically <20 qualifying variants per gene | Simple text: "X LoF-only, Y ClinVar-only, Z both" |
| Source toggle (calculate from only one source) | Risks users accidentally using incomplete data in clinical reports | Show as read-only sensitivity analysis info, not as calculation toggle |

---

## Feature 3: Scientific Notation + Per-100k Display (#10)

### How Genomics Tools Format Frequencies

**gnomAD Browser:**
- Allele frequencies: decimal (0.001234) with 4-6 significant figures
- Scientific notation for very small values (1.23e-5)
- No "per 100k" display

**ACMG/Clinical publications (Kandolin 2024, ACMG 2021):**
- Carrier frequencies: "1 in X" format dominant (e.g., "1 in 25", "1 in 200")
- ACMG screening tiers use 1/100 and 1/200 thresholds
- Percentage format alongside (e.g., "4.0%")
- Scientific notation for very small allele frequencies in tables

**Orphanet/Epidemiology:**
- Disease prevalence: "per 100,000" is the standard (e.g., "1-9 / 100,000")
- Alternative: "1 in X" for very rare conditions
- Birth prevalence reported separately from point prevalence

**This tool's current formatters:**
- `formatAlleleFrequency`: decimal; scientific notation for AF < 0.0001 (already correct)
- `frequencyToPercent`: X.XX% with configurable decimal places (currently 2)
- `frequencyToRatio`: "1:X" with Math.round
- `formatPrevalence`: "1:X" ratio + "X.XXXX%" percentage (4 decimal places)

### Table Stakes

| Feature | Why Expected | Complexity | Dependencies |
|---------|-------------|------------|-------------|
| Scientific notation for prevalence display | Values like 0.0000156 displayed as "0.0016%" are misleading (suggest higher prevalence). Scientific notation (1.56e-5) is standard in genomics. | Low | Modify `formatPrevalence` to use `toExponential()` for small values |
| Per-100,000 prevalence display | Epidemiology standard matching Orphanet format. Enables direct comparison: "Your calculation: 1.56 per 100,000. Orphanet: 1-9 per 100,000." Genetic counselors expect this format. | Low | `prevalence * 100000` with appropriate rounding; add to `formatPrevalence` output |
| Consistent significant figures | For very small carrier frequencies (e.g., ultra-rare diseases), current "0.00%" is meaningless. Need minimum significant digits. | Low | Threshold-based format switching in formatters |

### Differentiators

| Feature | Value Proposition | Complexity | Dependencies |
|---------|------------------|------------|-------------|
| User-selectable display format | Toggle between 1:X ratio, percentage, scientific notation, per-100k in settings. Different users prefer different formats for different contexts. | Medium | Settings store toggle; conditional formatter in display components |
| Copy-friendly formatted values | Click-to-copy on any frequency value (already have clipboard API for link sharing) | Low | Extend existing `useClipboard` usage to frequency cells |
| Prevalence context labels | "approximately X per 100,000 births" vs "approximately X per 100,000 individuals" with qualifier language appropriate for genetic vs birth prevalence | Low | Template text differentiation |
| Format in clinical text output | Auto-select appropriate format (1:X for carrier freq, per-100k for prevalence) in generated clinical text | Low | Template variable formatting |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|-------------|-----------|-------------------|
| Showing ALL formats simultaneously everywhere | Information overload; clutters the already dense results table | Primary format (1:X) with secondary format (%) already shown. Add per-100k as tooltip or configurable alternative. |
| Per-million or per-billion display | Not standard in clinical genetics; only used in cancer epidemiology | Per-100,000 matches Orphanet conventions |
| Custom decimal places per cell | Too granular; users will not configure this per column | One global setting (existing `frequencyDecimalPlaces`); threshold-based auto-switching for very small values |

### Recommended Formatting Rules

| Context | Primary Format | Secondary Format | Auto-switch Rule |
|---------|---------------|-----------------|-----------------|
| Carrier frequency (>= 0.001) | 1:X ratio | X.XX% | Current behavior is correct |
| Carrier frequency (< 0.001) | 1:X ratio | Scientific notation | When percentage would show "0.00%" |
| Allele frequency | Decimal | Scientific notation | When AF < 0.0001 (current behavior correct) |
| Genetic prevalence (>= 1 per 100k) | 1:X ratio | X.XX per 100,000 | New: add per-100k |
| Genetic prevalence (< 1 per 100k) | 1:X ratio | Scientific notation | When per-100k would be "0.XX per 100,000" |

---

## Feature 4: TSV Export (#9)

### How Bioinformatics Tools Export

**GeniE:** TSV is the primary export format. "All variant details are downloadable as TSV files, allowing people to apply their own methods if desired." This is the format bioinformatics users expect.

**slivar:** `slivar tsv` converts VCF to spreadsheet-friendly TSV with customizable columns.

**gnomAD:** Bulk downloads in VCF and TSV. Per-variant browser exports follow VCF conventions.

**Standard column ordering** in bioinformatics TSV (derived from VCF convention):
1. Identifiers first (chromosome, position, variant ID)
2. Variant details (ref, alt, consequence, HGVS)
3. Frequency data (AF, AC, AN)
4. Annotation data (ClinVar, LOFTEE)
5. Analysis-specific columns last

### Current State

The tool exports JSON and Excel. The `ExportVariant` interface already defines all needed fields. The `buildExportData` function creates structured export data. Adding TSV is purely a formatting exercise -- no new data computation needed.

### Table Stakes

| Feature | Why Expected | Complexity | Dependencies |
|---------|-------------|------------|-------------|
| TSV variant export | Standard bioinformatics interchange format. GeniE uses TSV as primary. Required for downstream analysis in R, Python, Excel, and pipeline integration. | Low | Existing `ExportVariant` data; generate tab-delimited string + browser download |
| Standard column ordering | Follow VCF-derived convention (identifiers, variant details, frequencies, annotations, analysis) | Low | Reorder existing fields in output |
| Header row with bioinformatics-standard names | Column names in snake_case, lowercase, matching community conventions (variant_id, allele_frequency, allele_count, etc.) | Low | String formatting |
| Menu item alongside JSON/Excel | TSV export accessible from the same Export dropdown menu | Low | Add third option to existing menu in `StepResults.vue` |

### Differentiators

| Feature | Value Proposition | Complexity | Dependencies |
|---------|------------------|------------|-------------|
| TSV for all three data types | Separate TSV files for variants, populations, and summary (or combined multi-section file with clear headers) | Low | Existing export builders for all three types |
| Population-specific variant TSV | Export variants with per-population AC/AN/AF columns. Matches gnomAD bulk download format for downstream analysis. | Medium | Logic exists in `getPopulationVariants`; need to pivot data into columns per population |
| Copy-to-clipboard TSV | Copy variant table as TSV directly to clipboard for pasting into spreadsheets without file download | Low | Clipboard API (already used); TSV formatter |
| Source column in export | Add `source` column: "lof_only", "clinvar_only", "both", "missense_clinvar" | Low | Compute from existing `isLoF`, `isClinvarPathogenic`, `isMissense` flags |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|-------------|-----------|-------------------|
| VCF export | VCF is for variant calling pipelines, not clinical calculators. Requires generating proper VCF headers, INFO field formatting, and compliance with VCF spec. | TSV covers all downstream analysis needs |
| BED format export | Not relevant for carrier frequency data (BED is for genomic intervals) | TSV is sufficient |
| CSV (comma-separated) | TSV is preferred in bioinformatics because annotation fields often contain commas. Excel opens TSV correctly. | Default to TSV. CSV trivial to add later if requested. |

### Recommended TSV Column Order

**Variant TSV:**
```
variant_id	chromosome	position	ref	alt	consequence	hgvsc	hgvsp	allele_frequency	carrier_frequency	allele_count	allele_number	clinvar_status	clinvar_stars	lof_annotation	source	excluded	exclusion_reason
```

**Population TSV:**
```
population_code	population_label	carrier_frequency	carrier_frequency_percent	carrier_frequency_ratio	genetic_prevalence	allele_count	allele_number	is_founder_effect	is_low_sample_size
```

**Summary TSV:**
```
gene	gnomad_version	global_carrier_frequency	global_carrier_frequency_ratio	global_allele_count	global_allele_number	qualifying_variants	genetic_prevalence	bayesian_prevalence	formula	hom_exclusion_active	export_date
```

---

## Feature 5: Subcontinental Populations (#5)

### How gnomAD Handles Subpopulations

**gnomAD v2.1.1** provides subcontinental populations (HIGH confidence, verified from release notes):

East Asian (eas) subpopulations:
- `eas_kor` (Korean): 1,909 exomes
- `eas_jpn` (Japanese): 76 exomes
- `eas_oea` (Other East Asian): 7,212 exomes, 780 genomes

Non-Finnish European (nfe) subpopulations:
- `nfe_bgr` (Bulgarian): 1,335 exomes
- `nfe_est` (Estonian): 121 exomes, 2,297 genomes
- `nfe_nwe` (North-Western European): 21,111 exomes, 4,299 genomes
- `nfe_seu` (Southern European): 5,752 exomes, 53 genomes
- `nfe_swe` (Swedish): 13,067 exomes
- `nfe_onf` (Other Non-Finnish European): 15,499 exomes, 1,069 genomes

**gnomAD v4.0/v4.1:** Subcontinental populations NOT included in MVP release. The v4.0 release notes explicitly state "sub-genetic ancestry groups" would come in subsequent minor releases. As of February 2026, v4 subcontinental data is not available via the GraphQL API.

**gnomAD v3.1.2:** Does not provide subcontinental populations (continental-level groups plus Amish only).

**gnomAD Browser display convention:** Subcontinental populations are shown as expandable/collapsible rows indented under their parent population in the population frequency table.

**Critical sample size concern:** Many v2 subcontinental populations have very small sample sizes. `eas_jpn` has only 76 exomes. The existing `lowSampleSizeThreshold: 1000` would flag most of these, which is appropriate.

### Table Stakes

| Feature | Why Expected | Complexity | Dependencies |
|---------|-------------|------------|-------------|
| Display v2 subcontinental data when gnomAD v2 is selected | v2 subpopulations are available in the GraphQL API and are clinically relevant for European/East Asian ancestry breakdown. This is a key reason users select v2 over v4. | Medium | Modify GraphQL variant query for v2 to request subpopulation data; extend `PopulationConfig` to support parent-child relationships; update frequency calculation to include subpopulations |
| Hierarchical display (parent > child) | gnomAD browser convention. Users expect to see subpopulations nested under their parent population, not as flat siblings. | Medium | Vuetify expandable rows or indented row styling in population table; tree data structure |
| Low sample size warnings on subpopulations | Most subpopulations have <2000 samples. Warnings are critical to prevent misinterpretation. | Low | Existing `isLowSampleSize` flag with existing threshold (1000) |
| "Not available" message for v3/v4 | Users selecting v4 should see a clear explanation that subcontinental data is not yet available, not just empty space. | Low | Conditional display based on gnomAD version |

### Differentiators

| Feature | Value Proposition | Complexity | Dependencies |
|---------|------------------|------------|-------------|
| Version-aware population config | `PopulationConfig` gains optional `subpopulations` array. Each gnomAD version config specifies which populations have children. Clean separation of concerns. | Medium | Config JSON extension; backward-compatible |
| Subpopulation in exports | TSV/Excel/JSON exports include subcontinental rows with parent population reference | Low | Extend export data model with `parentPopulation` field |
| Subpopulation carrier frequency in clinical text | When user's patient is of specific ancestry (e.g., Swedish), clinical text can reference subpopulation data | Medium | Template variable extension |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|-------------|-----------|-------------------|
| Fabricating subcontinental estimates for v4 | v4 does not provide subcontinental data via API. Generating estimates (e.g., from v2 ratios) would be scientifically invalid. | Show "subcontinental data not available for gnomAD v4" with explanation that v4 uses global ancestry inference without subcontinental breakdown |
| Showing subpopulations expanded by default | Clutters the UI, especially with low-sample-size warnings on most rows | Default collapsed under parent; user clicks to expand |
| Computing carrier frequency for subpopulations with AN < 100 | Statistically meaningless; creates false precision | Show AC/AN but display carrier frequency as "Insufficient data" below threshold |
| Subcontinental population bar chart by default | Too many bars (up to 14 with subpopulations); chart becomes unreadable | Show subpopulations only in the table; bar chart shows continental populations only, with option to expand |

### Version-Specific Availability

| Version | Subcontinental Data | Groups with Subpopulations | API Status |
|---------|-------------------|--------------------------|------------|
| v2.1.1 | Yes | eas (3), nfe (6) | Available via GraphQL |
| v3.1.2 | No | None | N/A |
| v4.1 | Not yet | Planned (no timeline) | Not available |

---

## Feature 6: Orphanet Prevalence Reference Data (#6)

### How Orphanet Data Is Structured

**Orphadata** provides epidemiology data for rare diseases (MEDIUM confidence -- structure verified from documentation, API details need implementation-time validation):

- **Coverage:** 6,443 rare diseases with prevalence/incidence data (December 2025)
- **Update frequency:** Monthly releases
- **Formats:** XML files (primary), JSON via API (product9_prev)
- **License:** CC BY 4.0 (free for any use with attribution)
- **Data fields:**
  - Disease name and ORPHA number
  - Prevalence type: point prevalence, birth prevalence, lifetime prevalence
  - Prevalence class: ranges like "1-9 / 100,000", "1-9 / 1,000,000", ">1 / 1,000"
  - Geographic scope: worldwide, Europe, specific countries
  - Inheritance type, age of onset

**Gene-to-disease mapping** is available as a separate Orphadata product (product6), linking genes to ORPHA numbers. This two-step chain enables: gene -> ORPHA disease(s) -> prevalence data.

**Orphadata API products:**
- product1: Rare diseases with terminology alignments
- product6: Genes associated with diseases
- product9_prev: Epidemiology data (prevalence)
- product9_ages: Natural history data

### How Competitor Tools Use This

**GeniE** incorporates Orphanet prevalence estimates imported through their release files. The dashboard shows Orphanet prevalence alongside calculated genetic prevalence for comparison. This is the primary competitive reference.

**GeneReviews** references Orphanet prevalence within disease summaries but no programmatic access.

**OMIM** provides prevalence data but behind a commercial license. Not suitable for open-source integration.

### Table Stakes

| Feature | Why Expected | Complexity | Dependencies |
|---------|-------------|------------|-------------|
| Show Orphanet prevalence as comparison value | When displaying genetic prevalence (q^2), show published Orphanet prevalence alongside. "Calculated: 1:X. Published (Orphanet): 1:Y-Z." GeniE already does this. | Medium | Need gene-to-ORPHA mapping + prevalence lookup; static data bundle recommended |
| Prevalence range display | Orphanet uses ranges ("1-9 / 100,000"), not point estimates. Display must preserve this range, not pick a midpoint. | Low | String formatting; store as range (min, max) |
| Source attribution | Clear label: "Reference: Orphanet [date], ORPHA:[number]" with link to Orphanet page | Low | URL pattern: `https://www.orpha.net/en/disease/detail/{orpha_number}` |
| Handle "no Orphanet data" gracefully | Many genes have no Orphanet prevalence entry. Display should show "No published prevalence data available" not an error. | Low | Conditional rendering |

### Differentiators

| Feature | Value Proposition | Complexity | Dependencies |
|---------|------------------|------------|-------------|
| Automatic gene-to-disease-to-prevalence lookup | User enters gene, tool automatically shows Orphanet prevalence. No manual lookup needed. Key competitive parity with GeniE. | High | Requires building gene-to-ORPHA index + prevalence lookup. Recommend bundling as static JSON. |
| Prevalence discrepancy alert | Flag when calculated genetic prevalence differs >10x from Orphanet published prevalence. May indicate incomplete variant capture, reduced penetrance, or known ascertainment bias. | Medium | Comparison logic; need to parse Orphanet range midpoint for comparison |
| Multiple disease association | Some genes (CFTR) are associated with multiple Orphanet entries (CF, CBAVD, pancreatitis). Show all with separate prevalence data. | Medium | Gene-to-disease mapping is one-to-many in Orphadata product6 |
| Per-100k format matching | Display calculated prevalence in same "per 100,000" format as Orphanet for direct visual comparison | Low | Feature 3 dependency (per-100k formatting) |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|-------------|-----------|-------------------|
| Real-time Orphadata API calls from browser | API may be slow/unreliable; adds external dependency to clinical tool; CORS issues in browser SPA; API uses Elasticsearch backend that may have availability issues | Bundle Orphanet data as static JSON in `@gnomad-cf/core/config/`; update with releases |
| Using Orphanet prevalence IN calculations | Orphanet prevalence is for reference comparison only. The genetic prevalence from gnomAD is the tool's calculation. Mixing data sources would be scientifically unsound. | Display side-by-side with clear labels: "Calculated" vs "Published" |
| Full Orphanet disease profile | Age of onset, inheritance type, clinical features are beyond scope | Show only: disease name, ORPHA number, prevalence class, geographic scope |
| Attempting to compute which Orphanet prevalence "class" the calculation falls into | Orphanet classes are ranges determined by expert curation, not mathematical computation | Show them side-by-side; let clinical judgment determine if they agree |

### Data Integration Strategy

**Recommended approach:** Bundle a static JSON mapping file in `@gnomad-cf/core/config/orphanet/`:
- `gene-disease-map.json`: gene symbol -> ORPHA number(s) (derived from Orphadata product6)
- `prevalence.json`: ORPHA number -> prevalence data (derived from Orphadata product9_prev)

**Data size estimate:** ~4,000 gene-disease associations, ~6,400 diseases with prevalence. JSON bundle approximately 500KB-1MB compressed. Acceptable for web bundle.

**Update cadence:** Quarterly or with each tool release, fetching latest Orphadata XML/JSON and converting to static bundle. Script in `scripts/update-orphanet.ts`.

---

## Feature 7: Population Bar Chart (#2)

### How Genomics Tools Visualize Population Frequencies

**gnomAD Browser:**
- Population frequencies are purely tabular (no bar chart on the variant page)
- Gene page shows allele frequency track (variant positions plotted along gene, height = AF)
- Subcontinental populations are expandable table rows

**GeniE:**
- Provides "interactive charts with adjustable methodologies"
- Users can change calculation approaches via radio buttons below charts
- Specific chart types not publicly documented (SPA could not be rendered)
- TypeScript-heavy frontend suggests D3 or React-based charting

**Published carrier frequency studies:**
- Horizontal bar charts comparing carrier frequencies across populations are standard in publications
- Bars sorted by frequency descending or by geographic grouping
- Log scale common when populations span wide frequency ranges
- Error bars or confidence intervals sometimes shown (for sample-size-dependent estimates)

### Charting Library Selection

The project uses Vue 3 + Vuetify 3 + Vite 7. Compatible options:

| Library | Bundle Size | Vue 3 Support | a11y | Verdict |
|---------|------------|---------------|------|---------|
| Chart.js v4 + vue-chartjs v5 | ~65KB | Yes (dedicated wrapper) | Limited; aria via plugin | **Recommended** -- lightweight, mature, covers bar chart needs perfectly |
| Apache ECharts + vue-echarts | ~300KB+ | Yes | Built-in ARIA | Over-engineered; bundle size concern for SPA |
| D3.js | ~90KB (full) | Manual integration | Manual ARIA | Too low-level for simple bar charts; no Vue wrapper benefit |
| Vuetify Sparklines | Built-in | Yes | Vuetify a11y | Too simple -- sparklines only, cannot do proper bar chart |

**Recommendation: Chart.js v4 + vue-chartjs v5.** It is the most common Vue charting solution, well-documented, actively maintained, and lightweight. The bar chart is a core Chart.js primitive requiring minimal configuration.

### Table Stakes

| Feature | Why Expected | Complexity | Dependencies |
|---------|-------------|------------|-------------|
| Horizontal bar chart of population carrier frequencies | Standard visualization in genomics publications. Makes population comparison immediate and visual. The tool already has a table; the chart is the visual complement. | Medium | New dependency: chart.js + vue-chartjs. Data from `CarrierFrequencyResult.populations`. |
| Global frequency reference line | Horizontal dashed line or marker showing global carrier frequency for instant comparison | Low | Chart.js annotation plugin or simple dataset |
| Population labels | Full population names on y-axis (not codes) | Low | Existing `pop.label` field |
| Responsive sizing | Chart must work on mobile (stacked/scrollable) and desktop (inline) | Low | Chart.js responsive mode is default |
| Color coding for founder effect | Populations with founder effect detection highlighted in distinct color (match existing blue highlight in table) | Low | Conditional bar coloring from existing `isFounderEffect` flag |

### Differentiators

| Feature | Value Proposition | Complexity | Dependencies |
|---------|------------------|------------|-------------|
| Log scale toggle | When populations span 100x range (e.g., ASJ vs AFR for CFTR), log scale makes all bars visible. Without it, low-frequency populations are invisible. | Low | Chart.js log scale configuration option |
| Downloadable chart as PNG/SVG | Publication-ready figure export for papers and presentations. Clinical geneticists frequently need figures for clinical letters or conference presentations. | Medium | Chart.js `toBase64Image()` for PNG; custom SVG export more complex |
| Tooltips with full data | Hover shows carrier freq %, 1:X ratio, AC, AN, and low sample size warning | Low | Chart.js tooltip plugin with custom callbacks |
| Click-to-drill-down | Click a population bar to open the population variant modal (already built) | Low | Connect chart click event to existing `openPopulationModal(code)` function |
| Low sample size visual indicator | Hatched or translucent pattern for populations with `isLowSampleSize: true` | Medium | Chart.js pattern plugin or custom drawing |
| Prevalence comparison chart | Second grouped bar or separate chart showing genetic prevalence per population alongside carrier frequency | Medium | Data already in `PopulationFrequency.geneticPrevalence` |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|-------------|-----------|-------------------|
| 3D charts | Distort data perception; not accepted in scientific publications | Flat 2D horizontal bars |
| Pie chart for population frequencies | Populations are NOT parts of a whole. Carrier frequencies are independent per-population values, not fractions of total. Pie chart is statistically incorrect here. | Bar chart |
| World map / choropleth | gnomAD populations are genetic ancestry labels, NOT geographic regions. Mapping "Ashkenazi Jewish" or "Admixed American" to geography is misleading and scientifically incorrect. | Labeled bar chart |
| Animated chart transitions | Distracting in clinical context; accessibility concerns for motion-sensitive users | Instant render or subtle fade (prefers-reduced-motion respected) |
| Stacked bars (carrier freq components) | Carrier frequency is a single aggregate value per population, not composed of additive components | Simple single bars with variant breakdown in tooltip |

---

## Feature Dependencies Map

```
Feature 1 (Quality Flags)
    |-- AF threshold flags: independent, pure logic (Low)
    |-- LOFTEE flags: requires GraphQL query update for lof_flags/lof_filter (Medium)
    +-- Enables: Better quality column in Feature 2 source breakdown
                  Quality flags in Feature 4 TSV export

Feature 2 (Source Breakdown)
    |-- Summary counts: independent, computed from existing flags (Low)
    |-- Source badge in table: independent, UI change (Low)
    +-- Enables: source column in Feature 4 TSV export

Feature 3 (Scientific Notation + Per-100k)
    |-- Formatter changes: independent, pure logic (Low)
    +-- Enables: Feature 6 prevalence comparison in matching format
                 Better prevalence display in Feature 7 chart tooltips

Feature 4 (TSV Export)
    |-- Base TSV: independent, string formatting (Low)
    |-- Enhanced by: Feature 1 (quality flag columns)
    |-- Enhanced by: Feature 2 (source column)
    +-- No blocking dependencies

Feature 5 (Subcontinental Populations)
    |-- Requires: GraphQL query update for subpopulation data (Medium)
    |-- Requires: PopulationConfig schema extension (Medium)
    |-- Requires: Hierarchical UI display (Medium)
    +-- Enhances: Feature 7 (optional subpopulation bars in chart)

Feature 6 (Orphanet Prevalence)
    |-- Requires: Static data bundle (gene-disease-prevalence map) (High)
    |-- Requires: Build/update script for Orphanet data (Medium)
    |-- Enhanced by: Feature 3 (per-100k format for comparison)
    +-- Independent of other features

Feature 7 (Population Bar Chart)
    |-- Requires: Charting library (new dependency: chart.js + vue-chartjs) (Medium)
    |-- Enhanced by: Feature 5 (subpopulation bars)
    |-- Uses: existing CarrierFrequencyResult.populations data
    +-- Independent of Features 1-4, 6
```

---

## MVP Recommendation

### Phase 1: Quick Wins (Low complexity, high clinical value)

These features involve minimal code changes, no new dependencies, and improve publication-readiness immediately:

1. **Feature 3: Scientific Notation + Per-100k** -- Pure formatter changes in `@gnomad-cf/core/calculations/formatters.ts` and `prevalence.ts`. No new dependencies. Immediately improves how prevalence values are displayed.
2. **Feature 2: Source Breakdown** -- Count computation from existing `isLoF`/`isClinvarPathogenic` flags. Simple summary text above variant count. Source badge column in variant table.
3. **Feature 4: TSV Export** -- String formatting of existing `ExportData`. Add menu item alongside JSON/Excel. GeniE-competitive feature with minimal effort.
4. **Feature 1: Quality Flags (AF thresholds)** -- Add BA1 (>=5%) and BS1 (>1%) warning chips to variant table using existing `alleleFrequency` data. No API changes needed.

### Phase 2: Medium Effort (New dependency, significant user value)

5. **Feature 7: Population Bar Chart** -- New charting dependency (chart.js ~65KB) but well-understood. Data already computed and available. High visual impact for clinical presentations.

### Phase 3: Larger Scope (New data sources, API changes)

6. **Feature 1: Quality Flags (LOFTEE flags/filters)** -- Requires GraphQL query extension to fetch `lof_flags` and `lof_filter` fields not currently requested. Medium API change + display update.
7. **Feature 6: Orphanet Prevalence** -- Requires building static data bundle from Orphadata XML/JSON. Gene-to-disease-to-prevalence chain. Build script + bundled data + comparison UI.
8. **Feature 5: Subcontinental Populations** -- Largest scope. v2-only limitation reduces priority. Needs GraphQL query changes, config extension (parent-child population structure), hierarchical UI in population table.

### Defer to Post-v1.6

- ClinVar-only vs LoF-only carrier frequency toggle (sensitivity analysis as separate calculation)
- World map / geographic visualization (misleading for genetic ancestry)
- Aggregate quality score badge (requires scoring rubric definition)
- Population-specific variant TSV with per-population AF columns (nice-to-have export enhancement)
- Full Orphanet disease profile (age of onset, clinical features)

---

## Competitor Feature Matrix (v1.6 Features)

| Feature | This Tool (Current) | This Tool (v1.6 Target) | GeniE (Broad 2024) | gnomAD Browser |
|---------|-------------------|----------------------|-------------------|----------------|
| Variant quality flags | LoF HC/LC chip only | + BA1/BS1 AF warnings + LOFTEE flag detail | Low AN flag | Full QC flags |
| Source breakdown | Chips in expanded row | Summary counts + table badge + AF contribution | Source in variant list | Separate sections |
| Scientific notation | AF only (<0.0001) | + Prevalence scientific notation + per-100k | Not documented | AF only |
| TSV export | None (JSON + Excel) | Variant + Population + Summary TSV | TSV primary export | VCF download |
| Subcontinental populations | None | v2: eas (3), nfe (6) subgroups | Yes (from Hail tables) | Yes (expandable) |
| Orphanet prevalence | None | Side-by-side comparison | Orphanet imported | None |
| Population bar chart | None | Horizontal bars + founder highlight + log scale | Interactive charts | Table only |
| Clinical text generation | Yes (DE/EN) | Yes (DE/EN) | No | No |
| Manual variant exclusion | Yes | Yes | No | No |
| Shareable URLs | Yes | Yes | No | No |

**Key competitive gap filled by v1.6:** TSV export (GeniE parity), Orphanet prevalence (GeniE parity), population visualization (exceeds gnomAD browser which has no chart), and quality flags (between gnomAD's full flags and GeniE's minimal flags).

**Remaining differentiators vs competitors:** Clinical text generation (unique), manual variant exclusion (unique), configurable filtering (unique depth of control), shareable URLs (unique).

---

## Sources

### HIGH Confidence
- [gnomAD Variant QC documentation](https://github.com/macarthur-lab/gnomad-docs/blob/master/docs/variant-qc.md) -- Hard filters, region flags, RF thresholds
- [LOFTEE GitHub repository](https://github.com/konradjk/loftee) -- Complete list of lof_filter and lof_flags values with descriptions
- [gnomAD v2.1 release notes](https://gnomad.broadinstitute.org/news/2018-10-gnomad-v2-1/) -- Subcontinental population codes and sample sizes
- [gnomAD v4.0 release notes](https://gnomad.broadinstitute.org/news/2023-11-gnomad-v4-0/) -- v4 MVP limitations, subcontinental data not included
- [Gudmundsson et al. 2022 - Variant interpretation using population databases](https://pmc.ncbi.nlm.nih.gov/articles/PMC9160216/) -- BA1/BS1 thresholds, LOFTEE flag prevalence (~14% HC), population frequency display, FAF
- [gnomAD LoF curations](https://gnomad.broadinstitute.org/news/2020-10-loss-of-function-curations-in-gnomad/) -- Curation verdicts and browser display
- [ACMG carrier screening 2021](https://pmc.ncbi.nlm.nih.gov/articles/PMC8488021/) -- "1 in X" format, tier thresholds (1/100, 1/200)
- [ACMG technical standard 2024](https://pubmed.ncbi.nlm.nih.gov/38814327/) -- Carrier screening laboratory testing standards

### MEDIUM Confidence
- [GeniE blog post](https://gnomad.broadinstitute.org/news/2024-06-genie/) -- Features, Orphanet integration, TSV export, variant flags
- [GeniE GitHub](https://github.com/broadinstitute/genetic-prevalence-estimator) -- Architecture, data sources
- [Orphadata website](https://www.orphadata.com/) -- Data availability, formats, CC BY 4.0 licensing
- [Orphadata epidemiology](https://sciences.orphadata.com/epidemiology/) -- 6,443 diseases, monthly updates, XML format
- [Orphadata API GitHub](https://github.com/Orphanet/API_Orphadata) -- API products (product6, product9_prev), Flask/Elasticsearch

### LOW Confidence
- GeniE live application interface details (JavaScript SPA could not be rendered for inspection)
- Exact Orphadata API response format for product9_prev (needs validation during implementation)
- gnomAD v4 subcontinental population timeline (stated as "future minor release" with no specific date as of Feb 2026)
- Chart.js + vue-chartjs v5 bundle size (~65KB estimate; needs verification at install time)
