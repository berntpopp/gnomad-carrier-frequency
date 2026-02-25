import { ref, type Ref } from "vue";
import {
  buildSubmissionsQuery,
  parseSubmissionsResponse,
  type ClinVarSubmission,
  type ClinVarVariantWithSubmissions,
} from "@gnomad-cf/core/queries";
import { getReferenceGenome } from "@gnomad-cf/core/config";

/** Batch size for fetching submissions (to avoid query size limits) */
const BATCH_SIZE = 50;

/** API endpoint */
const GNOMAD_API_URL = "https://gnomad.broadinstitute.org/api";

/** Maximum number of retry attempts per batch */
const MAX_RETRIES = 3;

/** Base delay in ms for exponential backoff (doubles each retry) */
const BASE_DELAY_MS = 1000;

/** Inter-batch delay in ms to avoid rate limiting */
const BATCH_DELAY_MS = 200;

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
  /** Retry failed batches from the last fetch */
  retryFailed: () => Promise<void>;
  /** Clear cached submissions */
  clearSubmissions: () => void;
}

/** Delay helper */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Composable for fetching ClinVar submissions data
 * Used to resolve "conflicting classifications" by analyzing individual submissions
 *
 * Fetches submissions in batches with exponential backoff retry
 */
export function useClinvarSubmissions(): UseClinvarSubmissionsReturn {
  const submissions = ref<Map<string, ClinVarSubmission[]>>(new Map());
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const progress = ref(0);

  // Track failed variant IDs for retry
  let failedVariantIds: string[] = [];

  /**
   * Fetch a single batch of submissions with retry and exponential backoff
   */
  async function fetchBatchWithRetry(
    variantIds: string[],
    referenceGenome: "GRCh38" | "GRCh37",
  ): Promise<Map<string, ClinVarSubmission[]>> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        if (attempt > 0) {
          const backoffMs = BASE_DELAY_MS * Math.pow(2, attempt - 1);
          await delay(backoffMs);
        }

        const query = buildSubmissionsQuery(variantIds, referenceGenome);

        const response = await fetch(GNOMAD_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
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
          json.data as Record<string, ClinVarVariantWithSubmissions | null>,
        );
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        // Only retry on server errors (5xx) or network errors, not client errors (4xx)
        if (
          err instanceof Error &&
          err.message.startsWith("HTTP 4") &&
          !err.message.startsWith("HTTP 429")
        ) {
          throw lastError;
        }
      }
    }

    throw lastError ?? new Error("Failed after retries");
  }

  /**
   * Fetch submissions for all provided variant IDs
   * Batches requests with inter-batch delay and per-batch retry
   */
  async function fetchSubmissions(variantIds: string[]): Promise<void> {
    if (variantIds.length === 0) {
      return;
    }

    isLoading.value = true;
    error.value = null;
    progress.value = 0;
    failedVariantIds = [];

    const referenceGenome = getReferenceGenome();
    const totalBatches = Math.ceil(variantIds.length / BATCH_SIZE);
    let processedBatches = 0;
    let batchErrors = 0;

    // Process in batches
    for (let i = 0; i < variantIds.length; i += BATCH_SIZE) {
      const batch = variantIds.slice(i, i + BATCH_SIZE);

      try {
        const batchResult = await fetchBatchWithRetry(batch, referenceGenome);

        // Merge results into main map
        for (const [key, value] of batchResult) {
          submissions.value.set(key, value);
        }
      } catch {
        // Track failed batch for retry, continue with remaining batches
        failedVariantIds.push(...batch);
        batchErrors++;
      }

      processedBatches++;
      progress.value = Math.round((processedBatches / totalBatches) * 100);

      // Small delay between batches to avoid rate limiting
      if (i + BATCH_SIZE < variantIds.length) {
        await delay(BATCH_DELAY_MS);
      }
    }

    if (batchErrors > 0) {
      error.value = `${batchErrors} of ${totalBatches} batch(es) failed after ${MAX_RETRIES} retries. ${failedVariantIds.length} variant(s) could not be fetched.`;
    }

    isLoading.value = false;
  }

  /**
   * Retry fetching submissions for variant IDs that failed in the last fetch
   */
  async function retryFailed(): Promise<void> {
    if (failedVariantIds.length === 0) return;
    const idsToRetry = [...failedVariantIds];
    await fetchSubmissions(idsToRetry);
  }

  /**
   * Clear cached submissions
   */
  function clearSubmissions(): void {
    submissions.value = new Map();
    error.value = null;
    progress.value = 0;
    failedVariantIds = [];
  }

  return {
    submissions,
    isLoading,
    error,
    progress,
    fetchSubmissions,
    retryFailed,
    clearSubmissions,
  };
}
