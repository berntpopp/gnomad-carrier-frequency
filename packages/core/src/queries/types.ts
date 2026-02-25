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
  ac_hom: number;
}

export interface GeneVariantExomeGenome {
  ac: number;
  an: number;
  ac_hom: number;
  populations: GeneVariantPopulation[];
}

export interface GeneVariantJointPopulation {
  id: string;
  ac: number;
  an: number;
  homozygote_count: number;
}

export interface GeneVariantJoint {
  ac: number;
  an: number;
  homozygote_count: number;
  hemizygote_count: number;
  populations: GeneVariantJointPopulation[];
}

export interface GeneVariantTranscript {
  gene_symbol: string;
  transcript_id: string;
  canonical: boolean;
  consequence_terms: string[];
  lof: string | null;
  lof_filter: string | null;
  lof_flags: string | null;
  hgvsc: string | null; // HGVS coding notation (e.g., "c.1234A>G")
  hgvsp: string | null; // HGVS protein notation (e.g., "p.Met123Val")
}

export interface GeneVariant {
  variant_id: string;
  pos: number;
  ref: string;
  alt: string;
  exome: GeneVariantExomeGenome | null;
  genome: GeneVariantExomeGenome | null;
  joint: GeneVariantJoint | null;
  transcript_consequence: GeneVariantTranscript | null;
}

export interface GeneClinvarVariant {
  variant_id: string;
  clinvar_variation_id: string | null;
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

// Gene constraint data from gnomAD
export interface GnomadConstraint {
  exp_lof: number | null;
  obs_lof: number | null;
  oe_lof: number | null;
  oe_lof_lower: number | null;
  oe_lof_upper: number | null; // This is LOEUF
  pLI: number | null;
  lof_z: number | null;
  flags: string[] | null;
}

export interface ManeSelectTranscript {
  ensembl_id: string;
  ensembl_version: string;
  refseq_id: string;
  refseq_version: string;
}

export interface GeneDetailsResult {
  gene_id: string;
  symbol: string;
  canonical_transcript_id: string | null;
  mane_select_transcript: ManeSelectTranscript | null;
  gnomad_constraint: GnomadConstraint | null;
}

export interface GeneDetailsResponse {
  gene: GeneDetailsResult | null;
}
