import { ref } from 'vue';
import { useHistoryStore } from '@/stores/useHistoryStore';
import { useHistoryAutoSave } from './useHistoryAutoSave';
import { useWizard } from './useWizard';
import { useCarrierFrequency } from './useCarrierFrequency';
import { useExclusionState } from './useExclusionState';
import { useGeneSearch } from './useGeneSearch';

/**
 * Composable for restoring calculation state from history entries.
 *
 * Restoration process:
 * 1. Auto-save current state (if valid) to prevent data loss
 * 2. Restore wizard state (gene, index status, frequency source)
 * 3. Trigger gene data fetch
 * 4. Restore filter configuration
 * 5. Restore exclusions
 * 6. Navigate to results step
 */
export function useHistoryRestore() {
  const historyStore = useHistoryStore();
  const { saveCurrentCalculation } = useHistoryAutoSave();
  const { state: wizardState } = useWizard();
  const { setGeneSymbol, setFilterConfig } = useCarrierFrequency();
  const { setExclusions, resetForGene } = useExclusionState();
  const geneSearch = useGeneSearch();

  const isRestoring = ref(false);

  /**
   * Restore full application state from a history entry.
   *
   * @param entryId - UUID of the history entry to restore
   * @returns true if restoration succeeded, false if entry not found
   */
  async function restoreFromHistory(entryId: string): Promise<boolean> {
    const entry = historyStore.getEntry(entryId);
    if (!entry) {
      console.warn('History entry not found:', entryId);
      return false;
    }

    isRestoring.value = true;

    try {
      // Step 1: Auto-save current state before restoring (per CONTEXT.md)
      // This prevents accidental data loss when browsing history
      saveCurrentCalculation();

      // Step 2: Restore gene
      // Update wizard state with gene info
      wizardState.gene = {
        ensembl_id: entry.gene.ensembl_id,
        symbol: entry.gene.symbol,
      };

      // Reset exclusions for this gene first
      resetForGene(entry.gene.symbol);

      // Trigger gene search/selection which fetches variant data
      geneSearch.selectGene(wizardState.gene);

      // Set gene symbol in carrier frequency composable (triggers data fetch)
      setGeneSymbol(entry.gene.symbol);

      // Step 3: Restore wizard state
      wizardState.indexStatus = entry.indexStatus;
      wizardState.frequencySource = entry.frequencySource;
      wizardState.literatureFrequency = entry.literatureFrequency;
      wizardState.literaturePmid = entry.literaturePmid;

      // Step 4: Restore filter configuration
      // This updates the session filter config, not the saved defaults
      setFilterConfig({ ...entry.filterConfig });

      // Step 5: Restore exclusions
      if (entry.excludedVariantIds.length > 0) {
        setExclusions(entry.excludedVariantIds);
      }

      // Step 6: Navigate to results step
      // Directly set currentStep to bypass validation since we're restoring valid state
      wizardState.currentStep = 4;

      return true;
    } catch (error) {
      console.error('Failed to restore from history:', error);
      return false;
    } finally {
      isRestoring.value = false;
    }
  }

  return {
    isRestoring,
    restoreFromHistory,
  };
}

export type UseHistoryRestoreReturn = ReturnType<typeof useHistoryRestore>;
