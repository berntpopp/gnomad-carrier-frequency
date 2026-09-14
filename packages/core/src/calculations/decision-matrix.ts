import {
  calculateHWECarrierFrequency,
  calculateSimplifiedCarrierFrequency,
} from "./carrier-frequency.js";
import { calculateVCR, calculateGCR } from "./homozygote-exclusion.js";
import {
  calculateBayesianPrevalence,
  deriveFallbackGeneticPrevalence,
} from "./prevalence.js";
import { formatCarrierFrequency } from "./formatters.js";

/**
 * Minimal variant allele count and sample size representation for decision matrix evaluation.
 */
export interface DecisionMatrixVariant {
  /** Allele count */
  ac: number;
  /** Allele number (total chromosomes sampled) */
  an: number;
  /** Homozygote count */
  hom: number;
}

/**
 * Configuration options for evaluating the decision matrix.
 */
export interface DecisionMatrixOptions {
  /** Carrier frequency formula ('hwe' or 'simplified') */
  formula?: "hwe" | "simplified";
  /** Whether to apply VCR/GCR homozygote exclusion */
  useHomExclusion?: boolean;
  /** Penetrance fraction in range [0.0, 1.0], default 1.0 */
  penetrance?: number;
  /** Whether default fallback frequency assumption is enabled */
  fallbackEnabled?: boolean;
  /** Default fallback carrier frequency value (e.g. 0.01 = 1%) */
  fallbackCF?: number;
}

/**
 * Result of evaluating the exhaustive 6-case decision matrix.
 */
export interface DecisionMatrixResult {
  /** Case index (1-6) corresponding to Section 2.2.5 of the remediation specification */
  caseIndex: 1 | 2 | 3 | 4 | 5 | 6;
  /** Raw carrier frequency from data (null if missing data or no qualifying variants) */
  rawCarrierFrequency: number | null;
  /** Effective carrier frequency after applying fallback if enabled */
  carrierFrequency: number | null;
  /** Genetic disease prevalence (q^2) */
  geneticPrevalence: number | null;
  /** Penetrance-adjusted disease prevalence (q^2 * penetrance) */
  bayesianPrevalence: number | null;
  /** Recommended user-facing primary display label */
  uiDisplay: string;
  /** Formatted ratio (e.g. "1:25") */
  ratioDisplay: string;
  /** Formatted percentage (e.g. "4.00%") */
  percentDisplay: string;
  /** Diagnostic flags */
  flags: {
    missingData?: boolean;
    noQualifyingVariants?: boolean;
    allExcluded?: boolean;
    observedZero?: boolean;
    variantHomozygoteOnly?: boolean;
    isDefaultFallback: boolean;
  };
}

/**
 * Evaluate the exhaustive, mutually exclusive 6-case decision matrix.
 *
 * Implements Section 2.2.5 (SPEC-05) of the clinical remediation specification:
 * - Case 1: Missing / Unsampled Data (AN = 0)
 * - Case 2: No Pathogenic Candidates (|V_path| = 0 and AN > 0)
 * - Case 3: All Candidates Excluded (|V_path| > 0, |V_inc| = 0, AN > 0)
 * - Case 4: Observed Zero (|V_inc| > 0, AN > 0, AC = 0)
 * - Case 5: Positive Homozygotes-Only Sites (|V_inc| > 0, AN > 0, AC > 0, all AC = 2*Hom)
 * - Case 6: Normal Residual Calculation (|V_inc| > 0, AN > 0, AC > 0, some AC > 2*Hom)
 *
 * @param rawVariants - All raw variants returned by gnomAD (or sample summary)
 * @param pathogenicVariants - Variants passing consequence & ClinVar filters
 * @param includedVariants - Variants passing filters AND not excluded (evaluable)
 * @param options - Calculation and fallback configuration
 * @returns Complete DecisionMatrixResult
 */
