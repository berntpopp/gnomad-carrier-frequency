<template>
  <v-stepper
    v-model="state.currentStep"
    flat
    :alt-labels="smAndDown"
    class="wizard-stepper"
    data-testid="wizard-stepper"
  >
    <v-stepper-header>
      <v-stepper-item
        :complete="state.currentStep > 1"
        :value="1"
        :title="xs ? '' : 'Gene'"
        :subtitle="smAndDown ? undefined : 'Search and select'"
        data-testid="wizard-step-1"
      />
      <v-divider />
      <v-stepper-item
        :complete="state.currentStep > 2"
        :value="2"
        :title="xs ? '' : 'Status'"
        :subtitle="smAndDown ? undefined : 'Carrier or affected'"
        data-testid="wizard-step-2"
      />
      <v-divider />
      <v-stepper-item
        :complete="state.currentStep > 3"
        :value="3"
        :title="xs ? '' : 'Freq'"
        :subtitle="smAndDown ? undefined : 'Select source'"
        data-testid="wizard-step-3"
      />
      <v-divider />
      <v-stepper-item
        :value="4"
        :title="xs ? '' : 'Results'"
        :subtitle="smAndDown ? undefined : 'View calculations'"
        data-testid="wizard-step-4"
      />
    </v-stepper-header>

    <v-stepper-window data-testid="wizard-content">
      <v-stepper-window-item :value="1">
        <StepGene
          v-model="state.gene"
          @complete="onGeneComplete"
        />
      </v-stepper-window-item>

      <v-stepper-window-item :value="2">
        <StepStatus
          v-model="state.indexStatus"
          @complete="nextStep"
          @back="prevStep"
        />
      </v-stepper-window-item>

      <v-stepper-window-item :value="3">
        <StepFrequency
          :source="state.frequencySource"
          :literature-frequency="state.literatureFrequency"
          :literature-pmid="state.literaturePmid"
          :gnomad-frequency="globalFrequency"
          :gnomad-loading="isLoading"
          :using-default="usingDefault"
          @update:source="state.frequencySource = $event"
          @update:literature-frequency="state.literatureFrequency = $event"
          @update:literature-pmid="state.literaturePmid = $event"
          @complete="nextStep"
          @back="prevStep"
        />
      </v-stepper-window-item>

      <v-stepper-window-item :value="4">
        <StepResults
          :result="result"
          :global-frequency="globalFrequency"
          :index-status="state.indexStatus"
          :frequency-source="state.frequencySource"
          :literature-frequency="state.literatureFrequency"
          :literature-pmid="state.literaturePmid"
          :using-default="usingDefault"
          :variants="variants"
          :clinvar-variants="clinvarVariants"
          :filter-config="filterConfig"
          :submissions="submissions"
          :conflicting-variant-ids="conflictingVariantIds"
          :is-loading-submissions="isLoadingSubmissions"
          :submissions-progress="submissionsProgress"
          @update:filter-config="setFilterConfig"
          @back="prevStep"
          @restart="resetWizard"
        />
      </v-stepper-window-item>
    </v-stepper-window>

    <!-- Error state -->
    <v-alert
      v-if="hasError"
      type="error"
      variant="tonal"
      class="mt-4"
    >
      {{ errorMessage }}
      <template #append>
        <v-btn
          variant="text"
          @click="refetch"
        >
          Retry
        </v-btn>
      </template>
    </v-alert>
  </v-stepper>
</template>

<script setup lang="ts">
import { watch } from 'vue';
import { useDisplay } from 'vuetify';
import { useWizard, useCarrierFrequency, useAppAnnouncer } from '@/composables';
import StepGene from './StepGene.vue';
import StepStatus from './StepStatus.vue';
import StepFrequency from './StepFrequency.vue';
import StepResults from './StepResults.vue';

// Responsive breakpoint detection for mobile-friendly stepper
// xs: < 600px (phones), sm: 600-960px (tablets)
const { smAndDown, xs } = useDisplay();

// Wizard state management
const {
  state,
  nextStep,
  prevStep,
  resetWizard,
} = useWizard();

// Carrier frequency calculation
const {
  setGeneSymbol,
  result,
  globalFrequency,
  usingDefault,
  isLoading,
  hasError,
  errorMessage,
  refetch,
  variants,
  clinvarVariants,
  filterConfig,
  setFilterConfig,
  submissions,
  conflictingVariantIds,
  isLoadingSubmissions,
  submissionsProgress,
} = useCarrierFrequency();

// Screen reader announcements
const {
  announceStep,
  announceCalculation,
  announceError,
  announceLoading,
  announceGeneSelection,
} = useAppAnnouncer();

// Step names for announcements
const stepNames = ['Gene', 'Status', 'Frequency', 'Results'];

// Handle gene selection completion
function onGeneComplete() {
  if (state.gene) {
    announceGeneSelection(state.gene.symbol);
  }
  nextStep();
}

// Sync gene selection with carrier frequency composable
watch(
  () => state.gene,
  (newGene) => {
    setGeneSymbol(newGene?.symbol ?? null);
  },
  { immediate: true }
);

// Announce step changes to screen readers
watch(
  () => state.currentStep,
  (newStep, oldStep) => {
    if (newStep !== oldStep && newStep >= 1 && newStep <= 4) {
      const stepName = stepNames[newStep - 1];
      if (stepName) {
        announceStep(newStep, stepName);
      }

      // Announce results when reaching step 4
      if (newStep === 4 && globalFrequency.value !== null) {
        announceCalculation(globalFrequency.value.ratio, 'global');
      }
    }
  }
);

// Announce loading state changes
watch(
  isLoading,
  (loading, wasLoading) => {
    if (loading && !wasLoading) {
      announceLoading('variant data');
    } else if (!loading && wasLoading && !hasError.value) {
      announceLoading('Variant data', true);
    }
  }
);

// Announce errors
watch(
  hasError,
  (error) => {
    if (error && errorMessage.value) {
      announceError(errorMessage.value);
    }
  }
);
</script>
