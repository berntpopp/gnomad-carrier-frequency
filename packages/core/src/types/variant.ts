// Variant-related type definitions for gnomAD data

export interface TranscriptConsequence {
  gene_symbol: string;
  transcript_id: string;
  canonical: boolean;
  consequence_terms: string[];
  lof: string | null; // "HC", "LC", "OS", or null
  lof_filter: string | null;
  lof_flags: string | null;
  hgvsc: string | null; // HGVS coding notation (e.g., "c.1234A>G")
  hgvsp: string | null; // HGVS protein notation (e.g., "p.Met123Val")
}

export interface ClinVarVariant {
  variant_id: string;
  clinvar_variation_id: string | null;
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
  ac_hom: number;
}

export interface JointPopulation {
  id: string;
  ac: number;
  an: number;
  homozygote_count: number;
}

export interface JointFrequencyData {
  ac: number;
  an: number;
  homozygote_count: number;
  hemizygote_count: number;
  populations: JointPopulation[];
}

export interface VariantFrequencyData {
  exome?: {
    ac: number;
    an: number;
    ac_hom: number;
    /** gnomAD QC filter names; empty array or ["PASS"] means passed; other values indicate failure */
    filters?: string[];
    populations: VariantPopulation[];
  };
  genome?: {
    ac: number;
    an: number;
    ac_hom: number;
    /** gnomAD QC filter names; empty array or ["PASS"] means passed; other values indicate failure */
    filters?: string[];
    populations: VariantPopulation[];
  };
  joint?: JointFrequencyData;
}

export interface GnomadVariant {
  variant_id: string;
  pos: number;
  ref: string;
  alt: string;
  exome?: VariantFrequencyData["exome"];
  genome?: VariantFrequencyData["genome"];
  joint?: VariantFrequencyData["joint"];
  transcript_consequence: TranscriptConsequence | null;
}
