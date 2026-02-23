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

      // Step 2: Clear gene first to avoid triggering the downstream reset watcher
      // The watcher only resets if oldGene !== null AND currentStep > 1
      // By clearing the gene first, we ensure a clean state transition
      wizardState.gene = null;

      // Step 3: Restore wizard state BEFORE setting gene
      // This prevents the gene watcher from overwriting these values
      wizardState.indexStatus = entry.indexStatus;
      wizardState.frequencySource = entry.frequencySource;
      wizardState.literatureFrequency = entry.literatureFrequency;
      wizardState.literaturePmid = entry.literaturePmid;

      // Step 4: Restore filter configuration
      // This updates the session filter config, not the saved defaults
      setFilterConfig({ ...entry.filterConfig });

      // Step 5: Restore exclusions
      resetForGene(entry.gene.symbol);
      if (entry.excludedVariantIds.length > 0) {
        setExclusions(entry.excludedVariantIds);
      }

      // Step 6: Navigate to results step BEFORE setting gene
      // This way when we set gene, the watcher won't reset (currentStep check passes)
      wizardState.currentStep = 4;

      // Step 7: Now set the gene - the watcher won't reset because we're on step 4
      // and setting from null doesn't trigger the reset (oldGene check)
      wizardState.gene = {
        ensembl_id: entry.gene.ensembl_id,
        symbol: entry.gene.symbol,
      };

      // Trigger gene search/selection which fetches variant data
      geneSearch.selectGene(wizardState.gene);

      // Set gene symbol in carrier frequency composable (triggers data fetch)
      setGeneSymbol(entry.gene.symbol);

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
