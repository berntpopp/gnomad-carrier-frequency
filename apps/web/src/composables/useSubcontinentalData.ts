import { ref, type Ref } from "vue";
import {
  config,
  getSubpopulations,
  getSubpopulationLabel,
  getSubpopulationParent,
  getApiEndpoint,
  getDatasetId,
} from "@gnomad-cf/core/config";
import {
  VARIANT_SUBCONTINENTAL_QUERY,
  type VariantSubcontinentalResponse,
} from "@gnomad-cf/core/queries";
import { useSubcontinentalStore } from "@/stores/useSubcontinentalStore";
import { useLogger } from "./useLogger";

/**
 * Aggregated subcontinental carrier frequency data for a single subpopulation.
 *
 * Computed by summing AC/AN across all qualifying variants for that subpopulation,
 * then applying the simplified 2*sumAF formula (VCR/GCR is not used here because
 * per-subpopulation homozygote counts are unreliable at small sample sizes).
 */
export interface SubcontinentalPopulationFrequency {
  /** gnomAD subpopulation code, e.g. "nfe_bgr" */
  code: string;
  /** Parent continental population code, e.g. "nfe" */
  parentCode: string;
  /** Human-readable label, e.g. "Bulgarian (Eastern European)" */
  label: string;
  /** Simplified carrier frequency (2 * sumAF). null if no data (AN=0 for all variants). */
  carrierFrequency: number | null;
  /** Total allele count (sum across all qualifying variants for this subpopulation) */
  alleleCount: number;
  /**
   * Maximum allele number seen across qualifying variants.
   * Uses max-AN strategy (same as buildPopulationFrequencies) to avoid
   * underestimating the denominator due to missing call rates.
   */
  alleleNumber: number;
  /** True if alleleNumber < config.settings.lowSampleSizeThreshold (1000) */
  isLowSampleSize: boolean;
  /**
   * True if carrier frequency > parentCarrierFrequency * config.settings.founderEffectMultiplier.
   * Requires parentFrequencies parameter to be passed to fetchForVariants.
   * Defaults to false when parentFrequencies is not provided.
   */
  isFounderEffect: boolean;
}

export interface UseSubcontinentalDataReturn {
  /** True while fetching per-variant subcontinental data */
  isLoading: Ref<boolean>;
  /** Fetch progress 0-100. Updates after each batch completes. */
  progress: Ref<number>;
  /** Error message if any batch failed, null otherwise */
  error: Ref<string | null>;
  /**
   * Aggregated subcontinental frequencies per subpopulation.
   * Sorted by carrierFrequency descending (nulls at end).
   * Empty array until fetchForVariants has completed successfully.
   */
  subcontinentalFrequencies: Ref<SubcontinentalPopulationFrequency[]>;
  /**
   * Fetch subcontinental population data for a list of variant IDs.
   *
   * Cache-first: variant IDs already in the Pinia store (same gene) are
   * skipped. The cache is invalidated when the gene changes.
   *
   * @param variantIds - Qualifying variant IDs (post-pathogenicity + exclusion filters)
   * @param gene - Current gene symbol. Cache is cleared if gene changed.
   * @param parentFrequencies - Optional Map from parent population code (e.g. "nfe")
   *   to its carrier frequency (0-1). Used for founder effect detection.
   *   When not provided, isFounderEffect is always false.
   */
  fetchForVariants: (
    variantIds: string[],
    gene: string,
    parentFrequencies?: Map<string, number | null>,
  ) => Promise<void>;
  /** Resets all reactive state and clears the Pinia store. */
  clear: () => void;
}

/** Per-variant fetch batch size. 5 concurrent requests balances speed vs gnomAD rate limits. */
const BATCH_SIZE = 5;

/** Delay (ms) between consecutive batches to avoid overwhelming gnomAD API. */
const INTER_BATCH_DELAY_MS = 500;

/** Maximum retry attempts per variant when rate-limited or server error. */
const MAX_RETRIES = 4;

/** Base delay (ms) for exponential backoff. Actual delay = baseDelay * 2^attempt. */
const RETRY_BASE_DELAY_MS = 1000;

/** gnomAD v2 API endpoint (subcontinental populations are v2-only) */
const GNOMAD_API_URL = getApiEndpoint("v2");
/** gnomAD v2 dataset identifier */
const DATASET_ID = getDatasetId("v2");

/** Sleep helper for delays between batches and retries. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Returns true if the HTTP status code is retryable (rate limit or server error). */
function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

/**
 * Fetch subcontinental population data for a single variant from gnomAD v2
 * with retry and exponential backoff for rate-limited/server-error responses.
 *
 * Combines exome and genome population arrays by summing AC and AN for matching
 * population IDs. Returns the combined array for this variant.
 *
 * @returns Array of combined populations for this variant, or null if the variant
 *   was not found in gnomAD v2 (e.g. v4-only variant).
 */
