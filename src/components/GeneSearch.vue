<template>
  <v-autocomplete
    v-model="model"
    v-model:search="searchInput"
    :items="items"
    :loading="loading"
    :disabled="disabled"
    item-title="symbol"
    item-value="symbol"
    label="Gene Symbol"
    placeholder="Enter gene symbol (e.g., CFTR, BRCA1)"
    clearable
    return-object
    no-filter
    hide-no-data
    :error="!!error"
    :error-messages="error?.message"
    @update:model-value="onSelect"
  >
    <template #item="{ item, props }">
      <v-list-item v-bind="props">
        <template #title>
          <span class="font-weight-bold">{{ item.raw.symbol }}</span>
        </template>
        <template #subtitle>
          {{ item.raw.ensembl_id }}
        </template>
      </v-list-item>
    </template>
  </v-autocomplete>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { useGeneSearch } from '@/composables';
import type { GeneSearchResult } from '@/api/queries/types';

defineProps<{
  disabled?: boolean;
}>();

const emit = defineEmits<{
  select: [gene: GeneSearchResult | null];
}>();

const {
  setSearchTerm,
  results,
  isLoading: loading,
  error,
  selectedGene,
  selectGene,
  clearSelection,
} = useGeneSearch();

const model = ref<GeneSearchResult | null>(null);
const searchInput = ref('');

watch(searchInput, (value) => {
  if (value !== selectedGene.value?.symbol) {
    setSearchTerm(value);
  }
});

const items = computed(() =>
  selectedGene.value ? [selectedGene.value] : results.value
);

const onSelect = (gene: GeneSearchResult | null) => {
  if (gene) {
    selectGene(gene);
    emit('select', gene);
  } else {
    clearSelection();
    emit('select', null);
  }
};
</script>
