// Utility functions for transforming variant data to display format

import type {
  GnomadVariant,
  ClinVarVariant,
  DisplayVariant,
  PopulationVariantFrequency,
} from '@/types';
import { getPopulationLabel } from '@/config';
import {
  isHighConfidenceLoF,
  isMissenseVariant,
  isPathogenicClinVar,
} from './variant-filters';

/**
 * Transform a single gnomAD variant to display format
 * Combines data from gnomAD with ClinVar annotations
 *
 * @param variant - gnomAD variant data
 * @param clinvarVariants - Array of ClinVar variants for cross-reference
 * @returns DisplayVariant with computed fields
 */
export function toDisplayVariant(
  variant: GnomadVariant,
  clinvarVariants: ClinVarVariant[]
): DisplayVariant {
  // Extract transcript consequence fields
  const tc = variant.transcript_consequence;
  const consequence = getConsequenceLabel(tc?.consequence_terms ?? []);
  const hgvsc = tc?.hgvsc ?? null;
  const hgvsp = tc?.hgvsp ?? null;
  const transcriptId = tc?.transcript_id ?? null;
  const lof = tc?.lof ?? null;

  // Compute combined allele frequency
  const exomeAc = variant.exome?.ac ?? 0;
  const genomeAc = variant.genome?.ac ?? 0;
  const exomeAn = variant.exome?.an ?? 0;
  const genomeAn = variant.genome?.an ?? 0;

  const totalAc = exomeAc + genomeAc;
  const totalAn = Math.max(exomeAn, genomeAn);
  const alleleFrequency = totalAn > 0 ? totalAc / totalAn : null;

  // Find matching ClinVar variant
  const clinvarMatch = clinvarVariants.find(
    (cv) => cv.variant_id === variant.variant_id
  );

  // Set ClinVar status and stars
  const clinvarStatus = clinvarMatch?.clinical_significance ?? null;
  const goldStars = clinvarMatch?.gold_stars ?? null;

  // Compute boolean flags
  const isLoF = tc ? isHighConfidenceLoF(tc) : false;
  const isClinvarPathogenic = clinvarMatch ? isPathogenicClinVar(clinvarMatch) : false;
  const isMissense = tc ? isMissenseVariant(tc) : false;

  return {
    variant_id: variant.variant_id,
    pos: variant.pos,
    ref: variant.ref,
    alt: variant.alt,
    consequence,
    alleleFrequency,
    alleleCount: totalAc,
    alleleNumber: totalAn,
    clinvarStatus,
    goldStars,
    hgvsc,
    hgvsp,
    transcriptId,
    lof,
    isLoF,
    isClinvarPathogenic,
    isMissense,
  };
}

/**
 * Transform array of gnomAD variants to display format
 *
 * @param variants - Array of gnomAD variants
 * @param clinvarVariants - Array of ClinVar variants for cross-reference
 * @returns Array of DisplayVariant
 */
export function toDisplayVariants(
  variants: GnomadVariant[],
  clinvarVariants: ClinVarVariant[]
): DisplayVariant[] {
  return variants.map((v) => toDisplayVariant(v, clinvarVariants));
}

/**
 * Get population-specific variant frequencies for a given population
 *
 * @param variants - Array of gnomAD variants
 * @param populationCode - Population code to filter by (e.g., "nfe", "afr")
 * @returns Array of PopulationVariantFrequency with variant frequencies for that population
 */
export function getPopulationVariants(
  variants: GnomadVariant[],
  populationCode: string
): PopulationVariantFrequency[] {
  const results: PopulationVariantFrequency[] = [];

  for (const variant of variants) {
    // Find population data in exome or genome
    const exomePop = variant.exome?.populations?.find(
      (p) => p.id === populationCode
    );
    const genomePop = variant.genome?.populations?.find(
      (p) => p.id === populationCode
    );

    // Combine exome and genome for this population
    const ac = (exomePop?.ac ?? 0) + (genomePop?.ac ?? 0);
    const an = Math.max(exomePop?.an ?? 0, genomePop?.an ?? 0);

    // Only include if there's data for this population
    if (an > 0) {
      const alleleFrequency = ac / an;
      results.push({
        populationCode,
        populationLabel: getPopulationLabel(populationCode),
        alleleFrequency: ac > 0 ? alleleFrequency : null,
        alleleCount: ac,
        alleleNumber: an,
      });
    }
  }

  return results;
}

/**
 * Get human-readable consequence label from consequence terms
 * Returns the first term with underscores replaced by spaces
 *
 * @param consequenceTerms - Array of SO consequence terms
 * @returns Formatted consequence label or "Unknown"
 */
export function getConsequenceLabel(consequenceTerms: string[]): string {
  if (!consequenceTerms || consequenceTerms.length === 0) {
    return 'Unknown';
  }
  // Return first term, replacing underscores with spaces
  return consequenceTerms[0].replace(/_/g, ' ');
}

/**
 * Get Vuetify color for ClinVar clinical significance
 *
 * @param status - ClinVar clinical significance string or null
 * @returns Vuetify color name
 */
export function getClinvarColor(status: string | null): string {
  if (!status) return 'default';

  const lower = status.toLowerCase();
  if (lower.includes('pathogenic') && !lower.includes('likely')) {
    return 'error';
  }
  if (lower.includes('likely_pathogenic') || lower.includes('likely pathogenic')) {
    return 'warning';
  }
  if (lower.includes('uncertain') || lower.includes('vus')) {
    return 'grey';
  }
  if (lower.includes('benign')) {
    return 'success';
  }
  return 'default';
}

/**
 * Format allele frequency for display
 * Uses scientific notation for very small values
 *
 * @param freq - Allele frequency value or null
 * @returns Formatted string
 */
export function formatAlleleFrequency(freq: number | null): string {
  if (freq === null) return '-';
  if (freq === 0) return '0';
  if (freq < 0.0001) {
    return freq.toExponential(2);
  }
  return freq.toFixed(6);
}

/**
 * Filter variants to those present in a specific population
 * A variant is present if its allele count > 0 in that population
 *
 * @param variants - Array of gnomAD variants
 * @param populationCode - Population code to filter by
 * @returns Filtered array of variants present in the population
 */
export function filterVariantsByPopulation(
  variants: GnomadVariant[],
  populationCode: string
): GnomadVariant[] {
  return variants.filter((variant) => {
    const exomePop = variant.exome?.populations?.find(
      (p) => p.id === populationCode
    );
    const genomePop = variant.genome?.populations?.find(
      (p) => p.id === populationCode
    );

    const ac = (exomePop?.ac ?? 0) + (genomePop?.ac ?? 0);
    return ac > 0;
  });
}
