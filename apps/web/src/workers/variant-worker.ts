/**
 * Web Worker entry point — orchestrates fetching, caching, and processing.
 *
 * Exposed via Comlink so the main thread can call methods as async functions
 * without manual postMessage wiring.
 */

import * as Comlink from "comlink";

import { GENE_VARIANTS_QUERY } from "@gnomad-cf/core/queries";
import type {
  GeneVariant,
  GeneClinvarVariant,
  GeneVariantsResponse,
} from "@gnomad-cf/core/queries";

import type { GnomadVersion } from "@gnomad-cf/core/config";
import type { GnomadVariant, ClinVarVariant } from "@gnomad-cf/core/types";

import type {
  ProcessGeneParams,
  RefilterParams,
  WorkerResult,
  CachedResponse,
} from "./types";

import {
  buildCacheKey,
  getCachedResponse,
  putCachedResponse,
  clearAllCache,
  clearCacheByGene,
  getCacheSize,
} from "./cache";

import { processVariants } from "./variant-pipeline";

// ---------------------------------------------------------------------------
// In-memory state — holds the current gene's raw variants for refilter
// ---------------------------------------------------------------------------

let currentVariants: GnomadVariant[] = [];
let currentClinvarVariants: ClinVarVariant[] = [];
let currentVersion: GnomadVersion = "v4";

// ---------------------------------------------------------------------------
// Normalization helpers
// ---------------------------------------------------------------------------

/**
 * Map the GraphQL GeneVariant shape to the core GnomadVariant shape.
 * exome/genome null → undefined (per GnomadVariant interface).
 */
function normalizeVariant(v: GeneVariant): GnomadVariant {
  return {
    variant_id: v.variant_id,
    pos: v.pos,
    ref: v.ref,
    alt: v.alt,
    exome: v.exome ?? undefined,
    genome: v.genome ?? undefined,
    joint: v.joint ?? undefined,
    transcript_consequence: v.transcript_consequence,
  };
}

/**
 * Map the GraphQL GeneClinvarVariant shape to the core ClinVarVariant shape.
 * The shapes are identical; this provides an explicit boundary.
 */
function normalizeClinvar(cv: GeneClinvarVariant): ClinVarVariant {
  return {
    variant_id: cv.variant_id,
    clinvar_variation_id: cv.clinvar_variation_id,
    clinical_significance: cv.clinical_significance,
    gold_stars: cv.gold_stars,
    review_status: cv.review_status,
    pos: cv.pos,
    ref: cv.ref,
    alt: cv.alt,
  };
}

/**
 * Infer GnomadVersion from a dataset string.
 *   gnomad_r4* / exac → v4
 *   gnomad_r3*        → v3
 *   anything else     → v2
 */
function datasetToVersion(dataset: string): GnomadVersion {
  if (dataset.includes("r4") || dataset.startsWith("exac")) return "v4";
  if (dataset.includes("r3")) return "v3";
  return "v2";
}

// ---------------------------------------------------------------------------
// Worker API
// ---------------------------------------------------------------------------

