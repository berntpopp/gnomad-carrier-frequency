// Wizard state management types

import type { IndexPatientStatus } from './frequency';
import type { GeneSearchResult } from '@/api/queries/types';

export type WizardStep = 1 | 2 | 3 | 4;
export type FrequencySource = 'gnomad' | 'literature' | 'default';

export interface WizardState {
  currentStep: WizardStep;
  // Step 1: Gene selection
  gene: GeneSearchResult | null;
  // Step 2: Index patient status
  indexStatus: IndexPatientStatus;
  // Step 3: Frequency source
  frequencySource: FrequencySource;
  literatureFrequency: number | null;
  literaturePmid: string | null;
}
