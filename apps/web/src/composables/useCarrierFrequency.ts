import { computed, ref, shallowRef, watch, type Ref } from "vue";
import { watchDebounced } from "@vueuse/core";
import { useClinvarSubmissions } from "./useClinvarSubmissions";
import { useExclusionState } from "./useExclusionState";
import { useLogger } from "./useLogger";
import { getConflictingVariantIds } from "@gnomad-cf/core/filters";
import type { SourceCategory } from "@gnomad-cf/core/filters";
import {
  buildPopulationFrequencies,
  formatCarrierFrequency,
  formatPrevalence,
} from "@gnomad-cf/core/calculations";
import {
  config,
  getDatasetId,
  getReferenceGenome,
  getApiEndpoint,
  type GnomadVersion,
} from "@gnomad-cf/core/config";
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
import {
  processGene,
  refilter,
  clearCache,
  getCacheSize,
} from "@/workers/variant-worker-api";
import type { WorkerResult, AggregatedPopEntry } from "@/workers/types";

// Default fallback from config - NO MAGIC NUMBERS
const { defaultCarrierFrequency } = config.settings;

// Module-level request ID counter for stale-result detection
let latestRequestId = 0;

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

  // Qualifying variants (after manual + quality exclusions)
  // Used by source breakdown to match parent population frequencies
  qualifyingVariants: Ref<GnomadVariant[]>;

  // Recurrence risk
  calculateRisk: (status: IndexPatientStatus) => {
    risk: number;
    percent: string;
    ratio: string;
  } | null;

  // Actions
  refetch: () => Promise<void>;

  // New worker-specific properties
  processingStatus: Ref<string | null>;
  cacheStatus: Ref<WorkerResult["cacheStatus"] | null>;
  sourceCategoryMap: Ref<Map<string, SourceCategory>>;
  clearVariantCache: (geneSymbol?: string) => Promise<void>;
  getVariantCacheSize: () => Promise<number>;
}

// Singleton instance for shared state across all callers
let instance: UseCarrierFrequencyReturn | null = null;