async function fetchSingleVariant(variantId: string): Promise<Array<{
  id: string;
  ac: number;
  an: number;
  ac_hom: number;
}> | null> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
      await sleep(delay);
    }

    let response: Response;
    try {
      response = await fetch(GNOMAD_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: VARIANT_SUBCONTINENTAL_QUERY,
          variables: {
            variantId,
            dataset: DATASET_ID,
          },
        }),
      });
    } catch (networkError) {
      // Network failure (DNS, timeout, connection refused) — retryable
      lastError =
        networkError instanceof Error
          ? networkError
          : new Error(String(networkError));
      continue;
    }

    if (!response.ok) {
      if (isRetryableStatus(response.status) && attempt < MAX_RETRIES) {
        lastError = new Error(
          `HTTP ${response.status}: ${response.statusText}`,
        );
        continue;
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const json = (await response.json()) as {
      data?: VariantSubcontinentalResponse;
      errors?: Array<{ message: string }>;
    };

    if (json.errors && json.errors.length > 0) {
      throw new Error(json.errors[0]?.message ?? "Unknown gnomAD API error");
    }

    const variant = json.data?.variant;
    if (!variant) {
      // Variant not found in gnomAD v2 — this is normal for v4-only variants
      return null;
    }

    // Collect all unique population IDs from exome and genome
    const combinedMap = new Map<
      string,
      { id: string; ac: number; an: number; ac_hom: number }
    >();

    const exomePops = variant.exome?.populations ?? [];
    const genomePops = variant.genome?.populations ?? [];

    for (const pop of exomePops) {
      combinedMap.set(pop.id, {
        id: pop.id,
        ac: pop.ac,
        an: pop.an,
        ac_hom: pop.ac_hom,
      });
    }

    for (const pop of genomePops) {
      const existing = combinedMap.get(pop.id);
      if (existing) {
        // Sum AC, AN, and ac_hom across exome + genome
        existing.ac += pop.ac;
        existing.an += pop.an;
        existing.ac_hom += pop.ac_hom;
      } else {
        combinedMap.set(pop.id, {
          id: pop.id,
          ac: pop.ac,
          an: pop.an,
          ac_hom: pop.ac_hom,
        });
      }
    }

    return Array.from(combinedMap.values());
  }

  // All retries exhausted
  throw lastError ?? new Error(`Failed after ${MAX_RETRIES + 1} attempts`);
}

/**
 * Run aggregation over the Pinia store's variant data.
 *
 * For each configured subpopulation code (v2):
 * - Sum AC across all cached variants
 * - Take max AN (representative sample size)
 * - Calculate sumAF = sum of per-variant (ac/an)
 * - Carrier frequency = 2 * sumAF (simplified — VCR not used at subpopulation level)
 *
 * @param store - The subcontinental Pinia store (already populated with variant data)
 * @param parentFrequencies - Optional Map for founder effect detection
 */
function computeAggregatedFrequencies(
  variantData: Record<
    string,
    Array<{ id: string; ac: number; an: number; ac_hom: number }>
  >,
  parentFrequencies?: Map<string, number | null>,
): SubcontinentalPopulationFrequency[] {
  const subpopulations = getSubpopulations("v2");
  const { lowSampleSizeThreshold, founderEffectMultiplier } = config.settings;

  const result: SubcontinentalPopulationFrequency[] = [];

  for (const sub of subpopulations) {
    const code = sub.code;
    const parentCode = getSubpopulationParent(code, "v2") ?? "";
    const label = getSubpopulationLabel(code, "v2");

    let totalAC = 0;
    let maxAN = 0;
    let sumAF = 0;

    // Aggregate across all cached variants for this subpopulation
    for (const populations of Object.values(variantData)) {
      const pop = populations.find((p) => p.id === code);
      if (!pop) continue;

      totalAC += pop.ac;
      maxAN = Math.max(maxAN, pop.an);

      if (pop.an > 0) {
        sumAF += pop.ac / pop.an;
      }
    }

    const carrierFrequency = sumAF > 0 ? 2 * sumAF : null;
    const isLowSampleSize = maxAN < lowSampleSizeThreshold;

    // Founder effect detection: requires parentFrequencies parameter
    let isFounderEffect = false;
    if (
      carrierFrequency !== null &&
      parentFrequencies !== undefined &&
      parentCode
    ) {
      const parentCF = parentFrequencies.get(parentCode);
      if (parentCF !== null && parentCF !== undefined) {
        isFounderEffect = carrierFrequency > parentCF * founderEffectMultiplier;
      }
    }

    result.push({
      code,
      parentCode,
      label,
      carrierFrequency,
      alleleCount: totalAC,
      alleleNumber: maxAN,
      isLowSampleSize,
      isFounderEffect,
    });
  }

  // Sort by carrierFrequency descending, nulls at end
  result.sort((a, b) => {
    if (a.carrierFrequency === null && b.carrierFrequency === null) return 0;
    if (a.carrierFrequency === null) return 1;
    if (b.carrierFrequency === null) return -1;
    return b.carrierFrequency - a.carrierFrequency;
  });

  return result;
}

