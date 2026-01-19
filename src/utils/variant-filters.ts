// Variant filtering functions for LoF and ClinVar pathogenicity

import type {
  TranscriptConsequence,
  ClinVarVariant,
  GnomadVariant,
  FilterConfig,
} from '@/types';
import { FACTORY_FILTER_DEFAULTS } from '@/types';

/**
 * Missense-class consequence terms
 * Used when missense filter is enabled
 */
export const MISSENSE_CONSEQUENCES = [
  'missense_variant',
  'inframe_insertion',
  'inframe_deletion',
] as const;

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
 * Check if a transcript consequence is a missense-class variant
 * Includes missense_variant, inframe_insertion, inframe_deletion
 */
export function isMissenseVariant(consequence: TranscriptConsequence): boolean {
  if (!consequence.canonical || !consequence.consequence_terms) {
    return false;
  }
  return consequence.consequence_terms.some((term) =>
    MISSENSE_CONSEQUENCES.includes(term as (typeof MISSENSE_CONSEQUENCES)[number])
  );
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
 * Check if a ClinVar variant is pathogenic with configurable star threshold
 * @param variant - ClinVar variant to check
 * @param threshold - Minimum number of gold stars required (0-4)
 */
export function isPathogenicClinVarWithThreshold(
  variant: ClinVarVariant,
  threshold: number
): boolean {
  const sig = variant.clinical_significance.toLowerCase();
  const isPathogenic =
    (sig.includes('pathogenic') || sig.includes('likely_pathogenic')) &&
    !sig.includes('conflicting');
  const hasReview = variant.gold_stars >= threshold;
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
  const hasHCLoF = variant.transcript_consequence
    ? isHighConfidenceLoF(variant.transcript_consequence)
    : false;

  const clinvarMatch = clinvarVariants.find(
    (cv) => cv.variant_id === variant.variant_id
  );
  const hasPathogenicClinVar = clinvarMatch
    ? isPathogenicClinVar(clinvarMatch)
    : false;

  return hasHCLoF || hasPathogenicClinVar;
}

/**
 * Determine if a variant should be included based on configurable filter settings
 * Returns true if ANY enabled filter matches the variant
 *
 * @param variant - gnomAD variant to check
 * @param clinvarVariants - Array of ClinVar variants for cross-reference
 * @param config - Filter configuration specifying which filters are active
 */
export function shouldIncludeVariantConfigurable(
  variant: GnomadVariant,
  clinvarVariants: ClinVarVariant[],
  config: FilterConfig
): boolean {
  // Check LoF HC filter
  if (config.lofHcEnabled && variant.transcript_consequence) {
    if (isHighConfidenceLoF(variant.transcript_consequence)) {
      return true;
    }
  }

  // Check missense filter
  if (config.missenseEnabled && variant.transcript_consequence) {
    if (isMissenseVariant(variant.transcript_consequence)) {
      return true;
    }
  }

  // Check ClinVar P/LP filter with configurable star threshold
  if (config.clinvarEnabled) {
    const clinvarMatch = clinvarVariants.find(
      (cv) => cv.variant_id === variant.variant_id
    );
    if (
      clinvarMatch &&
      isPathogenicClinVarWithThreshold(clinvarMatch, config.clinvarStarThreshold)
    ) {
      return true;
    }
  }

  return false;
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

/**
 * Filter variants using configurable filter settings
 * Returns variants that match ANY of the enabled filters
 *
 * @param variants - Array of gnomAD variants to filter
 * @param clinvarVariants - Array of ClinVar variants for cross-reference
 * @param config - Filter configuration specifying which filters are active
 */
export function filterPathogenicVariantsConfigurable(
  variants: GnomadVariant[],
  clinvarVariants: ClinVarVariant[],
  config: FilterConfig = FACTORY_FILTER_DEFAULTS
): GnomadVariant[] {
  return variants.filter((v) =>
    shouldIncludeVariantConfigurable(v, clinvarVariants, config)
  );
}
