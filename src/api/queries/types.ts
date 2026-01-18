// Response types for gnomAD GraphQL queries

export interface GeneSearchResult {
  ensembl_id: string;
  symbol: string;
}

export interface GeneSearchResponse {
  gene_search: GeneSearchResult[];
}

export interface GeneVariantPopulation {
  id: string;
  ac: number;
  an: number;
}

export interface GeneVariantExomeGenome {
  ac: number;
  an: number;
  populations: GeneVariantPopulation[];
}

export interface GeneVariantTranscript {
  gene_symbol: string;
  transcript_id: string;
  canonical: boolean;
  consequence_terms: string[];
  lof: string | null;
  lof_filter: string | null;
  lof_flags: string | null;
}

export interface GeneVariant {
  variant_id: string;
  pos: number;
  ref: string;
  alt: string;
  exome: GeneVariantExomeGenome | null;
  genome: GeneVariantExomeGenome | null;
  transcript_consequence: GeneVariantTranscript | null;
}

export interface GeneClinvarVariant {
  variant_id: string;
  clinical_significance: string;
  gold_stars: number;
  review_status: string;
  pos: number;
  ref: string;
  alt: string;
}

export interface GeneData {
  gene_id: string;
  symbol: string;
  variants: GeneVariant[];
  clinvar_variants: GeneClinvarVariant[];
}

export interface GeneVariantsResponse {
  gene: GeneData | null;
}
