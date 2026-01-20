import { watch, toRaw } from 'vue';
import { useHistoryStore } from '@/stores/useHistoryStore';
import { useWizard } from './useWizard';
import { useCarrierFrequency } from './useCarrierFrequency';
import { useExclusionState } from './useExclusionState';

// Track if already initialized (singleton pattern)
let isInitialized = false;

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
      }
    );
  }

  function saveCurrentCalculation() {
    // Must have valid gene and result
    if (!wizardState.gene || !result.value) {
      return;
    }

    // Must have valid carrier frequency
    if (result.value.globalCarrierFrequency === null) {
      return;
    }

    // Check for duplicate (same gene within 30 seconds)
    const mostRecent = historyStore.mostRecent;
    if (mostRecent) {
      const sameGene = mostRecent.gene.symbol === wizardState.gene.symbol;
      const recentEnough = Date.now() - mostRecent.timestamp < 30000;
      if (sameGene && recentEnough) {
        // Skip duplicate save
        return;
      }
    }

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
