import type { QueryResult } from "../types.js";

/**
 * Strip the variants field from a QueryResult to produce a summary-level result.
 */
function stripVariants(result: QueryResult): Omit<QueryResult, "variants"> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { variants: _variants, ...rest } = result;
  return rest;
}

/**
 * Format QueryResult (or array of QueryResult) as JSON.
 *
 * @param result - Single or array of query results
 * @param opts - Formatting options
 * @param opts.includeVariants - Include per-variant details in output (default: false)
 * @param opts.pretty - Pretty-print with 2-space indentation (default: true)
 * @returns JSON string
 */
export function formatJson(
  result: QueryResult | QueryResult[],
  opts?: { includeVariants?: boolean; pretty?: boolean },
): string {
  const pretty = opts?.pretty !== false; // Default true
  const includeVariants = opts?.includeVariants === true;

  let data:
    | QueryResult
    | Omit<QueryResult, "variants">
    | QueryResult[]
    | Omit<QueryResult, "variants">[];

  if (Array.isArray(result)) {
    data = includeVariants ? result : result.map(stripVariants);
  } else {
    data = includeVariants ? result : stripVariants(result);
  }

  return JSON.stringify(data, null, pretty ? 2 : undefined);
}
