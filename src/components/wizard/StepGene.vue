<template>
  <div>
    <h3 class="text-h6 mb-4">Select Gene</h3>
    <p class="text-body-2 text-medium-emphasis mb-4">
      Search for a gene symbol to calculate carrier frequency.
    </p>

    <div class="mb-4" style="max-width: 300px">
      <VersionSelector />
    </div>

    <GeneSearch @select="onGeneChange" />

    <div class="d-flex justify-end mt-6">
      <v-btn
        color="primary"
        :disabled="!modelValue"
        @click="$emit('complete')"
      >
        Continue
      </v-btn>
    </div>
  </div>
</template>

<script setup lang="ts">
import GeneSearch from '@/components/GeneSearch.vue';
import VersionSelector from '@/components/VersionSelector.vue';
import type { GeneSearchResult } from '@/api/queries/types';

defineProps<{
  modelValue: GeneSearchResult | null;
}>();

const emit = defineEmits<{
  'update:modelValue': [gene: GeneSearchResult | null];
  complete: [];
}>();

const onGeneChange = (gene: GeneSearchResult | null) => {
  emit('update:modelValue', gene);
};
</script>
