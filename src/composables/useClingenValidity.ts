import { ref, computed, type Ref, type ComputedRef } from 'vue';
import { useClingenStore } from '@/stores/useClingenStore';
import type { ClingenEntry, ClingenValidityResult } from '@/types';

const CLINGEN_CSV_URL =
  'https://search.clinicalgenome.org/kb/gene-validity/download';

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
 * Parse ClinGen CSV text into typed entries
 * CSV structure: GENE SYMBOL, GENE ID (HGNC), DISEASE LABEL, DISEASE ID (MONDO), MOI, SOP, CLASSIFICATION, ONLINE REPORT, CLASSIFICATION DATE, GCEP, ...
 */
function parseClingenCSV(csvText: string): ClingenEntry[] {
  const lines = csvText.split('\n');

  // Skip header row, filter empty lines
  return lines
    .slice(1)
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      // Handle CSV with potential quoted fields
      const values = parseCSVLine(line);
      return {
        geneSymbol: values[0]?.trim().toUpperCase() ?? '',
        hgncId: values[1]?.trim() ?? '',
        diseaseLabel: values[2]?.trim() ?? '',
        mondoId: values[3]?.trim() ?? '',
        moi: values[4]?.trim() ?? '',
        classification: values[5]?.trim() ?? '',
        onlineReport: values[7]?.trim() ?? '',
        classificationDate: values[8]?.trim() ?? '',
        gcep: values[9]?.trim() ?? '',
      };
    })
    .filter((entry) => entry.geneSymbol.length > 0);
}

/**
 * Parse a single CSV line, handling quoted fields
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current); // Push last field
  return result;
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
      const response = await fetch(CLINGEN_CSV_URL);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const csvText = await response.text();
      const entries = parseClingenCSV(csvText);

      if (entries.length === 0) {
        throw new Error('No valid entries parsed from ClinGen CSV');
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