const workerApi = {
  /**
   * Fetch (or load from cache), filter, and aggregate variants for a gene.
   */
  async processGene(params: ProcessGeneParams): Promise<WorkerResult> {
    const {
      geneSymbol,
      dataset,
      referenceGenome,
      apiEndpoint,
      filterConfig,
      qualitySettings,
      qualityExclusionConfig,
      calcConfig,
      excludedIds,
      submissions,
      forceRefresh = false,
      requestId,
    } = params;

    const cacheKey = buildCacheKey(geneSymbol, dataset, referenceGenome);
    const version = datasetToVersion(dataset);
    currentVersion = version;

    // ------------------------------------------------------------------
    // 1. Try cache (unless force-refresh requested)
    // ------------------------------------------------------------------
    if (!forceRefresh) {
      try {
        const cached = await getCachedResponse(cacheKey);
        if (cached !== null) {
          currentVariants = cached.variants;
          currentClinvarVariants = cached.clinvarVariants;

          const output = processVariants({
            variants: currentVariants,
            clinvarVariants: currentClinvarVariants,
            filterConfig,
            qualitySettings,
            qualityExclusionConfig,
            calcConfig,
            excludedIds,
            submissions,
            version,
          });

          return { ...output, cacheStatus: "hit", requestId };
        }
      } catch {
        // IndexedDB unavailable (private browsing, quota exceeded, etc.)
        // Fall through to network fetch; cacheStatus will be "unavailable"
      }
    }

    // ------------------------------------------------------------------
    // 2. Fetch from gnomAD GraphQL API
    // ------------------------------------------------------------------
    let fetchResponse: Response;
    try {
      fetchResponse = await fetch(apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: GENE_VARIANTS_QUERY,
          variables: { geneSymbol, dataset, referenceGenome },
        }),
      });
    } catch (networkError) {
      throw new Error(
        `Network error while fetching variants for ${geneSymbol}: ${String(networkError)}`,
      );
    }

    if (fetchResponse.status === 429) {
      throw new Error(
        "gnomAD API rate limit reached (HTTP 429). Please wait a moment and try again.",
      );
    }

    if (!fetchResponse.ok) {
      throw new Error(
        `gnomAD API returned HTTP ${fetchResponse.status} for ${geneSymbol}.`,
      );
    }

    const json = (await fetchResponse.json()) as { data: GeneVariantsResponse };
    const geneData = json.data?.gene;

    if (!geneData) {
      throw new Error(
        `Gene "${geneSymbol}" not found in gnomAD (dataset: ${dataset}).`,
      );
    }

    // ------------------------------------------------------------------
    // 3. Normalize
    // ------------------------------------------------------------------
    currentVariants = geneData.variants.map(normalizeVariant);
    currentClinvarVariants = geneData.clinvar_variants.map(normalizeClinvar);

    // ------------------------------------------------------------------
    // 4. Write to cache (best-effort — don't fail if unavailable)
    // ------------------------------------------------------------------
    let cacheStatus: WorkerResult["cacheStatus"] = "stored";
    try {
      const entry: CachedResponse = {
        key: cacheKey,
        geneSymbol,
        dataset,
        referenceGenome,
        variants: currentVariants,
        clinvarVariants: currentClinvarVariants,
        totalVariantCount: currentVariants.length,
        storedAt: Date.now(),
      };
      await putCachedResponse(entry);
    } catch {
      cacheStatus = "unavailable";
    }

    // ------------------------------------------------------------------
    // 5. Run pipeline
    // ------------------------------------------------------------------
    const output = processVariants({
      variants: currentVariants,
      clinvarVariants: currentClinvarVariants,
      filterConfig,
      qualitySettings,
      qualityExclusionConfig,
      calcConfig,
      excludedIds,
      submissions,
      version,
    });

    return { ...output, cacheStatus, requestId };
  },

  /**
   * Re-run the processing pipeline with in-memory cached variants.
   * No network fetch; uses whatever processGene stored in module state.
   */
  async refilter(params: RefilterParams): Promise<WorkerResult> {
    const {
      filterConfig,
      qualitySettings,
      qualityExclusionConfig,
      calcConfig,
      excludedIds,
      submissions,
      requestId,
    } = params;

    const output = processVariants({
      variants: currentVariants,
      clinvarVariants: currentClinvarVariants,
      filterConfig,
      qualitySettings,
      qualityExclusionConfig,
      calcConfig,
      excludedIds,
      submissions,
      version: currentVersion,
    });

    return { ...output, cacheStatus: "hit", requestId };
  },

  /** Remove cached entries. If geneSymbol is provided, removes only that gene's entries. */
  async clearCache(geneSymbol?: string): Promise<void> {
    if (geneSymbol) {
      await clearCacheByGene(geneSymbol);
    } else {
      await clearAllCache();
    }
  },

  /** Return the number of entries currently stored in the cache. */
  async getCacheSize(): Promise<number> {
    return getCacheSize();
  },
};

export type VariantWorkerAPI = typeof workerApi;

Comlink.expose(workerApi);
