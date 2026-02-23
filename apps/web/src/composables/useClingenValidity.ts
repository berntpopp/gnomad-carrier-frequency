import { ref, computed, type Ref, type ComputedRef } from 'vue';
import { useClingenStore } from '@/stores/useClingenStore';
import type { ClingenEntry, ClingenValidityResult } from '@/types';

// ClinGen CSV - use local bundled copy to avoid CORS issues on GitHub Pages
// The file is stored in public/data/ and updated periodically via GitHub Actions
// Falls back to external URL for development with Vite proxy
const CLINGEN_CSV_LOCAL = `${import.meta.env.BASE_URL}data/clingen-gene-validity.csv`;
const CLINGEN_CSV_EXTERNAL =
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

/**
 * Parse ClinGen CSV text into typed entries
 * CSV format has metadata rows at the top:
 * - Row 0: Title "CLINGEN GENE DISEASE VALIDITY CURATIONS"
 * - Row 1: File created date
 * - Row 2: Webpage URL
 * - Row 3: Separator (+++++...)
 * - Row 4: Column headers
 * - Row 5: Separator (+++++...)
 * - Row 6+: Data rows
 *
 * CSV columns: GENE SYMBOL, GENE ID (HGNC), DISEASE LABEL, DISEASE ID (MONDO), MOI, SOP, CLASSIFICATION, ONLINE REPORT, CLASSIFICATION DATE, GCEP
 */
function parseClingenCSV(csvText: string): ClingenEntry[] {
  const lines = csvText.split('\n');

  // Skip metadata and header rows (first 6 rows), filter empty lines and separator rows
  return lines
    .slice(6) // Skip metadata, header, and separator rows
    .filter((line) => line.trim().length > 0 && !line.startsWith('"+++'))
    .map((line) => {
      const values = parseCSVLine(line);
      return {
        geneSymbol: values[0]?.trim().toUpperCase() ?? '',
        hgncId: values[1]?.trim() ?? '',
        diseaseLabel: values[2]?.trim() ?? '',
        mondoId: values[3]?.trim() ?? '',
        moi: values[4]?.trim() ?? '',
        classification: values[6]?.trim() ?? '',
        expertPanel: values[9]?.trim() ?? '',
        classificationDate: values[8]?.trim() ?? '',
        permId: '', // Not in CSV
      };
    })
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
      // Try local bundled file first (works on GitHub Pages)
      // Falls back to external URL if local file fails (e.g., in development without the file)
      let response: Response;
      let usedUrl: string;

      try {
        response = await fetch(CLINGEN_CSV_LOCAL);
        usedUrl = CLINGEN_CSV_LOCAL;
        if (!response.ok) {
          throw new Error('Local file not available');
        }
      } catch {
        // Fallback to external URL (works in dev with Vite proxy or when CORS is available)
        console.log('[ClinGen] Local file not available, trying external URL');
        response = await fetch(CLINGEN_CSV_EXTERNAL);
        usedUrl = CLINGEN_CSV_EXTERNAL;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const csvText = await response.text();
      const entries = parseClingenCSV(csvText);

      if (entries.length === 0) {
        throw new Error('No valid entries parsed from ClinGen CSV');
      }

      console.log(`[ClinGen] Loaded ${entries.length} entries from ${usedUrl}`);
      store.setData(entries);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to fetch ClinGen data';
      console.error('[ClinGen] Fetch error:', message);
      store.setError(message);
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
