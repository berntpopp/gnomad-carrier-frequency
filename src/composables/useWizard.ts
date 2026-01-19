// Wizard state management composable

import { reactive, computed, watch } from 'vue';
import type { WizardState, WizardStep, FrequencySource } from '@/types';

/**
 * Composable for managing the 4-step wizard flow.
 * Handles step navigation, validation, and downstream state reset.
 */
export function useWizard() {
  const state = reactive<WizardState>({
    currentStep: 1,
    gene: null,
    indexStatus: 'heterozygous', // User decision: default to carrier
    frequencySource: 'gnomad',
    literatureFrequency: null,
    literaturePmid: null,
  });

  // Step validation computeds
  const step1Valid = computed(() => state.gene !== null);

  const step2Valid = computed(() => true); // Always valid - has default

  const step3Valid = computed(() => {
    switch (state.frequencySource) {
      case 'gnomad':
        return true; // Uses calculated value
      case 'literature':
        return (
          state.literatureFrequency !== null &&
          state.literatureFrequency > 0 &&
          state.literatureFrequency <= 1 &&
          state.literaturePmid !== null &&
          state.literaturePmid.trim().length > 0
        );
      case 'default':
        return true; // Uses config value
      default:
        return false;
    }
  });

  // Can user proceed from current step?
  const canProceed = computed(() => {
    switch (state.currentStep) {
      case 1:
        return step1Valid.value;
      case 2:
        return step2Valid.value;
      case 3:
        return step3Valid.value;
      case 4:
        return false; // Final step, no proceed
      default:
        return false;
    }
  });

  // Step validation map for goToStep
  const stepValidations = computed(() => ({
    1: true, // Can always go to step 1
    2: step1Valid.value,
    3: step1Valid.value && step2Valid.value,
    4: step1Valid.value && step2Valid.value && step3Valid.value,
  }));

  // Downstream reset: when gene changes and we're past step 1, reset
  watch(
    () => state.gene,
    (_newGene, oldGene) => {
      // Only reset if gene actually changed (not initial set) and we're past step 1
      if (oldGene !== null && state.currentStep > 1) {
        state.currentStep = 1;
        state.indexStatus = 'heterozygous';
        state.frequencySource = 'gnomad';
        state.literatureFrequency = null;
        state.literaturePmid = null;
      }
    },
  );

  // Navigation methods
  function nextStep(): void {
    if (canProceed.value && state.currentStep < 4) {
      state.currentStep = (state.currentStep + 1) as WizardStep;
    }
  }

  function prevStep(): void {
    if (state.currentStep > 1) {
      state.currentStep = (state.currentStep - 1) as WizardStep;
    }
  }

  function goToStep(step: WizardStep): void {
    // Can go to current step or earlier, or to next step if prior steps valid
    if (step <= state.currentStep || stepValidations.value[step]) {
      state.currentStep = step;
    }
  }

  function resetWizard(): void {
    state.currentStep = 1;
    state.gene = null;
    state.indexStatus = 'heterozygous';
    state.frequencySource = 'gnomad';
    state.literatureFrequency = null;
    state.literaturePmid = null;
  }

  // Setter for frequency source with type narrowing
  function setFrequencySource(source: FrequencySource): void {
    state.frequencySource = source;
    // Clear literature values when switching away from literature
    if (source !== 'literature') {
      state.literatureFrequency = null;
      state.literaturePmid = null;
    }
  }

  return {
    state,
    canProceed,
    step1Valid,
    step2Valid,
    step3Valid,
    nextStep,
    prevStep,
    goToStep,
    resetWizard,
    setFrequencySource,
  };
}

export type UseWizardReturn = ReturnType<typeof useWizard>;
