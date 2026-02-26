// Quality flag pure functions for variant quality transparency
// QUAL-01 through QUAL-04 and QUAL-08 explanation strings

import type { GnomadVariant } from "../types/index.js";
import type {
  QualityFlag,
  QualityFlagType,
  QualitySettings,
  QualityExclusionConfig,
} from "../types/index.js";

/**
 * Check if a variant exceeds the high allele frequency threshold (ACMG BA1).
 * Checks both global AF AND per-population AF — if ANY population exceeds the
 * threshold, the variant is flagged (Pitfall 3 in RESEARCH.md).
 *
 * Uses joint-first data pattern (gnomAD v4), falling back to exome + genome sum.
 */
export function isHighAF(variant: GnomadVariant, threshold: number): boolean {
  // Compute global AF using joint-first pattern
  const ac =
    variant.joint?.ac ??
    (variant.exome?.ac ?? 0) + (variant.genome?.ac ?? 0);
  const an =
    variant.joint?.an ??
    (variant.exome?.an ?? 0) + (variant.genome?.an ?? 0);

  if (an > 0) {
    const globalAF = ac / an;
    if (globalAF >= threshold) return true;
  }

  // Per-population check: flag if ANY population AF >= threshold
  // Prefer joint populations, fall back to exome + genome
  const populations =
    variant.joint?.populations ??
    (variant.exome?.populations ?? variant.genome?.populations ?? []);

  for (const pop of populations) {
    if (pop.an > 0) {
      const popAF = pop.ac / pop.an;
      if (popAF >= threshold) return true;
    }
  }

  return false;
}

/**
 * Check if a variant has an anomalously high homozygote count.
 * Supports two methods:
 * - 'hwe_relative': flag if observed hom > multiplier × HWE-expected hom
 * - 'absolute': flag if observed hom >= absolute threshold
 *
 * Uses joint-first data pattern to ensure AC, AN, and hom count are from same source.
 */
export function isHighHom(
  variant: GnomadVariant,
  settings: QualitySettings,
): boolean {
  const ac =
    variant.joint?.ac ??
    (variant.exome?.ac ?? 0) + (variant.genome?.ac ?? 0);
  const an =
    variant.joint?.an ??
    (variant.exome?.an ?? 0) + (variant.genome?.an ?? 0);
  const acHom =
    variant.joint?.homozygote_count ??
    (variant.exome?.ac_hom ?? 0) + (variant.genome?.ac_hom ?? 0);

  if (settings.highHomMethod === "absolute") {
    return acHom >= settings.highHomAbsoluteThreshold;
  }

  // hwe_relative method
  if (an === 0) return false;
  const af = ac / an;
  const expectedHom = af * af * an;
  return acHom > expectedHom * settings.highHomHWEMultiplier;
}

/**
 * Check if a variant failed gnomAD QC filters.
 * gnomAD encodes passing variants as filters=[] or filters=["PASS"].
 * Variants with specific filter names (RF, AC0, InbreedingCoeff, etc.) failed QC.
 */
export function isGnomadFiltered(variant: GnomadVariant): boolean {
  const isFailedFilters = (filters: string[] | undefined): boolean => {
    if (filters === undefined || filters === null) return false;
    if (filters.length === 0) return false;
    return !filters.every((f) => f === "PASS");
  };

  return (
    isFailedFilters(variant.exome?.filters) ||
    isFailedFilters(variant.genome?.filters)
  );
}

/**
 * Check if a variant is only present in genome sequencing data (no exome data).
 * Genome-only variants have lower sample sizes and different coverage profiles.
 *
 * Note: if variant has joint data, it means both exome and genome contributed —
 * so NOT genomes-only. Only flag if no joint AND no exome.
 */
export function isGenomesOnly(variant: GnomadVariant): boolean {
  // If joint data is present, exome data contributed — not genomes-only
  if (variant.joint !== undefined && variant.joint !== null) return false;

  const hasExome =
    variant.exome !== undefined &&
    variant.exome !== null &&
    variant.exome.an > 0;
  const hasGenome =
    variant.genome !== undefined &&
    variant.genome !== null &&
    variant.genome.an > 0;

  return !hasExome && hasGenome;
}

/**
 * Compute all quality flags for a variant given the current quality settings.
 * Returns an array of QualityFlag objects with dynamic, user-meaningful explanations.
 *
 * Implements QUAL-01 (High AF), QUAL-02 (High Hom), QUAL-03 (gnomAD Filtered),
 * QUAL-04 (Genomes Only), and QUAL-08 (explanation strings with dynamic values).
 */
