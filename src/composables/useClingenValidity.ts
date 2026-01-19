import { ref, computed, type Ref, type ComputedRef } from 'vue';
import { useClingenStore } from '@/stores/useClingenStore';
import type {
  ClingenEntry,
  ClingenValidityResult,
  ClingenApiResponse,
  ClingenApiRow,
} from '@/types';

const CLINGEN_API_URL =
  'https://search.clinicalgenome.org/api/validity?queryParams';

export interface UseClingenValidityReturn {
  // State
  isLoading: Ref<boolean>;
  error: ComputedRef<string | null>;

  // Cache info
  isExpired: ComputedRef<boolean>;
  hasData: ComputedRef<boolean>;
  cacheAge: ComputedRef<string>;
  entryCount: ComputedRef<number>;

  // Actions
  fetchData: () => Promise<void>;
  refreshCache: () => Promise<void>;
  checkGene: (geneSymbol: string) => ClingenValidityResult;
}

/**
 * Transform ClinGen API row to normalized entry
 */
function transformApiRow(row: ClingenApiRow): ClingenEntry {
  return {
    geneSymbol: row.symbol?.toUpperCase() ?? '',
    hgncId: row.hgnc_id ?? '',
    diseaseLabel: row.disease_name ?? '',
    mondoId: row.mondo ?? '',
    moi: row.moi ?? '',
    classification: row.classification ?? '',
    expertPanel: row.ep ?? '',
    classificationDate: row.released ?? '',
    permId: row.perm_id ?? '',
  };
}

/**
 * Parse ClinGen API JSON response into typed entries
 */
function parseClingenApiResponse(response: ClingenApiResponse): ClingenEntry[] {
  if (!response.rows || !Array.isArray(response.rows)) {
    return [];
  }

  return response.rows
    .map(transformApiRow)
    .filter((entry) => entry.geneSymbol.length > 0);
}

export function useClingenValidity(): UseClingenValidityReturn {
  const store = useClingenStore();
  const isLoading = ref(false);

  const fetchData = async (): Promise<void> => {
    // Skip if cache is valid
    if (store.hasData && !store.isExpired) {
      return;
    }

    isLoading.value = true;
    store.setError(''); // Clear previous errors

    try {
      const response = await fetch(CLINGEN_API_URL);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const json = (await response.json()) as ClingenApiResponse;
      const entries = parseClingenApiResponse(json);

      if (entries.length === 0) {
        throw new Error('No valid entries parsed from ClinGen API');
      }

      store.setData(entries);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to fetch ClinGen data';
      store.setError(message);
      console.error('[ClinGen] Fetch error:', message);
    } finally {
      isLoading.value = false;
    }
  };

  const refreshCache = async (): Promise<void> => {
    store.clearCache();
    await fetchData();
  };

  const checkGene = (geneSymbol: string): ClingenValidityResult => {
    return store.getGeneValidity(geneSymbol);
  };

  return {
    isLoading,
    error: computed(() => store.error),
    isExpired: computed(() => store.isExpired),
    hasData: computed(() => store.hasData),
    cacheAge: computed(() => store.cacheAge),
    entryCount: computed(() => store.entryCount),
    fetchData,
    refreshCache,
    checkGene,
  };
}
