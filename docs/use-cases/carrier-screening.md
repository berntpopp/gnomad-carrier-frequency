# Carrier Screening Counseling

## The Scenario

A couple is planning their first pregnancy. During pre-conception counseling, one partner was found to carry a pathogenic variant in the CFTR gene (cystic fibrosis). You need to determine the carrier frequency in the partner's population to estimate the couple's recurrence risk.

This is a routine carrier screening consultation. The goal is to arrive at a defensible, population-appropriate carrier frequency that accounts for the specific variants in the gnomAD dataset — and to handle the edge cases that come up in real clinical practice.

## Using the Calculator

### Searching for CFTR

Type "CFTR" in the gene search field and select it from the autocomplete list. The calculator queries gnomAD and retrieves all variants that meet the automatic inclusion criteria: Loss-of-Function High-Confidence (LoF HC) calls and ClinVar pathogenic/likely pathogenic classifications.

### Reviewing the Variant Table

When the CFTR variant table loads, review each variant before accepting the defaults. The automatic filters capture the right variants for most situations, but CFTR is a gene where clinical judgment matters.

<figure class="screenshot-frame">
  <img src="/screenshots/variant-table.webp" alt="Variant table showing CFTR variants with LoF HC and ClinVar classifications" />
  <figcaption>The variant table lists all qualifying CFTR variants. Each row can be individually included or excluded from the carrier frequency calculation.</figcaption>
</figure>

One variant that may appear is **c.1210-11T>G** — also known as the 5T allele in the intron 8 polypyrimidine tract. This variant has context-dependent clinical significance. Its pathogenicity depends on the TG repeat tract length on the same allele (TG12 or TG13 increase severity) and whether a classic CF-causing variant is present on the other allele. Its presence in gnomAD at appreciable frequency reflects this complexity: it causes complete cystic fibrosis only in specific combinations, and isolated carriers may have no clinical phenotype or only CBAVD (congenital bilateral absence of the vas deferens).

### Excluding a Variant

To exclude c.1210-11T>G from the carrier frequency calculation, uncheck it in the variant table. The carrier frequency updates immediately using only the remaining variants.

This is a direct representation of a real clinical decision. Rather than requiring manual subtraction from the allele count, the calculator lets you compare the carrier frequency with and without the disputed variant and document the basis for your choice.

::: tip When to Exclude Variants
Variant exclusion is useful when a variant's pathogenicity is disputed or context-dependent. The calculator lets you see the impact on carrier frequency with and without specific variants before deciding which number to use in counseling. See the [Filters reference](/reference/filters) for details on automatic variant filtering criteria.
:::

### Interpreting Results

The results table shows carrier frequencies for each gnomAD genetic ancestry group. For carrier screening, focus on the population that best matches the partner's ancestry — this is where the carrier frequency will be most relevant for estimating the couple's risk.

With heterozygous carrier status selected, the recurrence risk for this couple equals:

**partner's carrier frequency × 1/4**

Because one partner is a known carrier, the remaining question is whether the other partner also carries a pathogenic variant (probability = population carrier frequency). If both are carriers, the probability of an affected child in any given pregnancy is 1/4 (standard autosomal recessive Mendelian risk). The calculator therefore computes: carrier frequency ÷ 4.

::: info ClinGen Classification is Advisory
ClinGen gene-disease validity classifications are shown in the results for reference but do not automatically filter variants. The variant table criteria (LoF HC + ClinVar pathogenic/likely pathogenic) are what determine the calculation inputs.
:::

## Next Steps

After reviewing the carrier frequency:

- Document which variants were included and the reason for any exclusions
- Note the gnomAD version and ancestry group used
- Use the clinical letter feature to generate documentation text for the counseling letter

## See Also

- [Methodology](/reference/methodology) — Complete explanation of the carrier frequency and recurrence risk formulas
- [Recurrence Risk and Family Planning](/use-cases/family-planning) — Interpreting recurrence risk when both parents are known to carry variants
- [Filters](/reference/filters) — How variants are automatically selected for inclusion
