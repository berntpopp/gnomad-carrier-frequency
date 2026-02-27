import { ref, computed, type Ref, type ComputedRef } from "vue";
import {
  fetchOrphanetData,
  selectPrimaryDisease,
  type OrphanetDisease,
  type OrphanetResult,
} from "@gnomad-cf/core/orphanet";
import { useOrphanetStore } from "@/stores/useOrphanetStore";

export interface UseOrphanetDataReturn {
  /** True while fetch is in progress */
  loading: Ref<boolean>;
  /** Enriched disease list from Orphanet result */
  diseases: Ref<OrphanetDisease[]>;
  /** Primary disease selected by selectPrimaryDisease (AR preferred + highest valMoy) */
  primaryDisease: ComputedRef<OrphanetDisease | undefined>;
  /**
   * Additional diseases beyond the primary, filtered to those with bestPrevalence.
   * These are shown in the +N more expansion area.
   */
  additionalDiseases: ComputedRef<OrphanetDisease[]>;
  /** Error message from fetch, or null */
  error: Ref<string | null>;
  /** True when diseases.length > 0 and no error */
  hasData: ComputedRef<boolean>;
  /**
   * Fetch Orphanet data for a gene symbol.
   *
   * Cache-first: if the Pinia store already has data for this gene, populates
   * local reactive refs instantly from cache without any network request.
   * Duplicate in-flight fetches are skipped via the pending flag.
   */
  fetchForGene: (geneSymbol: string) => Promise<void>;
}

/**
 * Composable for Orphanet prevalence data.
 *
 * Each call to useOrphanetData() creates its own reactive state (loading,
 * diseases, error). The Pinia store (useOrphanetStore) is the shared session
 * cache. When fetchForGene is called for a gene already in the store, local
 * refs are populated instantly from cache — no network request.
 *
 * Sharing pattern: multiple components can independently call
 * fetchForGene('CFTR') — only the first call hits the network; subsequent
 * calls read from the Pinia store cache instantly.
 *
 * Eager fetch trigger (watching gene symbol changes in the wizard flow) is
 * wired in Plan 03 when connecting to StepResults/useWizard.
 */
export function useOrphanetData(): UseOrphanetDataReturn {
  const store = useOrphanetStore();

  const loading = ref<boolean>(false);
  const diseases = ref<OrphanetDisease[]>([]);
  const error = ref<string | null>(null);

  const primaryDisease = computed<OrphanetDisease | undefined>(() =>
    selectPrimaryDisease(diseases.value),
  );

  const additionalDiseases = computed<OrphanetDisease[]>(() => {
    const primary = primaryDisease.value;
    if (!primary) return [];
    // All diseases except primary, filtered to those with bestPrevalence data
    return diseases.value.filter(
      (d) => d.orphacode !== primary.orphacode && d.bestPrevalence !== null,
    );
  });

  const hasData = computed<boolean>(
    () => diseases.value.length > 0 && error.value === null,
  );

  /**
   * Populate local reactive refs from a cached or freshly-fetched result.
   */
  function populateFromResult(result: OrphanetResult): void {
    diseases.value = result.diseases;
    error.value = result.error;
    loading.value = false;
  }

  async function fetchForGene(geneSymbol: string): Promise<void> {
    // --- Cache-first path ---
    const cached = store.getCached(geneSymbol);
    if (cached) {
      populateFromResult(cached);
      return;
    }

    // --- Skip duplicate in-flight fetch ---
    if (store.isPending(geneSymbol)) {
      return;
    }

    // --- Network fetch path ---
    loading.value = true;
    error.value = null;
    store.setPending(geneSymbol, true);

    try {
      const result = await fetchOrphanetData(geneSymbol);
      store.setCached(geneSymbol, result);
      populateFromResult(result);
    } catch (err) {
      // fetchOrphanetData handles its own errors and returns a result with
      // error string, so this catch handles truly unexpected exceptions only.
      const message =
        err instanceof Error ? err.message : "Unexpected error fetching Orphanet data";
      error.value = message;
      loading.value = false;
    } finally {
      store.setPending(geneSymbol, false);
    }
  }

  return {
    loading,
    diseases,
    primaryDisease,
    additionalDiseases,
    error,
    hasData,
    fetchForGene,
  };
}
