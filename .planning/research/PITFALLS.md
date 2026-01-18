# Domain Pitfalls: gnomAD Carrier Frequency Calculator

**Domain:** Genetic risk calculation using gnomAD population data
**Researched:** 2026-01-18
**Confidence:** HIGH (verified with official gnomAD documentation and peer-reviewed publications)

---

## Critical Pitfalls

Mistakes that cause incorrect risk calculations, clinical misinterpretation, or require rewrites.

---

### Pitfall 1: Summing Allele Frequencies Incorrectly for Carrier Frequency

**What goes wrong:** Using `sum(AF)` directly as the "allele frequency" then computing carrier frequency as `2 * sum(AF)`. This double-counts carriers who have multiple pathogenic variants and ignores the probability math.

**Why it happens:** The carrier frequency formula `2pq` (or `2q` when q is small) assumes a single allele. When a gene has multiple pathogenic variants, the cumulative allele frequency `q = AF1 + AF2 + ... + AFn` is valid for calculating `q`, but only when variants are in linkage equilibrium and no individual carries multiple variants.

**Consequences:**
- Overestimation of carrier frequency by up to 2x for genes with common variants
- Incorrect recurrence risk communicated to patients
- False precision in clinical documentation

**Prevention:**
1. Sum allele frequencies: `q_cumulative = sum(pathogenic_AF)`
2. Apply carrier frequency formula: `carrier_freq = 2 * q_cumulative` (when q is small, which it almost always is for rare diseases)
3. For very accurate calculations with common variants, use `2pq` where `p = 1 - q_cumulative`
4. Document the approximation used

**Detection:**
- `q_cumulative > 0.05` suggests the `2q` approximation may introduce >5% error
- Compare your calculations against published carrier frequencies for well-studied genes (CFTR, SMN1)

**Phase to address:** Phase 1 (core calculation logic)

