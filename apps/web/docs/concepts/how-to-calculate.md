---
title: "How to Calculate Carrier Frequency"
description: "Step-by-step guide to calculating carrier frequency from gnomAD allele data using Hardy-Weinberg equilibrium, with worked examples and a comparison table for 7 common genes."
head:
  - - script
    - type: application/ld+json
    - |
      {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": "How to Calculate Carrier Frequency",
        "description": "Step-by-step guide to calculating carrier frequency from gnomAD allele data using Hardy-Weinberg equilibrium, with worked examples and a comparison table for 7 common genes.",
        "datePublished": "2026-02-23",
        "dateModified": "2026-02-23",
        "author": {
          "@type": "Person",
          "name": "Bernt Popp",
          "url": "https://github.com/berntpopp"
        },
        "publisher": {
          "@type": "Organization",
          "name": "gnomAD Carrier Frequency Calculator",
          "url": "https://gnomad-carrier-frequency.kidney-genetics.org/"
        }
      }
---

# How to Calculate Carrier Frequency

::: warning For Research Use Only
The gnomAD Carrier Frequency Calculator is intended for research and educational purposes only. It is not a validated clinical diagnostic tool. Any outputs must be independently reviewed and verified by qualified professionals before use in a clinical context.
:::

## Introduction

Carrier frequency tells you how common carrier status is for a given autosomal recessive condition in a population. Calculating it requires two ingredients: the frequency of pathogenic alleles in that population, and a mathematical model — Hardy-Weinberg equilibrium (HWE) — that translates allele frequency into carrier frequency.

The core formula is:

**Carrier frequency = 2pq ≈ 2q**

Where **q** is the combined frequency of all pathogenic alleles for the gene, and **p = 1 − q**. For rare variants where q is small, p approaches 1, so 2q is a reliable approximation.

