<template>
  <v-stepper
    v-model="state.currentStep"
    flat
  >
    <v-stepper-header>
      <v-stepper-item
        :complete="state.currentStep > 1"
        :value="1"
        title="Gene"
        subtitle="Search and select"
      />
      <v-divider />
      <v-stepper-item
        :complete="state.currentStep > 2"
        :value="2"
        title="Status"
        subtitle="Carrier or affected"
      />
      <v-divider />
      <v-stepper-item
        :complete="state.currentStep > 3"
        :value="3"
        title="Frequency"
        subtitle="Select source"
      />
      <v-divider />
      <v-stepper-item
        :value="4"
        title="Results"
        subtitle="View calculations"
      />
    </v-stepper-header>

    <v-stepper-window>
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
import { useWizard, useCarrierFrequency } from '@/composables';
import StepGene from './StepGene.vue';
import StepStatus from './StepStatus.vue';
import StepFrequency from './StepFrequency.vue';
import StepResults from './StepResults.vue';

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
} = useCarrierFrequency();

// Handle gene selection completion
function onGeneComplete() {
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
</script>
