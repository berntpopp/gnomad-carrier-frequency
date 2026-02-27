// GraphQL queries module exports

// Queries
export { GENE_SEARCH_QUERY, GENE_DETAILS_QUERY } from "./gene-search";
export { GENE_VARIANTS_QUERY } from "./gene-variants";
export { VARIANT_SUBCONTINENTAL_QUERY } from "./subcontinental-variant";

// ClinVar submissions (for conflicting classification resolution)
export {
  buildSubmissionsQuery,
  parseSubmissionsResponse,
  calculatePathogenicPercentage,
  meetsConflictingThreshold,
  PATHOGENIC_CLASSIFICATIONS,
  EXCLUDED_CLASSIFICATIONS,
} from "./clinvar-submissions";
export type {
  ClinVarSubmission,
  ClinVarVariantWithSubmissions,
} from "./clinvar-submissions";

// Variable types
export type { GeneSearchVariables } from "./gene-search";
export type { GeneVariantsVariables } from "./gene-variants";
export type {
  VariantSubcontinentalVariables,
  VariantSubcontinentalPopulation,
  VariantSubcontinentalResponse,
} from "./subcontinental-variant";

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
  GnomadConstraint,
  GeneDetailsResult,
  GeneDetailsResponse,
} from "./types";
