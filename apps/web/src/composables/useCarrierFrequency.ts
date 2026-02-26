import { computed, ref, watch, type Ref } from "vue";
import { watchDebounced } from "@vueuse/core";
import { useGeneVariants } from "./useGeneVariants";
import { useClinvarSubmissions } from "./useClinvarSubmissions";
import { useExclusionState } from "./useExclusionState";
import {
  filterPathogenicVariantsConfigurable,
  getConflictingVariantIds,
  computeQualityFlags,
  shouldExcludeByQuality,
} from "@gnomad-cf/core/filters";
import {
  aggregatePopulationFrequenciesWithConfig,
  buildPopulationFrequencies,
  calculateVCR,
  calculateGCR,
  calculateHWECarrierFrequency,
  calculateSimplifiedCarrierFrequency,
  calculateGeneticPrevalence,
  calculateBayesianPrevalence,
  formatCarrierFrequency,
  formatPrevalence,
} from "@gnomad-cf/core/calculations";
import { config, type GnomadVersion } from "@gnomad-cf/core/config";
import { useGnomadVersion } from "@/api";
import { useFilterStore } from "@/stores/useFilterStore";
import { useCalcStore } from "@/stores/useCalcStore";
import { useQualityStore } from "@/stores/useQualityStore";
import type { ClinVarSubmission } from "@gnomad-cf/core/queries";
import type {
  CarrierFrequencyResult,
  IndexPatientStatus,
  PopulationFrequency,
  GnomadVariant,
  ClinVarVariant,
  FilterConfig,
  QualityFlag,
  QualityExclusionConfig,
} from "@gnomad-cf/core/types";

// Default fallback from config - NO MAGIC NUMBERS
const { defaultCarrierFrequency } = config.settings;

export interface UseCarrierFrequencyReturn {
  // Input
  geneSymbol: Ref<string | null>;
  setGeneSymbol: (symbol: string | null) => void;

  // Loading/Error
  isLoading: Ref<boolean>;
  hasError: Ref<boolean>;
  errorMessage: Ref<string | null>;

  // Results
  result: Ref<CarrierFrequencyResult | null>;
  globalFrequency: Ref<{ percent: string; ratio: string } | null>;
  populations: Ref<PopulationFrequency[]>;
  qualifyingVariantCount: Ref<number>;
  hasFounderEffect: Ref<boolean>;
  usingDefault: Ref<boolean>;

  // Prevalence (formatted)
  geneticPrevalenceFormatted: Ref<{ ratio: string; percent: string } | null>;
  bayesianPrevalenceFormatted: Ref<{ ratio: string; percent: string } | null>;

  // Raw variant data (for filtering UI)
  variants: Ref<GnomadVariant[]>;
  clinvarVariants: Ref<ClinVarVariant[]>;

  // Filter configuration (reactive)
  filterConfig: Ref<FilterConfig>;
  setFilterConfig: (config: FilterConfig) => void;

  // ClinVar submissions for conflicting classifications
  submissions: Ref<Map<string, ClinVarSubmission[]>>;
  conflictingVariantIds: Ref<string[]>;
  isLoadingSubmissions: Ref<boolean>;
  submissionsProgress: Ref<number>;
  submissionsError: Ref<string | null>;
  retryFailedSubmissions: () => Promise<void>;

  // Version
  currentVersion: Ref<GnomadVersion>;

  // Exclusion state (manual)
  excludedCount: Ref<number>;
  totalPathogenicCount: Ref<number>;

  // Quality flags
  qualityExclusionConfig: Ref<QualityExclusionConfig>;
  setQualityExclusionConfig: (config: QualityExclusionConfig) => void;
  qualityFlagsMap: Ref<Map<string, QualityFlag[]>>;
  qualityExcludedCount: Ref<number>;
  flaggedVariantCount: Ref<number>;

  // Pathogenicity-filtered variants (before manual/quality exclusions)
  // Needed by downstream components for source classification
  filteredByPathogenicity: Ref<GnomadVariant[]>;

