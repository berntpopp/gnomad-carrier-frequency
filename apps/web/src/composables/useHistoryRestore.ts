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

export function migrateHistoryEntry(raw: any): RestoredSettings {
  const filterCfg = raw.filterConfig || {};
  return {
    gene: {
      symbol: raw.gene?.symbol ?? "",
      ensembl_id: raw.gene?.ensembl_id ?? "",
    },
    dataset: (raw.target?.dataset ??
      raw.results?.gnomadVersion ??
      "v4") as GnomadVersion,
    filters: {
      includeLof: raw.filters?.includeLof ?? filterCfg.lofHcEnabled ?? true,
      includeMissense:
        raw.filters?.includeMissense ?? filterCfg.missenseEnabled ?? false,
      includeClinvarPathogenic:
        raw.filters?.includeClinvarPathogenic ??
        filterCfg.clinvarEnabled ??
        true,
      clinvarReviewStarsMin:
        raw.filters?.clinvarReviewStarsMin ??
        filterCfg.clinvarStarThreshold ??
        1,
      includeConflictingClinvar:
        raw.filters?.includeConflictingClinvar ??
        filterCfg.clinvarIncludeConflicting ??
        false,
      clinvarConflictingThreshold:
        raw.filters?.clinvarConflictingThreshold ??
        filterCfg.clinvarConflictingThreshold ??
        80,
      conflictingReviewStarsMin: raw.filters?.conflictingReviewStarsMin ?? 1,
    },
    manualExclusions:
      raw.exclusions?.manualExcludedVariantIds ?? raw.excludedVariantIds ?? [],
    clinical: {
      indexStatus: (raw.clinical?.indexStatus ??
        raw.patientStatus ??
        raw.indexStatus ??
        "heterozygous") as IndexPatientStatus,
      frequencySource: (raw.clinical?.frequencySource ??
        raw.frequencySource ??
        raw.source ??
        "gnomad") as FrequencySource,
      literatureCarrierFrequency:
        raw.clinical?.literatureCarrierFrequency ??
        raw.literatureFrequency ??
        null,
      literaturePmid:
        raw.clinical?.literaturePmid ?? raw.literaturePmid ?? null,
      penetrance: raw.clinical?.penetrance ?? raw.penetrance ?? 1.0,
    },
    calculation: {
      formula:
        raw.calculation?.formula ??
        (raw.filterConfig?.useHWEFormula === false ? "simplified" : "hwe"),
      useHomozygoteExclusion:
        raw.calculation?.useHomozygoteExclusion ??
        raw.filterConfig?.useHomExclusion ??
        true,
      useBayesianPrevalence: raw.calculation?.useBayesianPrevalence ?? true,
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
      const restored = migrateHistoryEntry(entry);

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
        const restored = migrateHistoryEntry(entry);
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
