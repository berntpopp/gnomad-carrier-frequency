import { ref, type Ref, nextTick } from "vue";
import { useHistoryStore } from "@/stores/useHistoryStore";
import { useHistoryAutoSave } from "./useHistoryAutoSave";
import { useWizard } from "./useWizard";
import { useCarrierFrequency } from "./useCarrierFrequency";
import { useExclusionState } from "./useExclusionState";
import { useGeneSearch } from "./useGeneSearch";
import { useLogger } from "./useLogger";
import { useGnomadVersion } from "@/api";
import { useCalcStore } from "@/stores/useCalcStore";
import { isRestoring } from "./useAnalysisContext";
import { invalidateActiveConfigToken } from "./useGeneConfig";
import type {
  IndexPatientStatus,
  FrequencySource,
} from "@gnomad-cf/core/types";
import type { GnomadVersion } from "@gnomad-cf/core/config";

const activeRestoreToken: Ref<symbol | null> = ref(null);

export interface RestoredSettings {
  gene: { symbol: string; ensembl_id: string };
  dataset: GnomadVersion;
  filters: {
    includeLof: boolean;
    includeMissense: boolean;
    includeClinvarPathogenic: boolean;
    clinvarReviewStarsMin: number;
    includeConflictingClinvar: boolean;
    clinvarConflictingThreshold: number;
    conflictingReviewStarsMin: number;
  };
  manualExclusions: string[];
  clinical: {
    indexStatus: IndexPatientStatus;
    frequencySource: FrequencySource;
    literatureCarrierFrequency: number | null;
    literaturePmid: string | null;
    penetrance: number;
  };
  calculation: {
    formula: "hwe" | "simplified";
    useHomozygoteExclusion: boolean;
    useBayesianPrevalence: boolean;
  };
}

export function migrateHistoryEntry(
  rawInput: Record<string, unknown> | null | undefined,
): RestoredSettings {
  const raw = rawInput ?? {};
  const filterCfg = (raw.filterConfig ?? {}) as Record<string, unknown>;
  const rawGene = (raw.gene ?? {}) as Record<string, unknown>;
  const rawTarget = (raw.target ?? {}) as Record<string, unknown>;
  const rawResults = (raw.results ?? {}) as Record<string, unknown>;
  const rawFilters = (raw.filters ?? {}) as Record<string, unknown>;
  const rawExclusions = (raw.exclusions ?? {}) as Record<string, unknown>;
  const rawClinical = (raw.clinical ?? {}) as Record<string, unknown>;
  const rawCalc = (raw.calculation ?? {}) as Record<string, unknown>;

  return {
    gene: {
      symbol: (rawGene.symbol as string) ?? "",
      ensembl_id: (rawGene.ensembl_id as string) ?? "",
    },
    dataset: ((rawTarget.dataset as string) ??
      (rawResults.gnomadVersion as string) ??
      "v4") as GnomadVersion,
    filters: {
      includeLof:
        (rawFilters.includeLof as boolean) ??
        (filterCfg.lofHcEnabled as boolean) ??
        true,
      includeMissense:
        (rawFilters.includeMissense as boolean) ??
        (filterCfg.missenseEnabled as boolean) ??
        false,
      includeClinvarPathogenic:
        (rawFilters.includeClinvarPathogenic as boolean) ??
        (filterCfg.clinvarEnabled as boolean) ??
        true,
      clinvarReviewStarsMin:
        (rawFilters.clinvarReviewStarsMin as number) ??
        (filterCfg.clinvarStarThreshold as number) ??
        1,
      includeConflictingClinvar:
        (rawFilters.includeConflictingClinvar as boolean) ??
        (filterCfg.clinvarIncludeConflicting as boolean) ??
        false,
      clinvarConflictingThreshold:
        (rawFilters.clinvarConflictingThreshold as number) ??
        (filterCfg.clinvarConflictingThreshold as number) ??
        80,
      conflictingReviewStarsMin:
        (rawFilters.conflictingReviewStarsMin as number) ?? 1,
    },
    manualExclusions:
      (rawExclusions.manualExcludedVariantIds as string[]) ??
      (raw.excludedVariantIds as string[]) ??
      [],
    clinical: {
      indexStatus: ((rawClinical.indexStatus as string) ??
        (raw.patientStatus as string) ??
        (raw.indexStatus as string) ??
        "heterozygous") as IndexPatientStatus,
      frequencySource: ((rawClinical.frequencySource as string) ??
        (raw.frequencySource as string) ??
        (raw.source as string) ??
        "gnomad") as FrequencySource,
      literatureCarrierFrequency:
        (rawClinical.literatureCarrierFrequency as number | null) ??
        (raw.literatureFrequency as number | null) ??
        null,
      literaturePmid:
        (rawClinical.literaturePmid as string | null) ??
        (raw.literaturePmid as string | null) ??
        null,
      penetrance:
        (rawClinical.penetrance as number) ?? (raw.penetrance as number) ?? 1.0,
    },
    calculation: {
      formula: ((rawCalc.formula as string) ??
        (filterCfg.useHWEFormula === false ? "simplified" : "hwe")) as
        | "hwe"
        | "simplified",
      useHomozygoteExclusion:
        (rawCalc.useHomozygoteExclusion as boolean) ??
        (filterCfg.useHomExclusion as boolean) ??
        true,
      useBayesianPrevalence: (rawCalc.useBayesianPrevalence as boolean) ?? true,
    },
  };
}

