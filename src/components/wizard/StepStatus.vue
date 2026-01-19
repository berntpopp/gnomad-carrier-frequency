<template>
  <div>
    <h3 class="text-h6 mb-4">Index Patient Status</h3>
    <p class="text-body-2 text-medium-emphasis mb-4">
      Select whether the index patient is a carrier or affected.
    </p>

    <v-card variant="outlined" class="pa-4 mb-4">
      <div class="d-flex align-center justify-center">
        <span
          :class="{
            'text-medium-emphasis': isAffected,
            'font-weight-bold': !isAffected,
          }"
        >
          Carrier (heterozygous)
        </span>
        <v-switch
          v-model="isAffected"
          class="mx-4"
          color="primary"
          hide-details
          inset
        />
        <span
          :class="{
            'text-medium-emphasis': !isAffected,
            'font-weight-bold': isAffected,
          }"
        >
          Affected (compound het/homozygous)
        </span>
        <v-tooltip location="top">
          <template #activator="{ props }">
            <v-icon v-bind="props" class="ml-2" size="small">
              mdi-help-circle-outline
            </v-icon>
          </template>
          <span>Carrier: one pathogenic allele. Affected: two pathogenic alleles.</span>
        </v-tooltip>
      </div>
    </v-card>

    <div class="d-flex justify-space-between mt-6">
      <v-btn variant="text" @click="$emit('back')">Back</v-btn>
      <v-btn color="primary" @click="$emit('complete')">Continue</v-btn>
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

// Computed property that maps status to boolean and emits on change
const isAffected = computed({
  get: () => props.modelValue === 'compound_het_homozygous',
  set: (value: boolean) => {
    emit('update:modelValue', value ? 'compound_het_homozygous' : 'heterozygous');
  },
});
</script>
