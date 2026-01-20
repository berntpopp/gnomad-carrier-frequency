import type { GnomadVersion } from '@/config';
import type { IndexPatientStatus, FrequencySource } from './wizard';
import type { FilterConfig } from './filter';

/**
 * Represents a saved calculation in history.
 * Contains all state needed to restore or display a previous calculation.
 */
export interface HistoryEntry {
  /** Unique identifier (UUID) */
  id: string;
  /** Unix timestamp when saved */
  timestamp: number;

  /** Gene information */
  gene: {
    ensembl_id: string;
    symbol: string;
  };

  /** Wizard state snapshot */
  indexStatus: IndexPatientStatus;
  frequencySource: FrequencySource;
  literatureFrequency: number | null;
  literaturePmid: string | null;

  /** Filter configuration snapshot */
  filterConfig: FilterConfig;

  /** Excluded variant IDs (reasons not stored for space) */
  excludedVariantIds: string[];

  /** Results snapshot for display without recalculation */
  results: {
    globalCarrierFrequency: number;
    qualifyingVariantCount: number;
    gnomadVersion: GnomadVersion;
  };
}

/**
 * History store settings
 */
export interface HistorySettings {
  /** Maximum number of entries to keep (FIFO cleanup) */
  maxEntries: number;
}

/**
 * History store state
 */
export interface HistoryStoreState {
  entries: HistoryEntry[];
  settings: HistorySettings;
}
