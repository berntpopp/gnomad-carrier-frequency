/**
 * ClinGen gene-disease validity types
 *
 * Provides type definitions for ClinGen CSV data, cache state,
 * and gene validity lookup results.
 */

/**
 * Single ClinGen gene-disease validity entry
 * Maps to CSV columns from https://search.clinicalgenome.org/kb/gene-validity/download
 */
export interface ClingenEntry {
  geneSymbol: string; // Column 0: GENE SYMBOL
  hgncId: string; // Column 1: GENE ID (HGNC)
  diseaseLabel: string; // Column 2: DISEASE LABEL
  mondoId: string; // Column 3: DISEASE ID (MONDO)
  moi: string; // Column 4: MOI (Mode of Inheritance)
  classification: string; // Column 5: CLASSIFICATION
  onlineReport: string; // Column 7: ONLINE REPORT (URL)
  classificationDate: string; // Column 8: CLASSIFICATION DATE
  gcep: string; // Column 9: GCEP (expert panel)
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
