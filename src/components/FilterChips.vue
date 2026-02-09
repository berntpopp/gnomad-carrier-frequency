<template>
  <div
    class="d-flex flex-wrap ga-1"
    data-testid="filter-chips"
  >
    <v-chip
      v-if="filters.lofHcEnabled"
      color="primary"
      size="x-small"
      prepend-icon="mdi-check"
      data-testid="filter-chip-lof"
    >
      LoF HC
    </v-chip>

    <v-chip
      v-if="filters.missenseEnabled"
      color="secondary"
      size="x-small"
      prepend-icon="mdi-check"
    >
      Missense
    </v-chip>

    <v-chip
      v-if="filters.clinvarEnabled"
      color="success"
      size="x-small"
      prepend-icon="mdi-check"
      data-testid="filter-chip-clinvar"
    >
      ClinVar P/LP {{ starLabel }}
    </v-chip>

    <v-chip
      v-if="filters.clinvarEnabled && filters.clinvarIncludeConflicting"
      color="warning"
      size="x-small"
      prepend-icon="mdi-alert"
    >
      Conflicting >= {{ filters.clinvarConflictingThreshold }}% P/LP
    </v-chip>

    <v-chip
      v-if="!hasActiveFilters"
      color="warning"
      size="x-small"
      prepend-icon="mdi-alert"
    >
      No filters active
    </v-chip>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { FilterConfig } from '@/types';

const props = defineProps<{
  filters: FilterConfig;
}>();

const hasActiveFilters = computed(() => {
  return (
    props.filters.lofHcEnabled ||
    props.filters.missenseEnabled ||
    props.filters.clinvarEnabled
  );
});

const starLabel = computed(() => {
  const threshold = props.filters.clinvarStarThreshold;
  if (threshold === 0) return '';
  return threshold === 1 ? '>= 1 star' : `>= ${threshold} stars`;
});
</script>