This page walks through both steps: finding q from gnomAD data, and applying HWE to get a carrier frequency. The gnomAD Carrier Frequency Calculator automates the entire process — [open it here](https://gnomad-carrier-frequency.kidney-genetics.org/){target="_blank" rel="noopener"} to follow along.

## Step 1: Identify the Disease Allele Frequency

gnomAD reports allele counts (AC) and allele numbers (AN) for every variant. These are the raw materials for calculating allele frequency.

- **AC (Allele Count):** the number of times this variant was observed across all chromosomes sequenced
- **AN (Allele Number):** the total number of chromosomes sequenced at this position (must have sufficient read coverage)
- **Allele frequency (AF):** AF = AC / AN

For a single-variant condition, q = AF. But most autosomal recessive conditions are caused by multiple different pathogenic variants in the same gene. In that case, you sum the allele frequencies across all qualifying variants:

**q = AF₁ + AF₂ + AF₃ + ... = Σ(AC_i / AN_i)**

**CFTR example:** The gnomAD v4.1 dataset includes dozens of pathogenic CFTR variants qualifying as high-confidence loss-of-function or ClinVar pathogenic. For the global non-Finnish European population, their combined allele frequencies sum to approximately q = 0.014 to 0.020, depending on which variant set is used. Each individual variant — including the common p.Phe508del — contributes its own AC/AN to the total.

This summation approach is important because using only the most common variant would drastically undercount the true carrier rate. The calculator handles this automatically by fetching all qualifying variants for the gene and summing their allele frequencies.

## Step 2: Apply Hardy-Weinberg Equilibrium

Once you have q, the combined disease allele frequency, carrier frequency follows directly from HWE.

Under Hardy-Weinberg equilibrium, in a large randomly mating population:

| Genotype | Frequency | Status |
|---|---|---|
| pp (two normal alleles) | p² | Unaffected, no variants |
| pq or qp (one normal, one pathogenic) | 2pq | Carrier |
| qq (two pathogenic alleles) | q² | Affected |

Carriers have genotype frequency **2pq**. For rare alleles (q < 0.05), p = 1 − q is close to 1, so:

**Carrier frequency ≈ 2q**

**Continuing the CFTR example:** With q = 0.018 for non-Finnish Europeans:

- Exact: 2pq = 2 × 0.982 × 0.018 = 0.0354 (approximately 1 in 28)
- Approximation: 2q = 0.036 (approximately 1 in 28)

The difference is negligible. For allele frequencies under 5%, the approximation error is always below 1% — well within the uncertainty of the underlying population data.

**Converting to a ratio:** Carrier frequency is often reported as "1 in X" for clinical communication. To convert: X = 1 / carrier_frequency. For carrier_frequency = 0.036: X = 1 / 0.036 ≈ 28, so approximately 1 in 28 Europeans carry a pathogenic CFTR variant.

## Common Conditions: Carrier Frequencies at a Glance

The table below shows approximate carrier frequency estimates from population studies for seven well-characterized autosomal recessive conditions. These values are global approximations — carrier frequencies vary substantially between genetic ancestry groups.

| Condition | Gene | Approx. Global Carrier Frequency | Population Note | Try in Calculator |
|---|---|---|---|---|
| Cystic fibrosis | CFTR | ~1 in 35 | Higher in European (~1 in 25) and Ashkenazi Jewish | [Try CFTR](https://gnomad-carrier-frequency.kidney-genetics.org/?gene=CFTR){target="_blank" rel="noopener"} |
| Nonsyndromic hearing loss | GJB2 | ~1 in 30 | Varies widely; higher in some Asian populations | [Try GJB2](https://gnomad-carrier-frequency.kidney-genetics.org/?gene=GJB2){target="_blank" rel="noopener"} |
| Tay-Sachs disease | HEXA | ~1 in 300 | ~1 in 30 in Ashkenazi Jewish; classic founder effect | [Try HEXA](https://gnomad-carrier-frequency.kidney-genetics.org/?gene=HEXA){target="_blank" rel="noopener"} |
| Hereditary hemochromatosis | HFE | ~1 in 9 (European) | C282Y variant; much lower in non-European populations | [Try HFE](https://gnomad-carrier-frequency.kidney-genetics.org/?gene=HFE){target="_blank" rel="noopener"} |
| Phenylketonuria | PAH | ~1 in 50 | Relatively uniform globally; slightly higher in European | [Try PAH](https://gnomad-carrier-frequency.kidney-genetics.org/?gene=PAH){target="_blank" rel="noopener"} |
| Canavan disease | ASPA | ~1 in 300 | ~1 in 40 in Ashkenazi Jewish; founder effect | [Try ASPA](https://gnomad-carrier-frequency.kidney-genetics.org/?gene=ASPA){target="_blank" rel="noopener"} |
| Autosomal recessive polycystic kidney disease | PKHD1 | ~1 in 70 | Relatively uniform across populations | [Try PKHD1](https://gnomad-carrier-frequency.kidney-genetics.org/?gene=PKHD1){target="_blank" rel="noopener"} |

::: info Note on these values
Values are approximate global estimates from population studies. Carrier frequencies vary significantly between genetic ancestry groups. Use the calculator for population-specific data derived directly from gnomAD. Do not use these figures in clinical documentation without independent verification.
:::

## Population-Specific Variation

The global carrier frequency is a weighted average across all ancestries in the gnomAD dataset. For many conditions, the population-specific figures diverge substantially from the global estimate — sometimes by an order of magnitude.

The main driver is the **founder effect**: when a population traces its ancestry to a relatively small group of founders, rare variants carried by those founders can reach much higher frequencies than in the general population. Subsequent generations inherit these variants at elevated rates because the founding population's gene pool was limited.

**HEXA (Tay-Sachs disease)** illustrates this clearly. The global carrier frequency is approximately 1 in 300. In Ashkenazi Jewish individuals, it is approximately 1 in 30 — ten times higher. This is because the Ashkenazi Jewish population descends from a founding group of perhaps a few hundred individuals in medieval Europe. HEXA variants present in those founders have persisted at elevated frequency.

**CFTR (Cystic fibrosis)** shows a different pattern: elevated frequency in European populations broadly, with further variation within Europe. The CFTR p.Phe508del variant is thought to have originated in a single European ancestor; it subsequently spread through a large but still ancestrally restricted population.

For clinical use, the relevant carrier frequency is almost always the population-specific estimate rather than the global average. The gnomAD Carrier Frequency Calculator displays population-specific values for each gnomAD ancestry group (African/African-American, Admixed American, Ashkenazi Jewish, East Asian, Finnish, Middle Eastern, Non-Finnish European, South Asian) alongside the global figure. This allows you to select the estimate most appropriate for your patient's ancestry.

## Limitations to Know

Several assumptions underlie this approach. Understanding them helps interpret the resulting carrier frequency figures appropriately.

**gnomAD captures only sequenced variants.** The allele frequency calculation includes only variants present in gnomAD's sequencing data with sufficient coverage. Deep intronic variants, structural variants, and copy-number variants may not be detected. For some genes, a meaningful fraction of pathogenic alleles may be missed.

**Population coverage is unequal.** gnomAD v4.1 contains substantially more individuals of European ancestry than African or South Asian ancestry. Population-specific carrier frequency estimates for underrepresented groups have wider uncertainty. The gnomAD AN (allele number) for a given population reflects how many chromosomes were adequately sequenced — smaller AN means less reliable frequency estimates.

**Hardy-Weinberg equilibrium is an assumption.** HWE holds in large, randomly mating populations without selection. For very rare, severe conditions (where affected individuals have reduced reproductive fitness), the actual distribution of genotypes may deviate slightly from HWE predictions. In practice, for autosomal recessive conditions with q well below 0.05, the deviation is small.

**Variant selection affects the result.** The calculator filters for high-confidence loss-of-function variants and ClinVar pathogenic/likely pathogenic entries. Different filtering choices would yield different q values and therefore different carrier frequencies. See [Methodology](/reference/methodology) for a full description of the calculation pipeline, and [Filters](/reference/filters) for variant selection criteria.

::: warning Research Use Only
These limitations mean that gnomAD-derived carrier frequencies are estimates appropriate for research and educational framing, not final clinical values. Always review outputs with a qualified genetic counselor or clinical geneticist before incorporating them into patient care.
:::

## Try It with Your Gene of Interest

The calculator handles all of the above automatically: it fetches all qualifying variants, sums allele frequencies, applies Hardy-Weinberg, and displays population-specific results alongside the global estimate.

Select a gene to start:

- [CFTR — Cystic Fibrosis](https://gnomad-carrier-frequency.kidney-genetics.org/?gene=CFTR){target="_blank" rel="noopener"}
- [GJB2 — Hearing Loss](https://gnomad-carrier-frequency.kidney-genetics.org/?gene=GJB2){target="_blank" rel="noopener"}
- [HEXA — Tay-Sachs Disease](https://gnomad-carrier-frequency.kidney-genetics.org/?gene=HEXA){target="_blank" rel="noopener"}
- [HFE — Hereditary Hemochromatosis](https://gnomad-carrier-frequency.kidney-genetics.org/?gene=HFE){target="_blank" rel="noopener"}
- [PAH — Phenylketonuria](https://gnomad-carrier-frequency.kidney-genetics.org/?gene=PAH){target="_blank" rel="noopener"}
- [ASPA — Canavan Disease](https://gnomad-carrier-frequency.kidney-genetics.org/?gene=ASPA){target="_blank" rel="noopener"}
- [PKHD1 — Autosomal Recessive Polycystic Kidney Disease](https://gnomad-carrier-frequency.kidney-genetics.org/?gene=PKHD1){target="_blank" rel="noopener"}

Or [open the calculator](https://gnomad-carrier-frequency.kidney-genetics.org/){target="_blank" rel="noopener"} and type any autosomal recessive gene symbol to calculate its carrier frequency from current gnomAD data.

See [What is Carrier Frequency?](/concepts/what-is-carrier-frequency) for the conceptual background behind these calculations.
