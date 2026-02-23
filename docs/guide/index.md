# Guide

This guide covers everything you need to use the gnomAD Carrier Frequency Calculator effectively. Whether you are a genetic counselor, clinical geneticist, or researcher, these pages will walk you through the calculator's features and help you interpret results.

::: warning For Research Use Only
The gnomAD Carrier Frequency Calculator is a research tool intended to support clinical documentation workflows. Results should be reviewed by a qualified clinician and do not constitute a diagnostic report.
:::

## What is the gnomAD Carrier Frequency Calculator?

The gnomAD Carrier Frequency Calculator is a browser-based tool that queries the [Genome Aggregation Database (gnomAD)](https://gnomad.broadinstitute.org/) to calculate carrier frequencies for autosomal recessive conditions. It is designed for a broad clinical audience — genetic counselors, clinical geneticists, and researchers — who need to estimate recurrence risks and generate supporting documentation.

The calculator applies Hardy-Weinberg equilibrium to derive carrier frequencies from allele frequencies observed in gnomAD populations. Hardy-Weinberg equilibrium is a population genetics principle stating that, in a stable population, allele and genotype frequencies remain constant across generations. This means that if the pathogenic allele frequency in the population is _q_, then the carrier frequency (heterozygous individuals) is approximately 2_q_ for rare variants. The calculator uses this relationship to translate gnomAD allele data into clinically interpretable carrier frequencies.

The tool supports multiple gnomAD versions — v4.1 (GRCh38), v3.1.2 (GRCh38, genomes only), and v2.1.1 (GRCh37) — and produces German and English clinical documentation text ready to paste into patient letters or clinical reports. No account or installation is required; the calculator runs entirely in your browser.

<figure class="screenshot-frame">
  <img src="/screenshots/mobile-results.webp" alt="Calculator results displayed on a mobile device" />
  <figcaption>The calculator works on both desktop and mobile devices.</figcaption>
</figure>

## Key Features

- **gnomAD integration** — queries multiple gnomAD versions (v4.1, v3.1.2, v2.1.1) directly from your browser
- **Variant filtering** — automatically filters for high-confidence loss-of-function (LoF HC) variants and ClinVar pathogenic/likely pathogenic entries
- **Carrier frequency calculation** — derives carrier frequencies from population allele data using Hardy-Weinberg equilibrium
- **Recurrence risk estimation** — calculates recurrence risk based on the index patient's genetic status
- **Clinical text generation** — produces ready-to-use German and English documentation with configurable perspective and gender-inclusive language styles
- **URL sharing** — export results as a shareable link for colleagues or electronic records
- **Search history** — recent gene searches are saved locally for quick re-access
- **Offline support** — works as a Progressive Web App (PWA) after your first visit

## The 4-Step Wizard

The calculator guides you through four steps from gene selection to report generation:

1. **Gene Search** — find your gene by symbol and review gene constraint data to assess variant pathogenicity
2. **Patient Status** — set the index patient's genetic status (heterozygous carrier, homozygous affected, or compound heterozygous)
3. **Frequency Source** — choose between live gnomAD data, a literature value, or a default fallback frequency
4. **Results and Text** — review carrier frequencies by population, recurrence risk, and generate clinical documentation

<figure class="screenshot-frame">
  <img src="/screenshots/step-1-gene-selected.webp" alt="CFTR gene selected showing gene constraint data" />
  <figcaption>Step 1: After selecting a gene, constraint metrics help assess variant significance.</figcaption>
</figure>

## Next Steps

- [Getting Started](/guide/getting-started) — a step-by-step walkthrough of a complete calculation
- [Use Cases](/use-cases/) — real clinical scenarios with worked examples
- [Reference](/reference/) — methodology, data sources, variant filters, and template details
