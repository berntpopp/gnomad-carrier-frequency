import {
  formatCarrierFrequency,
  formatPrevalence,
} from "@gnomad-cf/core/calculations";
import type { QueryResult } from "../types.js";

/**
 * Escape a field value for TSV output.
 *
 * Rules (from RESEARCH.md pitfall 6):
 * - Wrap every field in double quotes
 * - Escape internal double quotes as ""
 * - Replace newlines with a space
 * - Replace tab characters with a space
 */
function escapeTsv(
  value: string | number | boolean | null | undefined,
): string {
  if (value === null || value === undefined) {
    return '""';
  }
  const str = String(value)
    .replace(/\n/g, " ") // newlines → space
    .replace(/\t/g, " ") // tabs → space
    .replace(/"/g, '""'); // internal quotes → doubled quotes
  return `"${str}"`;
}

/** TSV header columns for main table */
const MAIN_HEADER =
  "gene\tpopulation\tpopulation_code\tcarrier_frequency\tcarrier_freq_ratio\t" +
  "genetic_prevalence\tbayesian_prevalence\tallele_count\tallele_number\tsum_af\t" +
  "founder_effect\tlow_sample_size";

/** TSV header columns for variant table */
const VARIANT_HEADER =
  "variant_id\tgene\tconsequence\tallele_frequency\tclinvar\tac_hom";

/**
 * Compute sum_af from allele count/number.
 * Returns 0 if allele number is 0.
 */
function computeSumAF(alleleCount: number, alleleNumber: number): number {
  if (alleleNumber === 0) return 0;
  return alleleCount / alleleNumber;
}

/**
 * Format a single QueryResult into TSV rows (one row per population).
 * The global row uses population='Global', population_code='global'.
 */
function resultToRows(result: QueryResult): string[] {
  const rows: string[] = [];

  const { ratio: cfRatioGlobal, percent: cfPercentGlobal } =
    formatCarrierFrequency(result.globalCarrierFrequency);
  const { ratio: gpGlobal } = formatPrevalence(result.geneticPrevalence);
  const { ratio: bpGlobal } = formatPrevalence(result.bayesianPrevalence);

  // Global row
  rows.push(
    [
      escapeTsv(result.gene),
      escapeTsv("Global"),
      escapeTsv("global"),
      escapeTsv(cfPercentGlobal),
      escapeTsv(cfRatioGlobal),
      escapeTsv(gpGlobal),
      escapeTsv(bpGlobal),
      escapeTsv(result.globalAlleleCount),
      escapeTsv(result.globalAlleleNumber),
      escapeTsv(result.globalSumAF.toPrecision(5)),
      escapeTsv(false),
      escapeTsv(false),
    ].join("\t"),
  );

  // Per-population rows
  for (const pop of result.populations) {
    if (pop.carrierFrequency === null) continue;

    const { ratio: cfRatio, percent: cfPercent } = formatCarrierFrequency(
      pop.carrierFrequency,
    );
    const { ratio: gpRatio } = formatPrevalence(pop.geneticPrevalence);
    const bayesianPrevalence =
      pop.geneticPrevalence !== null
        ? pop.geneticPrevalence * result.penetrance
        : null;
    const { ratio: bpRatio } = formatPrevalence(bayesianPrevalence);
    const sumAF = computeSumAF(pop.alleleCount, pop.alleleNumber);

    rows.push(
      [
        escapeTsv(result.gene),
        escapeTsv(pop.label),
        escapeTsv(pop.code),
        escapeTsv(cfPercent),
        escapeTsv(cfRatio),
        escapeTsv(gpRatio),
        escapeTsv(bpRatio),
        escapeTsv(pop.alleleCount),
        escapeTsv(pop.alleleNumber),
        escapeTsv(sumAF.toPrecision(5)),
        escapeTsv(pop.isFounderEffect),
        escapeTsv(pop.isLowSampleSize),
      ].join("\t"),
    );
  }

  return rows;
}

/**
 * Format QueryResult(s) as TSV (tab-separated values).
 *
 * Produces one row per gene-population combination. The global aggregate is
 * included as the first row for each gene (population='Global').
 *
 * If `opts.includeVariants` is true, a separate "# Variants" section is
 * appended after the main table.
 *
 * Field escaping: all values wrapped in double quotes; internal quotes
 * doubled; newlines and tabs replaced with spaces.
 *
 * @param results - Single or array of query results
 * @param opts - Formatting options
 * @param opts.includeVariants - Append variant detail section (default: false)
 * @returns Tab-separated string
 */
export function formatTsv(
  results: QueryResult | QueryResult[],
  opts?: { includeVariants?: boolean },
): string {
  const resultArray = Array.isArray(results) ? results : [results];

  const lines: string[] = [MAIN_HEADER];

  for (const result of resultArray) {
    lines.push(...resultToRows(result));
  }

  if (opts?.includeVariants) {
    const variantLines: string[] = ["", "# Variants", VARIANT_HEADER];

    for (const result of resultArray) {
      if (!result.variants || result.variants.length === 0) continue;

      for (const v of result.variants) {
        variantLines.push(
          [
            escapeTsv(v.variant_id),
            escapeTsv(result.gene),
            escapeTsv(v.consequence),
            escapeTsv(v.alleleFrequency.toPrecision(5)),
            escapeTsv(v.clinvarSignificance ?? "N/A"),
            escapeTsv(v.ac_hom),
          ].join("\t"),
        );
      }
    }

    lines.push(...variantLines);
  }

  return lines.join("\n");
}
