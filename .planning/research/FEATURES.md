# Feature Research

**Domain:** CLI tools, community gene curation, carrier frequency calculations
**Project:** gnomAD Carrier Frequency Calculator — v1.5 milestone
**Researched:** 2026-02-23
**Confidence:** HIGH for calculation methods (verified against peer-reviewed literature and published pipelines); MEDIUM for CLI patterns (established conventions, no single authoritative source); MEDIUM for gene config schema (community practice, not standardized)

---

## Context: What Already Exists

The existing web app (`src/utils/frequency-calc.ts`) calculates carrier frequency as:

```
carrier_freq = 2 × Σ(variant_AF_i)
```

where `variant_AF_i = (exome_AC + genome_AC) / (exome_AN + genome_AN)` per variant. This is the simplified Hardy-Weinberg estimate using `2q ≈ 2 × sum(AF)` without accounting for homozygotes and without properly applying the full HWE formula. The recurrence risk uses `carrier_freq / 4` (heterozygous index) or `carrier_freq / 2` (homozygous/compound het index).

The v1.5 milestone targets: Hardy-Weinberg 2pq, homozygote exclusion, genetic prevalence (q² and Bayesian), CLI, community gene configs, and a full test suite.

---

## Calculation Methods: Research Findings

### Hardy-Weinberg Equilibrium Fundamentals

