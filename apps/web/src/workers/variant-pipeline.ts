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
  evaluateDecisionMatrix,
} from "@gnomad-cf/core/calculations";
import type { DecisionMatrixVariant } from "@gnomad-cf/core/calculations";

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
  const globalStats = computeGlobalStats(
    variants,
    filteredByPathogenicity,
    qualifyingVariants,
    calcConfig,
  );

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
// Helper: Map GnomadVariant to DecisionMatrixVariant
// ---------------------------------------------------------------------------

function toDecisionMatrixVariant(v: GnomadVariant): DecisionMatrixVariant {
  if (v.joint) {
    return {
      ac: v.joint.ac,
      an: v.joint.an,
      hom: v.joint.homozygote_count,
    };
  }
  const exomeAC = v.exome?.ac ?? 0;
  const genomeAC = v.genome?.ac ?? 0;
  const exomeAN = v.exome?.an ?? 0;
  const genomeAN = v.genome?.an ?? 0;
  const exomeAcHom = v.exome?.ac_hom ?? 0;
  const genomeAcHom = v.genome?.ac_hom ?? 0;

  return {
    ac: exomeAC + genomeAC,
    an: exomeAN + genomeAN,
    hom: exomeAcHom + genomeAcHom,
  };
}

// ---------------------------------------------------------------------------
// Global stats computation (mirrors useCarrierFrequency globalStats computed)
// ---------------------------------------------------------------------------

/**
 * Compute global carrier frequency, prevalence, and related statistics from
 * the set of variants using the clinical 6-case decision matrix.
 *
 * @param rawVariants - Total variants returned from gnomAD
 * @param pathogenicVariants - Variants passing pathogenicity criteria
 * @param qualifyingVariants - Variants after all exclusions (used for frequency calc)
 * @param calcConfig - Calculation configuration
 */
function computeGlobalStats(
  rawVariants: GnomadVariant[],
  pathogenicVariants: GnomadVariant[],
  qualifyingVariants: GnomadVariant[],
  calcConfig: CalcConfig,
): WorkerGlobalStats {
  const defaultFormula: "hwe" | "simplified" = calcConfig.useHWEFormula
    ? "hwe"
    : "simplified";

  const rawDmVars = rawVariants.map(toDecisionMatrixVariant);
  const pathDmVars = pathogenicVariants.map(toDecisionMatrixVariant);
  const qualDmVars = qualifyingVariants.map(toDecisionMatrixVariant);

  const decisionMatrix = evaluateDecisionMatrix(
    rawDmVars,
    pathDmVars,
    qualDmVars,
    {
      formula: defaultFormula,
      useHomExclusion: calcConfig.useHomExclusion,
      penetrance: calcConfig.penetrance,
    },
  );

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
      const exomeAC = variant.exome?.ac ?? 0;
      const genomeAC = variant.genome?.ac ?? 0;
      const exomeAN = variant.exome?.an ?? 0;
      const genomeAN = variant.genome?.an ?? 0;
      const exomeAcHom = variant.exome?.ac_hom ?? 0;
      const genomeAcHom = variant.genome?.ac_hom ?? 0;

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

  return {
    carrierFrequency: decisionMatrix.carrierFrequency,
    totalAC,
    maxAN,
    sumAF,
    vcrs,
    geneticPrevalence: decisionMatrix.geneticPrevalence,
    bayesianPrevalence: decisionMatrix.bayesianPrevalence,
    formula: defaultFormula,
    homExclusionActive: calcConfig.useHomExclusion,
    decisionMatrix,
  };
}
