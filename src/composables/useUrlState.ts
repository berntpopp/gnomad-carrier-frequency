// URL state synchronization composable
// Syncs wizard state to URL query parameters for shareable URLs

import { ref, watch, onMounted, nextTick } from 'vue';
import { useUrlSearchParams } from '@vueuse/core';
import {
  parseUrlState,
  encodeFilterFlags,
  decodeFilterFlags,
  filtersMatchDefaults,
  FACTORY_FILTER_DEFAULTS,
} from '@/types';
import type { UrlState } from '@/types';
import { useWizard } from './useWizard';
import { useFilterStore } from '@/stores/useFilterStore';
import { useGeneSearch } from './useGeneSearch';

// Module-level singleton state
const isInitialized = ref(false);
const isRestoringFromUrl = ref(false);

export interface UseUrlStateReturn {
  /** Whether URL state initialization is complete */
  isInitialized: typeof isInitialized;
  /** Whether URL state is currently being restored (show loading indicator) */
  isRestoringFromUrl: typeof isRestoringFromUrl;
  /** Get current URL as shareable link */
  getShareableUrl: () => string;
}

/**
 * Composable for bidirectional URL state synchronization
 *
 * Features:
 * - Restores wizard state from URL on page load
 * - Updates URL as user progresses through wizard
 * - Uses replaceState to avoid browser history pollution
 * - Compact encoding for filter flags
 * - Graceful handling of invalid URL parameters
 */
