// Display types for variant modal and table rendering

/**
 * Flattened variant structure for table display in variant modal.
 * Combines gnomAD variant data with ClinVar annotations.
 */
export interface DisplayVariant {
  /** Primary identifier (e.g., "1-12345-A-G") */
  variant_id: string;
  /** Genomic position */
  pos: number;
  /** Reference allele */
  ref: string;
  /** Alternate allele */
  alt: string;
  /** Human-readable consequence (e.g., "missense_variant") */
  consequence: string;
  /** Computed allele frequency (exome + genome combined), null if no data */
  alleleFrequency: number | null;
  /** Total allele count */
  alleleCount: number;
  /** Total allele number */
  alleleNumber: number;
  /** ClinVar clinical significance classification or null */
  clinvarStatus: string | null;
  /** ClinVar variation ID for direct linking */
  clinvarVariationId: string | null;
  /** ClinVar review stars (0-4) or null */
  goldStars: number | null;
  /** HGVS coding notation (e.g., "c.1234A>G") */
  hgvsc: string | null;
  /** HGVS protein notation (e.g., "p.Met123Val") */
  hgvsp: string | null;
  /** Transcript ID */
  transcriptId: string | null;
  /** LoF annotation (HC/LC/OS) */
  lof: string | null;
  /** True if LoF HC (high confidence loss-of-function) */
  isLoF: boolean;
  /** True if ClinVar Pathogenic or Likely Pathogenic */
  isClinvarPathogenic: boolean;
  /** True if missense consequence */
  isMissense: boolean;
}

/**
 * Per-population variant frequency for detailed display.
 * Used in population breakdown tables within variant modal.
 */
export interface PopulationVariantFrequency {
  /** Population code (e.g., "nfe", "afr") */
  populationCode: string;
  /** Human-readable population label (e.g., "European (Non-Finnish)") */
  populationLabel: string;
  /** Computed allele frequency for this population, null if no data */
  alleleFrequency: number | null;
  /** Allele count for this population */
  alleleCount: number;
  /** Allele number for this population */
  alleleNumber: number;
}
