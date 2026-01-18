# Feature Landscape: gnomAD Carrier Frequency Calculator

**Domain:** Genetic carrier frequency calculation and recurrence risk estimation for clinical genetic counseling
**Researched:** 2026-01-18
**Confidence:** HIGH (based on gnomAD GeniE documentation, NSGC guidelines, peer-reviewed methodology papers)

## Table Stakes

Features users expect. Missing = product feels incomplete or unusable for clinical work.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Gene search/input** | Core workflow entry point - counselors work gene-by-gene | Low | Must accept standard gene symbols (HGNC) |
| **gnomAD data integration** | Primary source for population allele frequencies | Medium | gnomAD v4.0 is current standard (807K+ individuals) |
| **Population/ancestry filtering** | Carrier frequencies vary drastically by ethnicity | Medium | gnomAD provides: NFE, Finnish, Ashkenazi Jewish, African, East Asian, South Asian, Latino, Middle Eastern |
| **ClinVar pathogenic variant filtering** | Clinical standard for identifying disease-causing variants | Medium | Filter by P/LP with star rating consideration |
| **LoF high-confidence filtering** | LOFTEE HC is standard for predicted loss-of-function | Medium | 28% of pLoF may not actually cause LoF - HC filter critical |
| **Carrier frequency calculation** | Core deliverable - 2pq or cumulative AF approach | Low | Formula: carrier_freq = 2 x cumulative_AF |
| **Recurrence risk calculation** | What counselors need for patient consultation | Low | For AR: carrier_freq_partner / 4 (if index is carrier) |
| **Numeric results display** | Counselors need actual numbers for documentation | Low | Show as fraction (1/X) and percentage |
| **Source attribution** | Clinical documentation requires citing data sources | Low | gnomAD version, ClinVar date, variant counts |

## Differentiators

Features that set product apart. Not expected, but valued by users.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **German clinical text generation** | Unique value - no other tool produces German consultation text | Medium | Key differentiator for German-speaking clinicians |
| **Perspective selection (Sie/Du)** | Professional German requires formal address options | Low | Sie (formal) vs Du (informal) - clinical context typically Sie |
| **Copy-ready clinical documentation** | Saves 14-46% documentation time per NSGC studies | Medium | Pre-formatted text for patient letters |
| **Variant-level transparency** | GeniE-style: show which variants contributed to calculation | High | Display individual variants, AFs, sources |
| **Confidence/quality indicators** | Flag low allele numbers, coverage issues, conflicting ClinVar | Medium | GeniE flags variants requiring scrutiny |
| **Multiple inheritance mode support** | Handle AR and X-linked differently | Medium | X-linked: males hemizygous, different risk calc |
| **Export/download capability** | Clinical records need documentation | Low | TSV for variants, PDF for clinical letter |
| **Calculation method transparency** | Multiple valid approaches exist (cumulative AF, Hardy-Weinberg) | Medium | Show formula used, not just result |
| **Bayesian residual risk calculation** | After negative carrier test, what's remaining risk? | High | Incorporates test sensitivity, prior carrier freq |
| **At-risk couple frequency** | Both partners' carrier status combined | Medium | ACF = carrier_freq_A x carrier_freq_B |
| **Batch gene processing** | Process multiple genes in one session | Medium | Useful for panel-based counseling |
| **Session history/favorites** | Counselors often query same genes repeatedly | Medium | CF, SMA, FXS are common |

## Anti-Features

Features to explicitly NOT build. Common mistakes in this domain.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Direct diagnostic claims** | Tool cannot diagnose - only estimates population frequencies | Clearly label as "estimates for counseling purposes" |
| **Automated variant curation** | ClinVar/gnomAD annotations are inputs, not something to second-guess | Use established classifications, show source |
| **Confidence intervals display** | GeniE deliberately excluded - "overemphasize one factor" while ignoring unknowns | Show data quality flags instead |
| **Patient data storage** | GDPR/privacy concerns, not needed for calculation tool | Stateless - no patient identifiers stored |
| **Real-time gnomAD API queries** | Slow, rate-limited, unreliable for clinical workflow | Pre-processed data or efficient caching |
| **Custom variant addition** | Out of scope - users should use ClinVar/gnomAD as source of truth | Link to gnomAD browser for exploration |
| **Pedigree drawing** | Complex feature, many dedicated tools exist (Progeny, etc.) | Focus on calculation, not family tree |
| **Multi-language output** | Scope creep - German is the differentiator | German only for v1, possibly English later |
| **Genetic test ordering** | Different product category entirely | Out of scope |
| **EMR/EHR integration** | Massive complexity, compliance requirements | Copy-paste workflow is acceptable |

