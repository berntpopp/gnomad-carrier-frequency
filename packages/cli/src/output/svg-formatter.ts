import { generateSvgChart } from "@gnomad-cf/core/chart";
import { getGnomadVersion } from "@gnomad-cf/core/config";
import { frequencyToPercent } from "@gnomad-cf/core/calculations";
import type { QueryResult } from "../types.js";

/**
 * Format QueryResult as a publication-ready SVG bar chart.
 * Returns a complete SVG document string ready to write to a file or stdout.
 */
export function formatSvg(result: QueryResult): string {
  const versionConfig = getGnomadVersion(result.version);

  return generateSvgChart(result.populations, {
    gene: result.gene,
    gnomadVersion: `gnomAD ${versionConfig.displayName}`,
    globalCarrierFrequency: result.globalCarrierFrequency,
    formatFrequency: frequencyToPercent,
    includeMetadata: true,
  });
}
