/**
 * Pure-function variant processing pipeline.
 *
 * Runs the full filtering / aggregation / stats pipeline without any Vue
 * reactivity or Pinia stores.  Designed to be called inside a web worker
 * (or in tests) so every input comes in and every output goes out as plain
 * serialisable data.
 */

import {
  filterPathogenicVariantsConfigurable,
  classifyVariantSource,
  computeQualityFlags,
  shouldExcludeByQuality,
} from "@gnomad-cf/core/filters";

import {
  aggregatePopulationFrequenciesWithConfig,
  calculateVCR,
  calculateGCR,
  calculateHWECarrierFrequency,
  calculateSimplifiedCarrierFrequency,
  calculateGeneticPrevalence,
  calculateBayesianPrevalence,
} from "@gnomad-cf/core/calculations";

import type {
  GnomadVariant,
  ClinVarVariant,
  FilterConfig,
  QualitySettings,
  QualityExclusionConfig,
  CalcConfig,
  QualityFlag,
} from "@gnomad-cf/core/types";

import type { GnomadVersion } from "@gnomad-cf/core/config";

import type { SourceCategory } from "@gnomad-cf/core/filters";
import type { ClinVarSubmission } from "@gnomad-cf/core/queries";

import type { WorkerGlobalStats, AggregatedPopEntry } from "./types";

// ---------------------------------------------------------------------------
// Public input / output types
// ---------------------------------------------------------------------------

export interface ProcessVariantsInput {
  variants: GnomadVariant[];
  clinvarVariants: ClinVarVariant[];
  filterConfig: FilterConfig;
  qualitySettings: QualitySettings;
  qualityExclusionConfig: QualityExclusionConfig;
  calcConfig: CalcConfig;
  excludedIds: string[];
  submissions: [string, ClinVarSubmission[]][];
  version: GnomadVersion;
}

/**
 * ProcessVariantsOutput mirrors WorkerResult but without cacheStatus and
 * requestId — those are added by the worker wrapper layer.
 */
export interface ProcessVariantsOutput {
  filteredByPathogenicity: GnomadVariant[];
  qualifyingVariants: GnomadVariant[];
  clinvarVariants: ClinVarVariant[];
  qualityFlagsMap: [string, QualityFlag[]][];
  qualityExcludedIds: string[];
  sourceCategoryMap: [string, SourceCategory][];
  aggregatedPops: AggregatedPopEntry[] | null;
  globalStats: WorkerGlobalStats;
  totalVariantCount: number;
}

// ---------------------------------------------------------------------------
// Main pipeline
// ---------------------------------------------------------------------------

/**
 * Run the complete variant-processing pipeline as pure functions.
 *
 * Steps:
 *   1. Pathogenicity filter (LoF HC + ClinVar P/LP, configurable)
 *   2. Quality flags + quality exclusions
 *   3. Manual exclusions → qualifyingVariants
 *   4. Source classification per variant
 *   5. Population frequency aggregation
 *   6. Global stats (carrier frequency, prevalence)
 */
export function processVariants(
  input: ProcessVariantsInput,
): ProcessVariantsOutput {
  const {
    variants,
    clinvarVariants,
    filterConfig,
    qualitySettings,
    qualityExclusionConfig,
    calcConfig,
    excludedIds,
    submissions,
    version,
  } = input;

  const totalVariantCount = variants.length;

  // Build submissions map for configurable filter (conflicting ClinVar logic)
  const submissionsMap = new Map<string, ClinVarSubmission[]>(submissions);

  // ---- 1. Pathogenicity filter ------------------------------------------------
  const filteredByPathogenicity = filterPathogenicVariantsConfigurable(
    variants,
    clinvarVariants,
    filterConfig,
    submissionsMap,
  );

  // ---- 2. Quality flags -------------------------------------------------------
  const qualityFlagsMapRaw = new Map<string, QualityFlag[]>();
  const qualityExcludedSet = new Set<string>();

  for (const variant of filteredByPathogenicity) {
    const flags = computeQualityFlags(variant, qualitySettings);
    if (flags.length > 0) {
      qualityFlagsMapRaw.set(variant.variant_id, flags);
      if (shouldExcludeByQuality(flags, qualityExclusionConfig)) {
        qualityExcludedSet.add(variant.variant_id);
      }
    }
  }

  const qualityFlagsMap: [string, QualityFlag[]][] = Array.from(
    qualityFlagsMapRaw.entries(),
  );
  const qualityExcludedIds: string[] = Array.from(qualityExcludedSet);

  // ---- 3. Manual exclusions → qualifying variants ----------------------------
  const excludedIdSet = new Set(excludedIds);

  const qualifyingVariants = filteredByPathogenicity.filter(
    (v) =>
      !excludedIdSet.has(v.variant_id) && !qualityExcludedSet.has(v.variant_id),
  );

  // ---- 4. Source classification -----------------------------------------------
  const sourceCategoryMap: [string, SourceCategory][] =
    filteredByPathogenicity.map((v) => [
      v.variant_id,
      classifyVariantSource(v, clinvarVariants, filterConfig, submissionsMap),
    ]);

  // ---- 5. Population frequency aggregation ------------------------------------
  // Uses qualifyingVariants (after all exclusions) for population stats
  let aggregatedPops: AggregatedPopEntry[] | null = null;

  if (qualifyingVariants.length > 0) {
    const aggMap = aggregatePopulationFrequenciesWithConfig(
      qualifyingVariants,
      version,
      calcConfig,
    );
    aggregatedPops = Array.from(aggMap.entries()).map(([code, data]) => ({
      code,
      ...data,
    }));
  }

  // ---- 6. Global stats --------------------------------------------------------
  const globalStats = computeGlobalStats(qualifyingVariants, calcConfig);

  return {
    filteredByPathogenicity,
    qualifyingVariants,
    clinvarVariants,
    qualityFlagsMap,
    qualityExcludedIds,
    sourceCategoryMap,
    aggregatedPops,
    globalStats,
    totalVariantCount,
  };
}

