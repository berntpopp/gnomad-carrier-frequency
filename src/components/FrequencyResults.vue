<template>
  <v-card v-if="result && !loading" class="mt-4">
    <v-card-title>
      {{ result.gene }} Carrier Frequency
      <v-chip v-if="usingDefault" color="warning" size="small" class="ml-2">
        Default ({{ formatDefaultFreq }})
      </v-chip>
      <v-chip color="info" size="small" class="ml-2">
        {{ versionConfig.displayName }}
      </v-chip>
    </v-card-title>

    <v-card-text>
      <div class="text-h5 mb-4">
        Global: {{ globalFrequency?.ratio }}
        <span class="text-body-2 text-medium-emphasis">
          ({{ globalFrequency?.percent }})
        </span>
      </div>

      <div class="text-body-2 mb-4">
        Based on {{ result.qualifyingVariantCount }} qualifying variant(s)
        <span class="text-medium-emphasis">
          (LoF HC or ClinVar P/LP with >= 1 star)
        </span>
      </div>

      <v-alert
        v-if="result.hasFounderEffect"
        type="info"
        variant="tonal"
        class="mb-4"
      >
        Founder effect detected: Some populations show >{{ founderMultiplier }}x the global frequency
      </v-alert>

      <v-table density="compact">
        <thead>
          <tr>
            <th>Population</th>
            <th class="text-right">Carrier Frequency</th>
            <th class="text-right">Ratio</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="pop in result.populations"
            :key="pop.code"
            :class="{ 'bg-blue-lighten-5': pop.isFounderEffect }"
          >
            <td>{{ pop.label }}</td>
            <td class="text-right">
              {{ formatPercent(pop.carrierFrequency) }}
            </td>
            <td class="text-right">
              {{ formatRatio(pop.carrierFrequency) }}
            </td>
            <td>
              <v-chip
                v-if="pop.isFounderEffect"
                color="info"
                size="x-small"
              >
                Founder effect
              </v-chip>
              <v-chip
                v-if="pop.isLowSampleSize"
                color="warning"
                size="x-small"
              >
                Low sample
              </v-chip>
            </td>
          </tr>
        </tbody>
      </v-table>

      <div class="text-body-2 mt-4 text-medium-emphasis">
        Range across populations:
        {{ formatRatio(result.minFrequency) }}
        to
        {{ formatRatio(result.maxFrequency) }}
      </div>
    </v-card-text>
  </v-card>

  <v-card v-else-if="loading" class="mt-4">
    <v-card-text class="text-center py-8">
      <v-progress-circular indeterminate color="primary" />
      <div class="mt-2">Loading variant data...</div>
    </v-card-text>
  </v-card>

  <v-alert
    v-else-if="error"
    type="error"
    variant="tonal"
    class="mt-4"
  >
    {{ error }}
    <template #append>
      <v-btn variant="text" @click="$emit('retry')">Retry</v-btn>
    </template>
  </v-alert>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { config, getGnomadVersion, type GnomadVersion } from '@/config';
import type { CarrierFrequencyResult } from '@/types';

const props = defineProps<{
  result: CarrierFrequencyResult | null;
  globalFrequency: { percent: string; ratio: string } | null;
  usingDefault: boolean;
  loading: boolean;
  error: string | null;
  version: GnomadVersion;
}>();

defineEmits<{
  retry: [];
}>();

// Get values from config for display
const founderMultiplier = config.settings.founderEffectMultiplier;
const defaultFreq = config.settings.defaultCarrierFrequency;

const formatDefaultFreq = computed(() =>
  `1:${Math.round(1 / defaultFreq)}`
);

const versionConfig = computed(() => getGnomadVersion(props.version));

const formatPercent = (freq: number | null) => {
  if (freq === null) return 'Not detected';
  return `${(freq * 100).toFixed(config.settings.frequencyDecimalPlaces)}%`;
};

const formatRatio = (freq: number | null) => {
  if (freq === null || freq === 0) return '-';
  return `1:${Math.round(1 / freq).toLocaleString()}`;
};
</script>
