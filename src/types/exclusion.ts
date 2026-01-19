// Exclusion types for manual variant exclusion feature

/**
 * Predefined exclusion reasons for quick selection
 */
export type PredefinedExclusionReason =
  | 'likely_benign'
  | 'low_quality'
  | 'population_specific'
  | 'other';

/**
 * Exclusion reason - either predefined or custom text
 */
export interface ExclusionReason {
  type: PredefinedExclusionReason;
  customText?: string; // Only used when type is 'other'
}

/**
 * State for tracking excluded variants
 * Managed by useExclusionState composable
 */
export interface ExclusionState {
  /** Set of excluded variant IDs */
  excluded: Set<string>;
  /** Map of variant ID to exclusion reason */
  reasons: Map<string, ExclusionReason>;
  /** Gene symbol these exclusions apply to (for reset detection) */
  geneSymbol: string | null;
}