/**
 * Composable for transactional restoration of calculation state from history entries.
 */
export function useHistoryRestore() {
  const historyStore = useHistoryStore();
  const { saveCurrentCalculation } = useHistoryAutoSave();
  const { state: wizardState } = useWizard();
  const { setGeneSymbol, setFilterConfig } = useCarrierFrequency();
  const { setExclusions, resetForGene } = useExclusionState();
  const geneSearch = useGeneSearch();
  const { setVersion } = useGnomadVersion();
  const calcStore = useCalcStore();
  const logger = useLogger("history");

  async function restoreFromHistory(entryId: string): Promise<boolean> {
    const entry = historyStore.getEntry(entryId);
    if (!entry) {
      logger.warn("History entry not found", { entryId });
      return false;
    }

    const token = Symbol("restore");
    activeRestoreToken.value = token;
    isRestoring.value = true;
    invalidateActiveConfigToken();

    try {
      // Step 1: Auto-save current state before restoring
      saveCurrentCalculation();

      // Step 2: Migrate raw history entry to authoritative normalized settings
      const restored = migrateHistoryEntry(
        entry as unknown as Record<string, unknown>,
      );

      // Step 3: Sequence dataset version in versionStore BEFORE gene selection
      setVersion(restored.dataset);

      // Step 4: Hydrate calculation & clinical parameters
      calcStore.setPenetrance(restored.clinical.penetrance);
      calcStore.setUseHWEFormula(restored.calculation.formula === "hwe");
      calcStore.setUseHomExclusion(restored.calculation.useHomozygoteExclusion);

      wizardState.indexStatus = restored.clinical.indexStatus;
      wizardState.frequencySource = restored.clinical.frequencySource;
      wizardState.literatureFrequency =
        restored.clinical.literatureCarrierFrequency;
      wizardState.literaturePmid = restored.clinical.literaturePmid;

      // Step 5: Restore filter configuration
      setFilterConfig({
        lofHcEnabled: restored.filters.includeLof,
        missenseEnabled: restored.filters.includeMissense,
        clinvarEnabled: restored.filters.includeClinvarPathogenic,
        clinvarStarThreshold: restored.filters.clinvarReviewStarsMin,
        clinvarIncludeConflicting: restored.filters.includeConflictingClinvar,
        clinvarConflictingThreshold:
          restored.filters.clinvarConflictingThreshold,
      });

      // Step 6: Restore exclusions
      resetForGene(restored.gene.symbol);
      if (restored.manualExclusions.length > 0) {
        setExclusions(restored.manualExclusions);
      }

      // Step 7: Navigate to results step
      wizardState.currentStep = 4;

      // Step 8: Set restored gene
      wizardState.gene = { ...restored.gene };
      geneSearch.selectGene(wizardState.gene);

      // Step 9: Await Vue microtasks settlement across watchers
      await nextTick();

      return true;
    } catch (error) {
      logger.error("Failed to restore from history", { error });
      return false;
    } finally {
      if (activeRestoreToken.value === token) {
        isRestoring.value = false;
        activeRestoreToken.value = null;

        // Dispatch calculation only after unlock
        const restored = migrateHistoryEntry(
          entry as unknown as Record<string, unknown>,
        );
        setGeneSymbol(restored.gene.symbol);
      }
    }
  }

  return {
    isRestoring,
    restoreFromHistory,
  };
}

export type UseHistoryRestoreReturn = ReturnType<typeof useHistoryRestore>;
