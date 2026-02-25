/**
 * Homozygote-exclusion carrier frequency formulas.
 *
 * When computing carrier frequency from population data, observed homozygotes
 * cannot be counted as carriers. The VCR/GCR framework removes this bias.
 *
 * VCR (Variant Carrier Rate): per-variant carrier rate after excluding homozygotes.
 * GCR (Gene Carrier Rate): aggregated carrier rate across all variants in a gene,
 *   computed via inclusion-exclusion to avoid double-counting.
 *
 * Reference: PMC9763236 (Karczewski et al.) — Eq. 1–3 for VCR/GCR derivation.
 */

/**
 * Calculate the Variant Carrier Rate (VCR) for a single variant.
 *
 * Formula: VCR = (AC - 2 * acHom) / (AN / 2)
 *
 * Rationale:
 *   - Heterozygous allele count = AC - 2 * acHom
 *   - Individual count = AN / 2 (each individual contributes 2 alleles)
 *   - VCR = fraction of individuals who are heterozygous carriers
 *
 * @param ac - Total allele count for this variant
 * @param an - Total allele number (chromosomes sampled)
 * @param acHom - Homozygous individual count for this variant
 * @returns VCR in range [0, 1], or 0 if AN = 0 (unsampled)
 */
export function calculateVCR(ac: number, an: number, acHom: number): number {
  if (an === 0) return 0;
  const hetAlleles = ac - 2 * acHom;
  const individuals = an / 2;
  return hetAlleles / individuals;
}

/**
 * Calculate the Gene Carrier Rate (GCR) by aggregating VCRs.
 *
 * Formula: GCR = 1 - ∏(1 - VCRᵢ)
 *
 * The inclusion-exclusion product avoids double-counting individuals
 * who carry more than one pathogenic variant (compound heterozygotes).
 *
 * @param vcrs - Array of per-variant VCR values
 * @returns GCR in range [0, 1]
 */
export function calculateGCR(vcrs: number[]): number {
  if (vcrs.length === 0) return 0;
  const product = vcrs.reduce((prod, vcr) => prod * (1 - vcr), 1);
  return 1 - product;
}
