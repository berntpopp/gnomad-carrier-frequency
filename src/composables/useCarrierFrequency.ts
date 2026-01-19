import { computed, ref, type Ref } from 'vue';
import { useGeneVariants } from './useGeneVariants';
import { filterPathogenicVariantsConfigurable } from '@/utils/variant-filters';
import {
  aggregatePopulationFrequencies,
  buildPopulationFrequencies,
} from '@/utils/frequency-calc';
import { formatCarrierFrequency } from '@/utils/formatters';
import { config, type GnomadVersion } from '@/config';
import { useGnomadVersion } from '@/api';
import { useFilterStore } from '@/stores/useFilterStore';
import type {
  CarrierFrequencyResult,
  IndexPatientStatus,
  PopulationFrequency,
  GnomadVariant,
  ClinVarVariant,
  FilterConfig,
} from '@/types';

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

  // Raw variant data (for filtering UI)
  variants: Ref<GnomadVariant[]>;
  clinvarVariants: Ref<ClinVarVariant[]>;

  // Filter configuration (reactive)
  filterConfig: Ref<FilterConfig>;
  setFilterConfig: (config: FilterConfig) => void;

  // Version
  currentVersion: Ref<GnomadVersion>;

  // Recurrence risk
  calculateRisk: (status: IndexPatientStatus) => {
    risk: number;
    percent: string;
    ratio: string;
  } | null;

  // Actions
  refetch: () => Promise<void>;
}

export function useCarrierFrequency(): UseCarrierFrequencyReturn {
  const geneSymbol = ref<string | null>(null);
  const { version } = useGnomadVersion();
  const filterStore = useFilterStore();

  const setGeneSymbol = (symbol: string | null) => {
    geneSymbol.value = symbol?.toUpperCase() ?? null;
  };

  // Reactive filter configuration - initialized from store defaults
  const filterConfig = ref<FilterConfig>({
    lofHcEnabled: filterStore.defaults.lofHcEnabled,
    missenseEnabled: filterStore.defaults.missenseEnabled,
    clinvarEnabled: filterStore.defaults.clinvarEnabled,
    clinvarStarThreshold: filterStore.defaults.clinvarStarThreshold,
  });

  const setFilterConfig = (config: FilterConfig) => {
    filterConfig.value = { ...config };
  };

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

  // Filter to pathogenic variants using configurable filters (FILT-01 through FILT-09)
  const pathogenicVariants = computed(() => {
    if (!normalizedVariants.value.length) return [];
    return filterPathogenicVariantsConfigurable(
      normalizedVariants.value,
      normalizedClinvar.value,
      filterConfig.value
    );
  });

  const qualifyingVariantCount = computed(() => pathogenicVariants.value.length);

  // Check if using default (no qualifying variants) - threshold from config
  const usingDefault = computed(() =>
    hasData.value && pathogenicVariants.value.length === 0
  );

  // Aggregate population frequencies (uses config for population codes)
  const aggregatedPops = computed(() => {
    if (usingDefault.value) return null;
    if (!pathogenicVariants.value.length) return null;
    return aggregatePopulationFrequencies(pathogenicVariants.value, version.value);
  });

  // Calculate global statistics: carrier frequency, total AC, and representative AN
  //
  // Mathematical approach: Sum of allele frequencies
  // - Each variant has its own AN due to varying call rate
  // - For exome+genome (different cohorts): combine AC and AN → variant AF
  // - For multiple variants (same cohort): sum the AFs
  //
  // Formula: carrier_freq = 2 × Σ(variant_AF_i)
  // where variant_AF = (exome_AC + genome_AC) / (exome_AN + genome_AN)
  //
  const globalStats = computed((): {
    carrierFrequency: number | null;
    totalAC: number;
    maxAN: number;
  } => {
    if (usingDefault.value) {
      return { carrierFrequency: defaultCarrierFrequency, totalAC: 0, maxAN: 0 };
    }
    if (!aggregatedPops.value || !pathogenicVariants.value.length) {
      return { carrierFrequency: null, totalAC: 0, maxAN: 0 };
    }

    // Sum allele frequencies across all pathogenic variants
    // Also track total AC and max AN for display
    let sumAF = 0;
    let totalAC = 0;
    let maxExomeAN = 0;
    let maxGenomeAN = 0;

    for (const variant of pathogenicVariants.value) {
      // Combine exome and genome for this variant (different sample sets)
      const exomeAC = variant.exome?.ac ?? 0;
      const genomeAC = variant.genome?.ac ?? 0;
      const exomeAN = variant.exome?.an ?? 0;
      const genomeAN = variant.genome?.an ?? 0;

      const combinedAC = exomeAC + genomeAC;
      const combinedAN = exomeAN + genomeAN;

      // Track totals
      totalAC += combinedAC;
      maxExomeAN = Math.max(maxExomeAN, exomeAN);
      maxGenomeAN = Math.max(maxGenomeAN, genomeAN);

      // Calculate this variant's AF and add to sum
      if (combinedAN > 0) {
        sumAF += combinedAC / combinedAN;
      }
    }

    return {
      carrierFrequency: sumAF > 0 ? 2 * sumAF : null,
      totalAC,
      maxAN: maxExomeAN + maxGenomeAN,
    };
  });

  // Expose individual computed values for convenience
  const globalCarrierFrequency = computed(() => globalStats.value.carrierFrequency);

  // Build population frequency array (uses config for labels/thresholds)
  const populations = computed((): PopulationFrequency[] => {
    if (!aggregatedPops.value || globalCarrierFrequency.value === null) return [];
    return buildPopulationFrequencies(
      aggregatedPops.value,
      globalCarrierFrequency.value,
      version.value // Pass version for config lookup
    );
  });

  // Check for founder effect (any population >5x global - threshold from config)
  const hasFounderEffect = computed(() =>
    populations.value.some((p) => p.isFounderEffect)
  );

  // Format global frequency
  const globalFrequency = computed(() => {
    if (globalCarrierFrequency.value === null) return null;
    return formatCarrierFrequency(globalCarrierFrequency.value);
  });

  // Build full result object
  const result = computed((): CarrierFrequencyResult | null => {
    if (!geneSymbol.value || globalCarrierFrequency.value === null) return null;

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
    };
  });

  // Recurrence risk calculation (CALC-02, CALC-03)
  const calculateRisk = (status: IndexPatientStatus) => {
    if (globalCarrierFrequency.value === null) return null;
    // CALC-02: Heterozygous carrier: carrier_freq / 4
    // CALC-03: Compound het/homozygous: carrier_freq / 2
    const divisor = status === 'heterozygous' ? 4 : 2;
    const risk = globalCarrierFrequency.value / divisor;
    return {
      risk,
      percent: `${(risk * 100).toFixed(2)}%`,
      ratio: risk > 0 ? `1:${Math.round(1 / risk)}` : 'N/A',
    };
  };

  return {
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
    variants: normalizedVariants,
    clinvarVariants: normalizedClinvar,
    filterConfig,
    setFilterConfig,
    currentVersion,
    calculateRisk,
    refetch,
  };
}
