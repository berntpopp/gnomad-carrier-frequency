import { ref, type Ref } from 'vue';
import {
  buildSubmissionsQuery,
  parseSubmissionsResponse,
  type ClinVarSubmission,
  type ClinVarVariantWithSubmissions,
} from '@/api/queries';
import { getReferenceGenome } from '@/config';

/** Batch size for fetching submissions (to avoid query size limits) */
const BATCH_SIZE = 50;

/** API endpoint */
const GNOMAD_API_URL = 'https://gnomad.broadinstitute.org/api';

export interface UseClinvarSubmissionsReturn {
  /** Map of variant_id to submissions array */
  submissions: Ref<Map<string, ClinVarSubmission[]>>;
  /** Loading state */
  isLoading: Ref<boolean>;
  /** Error message if fetch failed */
  error: Ref<string | null>;
  /** Progress (0-100) during batched fetch */
  progress: Ref<number>;
  /** Fetch submissions for a list of variant IDs */
  fetchSubmissions: (variantIds: string[]) => Promise<void>;
  /** Clear cached submissions */
  clearSubmissions: () => void;
}

/**
 * Composable for fetching ClinVar submissions data
 * Used to resolve "conflicting classifications" by analyzing individual submissions
 *
 * Fetches submissions in batches to handle genes with many conflicting variants
 */
export function useClinvarSubmissions(): UseClinvarSubmissionsReturn {
  const submissions = ref<Map<string, ClinVarSubmission[]>>(new Map());
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const progress = ref(0);

  /**
   * Fetch a single batch of submissions
   */
  async function fetchBatch(
    variantIds: string[],
    referenceGenome: 'GRCh38' | 'GRCh37'
  ): Promise<Map<string, ClinVarSubmission[]>> {
    const query = buildSubmissionsQuery(variantIds, referenceGenome);

    const response = await fetch(GNOMAD_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const json = await response.json();

    if (json.errors && json.errors.length > 0) {
      throw new Error(json.errors[0].message);
    }

    return parseSubmissionsResponse(
      json.data as Record<string, ClinVarVariantWithSubmissions | null>
    );
  }

  /**
   * Fetch submissions for all provided variant IDs
   * Batches requests to avoid query size limits
   */
  async function fetchSubmissions(variantIds: string[]): Promise<void> {
    if (variantIds.length === 0) {
      return;
    }

    isLoading.value = true;
    error.value = null;
    progress.value = 0;

    try {
      const referenceGenome = getReferenceGenome();
      const totalBatches = Math.ceil(variantIds.length / BATCH_SIZE);
      let processedBatches = 0;

      // Process in batches
      for (let i = 0; i < variantIds.length; i += BATCH_SIZE) {
        const batch = variantIds.slice(i, i + BATCH_SIZE);
        const batchResult = await fetchBatch(batch, referenceGenome);

        // Merge results into main map
        for (const [key, value] of batchResult) {
          submissions.value.set(key, value);
        }

        processedBatches++;
        progress.value = Math.round((processedBatches / totalBatches) * 100);
      }
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : 'Failed to fetch ClinVar submissions';
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Clear cached submissions
   */
  function clearSubmissions(): void {
    submissions.value = new Map();
    error.value = null;
    progress.value = 0;
  }

  return {
    submissions,
    isLoading,
    error,
    progress,
    fetchSubmissions,
    clearSubmissions,
  };
}