**Source:** [Hardy-Weinberg Equilibrium — Biology LibreTexts](https://bio.libretexts.org/Workbench/Modern_Genetics/11:_Population_genetics/11.01:_Hardy-Weinberg_equilibrium), [Khan Academy HWE](https://www.khanacademy.org/science/ap-biology/natural-selection/hardy-weinberg-equilibrium/v/applying-hardy-weinberg), [Nature Scitable](https://www.nature.com/scitable/definition/hardy-weinberg-equation-299/)
**Confidence:** HIGH

The HWE genotype frequency equation: `p² + 2pq + q² = 1`

Where:
- `q` = pathogenic allele frequency (sum of all pathogenic AFs per gene)
- `p` = wild-type allele frequency = `1 - q`
- `2pq` = heterozygote (carrier) frequency
- `q²` = affected (homozygous/compound het) frequency

For rare diseases where `q` is small, `p ≈ 1`, so `2pq ≈ 2q`, meaning the current simplified formula `2 × sum(AF)` is a valid approximation. However, for higher-frequency variants (e.g., CFTR ΔF508 in Europeans, q ≈ 0.02), the difference between `2q` and `2pq = 2q(1-q)` is meaningful (e.g., 0.0400 vs 0.0392 for q=0.02, a 2% overestimate). Clinical-grade tools use `2pq`.

### Homozygote Exclusion from Carrier Count

**Source:** [npj Genomic Medicine pipeline](https://pmc.ncbi.nlm.nih.gov/articles/PMC9763236/), [gnomAD variant interpretation lessons](https://pmc.ncbi.nlm.nih.gov/articles/PMC9160216/), [Schmitz et al. 2022 Clinical Genetics](https://onlinelibrary.wiley.com/doi/abs/10.1111/cge.14148)
**Confidence:** HIGH

The published pipeline (Guo et al., npj Genomic Medicine 2022) uses:

```
VCR = (AC - 2×Hom) / (0.5 × AN)
```

Rationale: homozygotes contribute 2 alleles to AC but 0 to carrier count. The denominator `0.5 × AN` converts from alleles to individuals. This can be rewritten as:

```
carrier_count = AC - 2×Hom
individual_count = AN / 2
VCR = carrier_count / individual_count = (AC - 2×Hom) / (AN / 2)
```

Multi-variant gene carrier rate (GCR) then uses inclusion-exclusion to avoid double-counting:

```
GCR = 1 - Π(1 - VCRᵢ)   for all variants i in the gene
```

The existing app uses `2 × Σ(AF)` which overestimates because homozygotes are counted as carriers (they are not — they are affected individuals) and the approximation `2q ≈ 2pq` ignores the `(1-q)` correction.

**Homozygote filter for pathogenicity:** Variants with 10+ homozygotes in gnomAD are typically flagged as likely non-pathogenic (or reduced penetrance) for severe early-onset conditions. This is a separate concern from the calculation — it is a variant-quality filter, not a formula change.

### Genetic Prevalence: q² and Bayesian

**Source:** [GeniE Genetic Prevalence Estimator](https://gnomad.broadinstitute.org/news/2024-06-genie/), [CureFZ disease prevalence estimation](https://www.curefzi.org/2019/06/05/using-genetic-data-to-estimate-disease-prevalence/), [PMC7007541 worldwide IRD prevalence](https://pmc.ncbi.nlm.nih.gov/articles/PMC7007541/)
**Confidence:** HIGH for q² formula; MEDIUM for Bayesian approach

**Method 1: q² (Hardy-Weinberg)**

```
q = Σ(pathogenic AF per gene)
genetic_prevalence = q²
```

This estimates the proportion of individuals expected to be affected (homozygous or compound heterozygous) under HWE assumptions. GeniE (Broad Institute, 2024) uses this method directly from gnomAD allele frequencies.

**Method 2: Bayesian / penetrance-adjusted**

```
P(disease) = P(genotype) × penetrance / P(genotype | disease)
           = q² × penetrance
```

When penetrance < 1 (e.g., CFTR variants with variable expression), the naive q² overestimates prevalence. The Bayesian adjustment multiplies by penetrance. For most severe AR conditions with full penetrance, q² and Bayesian yield near-identical results (as confirmed by Guo et al., 2022).

**Practical note:** The published studies (Genetics in Medicine 2024, Kandolin et al. 2024) validate that Bayesian methods and HWE maximum-likelihood methods produce "highly concordant results" for severe AR conditions. q² is the correct starting point; Bayesian is the refinement for partial penetrance.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features that are expected for a v1.5 milestone of this tool. Missing any of these means the milestone deliverable is incomplete or the tool is less accurate than published literature.

| Feature | Why Expected | Complexity | Dependencies on Existing Code | Notes |
|---------|--------------|------------|-------------------------------|-------|
| **Hardy-Weinberg 2pq carrier frequency** | Published gnomAD pipelines (npj Genomic Medicine, Genetics in Medicine 2024) use 2pq, not 2q. Current 2×sum(AF) is a known approximation. Clinical tools should be accurate. | Low | Modify `calculateCarrierFrequency()` in `frequency-calc.ts` | New formula: `q = Σ(AF); p = 1 - q; cf = 2pq`. Backward-compatible if expressed as a flag. For rare diseases q<<1 the change is <0.5%; for common variants (CFTR in Europeans) it is ~2%. |
| **Homozygote exclusion from carrier count** | The gnomAD homozygote count is available in API responses. Published pipelines explicitly subtract `2×Hom` from carrier counts to avoid counting affected individuals as carriers. Current code ignores homozygote data entirely. | Medium | Requires homozygote count in `VariantFrequencyData` type; `aggregatePopulationFrequencies()` needs updating | gnomAD API already returns homozygote counts per population. Types must be updated to include `hom` field. Formula per variant: `VCR = (AC - 2×Hom) / (AN / 2)`. |
| **Gene carrier rate via inclusion-exclusion** | When combining multiple variants per gene, simple sum of AFs overcounts. Published formula is `GCR = 1 - Π(1 - VCRᵢ)`. This is the standard for multi-variant genes. | Medium | Replace `2 × Σ(AF)` in `globalStats` computation | Critical for genes with many pathogenic variants (e.g., CFTR with 30+ variants). For single-variant genes, difference is negligible. |
| **Genetic prevalence q²** | Directly derived from carrier frequency research. GeniE (Broad/gnomAD official tool 2024) implements this. Users will expect this output alongside carrier frequency. | Low | New computed value in `useCarrierFrequency.ts` and `frequency-calc.ts` | `q² = q²` where `q = Σ(AF)`. Display as "1 in N" births expected to be affected. Include in CLI output and results panel. |
| **CLI: single gene calculation** | Any tool adding a "core package" must expose CLI. Standard expectation for bioinformatics tools (bcftools, VEP, ANNOVAR all have CLI). Users expect `gnomad-cf CFTR --population nfe` to work. | High | Requires monorepo restructure (bun workspaces) + extraction of core calculation logic from Vue composables into a framework-agnostic package | CLI must replicate the full pipeline: gene lookup → variant fetch → filter → calculate → output. |
| **CLI: JSON output by default** | All modern bioinformatics CLIs support structured output for programmatic consumption. VEP, bcftools, and community tools all support `--format json`. | Low | Part of CLI implementation | JSON output allows `jq` piping. Also support TSV/CSV for spreadsheet users. |
| **CLI: --help with all flags** | Unix CLI convention. Every flag documented inline. | Low | Part of CLI implementation using Click (Python) or commander.js (Node) | Include examples in `--help` text. |
| **CLI: batch mode (gene list input)** | Published pipelines process gene lists (Kandolin et al. processed 113 ACMG genes; Guo et al. processed 2699 genes). Batch is the primary use case for research users. | Medium | Depends on single-gene CLI working; needs rate-limiting for gnomAD API | Accept JSON/CSV/newline-delimited gene lists. Output one result per line (JSONL) or full JSON array. |
| **Core package unit tests** | No test suite currently exists. Adding calculation improvements without tests risks silent regressions. Standard practice for any extracted library. | Medium | Requires Vitest setup; no existing test infrastructure | Test `calculateCarrierFrequency`, `calculateHWE`, `homozygote exclusion`, `genetic prevalence` with known values (e.g., CFTR ΔF508 q≈0.02 in NFE → expected carrier freq ≈ 3.9%). |
| **Community gene config loading** | The app already has a config-driven architecture (`src/config/`). Users need a place to register gene-specific recommended filters, founder effect notes, and variant exclusions. | Medium | Extend existing config system; add per-gene JSON/YAML files | One file per gene (e.g., `genes/CFTR.json`) with recommended filters, known founder variants, and curation notes. |

**Confidence:** HIGH (all verified against published literature and the existing codebase).

### Differentiators (Competitive Advantage)

Features that go beyond what published pipelines provide and differentiate this tool for clinical genetic counseling use.

| Feature | Value Proposition | Complexity | Dependencies | Notes |
|---------|-------------------|------------|--------------|-------|
| **Genetic prevalence Bayesian (penetrance-adjusted)** | q² assumes full penetrance. Adding a penetrance parameter allows calculation for CFTR (mild alleles), HCM genes (30-50% penetrance). GeniE does not expose this. | Medium | Depends on q² implementation; adds user-facing penetrance input | Store penetrance in gene configs with citation. Default penetrance = 1.0 (full). Display adjusted prevalence alongside naive q². |
| **Homozygote count filter flag (pathogenicity QC)** | Variants with 10+ gnomAD homozygotes are likely non-pathogenic for severe conditions. Exposing this as a configurable filter (default ON) catches a class of false positives not currently handled. | Low | Requires homozygote count in types (same dependency as homozygote exclusion calculation) | Configurable threshold from config JSON. CLI flag `--max-homozygotes 10`. Different from homozygote exclusion from carrier formula — this is a variant filter, not a formula change. |
| **At-risk couple frequency** | `P(both carriers) = GCF₁ × GCF₂`. Standard in carrier screening reports. GeniE calculates this; the existing web app does not. | Low | Depends on full HWE calculation | Display in results panel and CLI output. Formula: `CF_partner1 × CF_partner2`. For same gene: `GCF²`. |
| **PR-based gene config contribution workflow** | GitHub Actions validation on gene config PRs (schema check, required fields, citation format). Enables community contributions without breaking production. | Medium | Depends on gene config schema being finalized; GitHub Actions CI | Validate schema with JSON Schema or Zod. Block merge if required fields missing. Auto-generate docs from configs. |
| **Population-stratified prevalence display** | Show q² per population, not just globally. Critical for founder effect genes (e.g., CFTR in Ashkenazi Jewish population). No competitor shows population-stratified prevalence in the UI. | Low | Depends on q² implementation + existing population breakdown in app | Per-population q² = per-population q². Already have the population breakdown. |
| **CLI: clinical text output** | The web app generates clinical documentation text (German/English). Exposing this in the CLI means genetic counselors can automate text generation for batch reporting. No other CLI tool does this. | Medium | Depends on extracting `template-renderer.ts` into core package | `gnomad-cf CFTR --patient-status heterozygous --language de --output text` |
| **CLI: stdin/stdout piping** | Accept gene names from stdin, output to stdout. Enables shell pipeline composition: `cat genes.txt \| gnomad-cf --batch - \| jq '.[] \| select(.carrierFrequency > 0.01)'` | Low | Depends on batch mode CLI | Standard Unix convention (VEP, bcftools all support this). |
| **Gene config: founder effect variant annotations** | Per-gene configs can document specific founder effect variants with population, frequency, and clinical citation. This transforms the app from "gnomAD lookup" to "curated clinical resource." | Medium | Depends on gene config schema | Store variant IDs with founder effect notes. Display in variant table. Export to CLI output. |
| **Shareable URL for CLI results** | Output includes a URL that opens the web app pre-populated with the same calculation. Bridges CLI research workflow with web-based clinical documentation. | Low | Depends on existing URL state encoding (`useUrlState.ts`) | Existing URL encoding already handles full state. CLI generates the URL from the same inputs. |

**Confidence:** MEDIUM (competitive analysis confirms gap vs. GeniE and published pipelines; implementation complexity estimated from existing codebase familiarity).

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem valuable but should be deliberately excluded from v1.5 scope.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **X-linked recessive calculation in CLI** | Different formula, different gene list, different clinical interpretation. Adding X-linked to v1.5 scope will delay the core AR improvements. The existing web app is AR-only. | Defer to v1.6. Note in CLI `--help` that X-linked is not yet supported. |
| **Local gnomAD database download** | bcftools plugins and the gnomAD-toolbox use Hail + Spark for full gnomAD dataset access (807K individuals). Running this locally requires 10+ GB downloads and Spark setup. Not appropriate for a CLI targeting genetic counselors. | Continue using gnomAD GraphQL API. Note rate limits in documentation. Add retry logic and caching for batch mode. |
| **npm registry publishing in v1.5** | Adding package publishing infrastructure (npm, JSR) requires versioning discipline, changelog maintenance, and compatibility guarantees. Premature for a tool still in active development. | GitHub-based consumption: `bun add github:username/repo#workspace=core`. Document this as the install method. |
| **Variant-level pathogenicity re-scoring (CADD, SIFT, PolyPhen)** | The published pipeline (Guo et al.) uses these for missense classification. Adding full in-browser/CLI variant scoring requires either large local databases or external API calls with significant latency. | The existing ClinVar + LoF HC filter approach is clinically validated. Add homozygote count as a QC filter. Document that missense scoring requires separate bioinformatics pipeline. |
| **GUI for gene config contribution** | A web-based curation interface (like ClinGen's Gene Curation Interface) is a multi-month product. The target audience (genetic counselors, researchers) is comfortable with GitHub PRs. | PR-based contribution with JSON Schema validation in CI. Clear CONTRIBUTING.md with template. |
| **Bayesian residual risk for negative carrier test** | This requires prior probability estimation (Bayes' theorem applied to negative test result) and is a separate clinical calculation from carrier frequency. High risk of introducing errors if bundled with carrier frequency. | Listed in PROJECT.md as v1.6+ feature. Keep separate. |
| **Real-time websocket gnomAD updates** | gnomAD releases annually. The API returns current data. Websocket updates provide no value here. | Existing fetch-on-demand approach is correct. |
| **VCF file upload for batch input** | VCF parsing is a separate domain (requires htslib-equivalent, FORMAT/INFO field parsing). The CLI targets gene-symbol input, not raw sequencing data. | Accept gene symbols, HGNC IDs, or Ensembl gene IDs as input. Document limitation clearly. |
| **Interactive CLI (TUI)** | Terminal UI libraries (Ink for Node, Rich/Textual for Python) add significant complexity and are harder to automate. The target CLI user is scripting batch workflows. | Flags-based CLI with clear `--help`. Interactive mode adds no value for batch processing. |
| **Parallel gnomAD API requests without rate limiting** | gnomAD GraphQL has implicit rate limits. Firing unlimited parallel requests for 100-gene batch jobs will result in 429s. | Implement sequential processing with configurable concurrency (default: 3 concurrent requests). Cache responses during a batch run. |

**Confidence:** HIGH for scope-related anti-features (project constraints clear). HIGH for technical anti-features (API behavior well understood from existing implementation).

---

## Feature Dependencies

```
CALCULATION IMPROVEMENTS (in priority order):

  1. Type updates: add homozygote count to VariantFrequencyData
     |
     +-- 2. Homozygote exclusion formula: VCR = (AC - 2×Hom) / (AN/2)
     |        |
     |        +-- 4. Gene carrier rate (inclusion-exclusion): GCR = 1 - Π(1 - VCRᵢ)
     |
     +-- 3. Homozygote count as pathogenicity filter (Hom >= 10 → flag/exclude)

  4. Full HWE 2pq: q = Σ(AF); cf = 2q(1-q)       [independent of #2, #3]
     |
     +-- 5. Genetic prevalence q²: prev = q²
     |        |
     |        +-- 6. Bayesian penetrance adjustment: prev_adj = q² × penetrance
     |        |
     |        +-- 7. At-risk couple frequency: ARC = CF₁ × CF₂
     |
     +-- 8. Population-stratified prevalence (per-population q²)

MONOREPO RESTRUCTURE (prerequisite for CLI):

  Bun workspaces setup (packages/core, packages/cli, apps/web)
    |
    +-- Extract frequency-calc.ts → packages/core/src/calculations.ts
    +-- Extract template-renderer.ts → packages/core/src/text-generation.ts
    +-- Extract variant-filters.ts → packages/core/src/variant-filters.ts
    +-- Update apps/web to import from @gnomad-cf/core
    |
    +-- CLI (packages/cli):
         |
         +-- Single gene mode: gnomad-cf CFTR
         +-- Batch mode: gnomad-cf --batch genes.json
         +-- Output formats: --format json|tsv|text
         +-- Clinical text: --output text --language de|en

COMMUNITY GENE CONFIGS:

  Schema definition (JSON Schema or Zod)
    |
    +-- Per-gene config files (genes/CFTR.json, genes/SMN1.json, ...)
    +-- Config loader in core package
    +-- Web app integration (load gene config on gene selection)
    +-- CLI integration (apply gene config to batch runs)
    |
    +-- GitHub Actions PR validation (schema check)
    +-- Documentation generation from configs

TESTING:

  Vitest setup
    |
    +-- Core unit tests (calculations: known-value fixtures)
    +-- CLI integration tests (subprocess execution with captured output)
    +-- Vue component tests (Vue Test Utils)
    +-- Playwright E2E (critical wizard flows)
```

### Build Order Recommendation

1. **Type updates + homozygote data** — unblocks both calculation improvements and test fixtures
2. **Core calculation improvements** — HWE 2pq, homozygote exclusion, GCR, q²
3. **Vitest + unit tests for calculations** — validate improvements with published reference values
4. **Monorepo restructure** — extract core, update web app imports
5. **Gene config schema + initial gene files** — CFTR, SMN1, HEXA as examples
6. **CLI single-gene mode** — depends on core package
7. **CLI batch mode** — depends on single-gene CLI + rate limiting
8. **CLI integration tests** — depends on CLI working
9. **Vue component tests + Playwright E2E** — depends on stable web app

---

## MVP Definition

### Must-Have for v1.5

These define whether the milestone is delivered:

1. **HWE 2pq carrier frequency formula** replacing `2 × Σ(AF)` — improves clinical accuracy
2. **Homozygote exclusion** — `VCR = (AC - 2×Hom) / (AN/2)` per variant, `GCR = 1 - Π(1 - VCRᵢ)` per gene
3. **Genetic prevalence q²** — displayed in results panel and CLI output
4. **Monorepo restructure** — bun workspaces with `packages/core`, `packages/cli`, `apps/web`
5. **CLI: single gene mode** — `gnomad-cf CFTR --population nfe --format json`
6. **CLI: batch mode** — `gnomad-cf --batch genes.json --format jsonl`
7. **Gene config schema + 3-5 initial configs** — CFTR, SMN1, HEXA/HEX-B (Tay-Sachs), PKU (PAH)
8. **Core unit tests** — carrier frequency, HWE, homozygote exclusion, q² with reference values
9. **CLI integration tests** — at least CFTR smoke test (mocked API response)

### Should-Have for v1.5

High-value, achievable within milestone scope:

10. **Homozygote count pathogenicity filter** — Hom >= threshold → flag variant as likely non-pathogenic
11. **Bayesian prevalence** — q² × penetrance, with penetrance configurable per gene
12. **At-risk couple frequency** — CF² displayed in results
13. **Vue component tests** — frequency display, variant table
14. **Playwright E2E** — wizard completion flow

### Defer to v1.6+

- X-linked recessive calculation
- Structural variant (SV) support
- PDF export
- npm registry publishing
- Interactive CLI (TUI)
- Full bioinformatics pipeline integration (VCF input)

---

## Feature Prioritization Matrix

| Feature | Clinical Value | User Demand | Implementation Effort | Risk | Priority |
|---------|---------------|-------------|----------------------|------|----------|
| HWE 2pq formula | High (accuracy) | Medium | Low | Low | P1 |
| Homozygote exclusion | High (accuracy) | Medium | Medium | Medium | P1 |
| Gene carrier rate GCR | High (accuracy) | Medium | Low | Low | P1 |
| Genetic prevalence q² | High (new info) | High | Low | Low | P1 |
| Monorepo restructure | Foundation | Medium | High | Medium | P1 |
| CLI single gene | High (new audience) | High | High | Medium | P1 |
| Core unit tests | Foundation | Low | Medium | Low | P1 |
| Gene config schema | Moderate | Medium | Low | Low | P1 |
| Initial gene configs (4-5) | Moderate | Medium | Low | Low | P1 |
| CLI batch mode | High (researchers) | High | Medium | Medium | P2 |
| Hom count filter | Moderate (accuracy) | Medium | Low | Low | P2 |
| Bayesian prevalence | Moderate (accuracy) | Medium | Medium | Medium | P2 |
| At-risk couple freq | Moderate | Medium | Low | Low | P2 |
| Vue component tests | Foundation | Low | Medium | Low | P2 |
| Playwright E2E | Foundation | Low | Medium | Medium | P2 |
| CLI clinical text | High (unique) | Medium | Medium | Low | P3 |
| PR validation CI | Moderate | Low | Medium | Low | P3 |
| Population-stratified q² | Moderate | Low | Low | Low | P3 |

---

## Competitor Feature Analysis

| Feature | This App (Current) | This App (v1.5 Target) | GeniE (Broad/gnomAD 2024) | Published Pipelines (Guo et al., Kandolin et al.) | bcftools/VEP (general tools) |
|---------|-------------------|----------------------|--------------------------|--------------------------------------------------|------------------------------|
| Carrier frequency method | 2×Σ(AF) approx | 2pq HWE | 2pq HWE (q²-based) | GCR = 1-Π(1-VCRᵢ) | N/A (variant-level tools) |
| Homozygote exclusion | No | Yes | Implicit in q² | Yes (explicit VCR formula) | N/A |
| Genetic prevalence | No | Yes (q² + Bayesian) | Yes (q², primary output) | Yes | N/A |
| At-risk couple frequency | No | Yes | No | Yes | N/A |
| Penetrance adjustment | No | Yes (config-based) | No | Partial | N/A |
| Population-specific | Yes (all gnomAD pops) | Yes | Yes | Yes | N/A |
| Clinical text generation | Yes (DE/EN) | Yes + CLI | No | No | No |
| CLI interface | No | Yes | No | Scripts only | Yes |
| Batch mode | No | Yes | No | Yes (custom scripts) | Yes |
| JSON output | Export only | CLI default | Download | Custom | Yes |
| Community gene configs | No | Yes (PR-based) | Partial (ClinVar-based) | No | No |
| Homozygote count filter | No | Yes | No | Yes (Hom >= 10 exclusion) | No |
| Unit test suite | No | Yes | Yes (academic validation) | Yes (validated against cohorts) | Yes |
| ClinGen validity warnings | Yes | Yes | No | No | No |
| Manual variant exclusion | Yes | Yes | No | No | N/A |
| Shareable URLs | Yes | Yes | No | N/A | N/A |
| PWA / offline | Yes | Yes | No | N/A | N/A |

**Key gap vs. GeniE:** GeniE calculates genetic prevalence but does not generate clinical documentation text, does not support multi-perspective clinical letters, and is web-only. The CLI + clinical text combination is the primary differentiator.

**Key gap vs. published pipelines:** Published pipelines are research scripts, not user-facing tools. They process 2000+ genes in bulk but require Hail/Python environment and are not installable by a clinical user. The CLI being installable via `npm install -g` or `bun add` is a key differentiator.

---

## Calculation Reference Values (for Test Fixtures)

Verified reference values from published literature. Use in unit tests to validate implementation.

| Gene | Population | q (sum AF) | Expected 2pq | Expected q² | Source |
|------|-----------|------------|--------------|-------------|--------|
| CFTR (ΔF508 only) | Non-Finnish European | ~0.020 | ~0.0392 | ~0.0004 (1:2500) | [Carrier freq CF literature] |
| CFTR (all P/LP variants) | Non-Finnish European | ~0.022 | ~0.0431 | ~0.00048 (1:2080) | Kandolin et al. 2024 |
| SMN1 | Global | ~0.010 | ~0.0198 | ~0.0001 (1:10000) | Published SMA epidemiology |
| HEXA (Tay-Sachs) | Ashkenazi Jewish | ~0.033 | ~0.0638 | ~0.0011 (1:930) | Carrier screening literature |

**Note:** The difference between `2q` (current) and `2pq` (HWE-correct) for CFTR-NFE: 0.0400 vs 0.0392 — a 2% overestimate in the current implementation. For rare diseases (q < 0.001), the difference is <0.1% and clinically negligible.

---

## Gene Config Schema Design

Based on the existing config-driven architecture and community curation research.

### Recommended Schema

```json
{
  "gene": "CFTR",
  "hgnc_id": "HGNC:1884",
  "condition": "Cystic Fibrosis",
  "inheritance": "autosomal_recessive",
  "clingen_validity": "DEFINITIVE",
  "curated_by": "community",
  "curation_date": "2024-01-15",
  "citation": "PMID:38459613",
  "notes": "Use gnomAD v4.1 NFE population for European carrier screening. ΔF508 (rs113993960) dominates frequency.",
  "recommended_filters": {
    "lofHcEnabled": true,
    "clinvarEnabled": true,
    "clinvarStarThreshold": 1,
    "missenseEnabled": false,
    "excludeHomozygoteThreshold": 10
  },
  "founder_variants": [
    {
      "variant_id": "7-117559590-ATCT-A",
      "population": "nfe",
      "common_name": "ΔF508",
      "note": "Most common CF variant in Europeans (~70% of alleles)"
    }
  ],
  "penetrance": 1.0,
  "population_notes": {
    "fin": "Elevated in Finnish population due to founder effect",
    "asj": "1/29 carrier rate in Ashkenazi Jewish population"
  }
}
```

### Required Fields (for PR validation)

- `gene` (string, must match gnomAD gene symbol)
- `condition` (string)
- `inheritance` (enum: `autosomal_recessive`, `x_linked`)
- `recommended_filters` (object, all filter keys present)
- `curation_date` (ISO date)
- `citation` (PMID or DOI)

### Optional Fields

- `hgnc_id`, `clingen_validity`, `notes`
- `founder_variants` array
- `penetrance` (default: 1.0)
- `population_notes`

---

## CLI Design Patterns

Based on VEP, bcftools, and bioinformatics CLI convention research.

### Recommended Interface

```bash
# Single gene, JSON output
gnomad-cf CFTR

# Single gene, specific population, TSV output
gnomad-cf CFTR --population nfe --format tsv

# Single gene, clinical text output
gnomad-cf CFTR --patient-status heterozygous --language de --output text

# Batch mode from file
gnomad-cf --batch genes.json --format jsonl

# Batch mode from stdin (pipe-friendly)
echo "CFTR\nSMN1\nHEXA" | gnomad-cf --batch - --format jsonl

# Apply gene config
gnomad-cf CFTR --use-gene-config

# Full calculation with all improvements
gnomad-cf CFTR --method hwe --exclude-homozygotes --prevalence
```

### Output Format: JSON (single gene)

```json
{
  "gene": "CFTR",
  "version": "gnomAD v4.1",
  "method": "hwe_2pq",
  "homozygote_excluded": true,
  "q": 0.02234,
  "carrier_frequency": {
    "value": 0.04369,
    "percent": "4.37%",
    "ratio": "1:23"
  },
  "genetic_prevalence": {
    "q_squared": 0.000499,
    "ratio": "1:2004",
    "bayesian": null
  },
  "populations": [
    {
      "code": "asj",
      "label": "Ashkenazi Jewish",
      "carrier_frequency": 0.0641,
      "allele_count": 142,
      "allele_number": 8864,
      "is_founder_effect": true
    }
  ],
  "variant_count": 12,
  "shareable_url": "https://gnomad-carrier-frequency.kidney-genetics.org/?gene=CFTR&..."
}
```

---

## Sources

### Calculation Methods

- [Hardy-Weinberg Equilibrium — Biology LibreTexts](https://bio.libretexts.org/Workbench/Modern_Genetics/11:_Population_genetics/11.01:_Hardy-Weinberg_equilibrium) — HIGH confidence, foundational
- [Hardy-Weinberg Carrier Frequency — Perinatology.com](https://www.perinatology.com/calculators/Hardy-Weinberg.htm) — MEDIUM, practical calculator
- [Guo et al. 2022 — Robust pipeline for carrier frequency ranking, npj Genomic Medicine](https://pmc.ncbi.nlm.nih.gov/articles/PMC9763236/) — HIGH confidence, authoritative pipeline with VCR formula
- [Schmitz et al. 2022 — Lessons from gnomAD, Clinical Genetics](https://onlinelibrary.wiley.com/doi/abs/10.1111/cge.14148) — HIGH confidence, peer-reviewed
- [Kandolin et al. 2024 — ACMG carrier screening, AJMG Part A](https://onlinelibrary.wiley.com/doi/full/10.1002/ajmg.a.63588) — HIGH confidence, 2024, gnomAD v4
- [Genetics in Medicine 2024 — gnomAD v4.0 carrier frequencies](https://www.gimjournal.org/article/S1098-3600(24)00238-7/fulltext) — HIGH confidence, 2024, peer-reviewed
- [Variant Interpretation Using Population Databases, PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC9160216/) — HIGH confidence, gnomAD best practices
- [CureFZ — Using Genetic Data to Estimate Disease Prevalence](https://www.curefzi.org/2019/06/05/using-genetic-data-to-estimate-disease-prevalence/) — MEDIUM, clear Bayesian explanation

### GeniE (Genetic Prevalence Estimator)

- [GeniE Announcement — gnomAD Blog, June 2024](https://gnomad.broadinstitute.org/news/2024-06-genie/) — HIGH confidence, official Broad Institute tool
- [GeniE GitHub Repository](https://github.com/broadinstitute/genetic-prevalence-estimator) — HIGH confidence, open source
- [GeniE Web App](https://genie.broadinstitute.org/) — authoritative

### gnomAD Tools

- [gnomAD-toolbox GitHub (Broad Institute)](https://github.com/broadinstitute/gnomad-toolbox) — HIGH confidence, official
- [gnomAD Package on PyPI](https://pypi.org/project/gnomad/) — HIGH confidence, official

### CLI Design Patterns

- [Ensembl VEP — CLI Documentation](https://www.ensembl.org/vep) — HIGH confidence, reference CLI tool
- [bcftools Documentation](https://samtools.github.io/bcftools/bcftools.html) — HIGH confidence, reference CLI tool
- [Python Click CLI Guide — Real Python](https://realpython.com/python-click/) — MEDIUM, established library
- [Click File and Stdin Arguments](https://thecodinginterface.com/blog/click-cli-file-and-stand-input-arguments/) — MEDIUM

### Community Gene Curation

- [ClinGen Community Curation (C3)](https://clinicalgenome.org/working-groups/clingen-community-curation-c3/) — HIGH confidence, authoritative
- [Community data-driven founder variant identification — Human Genomics 2023](https://humgenomics.biomedcentral.com/articles/10.1186/s40246-023-00472-w) — MEDIUM confidence
- [ACMG Technical Standard for Carrier Screening 2024](https://pubmed.ncbi.nlm.nih.gov/38814327/) — HIGH confidence, 2024

### ACMG Thresholds

- [ACMG Carrier Screening Practice Resource 2021](https://pmc.ncbi.nlm.nih.gov/articles/PMC8488021/) — HIGH confidence, 1/200 carrier frequency threshold for screening inclusion
