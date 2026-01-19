// Filter configuration types for variant filtering

/**
 * Configuration for variant filtering
 * Controls which variant types are included in carrier frequency calculation
 */
export interface FilterConfig {
  /** Toggle for LoF High Confidence filter (LOFTEE HC on canonical transcript) */
  lofHcEnabled: boolean;
  /** Toggle for missense variants inclusion */
  missenseEnabled: boolean;
  /** Toggle for ClinVar Pathogenic/Likely Pathogenic filter */
  clinvarEnabled: boolean;
  /** ClinVar review star threshold (0-4), variants must have >= this many stars */
  clinvarStarThreshold: number;
}

/**
 * Type alias for FilterConfig when used in store context
 * Semantically represents user's saved default filter settings
 */
export type FilterDefaults = FilterConfig;

/**
 * Factory default filter configuration
 * Used for initial state and reset functionality
 */
export const FACTORY_FILTER_DEFAULTS: FilterConfig = {
  lofHcEnabled: true,
  missenseEnabled: true,
  clinvarEnabled: true,
  clinvarStarThreshold: 1,
};
