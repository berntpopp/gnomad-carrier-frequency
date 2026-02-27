import { defineStore } from "pinia";

/**
 * Session-level Pinia store for subcontinental population data.
 *
 * Caches per-variant subcontinental population arrays keyed by variant ID,
 * scoped to a single gene at a time.
 *
 * NO persistence — this is a session-level cache only (same pattern as
 * useOrphanetStore). Data is fetched fresh on each page load.
 *
 * Record<string, ...> is used instead of Map:
 * - Pinia reactivity requires plain objects (Maps need special handling)
 * - JSON serialization compatible (for potential future devtools support)
 */
export const useSubcontinentalStore = defineStore("subcontinental", {
  state: () => ({
    /**
     * Gene symbol this cache is for.
     * null = no data loaded yet.
     * When fetching for a new gene, clearForGene() resets this and variantData.
     */
    gene: null as string | null,

    /**
     * Per-variant subcontinental population data.
     * Key: variant_id (e.g., "1-55516888-G-GA")
     * Value: array of subcontinental population objects (id, ac, an, ac_hom)
     *        Only subcontinental population IDs are stored (e.g., "nfe_bgr"),
     *        continental IDs (e.g., "nfe") and sex-specific IDs (e.g., "XX") are excluded.
     */
    variantData: {} as Record<
      string,
      Array<{ id: string; ac: number; an: number; ac_hom: number }>
    >,
  }),

  actions: {
    /**
     * Stores subcontinental population data for a single variant.
     * Called after each successful N+1 fetch in useSubcontinentalData.
     */
    setVariantData(
      variantId: string,
      populations: Array<{
        id: string;
        ac: number;
        an: number;
        ac_hom: number;
      }>,
    ): void {
      this.variantData[variantId] = populations;
    },

    /**
     * Returns true if subcontinental data for this variant is already cached.
     * Used by fetchForVariants to skip already-fetched variants.
     */
    hasVariant(variantId: string): boolean {
      return Object.prototype.hasOwnProperty.call(this.variantData, variantId);
    },

    /**
     * Invalidates the cache if the current gene differs from geneSymbol.
     * If gene matches, the existing cache is still valid — does nothing.
     *
     * Must be called at the start of fetchForVariants to prevent stale data
     * from a previous gene contaminating the new gene's aggregation.
     */
    clearForGene(geneSymbol: string): void {
      if (this.gene !== geneSymbol) {
        this.variantData = {};
        this.gene = geneSymbol;
      }
    },

    /**
     * Resets all state. Called by useSubcontinentalData.clear().
     */
    reset(): void {
      this.gene = null;
      this.variantData = {};
    },
  },

  // NO persist — session-level cache only
});