/**
 * Composable for subcontinental population data.
 *
 * Orchestrates N+1 variant fetching (one gnomAD v2 query per variant) with:
 * - Parallel batching (10 variants per batch) with progress tracking
 * - Cache-first pattern via Pinia session store (no duplicate requests for same gene)
 * - Cache invalidation on gene change
 * - Aggregation: per-subpopulation carrier frequencies with low sample size + founder effect detection
 *
 * Usage:
 * ```ts
 * const { isLoading, progress, subcontinentalFrequencies, fetchForVariants } =
 *   useSubcontinentalData();
 *
 * // After qualifyingVariants are computed:
 * await fetchForVariants(
 *   qualifyingVariants.map(v => v.variant_id),
 *   geneSymbol,
 *   // Optional: pass parent population frequencies for founder effect detection
 *   new Map(populations.map(p => [p.code, p.carrierFrequency]))
 * );
 * ```
 *
 * Note: This composable is NOT a singleton. Each caller gets its own reactive state.
 * Network deduplication is provided by the Pinia store cache-first pattern.
 */
export function useSubcontinentalData(): UseSubcontinentalDataReturn {
  const store = useSubcontinentalStore();
  const logger = useLogger("subcontinental");

  const isLoading = ref<boolean>(false);
  const progress = ref<number>(0);
  const error = ref<string | null>(null);
  const subcontinentalFrequencies = ref<SubcontinentalPopulationFrequency[]>(
    [],
  );

  async function fetchForVariants(
    variantIds: string[],
    gene: string,
    parentFrequencies?: Map<string, number | null>,
  ): Promise<void> {
    isLoading.value = true;
    progress.value = 0;
    error.value = null;

    // Invalidate cache if gene changed; no-op if same gene
    store.clearForGene(gene);

    // Determine which variant IDs still need fetching (not in cache)
    const toFetch = variantIds.filter((id) => !store.hasVariant(id));

    if (toFetch.length > 0) {
      let completed = 0;
      let batchFailures = 0;

      for (let i = 0; i < toFetch.length; i += BATCH_SIZE) {
        // Delay between batches to avoid rate limiting (skip for first batch)
        if (i > 0) {
          await sleep(INTER_BATCH_DELAY_MS);
        }

        const batch = toFetch.slice(i, i + BATCH_SIZE);

        // Fetch all variants in this batch in parallel
        const results = await Promise.allSettled(
          batch.map((id) =>
            fetchSingleVariant(id).then((pops) => ({ id, pops })),
          ),
        );

        let batchAllFailed = true;
        for (const result of results) {
          if (result.status === "fulfilled") {
            batchAllFailed = false;
            const { id, pops } = result.value;
            if (pops !== null) {
              // Filter to only configured subpopulation codes (excludes continental
              // IDs like "nfe", sex-specific IDs like "XX" / "nfe_bgr_XX", etc.)
              const subpopCodes = new Set(
                getSubpopulations("v2").map((s) => s.code),
              );
              const filtered = pops.filter((p) => subpopCodes.has(p.id));
              store.setVariantData(id, filtered);
            } else {
              // Variant not found in v2 — store empty array so hasVariant() returns true
              // and we don't re-fetch on subsequent calls
              store.setVariantData(id, []);
            }
          } else {
            // Individual variant fetch failed — log and continue
            const batchIndex = results.indexOf(result);
            const failedId = batch[batchIndex];
            logger.warn(`Failed to fetch variant ${failedId}`, {
              reason: result.reason,
            });
            batchFailures++;
          }
        }

        if (batchAllFailed) {
          // All variants in this batch failed — count as a full batch error
          // (individual variant failures above only log warnings)
        }

        completed += batch.length;
        progress.value = Math.round((completed / toFetch.length) * 100);
      }

      if (batchFailures > 0) {
        error.value = `${batchFailures} of ${toFetch.length} variant fetch(es) failed. Subcontinental frequencies may be incomplete.`;
      }
    } else {
      // All variants already cached — jump straight to 100%
      progress.value = 100;
    }

    // Run aggregation over all cached variant data (includes previously cached + newly fetched)
    // Only aggregate variants that were requested (variantIds), not everything in the store.
    // This prevents stale variants from being included if the user changes filters.
    const relevantVariantData: Record<
      string,
      Array<{ id: string; ac: number; an: number; ac_hom: number }>
    > = {};
    for (const id of variantIds) {
      if (store.hasVariant(id)) {
        const cached = store.variantData[id];
        if (cached !== undefined) {
          relevantVariantData[id] = cached;
        }
      }
    }

    subcontinentalFrequencies.value = computeAggregatedFrequencies(
      relevantVariantData,
      parentFrequencies,
    );

    isLoading.value = false;
  }

  function clear(): void {
    isLoading.value = false;
    progress.value = 0;
    error.value = null;
    subcontinentalFrequencies.value = [];
    store.reset();
  }

  return {
    isLoading,
    progress,
    error,
    subcontinentalFrequencies,
    fetchForVariants,
    clear,
  };
}
