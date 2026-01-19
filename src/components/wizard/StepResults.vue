<template>
  <div>
    <h3 class="text-h6 mb-4">Results</h3>

    <!-- Summary card -->
    <v-card v-if="result" class="mb-4">
      <v-card-title class="d-flex align-center flex-wrap">
        {{ result.gene }} - Carrier Frequency Results
        <v-chip :color="sourceChipColor" size="small" class="ml-2">
          {{ sourceAttribution }}
        </v-chip>
      </v-card-title>

      <v-card-text>
        <div class="text-h5">
          Global: {{ globalFrequency?.ratio }}
          <span class="text-body-2 text-medium-emphasis">
            ({{ globalFrequency?.percent }})
          </span>
        </div>
        <div class="text-body-1 mt-2">
          Recurrence Risk ({{ indexStatus === 'heterozygous' ? 'carrier' : 'affected' }}):
          <strong>{{ recurrenceRisk?.ratio }}</strong>
          <span class="text-medium-emphasis">({{ recurrenceRisk?.percent }})</span>
        </div>
        <div class="text-body-2 mt-2 text-medium-emphasis">
          Based on {{ result.qualifyingVariantCount }} qualifying variant(s)
        </div>
      </v-card-text>
    </v-card>

    <!-- Founder effect alert -->
    <v-alert
      v-if="result?.hasFounderEffect"
      type="info"
      variant="tonal"
      class="mb-4"
    >
      Founder effect detected: Some populations show elevated carrier frequency
    </v-alert>

    <!-- Sortable data table -->
    <v-data-table
      v-if="tableItems.length"
      :items="tableItems"
      :headers="headers"
      :sort-by="sortBy"
      density="compact"
      items-per-page="-1"
      class="elevation-1"
    >
      <template #item="{ item }">
        <tr :class="getRowClass(item)">
          <td>{{ item.label }}</td>
          <td class="text-right">{{ formatPercent(item.carrierFrequency) }}</td>
          <td class="text-right">{{ formatRatio(item.carrierFrequency) }}</td>
          <td class="text-right">{{ item.recurrenceRisk }}</td>
          <td class="text-right">{{ item.alleleCount }}</td>
          <td class="text-right">{{ item.alleleNumber?.toLocaleString() ?? '-' }}</td>
          <td>
            <v-chip v-if="item.notes" color="info" size="x-small">
              <v-icon start size="x-small">mdi-star</v-icon>
              {{ item.notes }}
            </v-chip>
          </td>
        </tr>
      </template>

      <template #bottom></template>
    </v-data-table>

    <!-- Range info -->
    <div v-if="result" class="text-body-2 mt-4 text-medium-emphasis">
      Range across populations:
      {{ formatRatio(result.minFrequency) }}
      to
      {{ formatRatio(result.maxFrequency) }}
    </div>

    <!-- Navigation buttons -->
    <div class="d-flex justify-space-between mt-6">
      <v-btn variant="text" @click="$emit('back')">Back</v-btn>
      <v-btn variant="outlined" color="primary" @click="$emit('restart')">
        Start Over
      </v-btn>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { config, getGnomadVersion } from '@/config';
import type { CarrierFrequencyResult, IndexPatientStatus, FrequencySource } from '@/types';

interface TableItem {
  label: string;
  carrierFrequency: number | null;
  ratioDenominator: number | null; // Numeric for sorting (e.g., 25 for "1:25")
  recurrenceRiskValue: number | null; // Numeric for sorting
  recurrenceRisk: string; // Formatted for display
  alleleCount: number;
  alleleNumber: number | null;
  isFounderEffect: boolean;
  isGlobal: boolean;
  notes: string; // Founder effect text
}

const props = defineProps<{
  result: CarrierFrequencyResult | null;
  globalFrequency: { percent: string; ratio: string } | null;
  indexStatus: IndexPatientStatus;
  frequencySource: FrequencySource;
  literatureFrequency: number | null;
  literaturePmid: string | null;
  usingDefault: boolean;
}>();

defineEmits<{
  back: [];
  restart: [];
}>();

// Table headers - use numeric keys for proper sorting
const headers = ref([
  { title: 'Population', key: 'label', sortable: true },
  { title: 'Carrier Freq (%)', key: 'carrierFrequency', sortable: true, align: 'end' as const },
  { title: 'Ratio', key: 'ratioDenominator', sortable: true, align: 'end' as const },
  { title: 'Recurrence Risk', key: 'recurrenceRiskValue', sortable: true, align: 'end' as const },
  { title: 'AC', key: 'alleleCount', sortable: true, align: 'end' as const },
  { title: 'AN', key: 'alleleNumber', sortable: true, align: 'end' as const },
  { title: 'Notes', key: 'notes', sortable: true },
]);

// Default sort by carrier frequency descending
const sortBy = ref([{ key: 'carrierFrequency', order: 'desc' as const }]);