  // Recurrence risk
  calculateRisk: (status: IndexPatientStatus) => {
    risk: number;
    percent: string;
    ratio: string;
  } | null;

  // Actions
  refetch: () => Promise<void>;
}

// Singleton instance for shared state across all callers
let instance: UseCarrierFrequencyReturn | null = null;

export function useCarrierFrequency(): UseCarrierFrequencyReturn {
  // Return cached instance if already created (singleton pattern)
  if (instance) return instance;

  const geneSymbol = ref<string | null>(null);
  const { version } = useGnomadVersion();
  const filterStore = useFilterStore();
  const calcStore = useCalcStore();
  const qualityStore = useQualityStore();

  const setGeneSymbol = (symbol: string | null) => {
    geneSymbol.value = symbol?.toUpperCase() ?? null;
  };

  // Reactive filter configuration - initialized from store defaults
  const filterConfig = ref<FilterConfig>({
    lofHcEnabled: filterStore.defaults.lofHcEnabled,
    missenseEnabled: filterStore.defaults.missenseEnabled,
    clinvarEnabled: filterStore.defaults.clinvarEnabled,
    clinvarStarThreshold: filterStore.defaults.clinvarStarThreshold,
    clinvarIncludeConflicting: filterStore.defaults.clinvarIncludeConflicting,
    clinvarConflictingThreshold:
      filterStore.defaults.clinvarConflictingThreshold,
  });

  const setFilterConfig = (config: FilterConfig) => {
    filterConfig.value = { ...config };
  };

  // Per-analysis quality exclusion config — local state, initialized from store defaults
  // Not persisted back to store on every toggle (Pitfall 7 in RESEARCH.md)
  const qualityExclusionConfig = ref<QualityExclusionConfig>({
    ...qualityStore.exclusionDefaults,
  });

  const setQualityExclusionConfig = (config: QualityExclusionConfig) => {
    qualityExclusionConfig.value = { ...config };
  };

  // Get exclusion state (singleton)
  const { excluded, excludedCount } = useExclusionState();

  // Debounced exclusion set for frequency calculation
  // Prevents recalculation on every rapid checkbox toggle
  const debouncedExcluded = ref<Set<string>>(new Set());

  // Watch excluded with debounce
  watchDebounced(
    excluded,
    (newExcluded) => {
      debouncedExcluded.value = new Set(newExcluded);
    },
    { debounce: 500, maxWait: 2000, immediate: true },
  );

  // ClinVar submissions for resolving conflicting classifications
  const {
    submissions,
    isLoading: isLoadingSubmissions,
    error: submissionsError,
    progress: submissionsProgress,
    fetchSubmissions,
    retryFailed,
    clearSubmissions,
  } = useClinvarSubmissions();

  // Fetch variants (uses config for dataset/referenceGenome)
  const {
    variants,
    clinvarVariants,
    isLoading,
    hasError,
    errorMessage,
    refetch,
    hasData,
    currentVersion,
  } = useGeneVariants(geneSymbol);

  // Convert API types to internal types for filtering
  // Types are structurally compatible but use different names
  const normalizedVariants = computed((): GnomadVariant[] => {
    return variants.value.map((v) => ({
      variant_id: v.variant_id,
      pos: v.pos,
      ref: v.ref,
      alt: v.alt,
      exome: v.exome ?? undefined,
      genome: v.genome ?? undefined,
      joint: v.joint ?? undefined,
      transcript_consequence: v.transcript_consequence,
    }));
  });

  const normalizedClinvar = computed((): ClinVarVariant[] => {
    return clinvarVariants.value.map((cv) => ({
      variant_id: cv.variant_id,
      clinvar_variation_id: cv.clinvar_variation_id,
      clinical_significance: cv.clinical_significance,
      gold_stars: cv.gold_stars,
      review_status: cv.review_status,
      pos: cv.pos,
      ref: cv.ref,
      alt: cv.alt,
    }));
  });

  // Identify conflicting variant IDs for submissions fetching
  const conflictingVariantIds = computed(() =>
    getConflictingVariantIds(normalizedClinvar.value),
  );

  // Auto-fetch submissions when conflicting filter is enabled and we have conflicting variants
  watch(
    [() => filterConfig.value.clinvarIncludeConflicting, conflictingVariantIds],
    async ([includeConflicting, ids]) => {
      if (includeConflicting && ids.length > 0) {
        // Only fetch if we don't already have all the submissions
        const missingIds = ids.filter((id) => !submissions.value.has(id));
        if (missingIds.length > 0) {
          await fetchSubmissions(missingIds);
        }
      }
    },
    { immediate: true },
  );

  // Clear submissions and reset quality exclusion config when gene changes
  watch(geneSymbol, () => {
    clearSubmissions();
    qualityExclusionConfig.value = { ...qualityStore.exclusionDefaults };
  });

  // Variants that pass pathogenicity filters (before any manual/quality exclusions)
  // This is the single source for pathogenicity-filtered variants used by all downstream computeds
  const filteredByPathogenicity = computed((): GnomadVariant[] => {
    if (!normalizedVariants.value.length) return [];
    return filterPathogenicVariantsConfigurable(
      normalizedVariants.value,
      normalizedClinvar.value,
      filterConfig.value,
      submissions.value,
    );
  });

  // Compute quality flags for all pathogenicity-filtered variants
  const qualityFlagsMap = computed((): Map<string, QualityFlag[]> => {
    const map = new Map<string, QualityFlag[]>();
    for (const variant of filteredByPathogenicity.value) {
      const flags = computeQualityFlags(variant, qualityStore.defaults);
      if (flags.length > 0) {
        map.set(variant.variant_id, flags);
      }
    }
    return map;
  });

  // Count of flagged variants (QUAL-06: summary count)
  const flaggedVariantCount = computed(() => qualityFlagsMap.value.size);

  // Variant IDs excluded by quality flags based on current exclusion config
  const qualityExcludedIds = computed((): Set<string> => {
    const excluded = new Set<string>();
    for (const [variantId, flags] of qualityFlagsMap.value) {
      if (shouldExcludeByQuality(flags, qualityExclusionConfig.value)) {
        excluded.add(variantId);
      }
    }
    return excluded;
  });

  // Count of quality-excluded variants (tracked separately from manual exclusions — Pitfall 4)
  const qualityExcludedCount = computed(() => qualityExcludedIds.value.size);

  // Total pathogenic count = all variants passing pathogenicity filters (before any exclusions)
  const totalPathogenicCount = computed(() => filteredByPathogenicity.value.length);

  // Filter to pathogenic variants using configurable filters (FILT-01 through FILT-09)
  // Then filter out BOTH manually excluded AND quality-excluded variants (EXCL-04, QUAL-07)
  const pathogenicVariants = computed(() => {
    return filteredByPathogenicity.value.filter(
      (v) =>
        !debouncedExcluded.value.has(v.variant_id) &&
        !qualityExcludedIds.value.has(v.variant_id),
    );
  });

  const qualifyingVariantCount = computed(
    () => pathogenicVariants.value.length,
  );

  // Check if using default (no qualifying variants from filters) - threshold from config
  // Uses totalPathogenicCount (before manual exclusions) so that manually excluding
  // all variants yields zero, not the fallback default frequency.
  const usingDefault = computed(
    () => hasData.value && totalPathogenicCount.value === 0,
  );

  // Aggregate population frequencies using CalcConfig
  // Reactivity: Vue computed automatically tracks calcStore.defaults
  const aggregatedPops = computed(() => {
    if (usingDefault.value) return null;
    if (!pathogenicVariants.value.length) return null;
    return aggregatePopulationFrequenciesWithConfig(
      pathogenicVariants.value,
      version.value,
      calcStore.defaults,
    );
  });

  // Calculate global statistics: carrier frequency, total AC, representative AN, and prevalence.
  //
  // Always compute:
  //   sumAF = sum of per-variant combined allele frequencies
  //   geneticPrevalence = q^2 where q = sumAF (NEVER from carrier frequency)
  //   bayesianPrevalence = geneticPrevalence * penetrance
  //
  // Carrier frequency formula chosen by CalcConfig:
  //   useHomExclusion=true:  VCR per variant then GCR aggregation
  //   useHomExclusion=false + useHWEFormula=true:  2pq (HWE)
  //   useHomExclusion=false + useHWEFormula=false: 2 * sumAF (simplified)
  //
  const globalStats = computed(
    (): {
      carrierFrequency: number | null;
      totalAC: number;
      maxAN: number;
      geneticPrevalence: number | null;
      bayesianPrevalence: number | null;
      formula: "hwe" | "simplified";
      homExclusionActive: boolean;
    } => {
      const defaultResult = {
        carrierFrequency: null as number | null,
        totalAC: 0,
        maxAN: 0,
        geneticPrevalence: null as number | null,
        bayesianPrevalence: null as number | null,
        formula: calcStore.defaults.useHWEFormula
          ? "hwe"
          : ("simplified" as "hwe" | "simplified"),
        homExclusionActive: calcStore.defaults.useHomExclusion,
      };

      if (usingDefault.value) {
        return { ...defaultResult, carrierFrequency: defaultCarrierFrequency };
      }
      if (!pathogenicVariants.value.length) {
        return defaultResult;
      }

      // Sum allele frequencies across all pathogenic variants
      // Prefer joint data (gnomAD v4) when available, fall back to exome+genome
      let sumAF = 0;
      let totalAC = 0;
      let maxAN = 0;

      for (const variant of pathogenicVariants.value) {
        let combinedAC: number;
        let combinedAN: number;

        if (variant.joint) {
          // Prefer joint data — properly combines exome+genome using coverage
          combinedAC = variant.joint.ac;
          combinedAN = variant.joint.an;
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
          combinedAC = exomeAC + genomeAC;
          combinedAN = exomeAN + genomeAN;
        }

        totalAC += combinedAC;
        maxAN = Math.max(maxAN, combinedAN);

        if (combinedAN > 0) {
          sumAF += combinedAC / combinedAN;
        }
      }

      // Genetic prevalence always from raw q = sumAF (never from carrier frequency)
      const geneticPrevalence =
        sumAF > 0 ? calculateGeneticPrevalence([sumAF]) : null;
      const bayesianPrevalence =
        geneticPrevalence !== null
          ? calculateBayesianPrevalence(
              geneticPrevalence,
              calcStore.defaults.penetrance,
            )
          : null;

      let carrierFrequency: number | null = null;
      const homExclusionActive = calcStore.defaults.useHomExclusion;
      let formula: "hwe" | "simplified" = calcStore.defaults.useHWEFormula
        ? "hwe"
        : "simplified";

      if (sumAF > 0) {
        if (homExclusionActive) {
          // VCR/GCR path — compute VCR for each variant then aggregate via GCR
          const vcrs: number[] = [];
          for (const variant of pathogenicVariants.value) {
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

            if (combinedAN > 0) {
              vcrs.push(calculateVCR(combinedAC, combinedAN, combinedAcHom));
            }
          }
          const gcr = calculateGCR(vcrs);
          carrierFrequency = gcr > 0 ? gcr : null;
          // formula label: when hom exclusion is ON, we report based on HWE toggle setting
          // but the actual calculation used VCR/GCR (which is more accurate)
          formula = calcStore.defaults.useHWEFormula ? "hwe" : "simplified";
        } else if (calcStore.defaults.useHWEFormula) {
          // HWE 2pq formula
          const cf = calculateHWECarrierFrequency([sumAF]);
          carrierFrequency = cf > 0 ? cf : null;
          formula = "hwe";
        } else {
          // Simplified 2 * sumAF
          const cf = calculateSimplifiedCarrierFrequency([sumAF]);
          carrierFrequency = cf > 0 ? cf : null;
          formula = "simplified";
        }
      }

      return {
        carrierFrequency,
        totalAC,
        maxAN,
        geneticPrevalence,
        bayesianPrevalence,
        formula,
        homExclusionActive,
      };
    },
  );

  // Expose individual computed values for convenience
  const globalCarrierFrequency = computed(
    () => globalStats.value.carrierFrequency,
  );

  // Build population frequency array (uses config for labels/thresholds)
  // aggregatedPops already has pre-computed carrierFrequency via CalcConfig
  const populations = computed((): PopulationFrequency[] => {
    if (!aggregatedPops.value || globalCarrierFrequency.value === null)
      return [];
    return buildPopulationFrequencies(
      aggregatedPops.value,
      globalCarrierFrequency.value,
      version.value,
    );
  });

  // Check for founder effect (any population >5x global - threshold from config)
  const hasFounderEffect = computed(() =>
    populations.value.some((p) => p.isFounderEffect),
  );

  // Format global frequency
  const globalFrequency = computed(() => {
    if (globalCarrierFrequency.value === null) return null;
    return formatCarrierFrequency(globalCarrierFrequency.value);
  });

  // Format prevalence values for display
  const geneticPrevalenceFormatted = computed(() => {
    const gp = globalStats.value.geneticPrevalence;
    if (gp === null) return null;
    return formatPrevalence(gp);
  });

  const bayesianPrevalenceFormatted = computed(() => {
    const bp = globalStats.value.bayesianPrevalence;
    if (bp === null) return null;
    return formatPrevalence(bp);
  });

  // Build full result object
  // Result is non-null whenever we have a gene and fetched data, even if all
  // variants were manually excluded (carrier frequency will be 0 in that case).
  // This keeps the summary card, population table, and variant table accessible.
  const result = computed((): CarrierFrequencyResult | null => {
    if (!geneSymbol.value || !hasData.value) return null;

    const freqs = populations.value
      .map((p) => p.carrierFrequency)
      .filter((f): f is number => f !== null);

    return {
      gene: geneSymbol.value,
      version: version.value,
      globalCarrierFrequency: globalCarrierFrequency.value,
      globalAlleleCount: globalStats.value.totalAC,
      globalAlleleNumber: globalStats.value.maxAN,
      populations: populations.value,
      qualifyingVariantCount: qualifyingVariantCount.value,
      minFrequency: freqs.length ? Math.min(...freqs) : null,
      maxFrequency: freqs.length ? Math.max(...freqs) : null,
      hasFounderEffect: hasFounderEffect.value,
      geneticPrevalence: globalStats.value.geneticPrevalence,
      bayesianPrevalence: globalStats.value.bayesianPrevalence,
      formula: globalStats.value.formula,
      homExclusionActive: globalStats.value.homExclusionActive,
    };
  });

  // Recurrence risk calculation (CALC-02, CALC-03)
  const calculateRisk = (status: IndexPatientStatus) => {
    if (globalCarrierFrequency.value === null) return null;
    // CALC-02: Heterozygous carrier: carrier_freq / 4
    // CALC-03: Compound het/homozygous: carrier_freq / 2
    const divisor = status === "heterozygous" ? 4 : 2;
    const risk = globalCarrierFrequency.value / divisor;
    return {
      risk,
      percent: `${(risk * 100).toFixed(2)}%`,
      ratio: risk > 0 ? `1:${Math.round(1 / risk)}` : "N/A",
    };
  };

  // Cache and return the singleton instance
  instance = {
    geneSymbol,
    setGeneSymbol,
    isLoading,
    hasError,
    errorMessage,
    result,
    globalFrequency,
    populations,
    qualifyingVariantCount,
    hasFounderEffect,
    usingDefault,
    geneticPrevalenceFormatted,
    bayesianPrevalenceFormatted,
    variants: normalizedVariants,
    clinvarVariants: normalizedClinvar,
    filterConfig,
    setFilterConfig,
    submissions,
    conflictingVariantIds,
    isLoadingSubmissions,
    submissionsProgress,
    submissionsError,
    retryFailedSubmissions: retryFailed,
    currentVersion,
    excludedCount,
    totalPathogenicCount,
    qualityExclusionConfig,
    setQualityExclusionConfig,
    qualityFlagsMap,
    qualityExcludedCount,
    flaggedVariantCount,
    filteredByPathogenicity,
    calculateRisk,
    refetch,
  };

  return instance;
}
