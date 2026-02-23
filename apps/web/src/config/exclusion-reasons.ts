// Predefined exclusion reason options for UI dropdowns
import type { PredefinedExclusionReason } from '@/types';

export interface ExclusionReasonOption {
  value: PredefinedExclusionReason;
  label: string;
  description: string;
}

/**
 * Predefined exclusion reasons for dropdown selection
 * Per CONTEXT.md: "Likely benign", "Low quality", "Population-specific", "Other"
 */
export const EXCLUSION_REASONS: ExclusionReasonOption[] = [
  {
    value: 'likely_benign',
    label: 'Likely benign',
    description: 'Variant appears benign based on clinical evidence',
  },
  {
    value: 'low_quality',
    label: 'Low quality',
    description: 'Sequencing quality concerns for this variant',
  },
  {
    value: 'population_specific',
    label: 'Population-specific',
    description: 'Variant frequency specific to certain populations',
  },
  {
    value: 'other',
    label: 'Other',
    description: 'Custom reason (specify below)',
  },
];
