// ClinVar submissions query for resolving conflicting classifications
// Fetches individual submission data to calculate P/LP percentage

/**
 * Single ClinVar submission from a lab/submitter
 */
export interface ClinVarSubmission {
  clinical_significance: string;
  submitter_name?: string;
  review_status?: string;
  last_evaluated?: string;
}

/**
 * ClinVar variant with submissions data
 */
export interface ClinVarVariantWithSubmissions {
  variant_id: string;
  clinical_significance?: string;
  review_status?: string;
  last_evaluated?: string;
  submissions: ClinVarSubmission[];
}

/**
 * Build a batched GraphQL query to fetch submissions for multiple variants
 * Uses aliased queries and parameterized GraphQL variables.
 *
 * @param variantIds - Array of variant IDs to fetch
 * @param referenceGenome - Reference genome (GRCh38 or GRCh37)
 * @returns Object with query string and variables map, or null if variantIds is empty
 */
export function buildSubmissionsQuery(
  variantIds: string[],
  referenceGenome: "GRCh38" | "GRCh37",
): { query: string; variables: Record<string, string> } | null {
  if (!variantIds || variantIds.length === 0) return null;

  for (const id of variantIds) {
    if (!/^(?:chr)?(?:\d+|X|Y)-[0-9]+-[ACGT]+-[ACGT]+$/i.test(id)) {
      throw new Error(`Invalid variant ID format: ${id}`);
    }
  }

  const variables: Record<string, string> = {
    refGenome: referenceGenome,
  };

  const fields = variantIds
    .map((id, index) => {
      const varName = `var${index}`;
      variables[varName] = id;
      return `v${index}: clinvar_variant(variant_id: $${varName}, reference_genome: $refGenome) {
        variant_id
        clinical_significance
        review_status
        last_evaluated
        submissions {
          clinical_significance
          review_status
          last_evaluated
          submitter_name
        }
      }`;
    })
    .join("\n      ");

  const varDeclarations = Object.keys(variables)
    .filter((k) => k !== "refGenome")
    .map((k) => `$${k}: String!`)
    .join(", ");

  const query = `query GetClinvarSubmissions($refGenome: ReferenceGenomeId!, ${varDeclarations}) {
      ${fields}
    }`;

  return { query, variables };
}

/**
 * Parse the batched submissions response into a map
 *
 * @param response - GraphQL response data object
 * @returns Map of variant_id to submissions array
 */
export function parseSubmissionsResponse(
  response: Record<string, ClinVarVariantWithSubmissions | null>,
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
  "pathogenic",
  "likely pathogenic",
  "pathogenic, low penetrance",
  "likely pathogenic, low penetrance",
] as const;

/**
 * Classifications to exclude from percentage calculation
 * These don't indicate a clear benign or pathogenic interpretation
 */
export const EXCLUDED_CLASSIFICATIONS = [
  "not provided",
  "other",
  "risk factor",
  "drug response",
  "association",
  "protective",
  "affects",
  "confers sensitivity",
  "uncertain risk allele",
  "likely risk allele",
  "established risk allele",
] as const;

/**
 * Calculate the percentage of P/LP submissions for a variant
 *
 * @param submissions - Array of ClinVar submissions
 * @returns Percentage (0-100) of P/LP submissions, or null if no valid submissions
 */
export function calculatePathogenicPercentage(
  submissions: ClinVarSubmission[],
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
      sig.includes(exc.toLowerCase()),
    );
    if (isExcluded) {
      continue;
    }

    totalValidCount++;

    // Check if pathogenic
    const isPathogenic = PATHOGENIC_CLASSIFICATIONS.some((p) =>
      sig.includes(p.toLowerCase()),
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
  threshold: number,
): boolean {
  const percentage = calculatePathogenicPercentage(submissions);
  if (percentage === null) {
    return false;
  }
  return percentage >= threshold;
}
