import {
  formatCarrierFrequency,
  formatPrevalence,
} from "@gnomad-cf/core/calculations";
import { getGnomadVersion } from "@gnomad-cf/core/config";
import type { OrphanetDisease } from "@gnomad-cf/core/orphanet";
import type { QueryResult } from "../types.js";

/**
 * Format a number with thousands separators.
 */
function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}

/**
 * Format a sum allele frequency with 5 significant figures.
 */
function formatSumAF(sumAF: number): string {
  if (sumAF === 0) return "0";
  return sumAF.toPrecision(5).replace(/\.?0+$/, "");
}

/**
 * Build a labeled key:value line, left-padding the value for alignment.
 */
function labelLine(label: string, value: string, indent = "  "): string {
  const padded = label.padEnd(22, " ");
  return `${indent}${padded}${value}`;
}

/**
 * Format a penetrance value as a percentage string.
 */
function formatPenetrance(penetrance: number): string {
  return `${Math.round(penetrance * 100)}%`;
}

/**
 * Format a formula description from the query result.
 */
function buildFormulaDescription(result: QueryResult): string {
  const base = result.formula === "hwe" ? "HWE" : "Simplified";
  return result.homExclusionActive ? `${base} + Hom. exclusion` : base;
}

/**
 * Format a single population section (or global section).
 */
function formatPopulationBlock(
  label: string,
  carrierFrequency: number | null,
  geneticPrevalence: number | null,
  bayesianPrevalence: number | null,
  alleleCount: number,
  alleleNumber: number,
  sumAF: number,
  penetrance: number,
  isFounderEffect: boolean,
  isLowSampleSize: boolean,
  separator: "dashes" | "equals",
): string {
  const lines: string[] = [];

  const headerLine =
    separator === "dashes" ? `--- ${label} ---` : `=== ${label} ===`;
  lines.push(headerLine);

  const cf = formatCarrierFrequency(carrierFrequency);
  lines.push(labelLine("Carrier frequency:", `${cf.ratio} (${cf.percent})`));

  const gp = formatPrevalence(geneticPrevalence);
  lines.push(labelLine("Genetic prevalence:", gp.ratio));

  if (penetrance < 1) {
    const bp = formatPrevalence(bayesianPrevalence);
    lines.push(
      labelLine(
        "Bayesian prevalence:",
        `${bp.ratio} (penetrance: ${formatPenetrance(penetrance)})`,
      ),
    );
  } else {
    const gp2 = formatPrevalence(geneticPrevalence);
    lines.push(
      labelLine(
        "Bayesian prevalence:",
        `${gp2.ratio} (penetrance: ${formatPenetrance(penetrance)})`,
      ),
    );
  }

  lines.push(labelLine("Allele count:", formatNumber(alleleCount)));
  lines.push(labelLine("Allele number:", formatNumber(alleleNumber)));
  lines.push(labelLine("Sum allele freq:", formatSumAF(sumAF)));

  if (isFounderEffect) {
    lines.push("  [!] Elevated - possible founder effect");
  }
  if (isLowSampleSize) {
    lines.push("  [!] Low sample size");
  }

  return lines.join("\n");
}

/**
 * Format Orphanet prevalence data as a text section.
 * Returns empty string when no diseases are provided.
 */
function formatOrphanetSection(diseases: OrphanetDisease[]): string {
  if (diseases.length === 0) return '';
  const lines: string[] = ['', '--- Orphanet Prevalence ---'];
  for (const d of diseases) {
    const prev = d.bestPrevalence
      ? `${d.bestPrevalence.prevalenceClass} (${d.bestPrevalence.geographic})`
      : 'Unknown';
    const ar = d.isAutosomalRecessive ? ' [AR]' : '';
    lines.push(labelLine(`${d.name}${ar}:`, prev));
    lines.push(`    ${d.orphanetUrl}`);
  }
  lines.push('  Note: Orphanet reports clinical prevalence, not genetic carrier prevalence.');
  return lines.join('\n');
}

/**
 * Format QueryResult as human-readable summary blocks with labeled key:value lines
 * grouped by population.
 *
 * @param result - The query result to format
 * @param opts - Optional formatting options
 * @param opts.includeVariants - If true, append per-variant detail section
 * @returns Formatted text string
 */
export function formatText(
  result: QueryResult,
  opts?: { includeVariants?: boolean },
): string {
  const versionConfig = getGnomadVersion(result.version);
  const formulaDesc = buildFormulaDescription(result);

  const headerLine = [
    `Gene: ${result.gene}`,
    `gnomAD ${versionConfig.displayName}`,
    `Variants: ${result.variantCount}`,
    `Formula: ${formulaDesc}`,
  ].join("  |  ");

  const sections: string[] = [headerLine, ""];

  // Global section
  const globalSumAF = result.globalSumAF;
  const globalGeneticPrevalence = result.geneticPrevalence;
  const globalBayesianPrevalence = result.bayesianPrevalence;

  sections.push(
    formatPopulationBlock(
      "Global",
      result.globalCarrierFrequency,
      globalGeneticPrevalence,
      globalBayesianPrevalence,
      result.globalAlleleCount,
      result.globalAlleleNumber,
      globalSumAF,
      result.penetrance,
      false,
      false,
      "dashes",
    ),
  );

  // Per-population sections
  for (const pop of result.populations) {
    if (pop.carrierFrequency === null) continue;

    // Derive sumAF from carrierFrequency via HWE: q ≈ CF/2
    // More accurately, use sqrt(geneticPrevalence) if available,
    // otherwise approximate from AC/AN
    const popSumAF =
      pop.alleleNumber > 0 ? pop.alleleCount / pop.alleleNumber : 0;

    sections.push("");
    sections.push(
      formatPopulationBlock(
        `${pop.label} (${pop.code})`,
        pop.carrierFrequency,
        pop.geneticPrevalence,
        pop.geneticPrevalence !== null
          ? pop.geneticPrevalence * result.penetrance
          : null,
        pop.alleleCount,
        pop.alleleNumber,
        popSumAF,
        result.penetrance,
        pop.isFounderEffect,
        pop.isLowSampleSize,
        "equals",
      ),
    );
  }

  // Orphanet prevalence section (when data available)
  if (result.orphanetDiseases && result.orphanetDiseases.length > 0) {
    sections.push(formatOrphanetSection(result.orphanetDiseases));
  }

  // Optional variants section
  if (opts?.includeVariants && result.variants && result.variants.length > 0) {
    sections.push("");
    sections.push("Variants:");
    sections.push(
      "  " + ["Variant ID", "Consequence", "AF", "ClinVar", "Hom"].join("\t"),
    );
    for (const v of result.variants) {
      const clinvar = v.clinvarSignificance ?? "N/A";
      const af = v.alleleFrequency.toPrecision(4);
      sections.push(
        "  " +
          [v.variant_id, v.consequence, af, clinvar, String(v.ac_hom)].join(
            "\t",
          ),
      );
    }
  }

  return sections.join("\n");
}