// Calculate effective carrier frequency based on source
const effectiveFrequency = computed((): number | null => {
  switch (props.frequencySource) {
    case 'gnomad':
      return props.result?.globalCarrierFrequency ?? null;
    case 'literature':
      return props.literatureFrequency;
    case 'default':
      return config.settings.defaultCarrierFrequency;
    default:
      return null;
  }
});

// Calculate recurrence risk
const recurrenceRisk = computed(() => {
  const freq = effectiveFrequency.value;
  if (freq === null) return null;

  // Carrier: carrier_freq / 4, Affected: carrier_freq / 2
  const divisor = props.indexStatus === 'heterozygous' ? 4 : 2;
  const risk = freq / divisor;

  return {
    risk,
    percent: `${(risk * 100).toFixed(config.settings.frequencyDecimalPlaces)}%`,
    ratio: risk > 0 ? `1:${Math.round(1 / risk).toLocaleString()}` : 'N/A',
  };
});

// Source attribution for display
const sourceAttribution = computed((): string => {
  switch (props.frequencySource) {
    case 'gnomad':
      if (props.usingDefault) {
        return 'Default (no gnomAD data)';
      }
      if (props.result) {
        const versionConfig = getGnomadVersion(props.result.version);
        return versionConfig.displayName;
      }
      return 'gnomAD';
    case 'literature':
      return `Literature (PMID: ${props.literaturePmid})`;
    case 'default':
      return 'Default assumption';
    default:
      return 'Unknown';
  }
});

// Source chip color
const sourceChipColor = computed((): string => {
  switch (props.frequencySource) {
    case 'gnomad':
      return props.usingDefault ? 'warning' : 'info';
    case 'literature':
      return 'success';
    case 'default':
      return 'warning';
    default:
      return 'default';
  }
});

// Build table items from result
const tableItems = computed((): TableItem[] => {
  if (!props.result) return [];

  const items: TableItem[] = [];

  // Global row first
  const globalCarrierFreq = effectiveFrequency.value;
  if (globalCarrierFreq !== null) {
    const { risk, riskString } = calculateRecurrenceRiskWithValue(globalCarrierFreq);
    items.push({
      label: 'Global',
      carrierFrequency: globalCarrierFreq,
      ratioDenominator: globalCarrierFreq > 0 ? Math.round(1 / globalCarrierFreq) : null,
      recurrenceRiskValue: risk,
      recurrenceRisk: riskString,
      alleleCount: sumAlleleCount(props.result),
      alleleNumber: maxAlleleNumber(props.result),
      isFounderEffect: false,
      isGlobal: true,
      notes: '',
    });
  }

  // Population rows
  for (const pop of props.result.populations) {
    const { risk, riskString } = pop.carrierFrequency !== null
      ? calculateRecurrenceRiskWithValue(pop.carrierFrequency)
      : { risk: null, riskString: '-' };

    items.push({
      label: pop.label,
      carrierFrequency: pop.carrierFrequency,
      ratioDenominator: pop.carrierFrequency !== null && pop.carrierFrequency > 0
        ? Math.round(1 / pop.carrierFrequency)
        : null,
      recurrenceRiskValue: risk,
      recurrenceRisk: riskString,
      alleleCount: pop.alleleCount,
      alleleNumber: pop.alleleNumber,
      isFounderEffect: pop.isFounderEffect,
      isGlobal: false,
      notes: pop.isFounderEffect ? 'Founder effect' : '',
    });
  }

  return items;
});

// Helper: Calculate recurrence risk with both numeric value and formatted string
function calculateRecurrenceRiskWithValue(freq: number): { risk: number; riskString: string } {
  const divisor = props.indexStatus === 'heterozygous' ? 4 : 2;
  const risk = freq / divisor;
  const riskString = risk > 0 ? `1:${Math.round(1 / risk).toLocaleString()}` : 'N/A';
  return { risk, riskString };
}

// Helper: Sum allele counts
function sumAlleleCount(result: CarrierFrequencyResult): number {
  return result.populations.reduce((sum, pop) => sum + pop.alleleCount, 0);
}

// Helper: Max allele number
function maxAlleleNumber(result: CarrierFrequencyResult): number | null {
  const numbers = result.populations.map((p) => p.alleleNumber).filter((n) => n > 0);
  return numbers.length ? Math.max(...numbers) : null;
}

// Row styling
function getRowClass(item: TableItem): string {
  if (item.isGlobal) return 'bg-grey-lighten-4 font-weight-bold';
  if (item.isFounderEffect) return 'bg-blue-lighten-5';
  return '';
}

// Formatters
function formatPercent(freq: number | null): string {
  if (freq === null) return 'Not detected';
  return `${(freq * 100).toFixed(config.settings.frequencyDecimalPlaces)}%`;
}

function formatRatio(freq: number | null): string {
  if (freq === null || freq === 0) return '-';
  return `1:${Math.round(1 / freq).toLocaleString()}`;
}
</script>
