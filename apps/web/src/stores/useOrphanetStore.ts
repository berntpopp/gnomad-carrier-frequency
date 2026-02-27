import { defineStore } from "pinia";
import type { OrphanetResult } from "@gnomad-cf/core/orphanet";

/**
 * Session-level Pinia store for Orphanet data.
 *
 * Caches OrphanetResult per gene symbol (lowercase key).
 * NO persistence — data is per-session and fetched fresh on each page load.
 * This is intentional: Orphanet prevalence data changes infrequently and
 * network fetches are cheap relative to clinical-data accuracy requirements.
 *
 * Record<string, ...> is used instead of Map (Maps are not reactive in Vue 3
 * reactive state without special handling, and Pinia persistence doesn't
 * serialize Maps correctly).
 */
export const useOrphanetStore = defineStore("orphanet", {
  state: () => ({
    /**
     * Map of lowercase gene symbol → OrphanetResult.
     * Empty diseases array in result means "fetched but no data found".
     */
    cache: {} as Record<string, OrphanetResult>,

    /**
     * Tracks genes currently being fetched to prevent duplicate in-flight requests.
     * Keyed by lowercase gene symbol.
     */
    pending: {} as Record<string, boolean>,
  }),

  actions: {
    /**
     * Returns cached result for a gene symbol, or undefined if not cached.
     * Key is always lowercased for consistency.
     */
    getCached(geneSymbol: string): OrphanetResult | undefined {
      return this.cache[geneSymbol.toLowerCase()];
    },

    /**
     * Stores a fetched result in the session cache.
     * Key is always lowercased for consistency.
     */
    setCached(geneSymbol: string, result: OrphanetResult): void {
      this.cache[geneSymbol.toLowerCase()] = result;
    },

    /**
     * Returns true if a fetch is currently in progress for this gene.
     */
    isPending(geneSymbol: string): boolean {
      return this.pending[geneSymbol.toLowerCase()] === true;
    },

    /**
     * Sets or clears the pending flag for a gene.
     */
    setPending(geneSymbol: string, value: boolean): void {
      this.pending[geneSymbol.toLowerCase()] = value;
    },
  },

  // NO persist — session-level cache only
});
