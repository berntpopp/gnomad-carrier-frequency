<template>
  <v-expansion-panels
    v-model="panel"
    class="mb-4"
  >
    <v-expansion-panel>
      <v-expansion-panel-title>
        <div class="d-flex align-center flex-wrap ga-2">
          <span class="text-subtitle-2">Filters</span>
          <FilterChips
            v-if="!isExpanded"
            :filters="modelValue"
          />
        </div>
      </v-expansion-panel-title>

      <v-expansion-panel-text>
        <v-row dense>
          <v-col
            cols="12"
            md="6"
          >
            <v-switch
              :model-value="modelValue.lofHcEnabled"
              color="primary"
              label="LoF High Confidence"
              density="compact"
              hide-details
              @update:model-value="updateFilter('lofHcEnabled', $event)"
            />
          </v-col>

          <v-col
            cols="12"
            md="6"
          >
            <v-switch
              :model-value="modelValue.missenseEnabled"
              color="secondary"
              label="Include Missense"
              density="compact"
              hide-details
              @update:model-value="updateFilter('missenseEnabled', $event)"
            />
          </v-col>

          <v-col
            cols="12"
            md="6"
          >
            <v-switch
              :model-value="modelValue.clinvarEnabled"
              color="success"
              label="ClinVar P/LP"
              density="compact"
              hide-details
              @update:model-value="updateFilter('clinvarEnabled', $event)"
            />
          </v-col>

          <v-col
            cols="12"
            md="6"
          >
            <v-slider
              :model-value="modelValue.clinvarStarThreshold"
              :disabled="!modelValue.clinvarEnabled"
              :min="0"
              :max="4"
              :step="1"
              :ticks="tickLabels"
              show-ticks="always"
              tick-size="4"
              label="ClinVar Min Stars"
              density="compact"
              thumb-label
              color="success"
              @update:model-value="updateFilter('clinvarStarThreshold', $event)"
            />
          </v-col>
        </v-row>

        <v-divider class="my-3" />

        <div class="d-flex align-center justify-space-between flex-wrap ga-2">
          <div class="text-body-2">
            <strong>{{ variantCount }}</strong> qualifying variant(s)
          </div>

          <v-btn
            variant="text"
            size="small"
            prepend-icon="mdi-refresh"
            @click="emit('reset')"
          >
            Reset to Defaults
          </v-btn>
        </div>
      </v-expansion-panel-text>
    </v-expansion-panel>
  </v-expansion-panels>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import FilterChips from './FilterChips.vue';
import type { FilterConfig } from '@/types';

const props = defineProps<{
  modelValue: FilterConfig;
  variantCount: number;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: FilterConfig];
  reset: [];
}>();

const panel = ref<number | undefined>(undefined);

const isExpanded = computed(() => panel.value === 0);

const tickLabels = {
  0: '0',
  1: '1',
  2: '2',
  3: '3',
  4: '4',
};

function updateFilter<K extends keyof FilterConfig>(
  key: K,
  value: FilterConfig[K]
) {
  emit('update:modelValue', {
    ...props.modelValue,
    [key]: value,
  });
}
</script>