export function useUrlState(): UseUrlStateReturn {
  // Initialize URL params with VueUse
  // Using 'history' mode with replace to avoid creating history entries
  const params = useUrlSearchParams('history', {
    write: true,
  });

  // Get references to wizard state and stores
  const { state: wizardState } = useWizard();
  const filterStore = useFilterStore();
  const geneSearch = useGeneSearch();

  /**
   * Restore application state from URL parameters
   * Called on mount if URL contains state parameters
   */
  async function restoreFromUrl(): Promise<void> {
    // Parse and validate URL parameters
    const urlState: UrlState = parseUrlState(params as Record<string, unknown>);

    // Restore gene if present in URL
    if (urlState.gene) {
      // Trigger gene search
      geneSearch.setSearchTerm(urlState.gene);

      // Wait for search results to populate
      await nextTick();

      // Wait a bit for the debounced search to execute and results to arrive
      await new Promise<void>((resolve) => {
        const maxAttempts = 50; // 5 seconds max
        let attempts = 0;

        const checkResults = () => {
          attempts++;

          // Check if we have results
          if (geneSearch.results.value.length > 0) {
            // Find matching gene (exact match on symbol)
            const matchingGene = geneSearch.results.value.find(
              (g) => g.symbol.toUpperCase() === urlState.gene?.toUpperCase()
            );

            if (matchingGene) {
              geneSearch.selectGene(matchingGene);
              wizardState.gene = matchingGene;
            }
            resolve();
          } else if (geneSearch.isLoading.value) {
            // Still loading, wait and try again
            setTimeout(checkResults, 100);
          } else if (attempts < maxAttempts) {
            // Not loading but no results yet, wait
            setTimeout(checkResults, 100);
          } else {
            // Give up after max attempts
            console.warn('[URL State] Could not find gene:', urlState.gene);
            resolve();
          }
        };

        checkResults();
      });
    }

    // Restore wizard state (only if gene was found or no gene in URL)
    if (wizardState.gene || !urlState.gene) {
      // Restore index status
      wizardState.indexStatus = urlState.status;

      // Restore frequency source
      wizardState.frequencySource = urlState.source;

      // Restore literature frequency if source is literature
      if (urlState.source === 'literature') {
        if (urlState.litFreq !== undefined) {
          wizardState.literatureFrequency = urlState.litFreq;
        }
        if (urlState.litPmid !== undefined) {
          wizardState.literaturePmid = urlState.litPmid;
        }
      }

      // Restore filter settings if present
      if (urlState.filters !== undefined) {
        const decodedFilters = decodeFilterFlags(urlState.filters);
        filterStore.setDefaults(decodedFilters);
      }

      // Restore ClinVar star threshold if present
      if (urlState.clinvarStars !== undefined) {
        filterStore.setClinvarStarThreshold(urlState.clinvarStars);
      }

      // Restore conflicting classifications setting
      if (urlState.conflicting !== undefined) {
        filterStore.setClinvarIncludeConflicting(urlState.conflicting === '1');
      }

      // Restore conflicting threshold if present
      if (urlState.conflictThreshold !== undefined) {
        filterStore.setClinvarConflictingThreshold(urlState.conflictThreshold);
      }

      // Restore step last (after all other state is set)
      // Only go to step if we have the prerequisites
      if (urlState.step > 1 && wizardState.gene) {
        wizardState.currentStep = urlState.step as 1 | 2 | 3 | 4;
      }
    }
  }

  /**
   * Update URL from current application state
   * Called when wizard state or filter settings change
   */
  function updateUrlFromState(): void {
    // Skip if we're currently restoring from URL
    if (isRestoringFromUrl.value) return;

    // Skip if not initialized (avoid URL update before restore)
    if (!isInitialized.value) return;

    // Build params from current state
    // Gene symbol
    if (wizardState.gene?.symbol) {
      params.gene = wizardState.gene.symbol;
    } else {
      delete params.gene;
    }

    // Step (always include if gene selected)
    if (wizardState.gene) {
      params.step = wizardState.currentStep.toString();
    } else {
      delete params.step;
    }

    // Index status (only if not default)
    if (wizardState.indexStatus !== 'heterozygous') {
      params.status = wizardState.indexStatus;
    } else {
      delete params.status;
    }

    // Frequency source (only if not default)
    if (wizardState.frequencySource !== 'gnomad') {
      params.source = wizardState.frequencySource;
    } else {
      delete params.source;
    }

    // Literature frequency (only if source is literature)
    if (
      wizardState.frequencySource === 'literature' &&
      wizardState.literatureFrequency !== null
    ) {
      params.litFreq = wizardState.literatureFrequency.toString();
    } else {
      delete params.litFreq;
    }

    // Literature PMID (only if source is literature)
    if (
      wizardState.frequencySource === 'literature' &&
      wizardState.literaturePmid !== null
    ) {
      params.litPmid = wizardState.literaturePmid;
    } else {
      delete params.litPmid;
    }

    // Filter flags (only if different from factory defaults)
    const currentFilters = filterStore.defaults;
    if (!filtersMatchDefaults(currentFilters)) {
      // Check if only the filter flags differ (not star/threshold settings)
      const flagsOnly =
        currentFilters.lofHcEnabled !== FACTORY_FILTER_DEFAULTS.lofHcEnabled ||
        currentFilters.missenseEnabled !== FACTORY_FILTER_DEFAULTS.missenseEnabled ||
        currentFilters.clinvarEnabled !== FACTORY_FILTER_DEFAULTS.clinvarEnabled;

      if (flagsOnly) {
        params.filters = encodeFilterFlags(currentFilters);
      } else {
        delete params.filters;
      }

      // ClinVar star threshold (only if different from default)
      if (currentFilters.clinvarStarThreshold !== FACTORY_FILTER_DEFAULTS.clinvarStarThreshold) {
        params.clinvarStars = currentFilters.clinvarStarThreshold.toString();
      } else {
        delete params.clinvarStars;
      }

      // Conflicting classifications
      if (currentFilters.clinvarIncludeConflicting) {
        params.conflicting = '1';

        // Conflicting threshold (only if enabled and different from default)
        if (
          currentFilters.clinvarConflictingThreshold !==
          FACTORY_FILTER_DEFAULTS.clinvarConflictingThreshold
        ) {
          params.conflictThreshold = currentFilters.clinvarConflictingThreshold.toString();
        } else {
          delete params.conflictThreshold;
        }
      } else {
        delete params.conflicting;
        delete params.conflictThreshold;
      }
    } else {
      // All defaults - remove all filter-related params
      delete params.filters;
      delete params.clinvarStars;
      delete params.conflicting;
      delete params.conflictThreshold;
    }
  }

  // Set up watchers to update URL when state changes
  watch(
    () => wizardState,
    () => updateUrlFromState(),
    { deep: true }
  );

  watch(
    () => filterStore.defaults,
    () => updateUrlFromState(),
    { deep: true }
  );

  // On mount, check for URL state and restore if present
  onMounted(async () => {
    // Only initialize once
    if (isInitialized.value) return;

    // Check if URL has any state parameters
    const hasUrlState = ['gene', 'step', 'status', 'source', 'filters'].some(
      (k) => params[k] !== undefined && params[k] !== null && params[k] !== ''
    );

    if (hasUrlState) {
      isRestoringFromUrl.value = true;
      await restoreFromUrl();
      isRestoringFromUrl.value = false;
    }

    isInitialized.value = true;
  });

  return {
    isInitialized,
    isRestoringFromUrl,
    getShareableUrl: () => window.location.href,
  };
}
