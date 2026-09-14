import { ref, computed, watch, type Ref } from "vue";
import type {
  CarrierFrequencyResult,
  GnomadVariant,
  ClinVarVariant,
  FilterConfig,
  CalcConfig,
} from "@gnomad-cf/core/types";
import type { ClinVarSubmission } from "@gnomad-cf/core/queries";
import {
  getSubpopulations,
  getSubpopulationParent,
} from "@gnomad-cf/core/config";
import {
  computeSourceBreakdown,
  type SourceBreakdownRow,
} from "@gnomad-cf/core/calculations";
import {
  useSubcontinentalData,
  type SubcontinentalPopulationFrequency,
  useUrlState,
} from "@/composables";

export interface UsePopulationBreakdownOptions {
  result: Ref<CarrierFrequencyResult | null>;
  qualifyingVariants: Ref<GnomadVariant[]>;
  clinvarVariants: Ref<ClinVarVariant[]>;
  filterConfig: Ref<FilterConfig>;
  calcConfig: Ref<CalcConfig>;
  submissions: Ref<Map<string, ClinVarSubmission[]>>;
  formatFrequency: (freq: number | null) => string;
}

export function usePopulationBreakdown(options: UsePopulationBreakdownOptions) {
  const {
    result,
    qualifyingVariants,
    clinvarVariants,
    filterConfig,
    calcConfig,
    submissions,
    formatFrequency,
  } = options;

  const isV2 = computed(() => result.value?.version === "v2");
  const { subcontinentalEnabled: showSubcontinental } = useUrlState();

  const {
    isLoading: isLoadingSubcontinental,
    progress: subcontinentalProgress,
    error: subcontinentalError,
    subcontinentalFrequencies,
    fetchForVariants: fetchSubcontinental,
    clear: clearSubcontinental,
  } = useSubcontinentalData();

  watch(showSubcontinental, async (enabled) => {
    if (enabled && isV2.value && qualifyingVariants.value.length > 0) {
      const variantIds = qualifyingVariants.value.map((v) => v.variant_id);
      const gene = result.value?.gene ?? "";
      const parentFreqs = new Map<string, number | null>();
      for (const pop of result.value?.populations ?? []) {
        parentFreqs.set(pop.code, pop.carrierFrequency);
      }
      await fetchSubcontinental(variantIds, gene, parentFreqs);
    }
  });

  function getSubcontinentalRows(
    parentCode: string,
  ): SubcontinentalPopulationFrequency[] {
    return subcontinentalFrequencies.value.filter(
      (f) => f.parentCode === parentCode,
    );
  }

  function hasSubpopulations(popCode: string): boolean {
    if (!isV2.value) return false;
    const pops = getSubpopulations("v2");
    return pops.some((s) => getSubpopulationParent(s.code, "v2") === popCode);
  }

  const expandedPops = ref<Set<string>>(new Set());

  function togglePopExpand(popCode: string, event: Event) {
    event.stopPropagation();
    const newSet = new Set(expandedPops.value);
    if (newSet.has(popCode)) {
      newSet.delete(popCode);
    } else {
      newSet.add(popCode);
    }
    expandedPops.value = newSet;
  }

  function isPopExpanded(popCode: string): boolean {
    return expandedPops.value.has(popCode);
  }

  const sourceBreakdownCache = computed(() => {
    const cache = new Map<string, SourceBreakdownRow[]>();
    for (const popCode of expandedPops.value) {
      cache.set(
        popCode,
        computeSourceBreakdown(
          qualifyingVariants.value,
          clinvarVariants.value,
          filterConfig.value,
          popCode,
          calcConfig.value,
          submissions.value,
        ),
      );
    }
    return cache;
  });

  function getSourceBreakdown(popCode: string): SourceBreakdownRow[] {
    return sourceBreakdownCache.value.get(popCode) ?? [];
  }

  function formatSourceFrequency(cf: number | null): string {
    if (cf === null || cf === 0) return "-";
    return formatFrequency(cf);
  }

  function getSourceBorderColor(category: string): string {
    switch (category) {
      case "clinvar_only":
        return "#2196F3";
      case "plof_only":
        return "#673AB7";
      case "both":
        return "#4CAF50";
      default:
        return "transparent";
    }
  }

  watch(result, () => {
    expandedPops.value = new Set();
    showSubcontinental.value = false;
    clearSubcontinental();
  });

  return {
    isV2,
    showSubcontinental,
    isLoadingSubcontinental,
    subcontinentalProgress,
    subcontinentalError,
    getSubcontinentalRows,
    hasSubpopulations,
    expandedPops,
    togglePopExpand,
    isPopExpanded,
    getSourceBreakdown,
    formatSourceFrequency,
    getSourceBorderColor,
  };
}
