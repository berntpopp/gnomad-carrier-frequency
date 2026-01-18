// Variant filtering functions for LoF and ClinVar pathogenicity

import type {
  TranscriptConsequence,
  ClinVarVariant,
  GnomadVariant,
} from '@/types/variant';

/**
 * Check if a transcript consequence is high-confidence loss of function
 * FILT-01: LoF "HC" (high confidence) from LOFTEE on canonical transcript
 */
export function isHighConfidenceLoF(
  consequence: TranscriptConsequence
): boolean {
  // Only consider canonical transcript
  return consequence.canonical && consequence.lof === 'HC';
}

/**
 * Check if a ClinVar variant is pathogenic with sufficient review
 * FILT-02: ClinVar pathogenic/likely pathogenic
 * FILT-03: Require >= 1 review star
 */
export function isPathogenicClinVar(variant: ClinVarVariant): boolean {
  const sig = variant.clinical_significance.toLowerCase();
  const isPathogenic =
    (sig.includes('pathogenic') || sig.includes('likely_pathogenic')) &&
    !sig.includes('conflicting');
  const hasReview = variant.gold_stars >= 1;
  return isPathogenic && hasReview;
}

/**
 * Determine if a variant should be included in carrier frequency calculation
 * Include if: LoF HC OR ClinVar Pathogenic/Likely Pathogenic with >= 1 star
 */
export function shouldIncludeVariant(
  variant: GnomadVariant,
  clinvarVariants: ClinVarVariant[]
): boolean {
  const hasHCLoF = variant.transcript_consequences.some(isHighConfidenceLoF);

  const clinvarMatch = clinvarVariants.find(
    (cv) => cv.variant_id === variant.variant_id
  );
  const hasPathogenicClinVar = clinvarMatch
    ? isPathogenicClinVar(clinvarMatch)
    : false;

  return hasHCLoF || hasPathogenicClinVar;
}

/**
 * Filter variants to only those qualifying for carrier frequency calculation
 */
export function filterPathogenicVariants(
  variants: GnomadVariant[],
  clinvarVariants: ClinVarVariant[]
): GnomadVariant[] {
  return variants.filter((v) => shouldIncludeVariant(v, clinvarVariants));
}
