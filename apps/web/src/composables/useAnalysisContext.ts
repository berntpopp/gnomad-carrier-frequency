import { ref, computed, watch, type ComputedRef, type Ref } from "vue";
import type { AnalysisContext } from "@gnomad-cf/core/types";
import { useWizard } from "./useWizard";
import { useGnomadVersion } from "@/api";
import { useCalcStore } from "@/stores/useCalcStore";
import { useFilterStore } from "@/stores/useFilterStore";
import { useQualityStore } from "@/stores/useQualityStore";
import { useExclusionState } from "./useExclusionState";
import { useGeneConfig } from "./useGeneConfig";
import { useUrlState } from "./useUrlState";

// Module-level singleton state
export const isRestoring: Ref<boolean> = ref(false);
export const activeContextRevision: Ref<number> = ref(1);

export function incrementRevision(): void {
  if (!isRestoring.value) {
    activeContextRevision.value++;
  }
}

let initialized = false;

export function useAnalysisContext() {
  const { state: wizardState } = useWizard();
  const { version, versionConfig } = useGnomadVersion();
  const { subcontinentalEnabled } = useUrlState();
  const calcStore = useCalcStore();
  const filterStore = useFilterStore();
  const qualityStore = useQualityStore();
  const exclusionState = useExclusionState();
  const { activeProfile } = useGeneConfig();

  // Watch for changes across all analysis settings to increment monotonic revision
  if (!initialized) {
    initialized = true;

    // Wizard clinical inputs
    watch(
      () => [
        wizardState.gene?.symbol,
        wizardState.indexStatus,
        wizardState.frequencySource,
        wizardState.literatureFrequency,
        wizardState.literaturePmid,
      ],
      () => incrementRevision(),
    );

    // Version & subcontinental toggle
    watch(
      () => [version.value, subcontinentalEnabled.value],
      () => incrementRevision(),
    );

    // Calculation parameters
    watch(
      () => [
        calcStore.defaults.useHWEFormula,
        calcStore.defaults.useHomExclusion,
        calcStore.defaults.penetrance,
      ],
      () => incrementRevision(),
    );

    // Filter parameters
    watch(
      () => [
        filterStore.defaults.lofHcEnabled,
        filterStore.defaults.missenseEnabled,
        filterStore.defaults.clinvarEnabled,
        filterStore.defaults.clinvarStarThreshold,
        filterStore.defaults.clinvarIncludeConflicting,
        filterStore.defaults.clinvarConflictingThreshold,
      ],
      () => incrementRevision(),
    );

    // Quality parameters
    watch(
      () => [
        qualityStore.defaults.highAfEnabled,
        qualityStore.defaults.highAfThreshold,
        qualityStore.defaults.highHomEnabled,
        qualityStore.defaults.highHomMethod,
        qualityStore.defaults.highHomAbsoluteThreshold,
        qualityStore.defaults.highHomHWEMultiplier,
        qualityStore.defaults.gnomadFilteredEnabled,
        qualityStore.defaults.genomesOnlyEnabled,
        qualityStore.exclusionDefaults.excludeHighAf,
        qualityStore.exclusionDefaults.excludeHighHom,
        qualityStore.exclusionDefaults.excludeGnomadFiltered,
        qualityStore.exclusionDefaults.excludeGenomesOnly,
      ],
      () => incrementRevision(),
    );

    // Exclusions
    watch(
      () => [
        exclusionState.excluded.value.length,
        exclusionState.excluded.value.join(","),
      ],
      () => incrementRevision(),
    );
  }

  const activeContext: ComputedRef<AnalysisContext> = computed(() => {
    const reasonsRecord: Record<string, string> = {};
    for (const [id, reason] of exclusionState.reasons) {
      reasonsRecord[id] = typeof reason === "string" ? reason : reason.type;
    }

    const currentVersion = version.value;
    const currentDataset =
      currentVersion === "v4" ? "v4" : currentVersion === "v3" ? "v3" : "v2";

    return {
      revision: activeContextRevision.value,
      target: {
        geneSymbol: wizardState.gene?.symbol ?? "",
        geneId: wizardState.gene?.ensembl_id ?? "",
        dataset: currentDataset,
        referenceGenome: versionConfig.value.referenceGenome,
        subcontinentalEnabled: subcontinentalEnabled.value,
      },
      clinical: {
        indexStatus: wizardState.indexStatus,
        frequencySource: wizardState.frequencySource,
        literatureCarrierFrequency: wizardState.literatureFrequency,
        literaturePmid: wizardState.literaturePmid,
        penetrance: calcStore.defaults.penetrance ?? 1.0,
      },
      filters: {
        selectedProfileName: activeProfile.value?.displayName ?? null,
        includeLof: filterStore.defaults.lofHcEnabled,
        includeMissense: filterStore.defaults.missenseEnabled,
        includeClinvarPathogenic: filterStore.defaults.clinvarEnabled,
        clinvarReviewStarsMin: filterStore.defaults.clinvarStarThreshold,
        includeConflictingClinvar:
          filterStore.defaults.clinvarIncludeConflicting,
        clinvarConflictingThreshold:
          filterStore.defaults.clinvarConflictingThreshold,
        conflictingReviewStarsMin: 1,
      },
      quality: {
        highAfEnabled: qualityStore.defaults.highAfEnabled,
        highAfThreshold: qualityStore.defaults.highAfThreshold,
        highHomEnabled: qualityStore.defaults.highHomEnabled,
        highHomMethod: qualityStore.defaults.highHomMethod,
        highHomAbsoluteThreshold:
          qualityStore.defaults.highHomAbsoluteThreshold,
        highHomHWEMultiplier: qualityStore.defaults.highHomHWEMultiplier,
        gnomadFilteredEnabled: qualityStore.defaults.gnomadFilteredEnabled,
        genomesOnlyEnabled: qualityStore.defaults.genomesOnlyEnabled,
        excludeHighAf: qualityStore.exclusionDefaults.excludeHighAf,
        excludeHighHom: qualityStore.exclusionDefaults.excludeHighHom,
        excludeGnomadFiltered:
          qualityStore.exclusionDefaults.excludeGnomadFiltered,
        excludeGenomesOnly: qualityStore.exclusionDefaults.excludeGenomesOnly,
        excludeLowAN: false,
        minAlleleNumber: 0,
      },
      exclusions: {
        manualExcludedVariantIds: exclusionState.excluded.value,
        qualityExcludedVariantIds: [],
        exclusionReasons: reasonsRecord,
      },
      calculation: {
        formula: calcStore.defaults.useHWEFormula ? "hwe" : "simplified",
        useHomozygoteExclusion: calcStore.defaults.useHomExclusion,
        useBayesianPrevalence: true,
      },
      provenance: {
        isDefaultFallback: wizardState.frequencySource === "default",
        cacheTimestamp: Date.now(),
        clinvarSubmissionBatchId: null,
        appVersion: "1.7.2",
      },
    };
  });

  return {
    isRestoring,
    activeContextRevision,
    activeContext,
    incrementRevision,
  };
}
