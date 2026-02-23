---
title: "Frequently Asked Questions"
description: "Common questions about Hardy-Weinberg equilibrium assumptions, gnomAD data interpretation, allele numbers, ancestry groups, and carrier frequency estimation edge cases."
head:
  - - script
    - type: application/ld+json
    - |
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "inLanguage": "en",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "When does Hardy-Weinberg equilibrium not hold?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Hardy-Weinberg equilibrium (HWE) requires five conditions: random mating, no natural selection, no migration or gene flow, no new mutations, and a sufficiently large population. In practice, violations such as founder effects, assortative mating, or inbreeding can cause observed genotype frequencies to deviate from HWE predictions. For rare autosomal recessive conditions, HWE holds well enough because selection against heterozygous carriers is minimal — carriers are phenotypically normal and face no reproductive disadvantage. Clinically relevant violations are most common in isolated populations with known founder variants, such as Ashkenazi Jewish communities for HEXA or Finnish populations for certain rare conditions."
            }
          },
          {
            "@type": "Question",
            "name": "Why do carrier frequency estimates differ between gnomAD versions?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "gnomAD v4.1 includes substantially more sequenced individuals than v2.1.1, so allele frequency estimates are based on larger sample sizes and may be more precise, especially for rare variants. The two versions also differ in their population composition: some ancestries are better represented in v4.1 due to expanded recruitment efforts. Additionally, v2.1.1 is aligned to GRCh37 while v4.1 uses GRCh38, meaning variant coordinates and some variant calls may differ due to reference genome changes. Finally, the balance of exome vs. genome data varies between versions, which can affect allele counts for variants in specific genomic regions."
            }
          },
          {
            "@type": "Question",
            "name": "What does it mean if gnomAD flags a variant as deviating from Hardy-Weinberg equilibrium?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "gnomAD runs statistical HWE tests on every variant site across sequenced individuals. Significant HWE deviation at a site is often a sign of genotyping artifacts — such as systematic sequencing errors, alignment problems, or batch effects — rather than true biological violation of HWE assumptions. For this reason, gnomAD applies HWE-based quality filters and excludes or flags variants with extreme HWE deviation. The calculator relies on gnomAD's quality-filtered allele frequencies, so most HWE-deviant artifactual sites are already excluded before carrier frequency is computed."
            }
          },
          {
            "@type": "Question",
            "name": "What is the difference between exome and genome data in gnomAD?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Exome sequencing targets only protein-coding regions (roughly 1.5% of the genome) and provides the largest sample sizes in gnomAD because exomes are cheaper to generate. Genome sequencing covers the entire genome, capturing intronic, regulatory, and non-coding variants that exomes miss. gnomAD v4.1 integrates both exome and genome cohorts, providing combined allele counts where both are available. The calculator aggregates allele counts (AC) and allele numbers (AN) from exomes and genomes jointly, which improves frequency estimates for coding variants while retaining genome-only data for variants outside exome capture regions."
            }
          },
          {
            "@type": "Question",
            "name": "How does gnomAD define genetic ancestry groups?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "gnomAD uses principal component analysis (PCA) on genome-wide genetic data to infer ancestry clusters, not self-reported ethnicity. The main groups are African/African-American (AFR), Admixed American (AMR), Ashkenazi Jewish (ASJ), East Asian (EAS), European (Finnish) (FIN), Middle Eastern (MID), Non-Finnish European (NFE), and South Asian (SAS). These labels reflect genetic similarity patterns in the reference dataset, not social or cultural identities. Population-specific carrier frequency estimates are most reliable when a patient's genetic ancestry is well-represented in gnomAD; underrepresented ancestries may have higher uncertainty due to smaller sample sizes."
            }
          },
          {
            "@type": "Question",
            "name": "What is allele number (AN) and why does it matter for carrier frequency estimates?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Allele number (AN) is the total count of alleles observed at a given genomic position across all sequenced individuals — approximately twice the number of individuals successfully sequenced at that site. Low AN indicates that few individuals were sequenced at that position, often because the region has poor sequencing coverage or falls outside standard exome capture regions. When AN is low, the allele frequency estimate (AC/AN) is statistically unreliable and may not reflect the true population frequency. The calculator displays AN alongside allele counts so users can assess confidence in the frequency estimate for each variant."
            }
          },
          {
            "@type": "Question",
            "name": "Why might a gene show no qualifying variants in the calculator?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Several reasons can explain an empty variant list: the gene may have no ClinVar pathogenic or likely pathogenic variants submitted; all known pathogenic variants may be structural (large deletions or duplications) that gnomAD short-read sequencing does not capture well; the gene may reside in a genomic region with low coverage in gnomAD exomes; or the selected gnomAD version may not include the variants of interest. The calculator applies two filters — loss-of-function high-confidence (LoF HC) and ClinVar pathogenic/likely pathogenic — and variants not meeting either criterion are excluded. Switching to a different gnomAD version or reviewing the filter settings may reveal additional variants for the gene in question."
            }
          }
        ]
      }
