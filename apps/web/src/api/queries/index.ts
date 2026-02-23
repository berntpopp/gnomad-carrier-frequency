// GraphQL queries module exports

// Queries
export { GENE_SEARCH_QUERY } from './gene-search';
export { GENE_VARIANTS_QUERY } from './gene-variants';

// ClinVar submissions (for conflicting classification resolution)
export {
  buildSubmissionsQuery,
  parseSubmissionsResponse,
  calculatePathogenicPercentage,
  meetsConflictingThreshold,
  PATHOGENIC_CLASSIFICATIONS,
  EXCLUDED_CLASSIFICATIONS,
} from './clinvar-submissions';
export type {
  ClinVarSubmission,
  ClinVarVariantWithSubmissions,
} from './clinvar-submissions';

// Variable types
export type { GeneSearchVariables } from './gene-search';
export type { GeneVariantsVariables } from './gene-variants';

// Response types
export type {
  GeneSearchResult,
  GeneSearchResponse,
  GeneVariantPopulation,
  GeneVariantExomeGenome,
  GeneVariantTranscript,
  GeneVariant,
  GeneClinvarVariant,
  GeneData,
  GeneVariantsResponse,
} from './types';
