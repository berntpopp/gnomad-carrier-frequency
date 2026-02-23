/**
 * ClinGen gene-disease validity types
 *
 * Provides type definitions for ClinGen CSV data, cache state,
 * and gene validity lookup results.
 */

/**
 * Single ClinGen gene-disease validity entry (parsed from CSV)
 * CSV columns: GENE SYMBOL, GENE ID (HGNC), DISEASE LABEL, DISEASE ID (MONDO), MOI, SOP, CLASSIFICATION, ONLINE REPORT, CLASSIFICATION DATE, GCEP
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
