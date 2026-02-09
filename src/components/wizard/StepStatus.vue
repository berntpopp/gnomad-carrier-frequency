<template>
  <div data-testid="step-status">
    <h2 class="text-h6 mb-4">
      Index Patient Status
    </h2>
    <p class="text-body-2 text-medium-emphasis mb-4">
      Select the genetic status of the index patient.
    </p>

    <v-card
      variant="outlined"
      class="pa-4 mb-4"
    >
      <v-radio-group
        v-model="statusModel"
        hide-details
      >
        <v-radio
          value="heterozygous"
          data-testid="status-option-heterozygous"
        >
          <template #label>
            <div>
              <strong>Heterozygous carrier</strong>
              <div class="text-caption text-medium-emphasis">
                One pathogenic allele detected
              </div>
            </div>
          </template>
        </v-radio>
        <v-radio
          value="homozygous"
          class="mt-2"
        >
          <template #label>
            <div>
              <strong>Homozygous affected</strong>
              <div class="text-caption text-medium-emphasis">
                Two copies of same pathogenic allele
              </div>
            </div>
          </template>
        </v-radio>
        <v-radio
          value="compound_het_confirmed"
          class="mt-2"
        >
          <template #label>
            <div>
              <strong>Compound heterozygous (confirmed)</strong>
              <div class="text-caption text-medium-emphasis">
                Two different pathogenic alleles, phase confirmed
              </div>
            </div>
          </template>
        </v-radio>
        <v-radio
          value="compound_het_assumed"
          class="mt-2"
        >
          <template #label>
            <div>
              <strong>Compound heterozygous (assumed)</strong>
              <div class="text-caption text-medium-emphasis">
                Two pathogenic alleles, phase assumed by phenotype
              </div>
            </div>
          </template>
        </v-radio>
      </v-radio-group>
    </v-card>

    <div class="d-flex justify-space-between mt-6">
      <v-btn
        variant="text"
        @click="$emit('back')"
      >
        Back
      </v-btn>
      <v-btn
        color="primary"
        data-testid="step-status-next-btn"
        @click="$emit('complete')"
      >
        Continue
      </v-btn>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { IndexPatientStatus } from '@/types';

const props = defineProps<{
  modelValue: IndexPatientStatus;
}>();

const emit = defineEmits<{
  'update:modelValue': [status: IndexPatientStatus];
  complete: [];
  back: [];
}>();

// Two-way binding for radio group
const statusModel = computed({
  get: () => props.modelValue,
  set: (value: IndexPatientStatus) => {
    emit('update:modelValue', value);
  },
});
</script>
