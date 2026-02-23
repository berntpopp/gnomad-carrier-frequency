# Recurrence Risk and Family Planning

## The Scenario

A child has been diagnosed with cystic fibrosis. Molecular testing identified two different CFTR variants, confirming compound heterozygosity — though phase has not been formally confirmed by parental testing. The parents want to understand the risk for future pregnancies and are asking whether they need parental testing before planning to conceive again.

This scenario focuses on interpreting recurrence risk correctly when the index case carries two variants, and on communicating what population-specific carrier frequency data actually means for this family.

## Using the Calculator

### Setting Up the Calculation

Search for CFTR and allow the variant table to load. Since the child is the index case (not the patient being screened), set the patient status to **Compound heterozygous (assumed)**.

This reflects the clinical situation: two CFTR variants were detected in the child, and phase — whether the variants are on different alleles — has not been formally confirmed by testing each parent separately. The "assumed" designation documents the level of evidence without overstating what the molecular testing established.

::: info Confirmed vs. Assumed Compound Heterozygosity
If parental testing or long-read sequencing has confirmed that the two variants are on separate alleles, select **Compound heterozygous (confirmed)** instead. Both options use the same recurrence risk formula, but the distinction is reflected in the generated clinical text. This matters for record-keeping: "confirmed" means phase is molecularly established; "assumed" means phase is clinically inferred from the child's phenotype.
:::

### Understanding the Recurrence Risk

The key difference between this scenario and a standard carrier screening consultation is in the recurrence risk formula.

For a **heterozygous carrier** (standard carrier screening):

> recurrence risk = carrier_frequency × carrier_frequency × 1/4

The ×1/4 accounts for two unknowns: whether the partner is also a carrier, and whether both pass on the pathogenic allele in a given pregnancy.

For a **compound heterozygous or homozygous patient** (this scenario):

> recurrence risk = carrier_frequency × 1/2

The ×1/2 instead of ×1/4 reflects a critical difference: one parent is an **obligate carrier** (probability = 1, because the child inherited a pathogenic variant from each parent). Only the other parent's carrier status remains uncertain. With one obligate carrier and the other parent's carrier probability equal to the population carrier frequency, the risk of an affected child in any given pregnancy is carrier_frequency × 1/2.

This is a substantially higher risk estimate than the standard carrier screening formula. For CFTR in a non-Finnish European family, where the carrier frequency is approximately 1 in 25, the recurrence risk is around 1 in 50 — compared to 1 in 2,500 from the standard carrier × carrier calculation.

::: tip Population-Specific Values
Carrier frequencies vary substantially between ancestry groups. For CFTR, the non-Finnish European (NFE) carrier frequency is notably higher than in East Asian or South Asian populations, reflecting founder effects in European populations. When the family's ancestry is known, use the population-specific value rather than the global average.

For families of mixed ancestry, the appropriate population to use — and how to communicate uncertainty around the estimate — is a clinical judgment call. See [Methodology](/reference/methodology) for details on how gnomAD population groups are defined and how to interpret them.
:::

### What the Results Mean for This Family

The recurrence risk for this couple — one obligate carrier, one with unknown carrier status — equals the gnomAD carrier frequency for their ancestry group divided by 2.

In counseling, this figure is the probability that their next child would be affected if neither parent undergoes additional testing. It gives context for the decision about whether parental testing adds useful information:

- If one parent tests **negative**, the recurrence risk drops substantially (residual risk from the testing method's sensitivity remains, but the a priori probability is greatly reduced)
- If one parent tests **positive** (confirming the specific variant), the couple's risk is now 1 in 4 per pregnancy — a standard Mendelian recessive risk

The calculator gives you the pre-testing probability. The clinical conversation is about whether parental testing changes management.

## See Also

- [Carrier Screening](/use-cases/carrier-screening) — The related scenario where one partner is a known carrier before pregnancy
- [Methodology](/reference/methodology) — The complete recurrence risk calculation and formula derivations
- [Clinical Letter](/use-cases/clinical-letter) — Generating documentation to send to this family after the consultation
