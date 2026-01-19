<template>
  <v-dialog
    :model-value="modelValue"
    :fullscreen="isSmallScreen"
    :width="dialogWidth"
    max-width="1400"
    scrollable
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between">
        <span>
          {{ modalTitle }}
        </span>
        <v-btn
          icon="mdi-close"
          variant="text"
          size="small"
          aria-label="Close variant modal"
          @click="emit('update:modelValue', false)"
        />
      </v-card-title>

      <v-divider />

      <v-card-text class="pa-0">
        <VariantTable
          :variants="variants"
          :loading="loading"
          :population-code="populationCode"
        />
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn
          color="primary"
          variant="text"
          @click="emit('update:modelValue', false)"
        >
          Close
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useDisplay } from 'vuetify';
import VariantTable from './VariantTable.vue';
import type { DisplayVariant } from '@/types';

const props = defineProps<{
  /** v-model for dialog visibility */
  modelValue: boolean;
  /** Variants to display in the modal */
  variants: DisplayVariant[];
  /** Human-readable population label for title (null = all variants) */
  populationLabel?: string | null;
  /** Population code for filtering context */
  populationCode?: string | null;
  /** Loading state */
  loading?: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>();

// Responsive breakpoint detection
const { smAndDown, lgAndUp } = useDisplay();

// Responsive dialog sizing
const isSmallScreen = computed(() => smAndDown.value);
const dialogWidth = computed(() => {
  if (lgAndUp.value) return '90%';
  return '95%';
});

// Dynamic modal title
const modalTitle = computed(() => {
  if (props.populationLabel) {
    return `Variants for ${props.populationLabel}`;
  }
  return 'All Contributing Variants';
});
</script>