## Feature Dependencies

```
Core Calculation Chain:
Gene Input
    --> gnomAD Query
    --> Variant Filtering (LoF HC + ClinVar P/LP)
    --> Allele Frequency Summation
    --> Carrier Frequency (2 x cumulative AF)
    --> Recurrence Risk (carrier_freq / 4)
    --> Clinical Text Output

Dependencies:
- Clinical text requires: carrier frequency result + population selection
- Recurrence risk requires: carrier frequency calculated
- Variant transparency requires: gnomAD query results stored
- Population filtering requires: gnomAD ancestry data available
- German text requires: all calculations complete
```

## MVP Recommendation

For MVP, prioritize:

### Must Have (Phase 1)
1. **Gene search/input** - Single gene lookup
2. **gnomAD data query** - Fetch variants for gene
3. **Variant filtering** - LoF HC + ClinVar P/LP
4. **Population selection** - At minimum: European (NFE), pan-ancestry
5. **Carrier frequency calculation** - Core formula
6. **Recurrence risk calculation** - AR inheritance
7. **Numeric results display** - Fraction and percentage
8. **German clinical text** - Basic consultation text with perspective toggle

### Should Have (Phase 2)
1. **Source attribution** - gnomAD version, variant count
2. **Variant-level transparency** - Show contributing variants
3. **Multiple populations** - Full gnomAD ancestry set
4. **Copy button** - One-click text copy
5. **Quality indicators** - Flag low-confidence data

### Could Have (Phase 3)
1. **X-linked inheritance mode** - Different calculation
2. **Bayesian residual risk** - Post-test risk
3. **Export capabilities** - PDF/TSV
4. **Session history** - Recent queries
5. **At-risk couple calculation** - Both partners

### Defer to Post-MVP
- Batch processing: Nice but not essential for core workflow
- Pedigree integration: Out of scope
- EMR integration: Too complex, low ROI

## Calculation Method Notes

### Carrier Frequency Approaches (from literature)

**Method 1: Cumulative Allele Frequency**
```
carrier_freq = 2 x sum(allele_frequencies)
```
Used when summing multiple pathogenic variants in a gene.

**Method 2: Hardy-Weinberg**
```
If disease frequency q^2 is known:
carrier_freq = 2pq ≈ 2q (when q is small)
```
Used when working from disease incidence.

**Method 3: Gene Carrier Rate (GCR)**
From gnomAD research papers:
```
VCR = (AC - 2*nhom) / AN  (variant carrier rate)
GCR = 1 - product(1 - VCR_i) for all variants
```
More precise for multiple variants.

### Recurrence Risk

**Autosomal Recessive (both parents carriers):**
```
risk = 1/4 (25%)
```

**One known carrier, partner from general population:**
```
risk = carrier_freq_population x 1/4
```

**X-linked Recessive:**
- Carrier mother: 50% affected sons, 50% carrier daughters
- Affected father: 0% affected sons, 100% carrier daughters

## Sources

### Primary (HIGH confidence)
- [GeniE, the Genetic Prevalence Estimator - gnomAD](https://gnomad.broadinstitute.org/news/2024-06-genie/)
- [NSGC Clinical Documentation Practice Resource](https://pubmed.ncbi.nlm.nih.gov/34390070/)
- [gnomAD v4.0 carrier frequency estimation](https://pubmed.ncbi.nlm.nih.gov/39492094/)
- [Bayesian Analysis in Genetic Counseling - PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC1867463/)
- [LOFTEE and pLoF variant classification](https://gnomad.broadinstitute.org/news/2020-10-loss-of-function-curations-in-gnomad/)
- [ClinVar classification representation](https://www.ncbi.nlm.nih.gov/clinvar/docs/clinsig/)

### Secondary (MEDIUM confidence)
- [Golden Helix: Residual Risk Calculation](https://www.goldenhelix.com/blog/how-reproductive-risk-and-residual-risk-are-cc-calculated-for-couple-carrier-screening-workflows/)
- [Progeny Clinical Letter Generation](https://www.progenygenetics.com/clinical/letters)
- [Carrier frequency pipeline - npj Genomic Medicine](https://www.nature.com/articles/s41525-022-00344-7)

### Domain Context
- ACMG 2021: Carrier screening for AR/X-linked conditions with carrier freq >=1/200
- Genetic counselors spend ~64% time on non-face-to-face activities including documentation
- Carrier frequencies vary significantly by ancestry (e.g., Ashkenazi Jewish ACF 6.11% vs others)
