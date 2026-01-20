import { watch, toRaw } from 'vue';
import { useHistoryStore } from '@/stores/useHistoryStore';
import { useWizard } from './useWizard';
import { useCarrierFrequency } from './useCarrierFrequency';
import { useExclusionState } from './useExclusionState';

// Track if already initialized (singleton pattern)
let isInitialized = false;
// Track if we've already saved for the current calculation (module-level for singleton)
let lastSavedGene: string | null = null;

/**
 * Composable that automatically saves completed calculations to history.
 *
 * Auto-save triggers when:
 * - User enters step 4 (results) from a different step
 * - Valid calculation result exists
 * - Not a duplicate of most recent entry (same gene within 30s)
 *
 * Call once at app root (App.vue) to initialize.
 */
export function useHistoryAutoSave() {
  const historyStore = useHistoryStore();
  const { state: wizardState } = useWizard();
  const { result, filterConfig, currentVersion } = useCarrierFrequency();
  const { excluded } = useExclusionState();

  function initialize() {
    if (isInitialized) return;
    isInitialized = true;

    // Watch for step changes to trigger auto-save
    watch(
      () => wizardState.currentStep,
      (newStep, oldStep) => {
        // Only save when entering results step from a different step
        if (newStep === 4 && oldStep !== 4) {
          saveCurrentCalculation();
        }
        // Reset tracking when leaving step 4
        if (newStep !== 4) {
          lastSavedGene = null;
        }
      }
    );

    // Also watch for result changes when on step 4
    // This handles the case where step transitions before result is ready
    watch(
      () => result.value?.globalCarrierFrequency,
      (newFreq) => {
        if (
          wizardState.currentStep === 4 &&
          newFreq !== null &&
          newFreq !== undefined
        ) {
          saveCurrentCalculation();
        }
      }
    );
  }

  function saveCurrentCalculation() {
    // Must have valid gene and result
    if (!wizardState.gene || !result.value) {
      console.log('[HistoryAutoSave] Skip: no gene or result', { gene: wizardState.gene, result: result.value });
      return;
    }

    // Must have valid carrier frequency
    if (result.value.globalCarrierFrequency === null) {
      console.log('[HistoryAutoSave] Skip: globalCarrierFrequency is null');
      return;
    }

    // Skip if we already saved this gene in current session
    if (lastSavedGene === wizardState.gene.symbol) {
      console.log('[HistoryAutoSave] Skip: already saved', lastSavedGene);
      return;
    }

    console.log('[HistoryAutoSave] Attempting save for', wizardState.gene.symbol);

    // Check for duplicate (same gene within 30 seconds)
    const mostRecent = historyStore.mostRecent;
    if (mostRecent) {
      const sameGene = mostRecent.gene.symbol === wizardState.gene.symbol;
      const recentEnough = Date.now() - mostRecent.timestamp < 30000;
      if (sameGene && recentEnough) {
        // Skip duplicate save
        lastSavedGene = wizardState.gene.symbol;
        return;
      }
    }

    // Track that we saved this gene
    lastSavedGene = wizardState.gene.symbol;

    // Build entry from current state
    historyStore.addEntry({
      gene: {
        ensembl_id: wizardState.gene.ensembl_id,
        symbol: wizardState.gene.symbol,
      },
      indexStatus: wizardState.indexStatus,
      frequencySource: wizardState.frequencySource,
      literatureFrequency: wizardState.literatureFrequency,
      literaturePmid: wizardState.literaturePmid,
      filterConfig: { ...toRaw(filterConfig.value) },
      excludedVariantIds: [...excluded.value],
      results: {
        globalCarrierFrequency: result.value.globalCarrierFrequency,
        qualifyingVariantCount: result.value.qualifyingVariantCount,
        gnomadVersion: currentVersion.value,
      },
    });
  }

  return {
    initialize,
    saveCurrentCalculation,
  };
}

export type UseHistoryAutoSaveReturn = ReturnType<typeof useHistoryAutoSave>;
