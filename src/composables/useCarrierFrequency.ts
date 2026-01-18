import { computed, ref, type Ref } from 'vue';
import { useGeneVariants } from './useGeneVariants';
import { filterPathogenicVariants } from '@/utils/variant-filters';
import {
  aggregatePopulationFrequencies,
  buildPopulationFrequencies,
} from '@/utils/frequency-calc';
import { formatCarrierFrequency } from '@/utils/formatters';
import { config, type GnomadVersion } from '@/config';
import { useGnomadVersion } from '@/api';
import type {
  CarrierFrequencyResult,
  IndexPatientStatus,
  PopulationFrequency,
  GnomadVariant,
  ClinVarVariant,
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

  const setGeneSymbol = (symbol: string | null) => {
    geneSymbol.value = symbol?.toUpperCase() ?? null;
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
      clinical_significance: cv.clinical_significance,
      gold_stars: cv.gold_stars,
      review_status: cv.review_status,
      pos: cv.pos,
      ref: cv.ref,
      alt: cv.alt,
    }));
  });

  // Filter to pathogenic variants (FILT-01, FILT-02, FILT-03)
  const pathogenicVariants = computed(() => {
    if (!normalizedVariants.value.length) return [];
    return filterPathogenicVariants(
      normalizedVariants.value,
      normalizedClinvar.value
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

  // Calculate global carrier frequency
  const globalCarrierFrequency = computed((): number | null => {
    if (usingDefault.value) return defaultCarrierFrequency; // From config
    if (!aggregatedPops.value) return null;

    // Sum all pathogenic AFs for global
    let totalAC = 0;
    let maxAN = 0;
    for (const variant of pathogenicVariants.value) {
      const exomeAC = variant.exome?.ac ?? 0;
      const genomeAC = variant.genome?.ac ?? 0;
      totalAC += exomeAC + genomeAC;

      const exomeAN = variant.exome?.an ?? 0;
      const genomeAN = variant.genome?.an ?? 0;
      maxAN = Math.max(maxAN, exomeAN, genomeAN);
    }

    if (maxAN === 0) return null;
    const globalAF = totalAC / maxAN;
    return 2 * globalAF; // Carrier frequency = 2 x AF
  });

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
    currentVersion,
    calculateRisk,
    refetch,
  };
}