export function computeQualityFlags(
  variant: GnomadVariant,
  settings: QualitySettings,
): QualityFlag[] {
  const flags: QualityFlag[] = [];

  // Compute joint-first aggregate values for use in explanations
  const ac =
    variant.joint?.ac ??
    (variant.exome?.ac ?? 0) + (variant.genome?.ac ?? 0);
  const an =
    variant.joint?.an ??
    (variant.exome?.an ?? 0) + (variant.genome?.an ?? 0);
  const acHom =
    variant.joint?.homozygote_count ??
    (variant.exome?.ac_hom ?? 0) + (variant.genome?.ac_hom ?? 0);

  const globalAF = an > 0 ? ac / an : 0;

  // QUAL-01: High AF (ACMG BA1)
  if (settings.highAfEnabled && isHighAF(variant, settings.highAfThreshold)) {
    flags.push({
      type: "high_af",
      label: "High AF (BA1)",
      explanation: `Allele frequency (${(globalAF * 100).toFixed(2)}%) exceeds the ${(settings.highAfThreshold * 100).toFixed(0)}% threshold (ACMG BA1). Variants this common are unlikely to cause rare recessive disease.`,
      severity: "critical",
    });
  }

  // QUAL-02: High Homozygote Count
  if (settings.highHomEnabled && isHighHom(variant, settings)) {
    let explanation: string;

    if (settings.highHomMethod === "absolute") {
      explanation = `Observed ${acHom} homozygotes exceeds the absolute threshold of ${settings.highHomAbsoluteThreshold}. High homozygote count may indicate the variant is too common for a rare disease.`;
    } else {
      const expectedHom = an > 0 ? globalAF * globalAF * an : 0;
      explanation = `Observed ${acHom} homozygotes vs ${expectedHom.toFixed(1)} expected by Hardy-Weinberg (${settings.highHomHWEMultiplier}x threshold). Excess homozygosity may indicate population structure or genotyping artifact.`;
    }

    flags.push({
      type: "high_hom",
      label: "High Hom",
      explanation,
      severity: "warning",
    });
  }

  // QUAL-03: gnomAD QC Filtered
  if (settings.gnomadFilteredEnabled && isGnomadFiltered(variant)) {
    // Collect the actual failing filter names for the explanation
    const filterNames: string[] = [];
    const collectFailingFilters = (filters: string[] | undefined): void => {
      if (filters && filters.length > 0 && !filters.every((f) => f === "PASS")) {
        for (const f of filters) {
          if (f !== "PASS" && !filterNames.includes(f)) {
            filterNames.push(f);
          }
        }
      }
    };
    collectFailingFilters(variant.exome?.filters);
    collectFailingFilters(variant.genome?.filters);

    flags.push({
      type: "gnomad_filtered",
      label: "QC Filtered",
      explanation: `This variant failed gnomAD quality control filters (${filterNames.join(", ")}). Frequency estimates may be less reliable.`,
      severity: "warning",
    });
  }

  // QUAL-04: Genomes Only
  if (settings.genomesOnlyEnabled && isGenomesOnly(variant)) {
    flags.push({
      type: "genomes_only",
      label: "Genomes Only",
      explanation:
        "This variant was observed only in genome sequencing data (no exome coverage). Frequency estimates are based on a smaller sample size and may be less precise.",
      severity: "info",
    });
  }

  return flags;
}

/**
 * Determine if a variant should be excluded from carrier frequency calculation
 * based on its quality flags and the active exclusion configuration.
 */
export function shouldExcludeByQuality(
  flags: QualityFlag[],
  exclusionConfig: QualityExclusionConfig,
): boolean {
  for (const flag of flags) {
    if (flag.type === "high_af" && exclusionConfig.excludeHighAf) return true;
    if (flag.type === "high_hom" && exclusionConfig.excludeHighHom) return true;
    if (
      flag.type === "gnomad_filtered" &&
      exclusionConfig.excludeGnomadFiltered
    )
      return true;
    if (flag.type === "genomes_only" && exclusionConfig.excludeGenomesOnly)
      return true;
  }
  return false;
}

/**
 * Map flag severity to a Vuetify color name.
 * - critical → 'error' (red)
 * - warning → 'warning' (orange)
 * - info → 'blue-grey'
 */
export function flagSeverityColor(
  severity: "critical" | "warning" | "info",
): string {
  switch (severity) {
    case "critical":
      return "error";
    case "warning":
      return "warning";
    case "info":
      return "blue-grey";
    default:
      return "warning";
  }
}

/**
 * Map flag type directly to a Vuetify color name for per-type coloring.
 * high_af → 'error' (red), high_hom → 'orange', gnomad_filtered → 'amber', genomes_only → 'blue-grey'
 */
export function flagTypeColor(type: QualityFlagType): string {
  switch (type) {
    case "high_af":
      return "error";
    case "high_hom":
      return "orange";
    case "gnomad_filtered":
      return "amber";
    case "genomes_only":
      return "blue-grey";
    default:
      return "warning";
  }
}