**Sources:**
- [Hardy-Weinberg Equilibrium Calculator](https://www.perinatology.com/calculators/Hardy-Weinberg.htm)
- [Applications in Population Genetics - Hamamy 2012](https://www.gfmer.ch/SRH-Course-2012/community-genetics/pdf/Applications-population-genetics-Hamamy-2012.pdf)

---

### Pitfall 2: Using Wrong gnomAD Dataset Version

**What goes wrong:** Querying gnomAD v2 for GRCh38 coordinates, or v4 when the gene is poorly covered, or mixing exome/genome frequencies without understanding their differences.

**Why it happens:**
- gnomAD v2 uses GRCh37 (hg19), v3/v4 use GRCh38
- Exome and genome datasets are non-overlapping sample sets with different ancestry compositions
- v4 is 5x larger but some genes have better coverage in v2

**Consequences:**
- Zero results (coordinate mismatch)
- Artificially inflated/deflated frequencies
- Missing variants that exist in other dataset versions

**Prevention:**
1. **For coding variants:** Use gnomAD v4 exomes (807,000+ samples) as primary
2. **Validate coverage:** Check allele number (AN) - low AN indicates poor coverage
3. **Reference genome:** Always specify and validate GRCh38 for v4 queries
4. **Cross-reference:** For critical genes, compare v2 and v4 frequencies

**Detection:**
- Unexpectedly zero variants for known disease genes
- AN < 50,000 indicates poor coverage
- Dramatic frequency differences between exome and genome for same variant

**Phase to address:** Phase 1 (API integration setup)

**Sources:**
- [gnomAD Changelog](https://gnomad.broadinstitute.org/news/changelog/)
- [Difference between V2 and V4 - gnomAD Discussion](https://discuss.gnomad.broadinstitute.org/t/difference-between-v2-and-v4/416)

---

### Pitfall 3: Trusting ClinVar "Pathogenic" Without Filtering

**What goes wrong:** Including all ClinVar "pathogenic" or "likely pathogenic" variants without checking review status, submission quality, or recency.

**Why it happens:**
- ClinVar aggregates submissions from multiple labs with varying quality
- 40% of common (AF > 0.5%) P/LP variants were downgraded upon reanalysis
- Some "pathogenic" variants are actually pseudogene mapping artifacts

**Consequences:**
- Including benign variants inflates carrier frequency
- Including artifacts creates impossible frequencies (e.g., 28% carrier frequency)
- Clinical text based on wrong data

**Prevention:**
1. **Require review status:** Filter for >= 1 gold star (multiple submitters, no conflicts)
2. **Check for conflicts:** Exclude variants with conflicting interpretations
3. **Frequency sanity check:** AF > 1% in any population warrants manual review
4. **Cross-reference:** Variant should have supporting evidence beyond single submission

**Detection:**
- Calculated carrier frequency > 10% for any population (highly unusual for AR diseases)
- Variant with high AF but single submitter
- ClinVar entry shows "conflicting interpretations"

**Phase to address:** Phase 2 (variant filtering logic)

**Sources:**
- [Reinterpretation of common pathogenic variants in ClinVar - Nature 2020](https://www.nature.com/articles/s41598-019-57335-5)
- [Variant interpretation using population databases: Lessons from gnomAD](https://pmc.ncbi.nlm.nih.gov/articles/PMC9160216/)

---

### Pitfall 4: Ignoring Population Stratification for Founder Effects

**What goes wrong:** Using global gnomAD frequencies when the patient belongs to a population with known founder effects (Ashkenazi Jewish, Finnish, Amish, specific ethnic groups).

**Why it happens:**
- Global frequencies mask population-specific enrichment
- Founder populations have 10-100x higher carrier frequencies for specific variants
- User interface doesn't prompt for or emphasize population selection

**Consequences:**
- Dramatically underestimating risk for founder populations (e.g., 1:25 vs 1:250 for Tay-Sachs in Ashkenazi)
- Overestimating risk when patient is from non-enriched population
- Missing clinically significant risk communication

**Prevention:**
1. **Display all populations:** Show carrier frequencies for all gnomAD ancestry groups
2. **Highlight outliers:** Flag when any population frequency is >5x the global frequency
3. **Founder effect warning:** For genes with known founder mutations, display explicit warnings
4. **Default to highest:** For clinical conservatism, consider displaying the highest population frequency prominently

**Detection:**
- Ashkenazi Jewish frequency > 5x European Non-Finnish frequency
- Finnish frequency > 5x other European frequencies
- Known founder effect genes: HEXA, GBA, BRCA1/2, many others

**Phase to address:** Phase 2 (population display) and Phase 3 (founder effect detection)

**Sources:**
- [Estimation of carrier frequencies utilizing gnomAD for ACMG recommended carrier screening](https://pubmed.ncbi.nlm.nih.gov/38459613/)
- [History Shapes Genes: The Founder Effect - Jnetics](https://www.jnetics.org/the-founder-effect/)

---

### Pitfall 5: LOFTEE "High Confidence" Misinterpretation

**What goes wrong:** Treating all LoF variants equally, or conversely, excluding valid LoF variants that lack "HC" (high confidence) annotation.

**Why it happens:**
- 28% of gnomAD homozygous pLoF variants may not actually cause loss of function
- LOFTEE is conservative - some true LoF variants are flagged as "low confidence"
- Variants in last exon, low-expression regions, or with splice rescues get filtered

**Consequences:**
- Including artifact LoF variants inflates carrier frequency
- Excluding valid LoF variants underestimates carrier frequency
- False precision in either direction

**Prevention:**
1. **Filter by LOFTEE:** Include only LoF with `lof = "HC"` (high confidence)
2. **Don't filter only by consequence:** Not all frameshift/nonsense are true LoF
3. **Check flags:** Review `lof_flags` for warnings about specific variants
4. **Combine with ClinVar:** LoF HC + ClinVar pathogenic = highest confidence

**Detection:**
- LoF variant with AF > 0.1% and no disease association
- Variant in last exon or low-pext region
- `lof_flags` field is not empty

**Phase to address:** Phase 2 (variant filtering logic)

**Sources:**
- [Loss-of-Function Curations in gnomAD](https://gnomad.broadinstitute.org/news/2020-10-loss-of-function-curations-in-gnomad/)
- [Advanced variant classification framework - AJHG 2023](https://pmc.ncbi.nlm.nih.gov/articles/PMC10029069/)

---

## Moderate Pitfalls

Mistakes that cause technical debt, user confusion, or require significant fixes.

---

### Pitfall 6: gnomAD API Rate Limiting and Blocking

**What goes wrong:** Making sequential API calls for each variant, getting blocked after ~10 requests, or causing poor UX with slow sequential loading.

**Why it happens:**
- gnomAD API is designed for interactive browser use, not bulk queries
- HTTP to HTTPS redirect (302) can break POST requests
- No official rate limit documentation

**Prevention:**
1. **Batch by gene:** Query all variants for a gene in single request (gnomAD supports this)
2. **Cache results:** Store gene variant data locally (localStorage or sessionStorage)
3. **Use HTTPS directly:** Always use `https://gnomad.broadinstitute.org/api`
4. **Handle 429/503:** Implement exponential backoff for rate limit errors
5. **Show loading states:** Users understand network delays with proper feedback

**Detection:**
- HTTP 429 (Too Many Requests) responses
- Queries suddenly returning empty after working
- Console errors about CORS or redirects

**Phase to address:** Phase 1 (API integration)

**Sources:**
- [Blocked when using API to get AF - gnomAD Discussion](https://discuss.gnomad.broadinstitute.org/t/blocked-when-using-api-to-get-af/149)
- [gnomAD GitHub Issue #536 - HTTPS redirect](https://github.com/macarthur-lab/gnomadjs/issues/536)

---

### Pitfall 7: Not Handling Missing/Zero gnomAD Data

**What goes wrong:** Showing "0" or "undefined" carrier frequency when gnomAD returns no variants, or crashing when gene is not found.

**Why it happens:**
- Gene may have no pathogenic variants in gnomAD (ultra-rare conditions)
- Gene symbol may not match gnomAD (aliases, outdated nomenclature)
- Query may return variants but none pass filters

**Consequences:**
- "0% carrier frequency" is clinically misleading (implies certainty)
- Missing fallback to population defaults (typically 1:100 or 1:200)
- User confusion about whether query failed or gene has no data

**Prevention:**
1. **Distinguish zero from unknown:** "No qualifying variants found" vs "API error"
2. **Provide fallback:** Default carrier frequency assumption (1:100) per requirements
3. **Validate gene symbol:** Query gene first to confirm it exists in gnomAD
4. **Display confidence:** Show "Based on gnomAD data" vs "Using default assumption"

**Detection:**
- Gene search returns but variant query returns empty
- Carrier frequency displays as 0, null, or undefined
- User reports "it says no risk" for known disease genes

**Phase to address:** Phase 1 (core calculation) and Phase 3 (UX refinement)

---

### Pitfall 8: Transcript Selection Inconsistency

**What goes wrong:** Variants are annotated on different transcripts, leading to inconsistent consequence annotations or missing variants.

**Why it happens:**
- gnomAD shows Ensembl canonical transcript by default
- ClinVar often uses RefSeq transcripts
- MANE Select transcript may differ from gnomAD canonical
- Same variant can be "missense" on one transcript and "synonymous" on another

**Consequences:**
- Missing pathogenic variants annotated on non-canonical transcripts
- Including variants that are benign on clinically-relevant transcript
- Confusion when variant descriptions don't match ClinVar

**Prevention:**
1. **Use MANE Select:** Prioritize MANE Select transcript when available
2. **Query canonical:** gnomAD's gene query returns variants on canonical transcript
3. **Document transcript:** Show which transcript is being used in results
4. **Don't over-filter:** Accept variants pathogenic on any clinically-relevant transcript

**Detection:**
- Variant IDs don't match between gnomAD and ClinVar
- Consequence differs from published literature
- Missing known pathogenic variant from results

**Phase to address:** Phase 2 (variant filtering and display)

**Sources:**
- [RFC: add MANE and RefSeq transcripts to gnomAD browser](https://github.com/broadinstitute/gnomad-browser/issues/518)
- [MANE transcript set - Nature 2022](https://www.nature.com/articles/s41586-022-04558-8)

---

### Pitfall 9: Using AF Instead of Filtering Allele Frequency (FAF)

**What goes wrong:** Using raw allele frequency (AF) for clinical interpretation instead of the statistically robust filtering allele frequency (FAF).

**Why it happens:**
- AF is the obvious, simple metric
- FAF concept is less intuitive
- FAF is not always displayed prominently

**Consequences:**
- For rare variants, AF may be artificially high due to sampling variance
- Clinical decisions based on less reliable frequency estimates
- Inconsistency with ACMG/AMP guidelines which recommend FAF

**Prevention:**
1. **Prefer FAF:** Use "Grpmax Filtering AF" for population maximum frequency
2. **Understand the difference:** FAF is the 95% CI lower bound of AF
3. **For carrier frequency:** Sum of individual variant AFs is acceptable (FAF is for variant-level filtering)
4. **Display both:** Show AF with confidence context

**Detection:**
- Rare variant (AC < 10) with high reported AF
- gnomAD shows FAF significantly lower than AF for a variant

**Phase to address:** Phase 2 (frequency display and calculation)

**Sources:**
- [Filtering Allele Frequency - gnomAD Help](https://gnomad.broadinstitute.org/help/faf)
- [ClinGen Guidance on gnomAD v4 - March 2024](https://clinicalgenome.org/site/assets/files/9445/clingen_guidance_to_vceps_regarding_the_use_of_gnomad_v4_march_2024.pdf)

---

## Minor Pitfalls

Mistakes that cause annoyance or minor inaccuracies but are easily fixable.

---

### Pitfall 10: Floating Point Display Precision

**What goes wrong:** Displaying carrier frequencies with excessive decimal places (e.g., "0.03999999999999") or inconsistent precision.

**Why it happens:**
- JavaScript floating point representation (IEEE-754)
- Not formatting output consistently
- Multiplying small numbers accumulates error

**Prevention:**
1. **Format output:** Use `toFixed(4)` or similar for display
2. **Use ratios:** Display as "1 in 250" rather than "0.004"
3. **Consistent significant figures:** 2-3 significant figures is appropriate for these estimates

**Detection:**
- Numbers with many decimal places in UI
- Inconsistent precision across different values
- "0.9999..." instead of "1.0"

**Phase to address:** Phase 3 (UI polish)

---

### Pitfall 11: Gene Symbol Validation and Aliases

**What goes wrong:** User enters gene alias or outdated symbol, query fails silently or returns wrong gene.

**Why it happens:**
- HGNC symbol changes over time
- Common aliases exist (e.g., "BRCA1" is clear, but "GAA" vs "LYAG")
- Typos in user input

**Prevention:**
1. **Autocomplete:** Implement gene search with gnomAD's gene query
2. **Validate first:** Check gene exists before variant query
3. **Show canonical name:** Display the official HGNC symbol after lookup
4. **Handle aliases:** Accept common aliases and map to current symbol

**Detection:**
- Gene query returns null or error
- Returned gene name differs from input
- User reports "gene not found" for valid gene

**Phase to address:** Phase 1 (gene search)

---

### Pitfall 12: Not Accounting for Exome vs Genome Coverage Differences

**What goes wrong:** Using exome data for genes with poor exome coverage, missing variants that would appear in genome data.

**Why it happens:**
- Some gene regions have low exome capture efficiency
- gnomAD genomes have more uniform coverage but smaller sample size
- User assumes all gnomAD data is equivalent

**Prevention:**
1. **Check coverage:** Display mean coverage or AN for the gene
2. **Low coverage warning:** Flag genes with mean coverage < 20x
3. **Consider both:** For critical decisions, note if genome data differs

**Detection:**
- AN varies dramatically across exons of same gene
- Gene known to have exome capture issues (e.g., GC-rich regions)
- Genome frequency differs significantly from exome frequency

**Phase to address:** Phase 3 (advanced features)

**Sources:**
- [gnomAD v4.1 - Exome/Genome discordance flags](https://gnomad.broadinstitute.org/news/2024-04-gnomad-v4-1/)

---

## Phase-Specific Warnings

| Phase | Topic | Likely Pitfall | Mitigation |
|-------|-------|---------------|------------|
| Phase 1 | API Integration | Rate limiting, HTTPS redirect | Batch queries, use HTTPS, implement retry logic |
| Phase 1 | Gene Search | Symbol validation | Use gnomAD gene query with autocomplete |
| Phase 1 | Core Calculation | Summing AF incorrectly | Verify formula: `carrier_freq = 2 * sum(AF)` for rare diseases |
| Phase 2 | Variant Filtering | Including artifact/benign variants | Filter: LoF HC OR ClinVar P/LP with >= 1 star |
| Phase 2 | Population Data | Ignoring founder effects | Display all populations, flag outliers |
| Phase 2 | Frequency Display | AF vs FAF confusion | Use AF sum for carrier frequency, document method |
| Phase 3 | Fallback Logic | Zero vs unknown confusion | Distinguish "no data" from "no pathogenic variants" |
| Phase 3 | Clinical Text | Wrong frequency source cited | Track data provenance (gnomAD vs literature vs default) |
| Phase 3 | UI Polish | Floating point display | Format to 2-3 significant figures |

---

## Pre-Implementation Checklist

Before building each phase, verify:

- [ ] gnomAD API endpoint is `https://gnomad.broadinstitute.org/api` (not HTTP)
- [ ] Query uses gnomAD v4 with GRCh38 reference genome
- [ ] Gene query includes MANE Select/canonical transcript info
- [ ] Variant filtering includes LoF confidence flag (`lof = "HC"`)
- [ ] ClinVar pathogenicity includes review status filter
- [ ] Population-specific frequencies are captured from response
- [ ] Carrier frequency formula documented: `2 * sum(pathogenic_AF)`
- [ ] Fallback value (1:100) implemented when no qualifying variants found
- [ ] Error handling covers: gene not found, API timeout, rate limiting, zero variants

---

## Sources

### Official gnomAD Resources
- [gnomAD Browser & API](https://gnomad.broadinstitute.org/)
- [gnomAD FAQ](https://gnomad.broadinstitute.org/faq)
- [gnomAD Changelog](https://gnomad.broadinstitute.org/news/changelog/)
- [Filtering Allele Frequency Documentation](https://gnomad.broadinstitute.org/help/faf)
- [Loss-of-Function Curations](https://gnomad.broadinstitute.org/news/2020-10-loss-of-function-curations-in-gnomad/)

### Peer-Reviewed Publications
- [Variant interpretation using population databases: Lessons from gnomAD - Human Mutation 2022](https://pmc.ncbi.nlm.nih.gov/articles/PMC9160216/)
- [Reinterpretation of common pathogenic variants in ClinVar - Scientific Reports 2020](https://www.nature.com/articles/s41598-019-57335-5)
- [Advanced variant classification framework - AJHG 2023](https://pmc.ncbi.nlm.nih.gov/articles/PMC10029069/)
- [MANE transcript set - Nature 2022](https://www.nature.com/articles/s41586-022-04558-8)
- [Estimation of carrier frequencies utilizing gnomAD - 2024](https://pubmed.ncbi.nlm.nih.gov/38459613/)

### Community Resources
- [gnomAD Discussion Forum](https://discuss.gnomad.broadinstitute.org/)
- [ClinGen Guidance on gnomAD v4 - March 2024](https://clinicalgenome.org/site/assets/files/9445/clingen_guidance_to_vceps_regarding_the_use_of_gnomad_v4_march_2024.pdf)