export function useCarrierFrequency(): UseCarrierFrequencyReturn {
  // Return cached instance if already created (singleton pattern)
  if (instance) return instance;

  const logger = useLogger("carrier-frequency");
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

  // Worker result state (shallowRef for large arrays)
  const filteredByPathogenicity = shallowRef<GnomadVariant[]>([]);
  const qualifyingVariants = shallowRef<GnomadVariant[]>([]);
  const clinvarVariantsRef = shallowRef<ClinVarVariant[]>([]);
  const qualityFlagsMap = shallowRef<Map<string, QualityFlag[]>>(new Map());
  const qualityExcludedIds = shallowRef<Set<string>>(new Set());
  const sourceCategoryMap = shallowRef<Map<string, SourceCategory>>(new Map());
  const aggregatedPops = shallowRef<AggregatedPopEntry[] | null>(null);
  const workerGlobalStats = shallowRef<WorkerResult["globalStats"] | null>(
    null,
  );

  // Loading/error state
  const isLoading = ref(false);
  const hasError = ref(false);
  const errorMessage = ref<string | null>(null);
  const hasData = ref(false);
  const processingStatus = ref<string | null>(null);
  const cacheStatus = ref<WorkerResult["cacheStatus"] | null>(null);

  // currentVersion alias
  const currentVersion = version;

  // Apply worker result, guarded by requestId stale check
  function applyResult(result: WorkerResult): void {
    if (result.requestId !== latestRequestId) return;

    filteredByPathogenicity.value = result.filteredByPathogenicity;
    qualifyingVariants.value = result.qualifyingVariants;
    clinvarVariantsRef.value = result.clinvarVariants;
    qualityFlagsMap.value = new Map(result.qualityFlagsMap);
    qualityExcludedIds.value = new Set(result.qualityExcludedIds);
    sourceCategoryMap.value = new Map(result.sourceCategoryMap);
    aggregatedPops.value = result.aggregatedPops;
    workerGlobalStats.value = result.globalStats;
    cacheStatus.value = result.cacheStatus;

    hasData.value = true;
    isLoading.value = false;
    processingStatus.value = null;
  }

  async function dispatchProcessGene(forceRefresh = false): Promise<void> {
    const gene = geneSymbol.value;
    if (!gene) return;

    latestRequestId++;
    const requestId = latestRequestId;

    isLoading.value = true;
    hasError.value = false;
    errorMessage.value = null;
    processingStatus.value = `Fetching variants for ${gene}...`;

    try {
      // Spread reactive objects into plain objects for structured clone (postMessage)
      const result = await processGene({
        geneSymbol: gene,
        dataset: getDatasetId(version.value),
        referenceGenome: getReferenceGenome(version.value),
        apiEndpoint: getApiEndpoint(version.value),
        filterConfig: { ...filterConfig.value },
        qualitySettings: { ...qualityStore.defaults },
        qualityExclusionConfig: { ...qualityExclusionConfig.value },
        calcConfig: { ...calcStore.defaults },
        excludedIds: Array.from(debouncedExcluded.value),
        submissions: Array.from(submissions.value.entries()),
        forceRefresh,
        requestId,
      });
      applyResult(result);
    } catch (err) {
      if (requestId !== latestRequestId) return;
      hasError.value = true;
      errorMessage.value =
        err instanceof Error ? err.message : "Failed to load variant data.";
      isLoading.value = false;
      processingStatus.value = null;
    }
  }

  async function dispatchRefilter(): Promise<void> {
    // Don't refilter while a full processGene fetch is in flight —
    // it would increment latestRequestId and discard the fetch result.
    if (!hasData.value || isLoading.value) return;

    latestRequestId++;
    const requestId = latestRequestId;

    processingStatus.value = "Refiltering...";

    try {
      // Spread reactive objects into plain objects for structured clone (postMessage)
      const result = await refilter({
        filterConfig: { ...filterConfig.value },
        qualitySettings: { ...qualityStore.defaults },
        qualityExclusionConfig: { ...qualityExclusionConfig.value },
        calcConfig: { ...calcStore.defaults },
        excludedIds: Array.from(debouncedExcluded.value),
        submissions: Array.from(submissions.value.entries()),
        requestId,
      });
      applyResult(result);
    } catch (err) {
      if (requestId !== latestRequestId) return;
      // Refilter errors are non-fatal — keep existing data
      processingStatus.value = null;
      logger.warn("Refilter failed", { error: err });
    }
  }

  // Watch gene/version changes → full processGene
  watch([geneSymbol, version], ([gene]) => {
    // Reset state when gene changes
    if (!gene) {
      hasData.value = false;
      filteredByPathogenicity.value = [];
      qualifyingVariants.value = [];
      clinvarVariantsRef.value = [];
      qualityFlagsMap.value = new Map();
      qualityExcludedIds.value = new Set();
      sourceCategoryMap.value = new Map();
      aggregatedPops.value = null;
      workerGlobalStats.value = null;
      cacheStatus.value = null;
      isLoading.value = false;
      hasError.value = false;
      errorMessage.value = null;
      processingStatus.value = null;
      return;
    }
    dispatchProcessGene();
  });

  // Debounced watch on filter/quality/calc config changes → refilter (300ms)
  watchDebounced(
    [filterConfig, qualityExclusionConfig, () => calcStore.defaults],
    () => {
      dispatchRefilter();
    },
    { debounce: 300 },
  );

  // Watch manual exclusions → refilter (already debounced by debouncedExcluded at 500ms)
  watch(debouncedExcluded, () => {
    dispatchRefilter();
  });

  // Watch submissions (deep) → refilter when hasData
  watch(
    submissions,
    () => {
      if (hasData.value) {
        dispatchRefilter();
      }
    },
    { deep: true },
  );

  // Identify conflicting variant IDs for submissions fetching
  const conflictingVariantIds = computed(() =>
    getConflictingVariantIds(clinvarVariantsRef.value),
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

  // Derived counts
  const qualityExcludedCount = computed(() => qualityExcludedIds.value.size);
  const flaggedVariantCount = computed(() => qualityFlagsMap.value.size);
  const totalPathogenicCount = computed(
    () => filteredByPathogenicity.value.length,
  );
  const qualifyingVariantCount = computed(
    () => qualifyingVariants.value.length,
  );

  // Check if using default (no qualifying variants from filters)
  const usingDefault = computed(
    () => hasData.value && totalPathogenicCount.value === 0,
  );

  // Global carrier frequency from worker stats
  const globalCarrierFrequency = computed((): number | null => {
    if (usingDefault.value) return defaultCarrierFrequency;
    return workerGlobalStats.value?.carrierFrequency ?? null;
  });

  // Build population frequency array (uses config for labels/thresholds)
  // Reconstructs Map from AggregatedPopEntry[] for buildPopulationFrequencies
  const populations = computed((): PopulationFrequency[] => {
    if (!aggregatedPops.value || globalCarrierFrequency.value === null)
      return [];
    const aggMap = new Map(
      aggregatedPops.value.map((e) => [
        e.code,
        {
          carrierFrequency: e.carrierFrequency,
          sumAF: e.sumAF,
          totalAC: e.totalAC,
          maxAN: e.maxAN,
          geneticPrevalence: e.geneticPrevalence,
        },
      ]),
    );
    return buildPopulationFrequencies(
      aggMap,
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
    const gp = workerGlobalStats.value?.geneticPrevalence ?? null;
    if (gp === null) return null;
    return formatPrevalence(gp);
  });

  const bayesianPrevalenceFormatted = computed(() => {
    const bp = workerGlobalStats.value?.bayesianPrevalence ?? null;
    if (bp === null) return null;
    return formatPrevalence(bp);
  });

  // Build full result object
  const result = computed((): CarrierFrequencyResult | null => {
    if (!geneSymbol.value || !hasData.value) return null;

    const freqs = populations.value
      .map((p) => p.carrierFrequency)
      .filter((f): f is number => f !== null);

    const stats = workerGlobalStats.value;

    return {
      gene: geneSymbol.value,
      version: version.value,
      globalCarrierFrequency: globalCarrierFrequency.value,
      globalAlleleCount: stats?.totalAC ?? 0,
      globalAlleleNumber: stats?.maxAN ?? 0,
      populations: populations.value,
      qualifyingVariantCount: qualifyingVariantCount.value,
      minFrequency: freqs.length ? Math.min(...freqs) : null,
      maxFrequency: freqs.length ? Math.max(...freqs) : null,
      hasFounderEffect: hasFounderEffect.value,
      geneticPrevalence: stats?.geneticPrevalence ?? null,
      bayesianPrevalence: stats?.bayesianPrevalence ?? null,
      formula: stats?.formula ?? "hwe",
      homExclusionActive: stats?.homExclusionActive ?? false,
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

  // Cache management actions
  const clearVariantCache = async (gene?: string): Promise<void> => {
    await clearCache(gene);
  };

  const getVariantCacheSize = async (): Promise<number> => {
    return getCacheSize();
  };

  // refetch forces a full processGene with cache bypass
  const refetch = async (): Promise<void> => {
    await dispatchProcessGene(true);
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
    variants: filteredByPathogenicity, // alias for backward compat
    clinvarVariants: clinvarVariantsRef,
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
    qualifyingVariants,
    calculateRisk,
    refetch,
    processingStatus,
    cacheStatus,
    sourceCategoryMap,
    clearVariantCache,
    getVariantCacheSize,
  };

  return instance;
}
