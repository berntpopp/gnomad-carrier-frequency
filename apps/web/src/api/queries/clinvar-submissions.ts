// ClinVar submissions query for resolving conflicting classifications
// Fetches individual submission data to calculate P/LP percentage

/**
 * Single ClinVar submission from a lab/submitter
 */
export interface ClinVarSubmission {
  clinical_significance: string;
}

/**
 * ClinVar variant with submissions data
 */
export interface ClinVarVariantWithSubmissions {
  variant_id: string;
  submissions: ClinVarSubmission[];
}

/**
 * Build a batched GraphQL query to fetch submissions for multiple variants
 * Uses aliased queries to fetch multiple variants in a single request
 *
 * @param variantIds - Array of variant IDs to fetch
 * @param referenceGenome - Reference genome (GRCh38 or GRCh37)
 * @returns GraphQL query string
 */
export function buildSubmissionsQuery(
  variantIds: string[],
  referenceGenome: 'GRCh38' | 'GRCh37'
): string {
  const variantQueries = variantIds
    .map((id, index) => {
      // Use index as alias since variant IDs contain special characters
      return `v${index}: clinvar_variant(variant_id: "${id}", reference_genome: ${referenceGenome}) {
        variant_id
        submissions {
          clinical_significance
        }
      }`;
    })
    .join('\n      ');

  return `query ClinVarSubmissions {
      ${variantQueries}
    }`;
}

/**
 * Parse the batched submissions response into a map
 *
 * @param response - GraphQL response data object
 * @returns Map of variant_id to submissions array
 */
export function parseSubmissionsResponse(
  response: Record<string, ClinVarVariantWithSubmissions | null>
): Map<string, ClinVarSubmission[]> {
  const result = new Map<string, ClinVarSubmission[]>();

  for (const value of Object.values(response)) {
    if (value && value.variant_id && value.submissions) {
      result.set(value.variant_id, value.submissions);
    }
  }

  return result;
}

/**
 * Classifications considered as Pathogenic/Likely Pathogenic
 * Case-insensitive matching
 */
export const PATHOGENIC_CLASSIFICATIONS = [
  'pathogenic',
  'likely pathogenic',
  'pathogenic, low penetrance',
  'likely pathogenic, low penetrance',
] as const;

/**
 * Classifications to exclude from percentage calculation
 * These don't indicate a clear benign or pathogenic interpretation
 */
export const EXCLUDED_CLASSIFICATIONS = [
  'not provided',
  'other',
  'risk factor',
  'drug response',
  'association',
  'protective',
  'affects',
  'confers sensitivity',
  'uncertain risk allele',
  'likely risk allele',
  'established risk allele',
] as const;

/**
 * Calculate the percentage of P/LP submissions for a variant
 *
 * @param submissions - Array of ClinVar submissions
 * @returns Percentage (0-100) of P/LP submissions, or null if no valid submissions
 */
export function calculatePathogenicPercentage(
  submissions: ClinVarSubmission[]
): number | null {
  if (!submissions || submissions.length === 0) {
    return null;
  }

  let pathogenicCount = 0;
  let totalValidCount = 0;

  for (const sub of submissions) {
    const sig = sub.clinical_significance.toLowerCase().trim();

    // Skip excluded classifications
    const isExcluded = EXCLUDED_CLASSIFICATIONS.some((exc) =>
      sig.includes(exc.toLowerCase())
    );
    if (isExcluded) {
      continue;
    }

    totalValidCount++;

    // Check if pathogenic
    const isPathogenic = PATHOGENIC_CLASSIFICATIONS.some((p) =>
      sig.includes(p.toLowerCase())
    );
    if (isPathogenic) {
      pathogenicCount++;
    }
  }

  if (totalValidCount === 0) {
    return null;
  }

  return (pathogenicCount / totalValidCount) * 100;
}

/**
 * Check if a variant with conflicting classifications should be included
 * based on the percentage of P/LP submissions
 *
 * @param submissions - Array of ClinVar submissions
 * @param threshold - Minimum percentage of P/LP submissions required (0-100)
 * @returns true if the variant meets the threshold
 */
export function meetsConflictingThreshold(
  submissions: ClinVarSubmission[],
  threshold: number
): boolean {
  const percentage = calculatePathogenicPercentage(submissions);
  if (percentage === null) {
    return false;
  }
  return percentage >= threshold;
}
