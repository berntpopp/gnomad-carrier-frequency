/**
 * ClinGen gene-disease validity types
 *
 * Provides type definitions for ClinGen API data, cache state,
 * and gene validity lookup results.
 */

/**
 * Raw API response row from ClinGen validity endpoint
 * https://search.clinicalgenome.org/api/validity?queryParams
 */
export interface ClingenApiRow {
  symbol: string;
  hgnc_id: string;
  disease_name: string;
  mondo: string;
  moi: string; // AD, AR, XL, SD, UD
  classification: string; // Definitive, Moderate, Limited, Disputed, Refuted, No Known Disease Relationship
  ep: string; // Expert panel
  sop: string;
  order: number;
  perm_id: string;
  released: string;
  animal_model_only: boolean;
}

/**
 * ClinGen API response structure
 */
export interface ClingenApiResponse {
  rows: ClingenApiRow[];
}

/**
 * Single ClinGen gene-disease validity entry (normalized from API)
 */
export interface ClingenEntry {
  geneSymbol: string;
  hgncId: string;
  diseaseLabel: string;
  mondoId: string;
  moi: string; // Mode of Inheritance (AD, AR, XL, SD, UD)
  classification: string;
  expertPanel: string;
  classificationDate: string;
  permId: string;
}

/**
 * Cache state for ClinGen data in Pinia store
 */
export interface ClingenCacheState {
  data: ClingenEntry[] | null;
  lastFetched: number | null; // Unix timestamp in ms
  error: string | null;
}

/**
 * Result of looking up a gene in ClinGen data
 */
export interface ClingenValidityResult {
  found: boolean;
  hasAutosomalRecessive: boolean;
  entries: ClingenEntry[]; // All entries for this gene
  arEntries: ClingenEntry[]; // Only AR entries
}

/**
 * Cache expiry constant (30 days in milliseconds)
 */
export const CLINGEN_CACHE_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000;
