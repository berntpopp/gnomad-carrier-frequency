// Variant-related type definitions for gnomAD data

export interface TranscriptConsequence {
  gene_symbol: string;
  transcript_id: string;
  canonical: boolean;
  consequence_terms: string[];
  lof: string | null; // "HC", "LC", "OS", or null
  lof_filter: string | null;
  lof_flags: string | null;
}

export interface ClinVarVariant {
  variant_id: string;
  clinical_significance: string;
  gold_stars: number;
  review_status: string;
  pos: number;
  ref: string;
  alt: string;
}

export interface VariantPopulation {
  id: string; // Population code from config
  ac: number;
  an: number;
}

export interface VariantFrequencyData {
  exome?: {
    ac: number;
    an: number;
    populations: VariantPopulation[];
  };
  genome?: {
    ac: number;
    an: number;
    populations: VariantPopulation[];
  };
}

export interface GnomadVariant {
  variant_id: string;
  pos: number;
  ref: string;
  alt: string;
  exome?: VariantFrequencyData['exome'];
  genome?: VariantFrequencyData['genome'];
  transcript_consequence: TranscriptConsequence | null;
}
