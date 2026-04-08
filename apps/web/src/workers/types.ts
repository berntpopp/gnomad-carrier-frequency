// Shared types for the variant processing web worker

import type {
  GnomadVariant,
  ClinVarVariant,
  FilterConfig,
  QualityFlag,
  QualitySettings,
  QualityExclusionConfig,
  CalcConfig,
} from "@gnomad-cf/core/types";
import type { SourceCategory } from "@gnomad-cf/core/filters";
import type { ClinVarSubmission } from "@gnomad-cf/core/queries";

/**
 * Parameters for processGene worker call.
 * Main thread sends these; worker fetches, caches, filters, aggregates.
 */
export interface ProcessGeneParams {
  geneSymbol: string;
  dataset: string;
  referenceGenome: string;
  apiEndpoint: string;
  filterConfig: FilterConfig;
  qualitySettings: QualitySettings;
  qualityExclusionConfig: QualityExclusionConfig;
  calcConfig: CalcConfig;
  excludedIds: string[];
  submissions: [string, ClinVarSubmission[]][];
  forceRefresh?: boolean;
  requestId: number;
}

/**
 * Parameters for refilter worker call.
 * Uses cached raw variants — no network fetch.
 */
export interface RefilterParams {
  filterConfig: FilterConfig;
  qualitySettings: QualitySettings;
  qualityExclusionConfig: QualityExclusionConfig;
  calcConfig: CalcConfig;
  excludedIds: string[];
  submissions: [string, ClinVarSubmission[]][];
  requestId: number;
}

/**
 * Pre-computed global statistics from the worker pipeline.
 */
export interface WorkerGlobalStats {
  totalAC: number;
  maxAN: number;
  sumAF: number;
  vcrs: number[];
  carrierFrequency: number | null;
  geneticPrevalence: number | null;
  bayesianPrevalence: number | null;
  formula: "hwe" | "simplified";
  homExclusionActive: boolean;
}

/**
 * Aggregated population data — serializable form of the Map returned
 * by aggregatePopulationFrequenciesWithConfig.
 */
export interface AggregatedPopEntry {
  code: string;
  carrierFrequency: number | null;
  sumAF: number;
  totalAC: number;
  maxAN: number;
  geneticPrevalence: number | null;
}

/**
 * Full result returned by the worker after processGene or refilter.
 */
export interface WorkerResult {
  /** Variants passing pathogenicity filters (before manual/quality exclusions) */
  filteredByPathogenicity: GnomadVariant[];
  /** Variants passing all exclusions (pathogenicity + manual + quality) */
  qualifyingVariants: GnomadVariant[];
  /** ClinVar variants from the API response */
  clinvarVariants: ClinVarVariant[];
  /** Quality flags per variant ID (serialized Map entries) */
  qualityFlagsMap: [string, QualityFlag[]][];
  /** Variant IDs excluded by quality config */
  qualityExcludedIds: string[];
  /** Source classification per variant ID (serialized Map entries) */
  sourceCategoryMap: [string, SourceCategory][];
  /** Aggregated population data (serialized from Map) */
  aggregatedPops: AggregatedPopEntry[] | null;
  /** Pre-computed global statistics */
  globalStats: WorkerGlobalStats;
  /** Total raw variant count before any filtering */
  totalVariantCount: number;
  /** Cache status for this request */
  cacheStatus: "hit" | "miss" | "stored" | "unavailable";
  /** Request ID for stale-result detection */
  requestId: number;
}

/**
 * Status updates posted by the worker during processing.
 */
export type WorkerStatus =
  | { type: "fetching"; requestId: number }
  | { type: "parsing"; totalVariants: number; requestId: number }
  | { type: "filtering"; requestId: number }
  | { type: "complete"; result: WorkerResult }
  | { type: "error"; message: string; requestId: number }
  | { type: "cache-hit"; geneSymbol: string; requestId: number };

/**
 * Cached gnomAD response stored in IndexedDB.
 */
export interface CachedResponse {
  key: string;
  geneSymbol: string;
  dataset: string;
  referenceGenome: string;
  variants: GnomadVariant[];
  clinvarVariants: ClinVarVariant[];
  totalVariantCount: number;
  storedAt: number;
}