export function evaluateDecisionMatrix(
  rawVariants: DecisionMatrixVariant[],
  pathogenicVariants: DecisionMatrixVariant[],
  includedVariants: DecisionMatrixVariant[],
  options: DecisionMatrixOptions = {},
): DecisionMatrixResult {
  const formula = options.formula ?? "hwe";
  const useHomExclusion = options.useHomExclusion ?? true;
  const rawPenetrance = options.penetrance ?? 1.0;
  const penetrance =
    Number.isFinite(rawPenetrance) && rawPenetrance >= 0 && rawPenetrance <= 1
      ? rawPenetrance
      : 1.0;
  const fallbackEnabled = options.fallbackEnabled ?? false;
  const fallbackCF =
    options.fallbackCF !== undefined &&
    Number.isFinite(options.fallbackCF) &&
    options.fallbackCF >= 0 &&
    options.fallbackCF <= 1
      ? options.fallbackCF
      : 0.01;

  const sumAnRaw = rawVariants.reduce((sum, v) => sum + (v.an || 0), 0);
  const sumAnPath = pathogenicVariants.reduce((sum, v) => sum + (v.an || 0), 0);
  const sumAnInc = includedVariants.reduce((sum, v) => sum + (v.an || 0), 0);
  const sumAcInc = includedVariants.reduce((sum, v) => sum + (v.ac || 0), 0);

  // -------------------------------------------------------------------------
  // Case 1: Missing / Unsampled Data
  // Predicate: (|V_inc| > 0 && sum AN_inc == 0) ||
  //            (|V_inc| == 0 && |V_path| > 0 && sum AN_path == 0) ||
  //            (|V_path| == 0 && (|V_raw| == 0 || sum AN_raw == 0))
  // -------------------------------------------------------------------------
  const isCase1 =
    (includedVariants.length > 0 && sumAnInc === 0) ||
    (includedVariants.length === 0 &&
      pathogenicVariants.length > 0 &&
      sumAnPath === 0) ||
    (pathogenicVariants.length === 0 &&
      (rawVariants.length === 0 || sumAnRaw === 0));

  if (isCase1) {
    return {
      caseIndex: 1,
      rawCarrierFrequency: null,
      carrierFrequency: null,
      geneticPrevalence: null,
      bayesianPrevalence: null,
      uiDisplay: "No data",
      ratioDisplay: "Not detected",
      percentDisplay: "Not detected",
      flags: {
        missingData: true,
        isDefaultFallback: false,
      },
    };
  }

  // -------------------------------------------------------------------------
  // Case 2: No Pathogenic Candidates
  // Predicate: |V_path| == 0 && sum AN_raw > 0
  // -------------------------------------------------------------------------
  if (pathogenicVariants.length === 0) {
    if (fallbackEnabled) {
      const genPrev = deriveFallbackGeneticPrevalence(fallbackCF);
      const bayesPrev = calculateBayesianPrevalence(genPrev, penetrance);
      const fmt = formatCarrierFrequency(fallbackCF);
      return {
        caseIndex: 2,
        rawCarrierFrequency: null,
        carrierFrequency: fallbackCF,
        geneticPrevalence: genPrev,
        bayesianPrevalence: bayesPrev,
        uiDisplay: `${fmt.percent} (Default assumption)`,
        ratioDisplay: fmt.ratio,
        percentDisplay: fmt.percent,
        flags: {
          noQualifyingVariants: true,
          isDefaultFallback: true,
        },
      };
    }

    return {
      caseIndex: 2,
      rawCarrierFrequency: null,
      carrierFrequency: null,
      geneticPrevalence: null,
      bayesianPrevalence: null,
      uiDisplay: "Not detected",
      ratioDisplay: "Not detected",
      percentDisplay: "Not detected",
      flags: {
        noQualifyingVariants: true,
        isDefaultFallback: false,
      },
    };
  }

  // -------------------------------------------------------------------------
  // Case 3: All Candidates Excluded
  // Predicate: |V_path| > 0 && |V_inc| == 0 && sum AN_path > 0
  // -------------------------------------------------------------------------
  if (includedVariants.length === 0) {
    if (fallbackEnabled) {
      const genPrev = deriveFallbackGeneticPrevalence(fallbackCF);
      const bayesPrev = calculateBayesianPrevalence(genPrev, penetrance);
      const fmt = formatCarrierFrequency(fallbackCF);
      return {
        caseIndex: 3,
        rawCarrierFrequency: null,
        carrierFrequency: fallbackCF,
        geneticPrevalence: genPrev,
        bayesianPrevalence: bayesPrev,
        uiDisplay: `${fmt.percent} (Default assumption)`,
        ratioDisplay: fmt.ratio,
        percentDisplay: fmt.percent,
        flags: {
          allExcluded: true,
          isDefaultFallback: true,
        },
      };
    }

    return {
      caseIndex: 3,
      rawCarrierFrequency: null,
      carrierFrequency: null,
      geneticPrevalence: null,
      bayesianPrevalence: null,
      uiDisplay: "Not detected",
      ratioDisplay: "Not detected",
      percentDisplay: "Not detected",
      flags: {
        allExcluded: true,
        isDefaultFallback: false,
      },
    };
  }

  // Helper AF calculations for included variants with AN > 0
  const validIncVariants = includedVariants.filter((v) => v.an > 0);
  const afs = validIncVariants.map((v) => v.ac / v.an);
  const sumAf = afs.reduce((sum, af) => sum + af, 0);

  // -------------------------------------------------------------------------
  // Case 4: Observed Zero
  // Predicate: |V_inc| > 0 && sum AN_inc > 0 && sum AC_inc == 0
  // -------------------------------------------------------------------------
  if (sumAcInc === 0) {
    const maxAn = Math.max(...validIncVariants.map((v) => v.an), 0);
    return {
      caseIndex: 4,
      rawCarrierFrequency: 0.0,
      carrierFrequency: 0.0,
      geneticPrevalence: 0.0,
      bayesianPrevalence: 0.0,
      uiDisplay: `0% (0 / ${maxAn.toLocaleString()})`,
      ratioDisplay: "Not detected",
      percentDisplay: "0.00%",
      flags: {
        observedZero: true,
        isDefaultFallback: false,
      },
    };
  }

  // Calculate genetic prevalence from raw sumAF: q^2 = (sum AF)^2
  const geneticPrevalence = sumAf * sumAf;
  const bayesianPrevalence = calculateBayesianPrevalence(
    geneticPrevalence,
    penetrance,
  );

  // -------------------------------------------------------------------------
  // Case 5: Positive Homozygotes-Only Sites
  // Predicate: |V_inc| > 0 && sum AN_inc > 0 && sum AC_inc > 0 &&
  //            all v in V_inc have AC_v == 2 * Hom_v
  // -------------------------------------------------------------------------
  const isHomozygotesOnly = validIncVariants.every(
    (v) => v.ac > 0 && v.ac === 2 * v.hom,
  );

  if (isHomozygotesOnly) {
    if (useHomExclusion) {
      // Under GCR, VCR_i = (AC - 2*Hom) / (AN/2 - Hom) = 0 for all variants, so GCR = 0.
      return {
        caseIndex: 5,
        rawCarrierFrequency: 0.0,
        carrierFrequency: 0.0,
        geneticPrevalence,
        bayesianPrevalence,
        uiDisplay: "0% (Homozygotes only)",
        ratioDisplay: "Not detected",
        percentDisplay: "0.00%",
        flags: {
          variantHomozygoteOnly: true,
          isDefaultFallback: false,
        },
      };
    }

    // If homozygote exclusion is disabled, calculate via active formula
    const cf =
      formula === "hwe"
        ? calculateHWECarrierFrequency(afs)
        : calculateSimplifiedCarrierFrequency(afs);
    const fmt = formatCarrierFrequency(cf);

    return {
      caseIndex: 5,
      rawCarrierFrequency: cf,
      carrierFrequency: cf,
      geneticPrevalence,
      bayesianPrevalence,
      uiDisplay: fmt.percent,
      ratioDisplay: fmt.ratio,
      percentDisplay: fmt.percent,
      flags: {
        variantHomozygoteOnly: true,
        isDefaultFallback: false,
      },
    };
  }

  // -------------------------------------------------------------------------
  // Case 6: Normal Residual Calculation
  // Predicate: |V_inc| > 0 && sum AN_inc > 0 && sum AC_inc > 0 &&
  //            some v in V_inc has AC_v > 2 * Hom_v
  // -------------------------------------------------------------------------
  let cf: number;
  if (useHomExclusion) {
    const vcrs = validIncVariants.map((v) => calculateVCR(v.ac, v.an, v.hom));
    cf = calculateGCR(vcrs);
  } else {
    cf =
      formula === "hwe"
        ? calculateHWECarrierFrequency(afs)
        : calculateSimplifiedCarrierFrequency(afs);
  }

  const fmt = formatCarrierFrequency(cf);

  return {
    caseIndex: 6,
    rawCarrierFrequency: cf,
    carrierFrequency: cf,
    geneticPrevalence,
    bayesianPrevalence,
    uiDisplay: fmt.percent,
    ratioDisplay: fmt.ratio,
    percentDisplay: fmt.percent,
    flags: {
      isDefaultFallback: false,
    },
  };
}