---

# Frequently Asked Questions

This page answers common questions about carrier frequency calculations, Hardy-Weinberg equilibrium, and gnomAD data interpretation. For step-by-step usage, see the [Getting Started](/guide/getting-started) guide. For methodology details, see the [Methodology](/reference/methodology) reference.

## Hardy-Weinberg Equilibrium

### When does Hardy-Weinberg equilibrium not hold?

Hardy-Weinberg equilibrium (HWE) requires five conditions: random mating, no natural selection, no migration or gene flow, no new mutations, and a sufficiently large population. In practice, violations such as founder effects, assortative mating, or inbreeding can cause observed genotype frequencies to deviate from HWE predictions. For rare autosomal recessive conditions, HWE holds well enough because selection against heterozygous carriers is minimal — carriers are phenotypically normal and face no reproductive disadvantage. Clinically relevant violations are most common in isolated populations with known founder variants, such as Ashkenazi Jewish communities for HEXA or Finnish populations for certain rare conditions.

### Why do carrier frequency estimates differ between gnomAD versions?

gnomAD v4.1 includes substantially more sequenced individuals than v2.1.1, so allele frequency estimates are based on larger sample sizes and may be more precise, especially for rare variants. The two versions also differ in their population composition: some ancestries are better represented in v4.1 due to expanded recruitment efforts. Additionally, v2.1.1 is aligned to GRCh37 while v4.1 uses GRCh38, meaning variant coordinates and some variant calls may differ due to reference genome changes. Finally, the balance of exome vs. genome data varies between versions, which can affect allele counts for variants in specific genomic regions.

### What does it mean if gnomAD flags a variant as deviating from Hardy-Weinberg equilibrium?

gnomAD runs statistical HWE tests on every variant site across sequenced individuals. Significant HWE deviation at a site is often a sign of genotyping artifacts — such as systematic sequencing errors, alignment problems, or batch effects — rather than true biological violation of HWE assumptions. For this reason, gnomAD applies HWE-based quality filters and excludes or flags variants with extreme HWE deviation. The calculator relies on gnomAD's quality-filtered allele frequencies, so most HWE-deviant artifactual sites are already excluded before carrier frequency is computed.

## gnomAD Data

### What is the difference between exome and genome data in gnomAD?

Exome sequencing targets only protein-coding regions (roughly 1.5% of the genome) and provides the largest sample sizes in gnomAD because exomes are cheaper to generate. Genome sequencing covers the entire genome, capturing intronic, regulatory, and non-coding variants that exomes miss. gnomAD v4.1 integrates both exome and genome cohorts, providing combined allele counts where both are available. The calculator aggregates allele counts (AC) and allele numbers (AN) from exomes and genomes jointly, which improves frequency estimates for coding variants while retaining genome-only data for variants outside exome capture regions.

### How does gnomAD define genetic ancestry groups?

gnomAD uses principal component analysis (PCA) on genome-wide genetic data to infer ancestry clusters, not self-reported ethnicity. The main groups are African/African-American (AFR), Admixed American (AMR), Ashkenazi Jewish (ASJ), East Asian (EAS), European (Finnish) (FIN), Middle Eastern (MID), Non-Finnish European (NFE), and South Asian (SAS). These labels reflect genetic similarity patterns in the reference dataset, not social or cultural identities. Population-specific carrier frequency estimates are most reliable when a patient's genetic ancestry is well-represented in gnomAD; underrepresented ancestries may have higher uncertainty due to smaller sample sizes.

### What is allele number (AN) and why does it matter for carrier frequency estimates?

Allele number (AN) is the total count of alleles observed at a given genomic position across all sequenced individuals — approximately twice the number of individuals successfully sequenced at that site. Low AN indicates that few individuals were sequenced at that position, often because the region has poor sequencing coverage or falls outside standard exome capture regions. When AN is low, the allele frequency estimate (AC/AN) is statistically unreliable and may not reflect the true population frequency. The calculator displays AN alongside allele counts so users can assess confidence in the frequency estimate for each variant.

### Why might a gene show no qualifying variants in the calculator?

Several reasons can explain an empty variant list: the gene may have no ClinVar pathogenic or likely pathogenic variants submitted; all known pathogenic variants may be structural (large deletions or duplications) that gnomAD short-read sequencing does not capture well; the gene may reside in a genomic region with low coverage in gnomAD exomes; or the selected gnomAD version may not include the variants of interest. The calculator applies two filters — loss-of-function high-confidence (LoF HC) and ClinVar pathogenic/likely pathogenic — and variants not meeting either criterion are excluded. Switching to a different gnomAD version or reviewing the [filter settings](/reference/filters) may reveal additional variants for the gene in question.

---

See [Methodology](/reference/methodology) for a detailed explanation of the Hardy-Weinberg calculations. See [Data Sources](/reference/data-sources) for information on gnomAD version selection and population coverage.