// ---------------------------------------------------------------------------
// Global stats computation (mirrors useCarrierFrequency globalStats computed)
// ---------------------------------------------------------------------------

/**
 * Compute global carrier frequency, prevalence, and related statistics from
 * the set of qualifying variants.
 *
 * @param qualifyingVariants - Variants after all exclusions (used for frequency calc)
 * @param calcConfig - Calculation configuration
 */
function computeGlobalStats(
  qualifyingVariants: GnomadVariant[],
  calcConfig: CalcConfig,
): WorkerGlobalStats {
  const defaultFormula: "hwe" | "simplified" = calcConfig.useHWEFormula
    ? "hwe"
    : "simplified";

  const emptyResult: WorkerGlobalStats = {
    carrierFrequency: null,
    totalAC: 0,
    maxAN: 0,
    sumAF: 0,
    vcrs: [],
    geneticPrevalence: null,
    bayesianPrevalence: null,
    formula: defaultFormula,
    homExclusionActive: calcConfig.useHomExclusion,
  };

  if (qualifyingVariants.length === 0) {
    return emptyResult;
  }

  // Aggregate AC, AN, sumAF across qualifying variants
  // Prefer joint data (gnomAD v4); fall back to exome + genome sum
  let sumAF = 0;
  let totalAC = 0;
  let maxAN = 0;
  const vcrs: number[] = [];

  for (const variant of qualifyingVariants) {
    let combinedAC: number;
    let combinedAN: number;
    let combinedAcHom: number;

    if (variant.joint) {
      combinedAC = variant.joint.ac;
      combinedAN = variant.joint.an;
      combinedAcHom = variant.joint.homozygote_count;
    } else {
      const exomeAC =
        variant.exome !== null && variant.exome !== undefined
          ? variant.exome.ac
          : 0;
      const genomeAC =
        variant.genome !== null && variant.genome !== undefined
          ? variant.genome.ac
          : 0;
      const exomeAN =
        variant.exome !== null && variant.exome !== undefined
          ? variant.exome.an
          : 0;
      const genomeAN =
        variant.genome !== null && variant.genome !== undefined
          ? variant.genome.an
          : 0;
      const exomeAcHom =
        variant.exome !== null && variant.exome !== undefined
          ? variant.exome.ac_hom
          : 0;
      const genomeAcHom =
        variant.genome !== null && variant.genome !== undefined
          ? variant.genome.ac_hom
          : 0;

      combinedAC = exomeAC + genomeAC;
      combinedAN = exomeAN + genomeAN;
      combinedAcHom = exomeAcHom + genomeAcHom;
    }

    totalAC += combinedAC;
    maxAN = Math.max(maxAN, combinedAN);

    if (combinedAN > 0) {
      sumAF += combinedAC / combinedAN;

      if (calcConfig.useHomExclusion) {
        vcrs.push(calculateVCR(combinedAC, combinedAN, combinedAcHom));
      }
    }
  }

  // Prevalence always from raw q = sumAF (never from carrier frequency)
  const geneticPrevalence =
    sumAF > 0 ? calculateGeneticPrevalence([sumAF]) : null;
  const bayesianPrevalence =
    geneticPrevalence !== null
      ? calculateBayesianPrevalence(geneticPrevalence, calcConfig.penetrance)
      : null;

  // Carrier frequency formula selection
  let carrierFrequency: number | null = null;
  let formula: "hwe" | "simplified" = defaultFormula;

  if (sumAF > 0) {
    if (calcConfig.useHomExclusion) {
      // VCR/GCR path
      const gcr = calculateGCR(vcrs);
      carrierFrequency = gcr > 0 ? gcr : null;
      // formula label follows HWE toggle setting (actual math uses VCR/GCR)
      formula = calcConfig.useHWEFormula ? "hwe" : "simplified";
    } else if (calcConfig.useHWEFormula) {
      const cf = calculateHWECarrierFrequency([sumAF]);
      carrierFrequency = cf > 0 ? cf : null;
      formula = "hwe";
    } else {
      const cf = calculateSimplifiedCarrierFrequency([sumAF]);
      carrierFrequency = cf > 0 ? cf : null;
      formula = "simplified";
    }
  }

  return {
    carrierFrequency,
    totalAC,
    maxAN,
    sumAF,
    vcrs,
    geneticPrevalence,
    bayesianPrevalence,
    formula,
    homExclusionActive: calcConfig.useHomExclusion,
  };
}
