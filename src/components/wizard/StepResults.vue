<template>
  <div>
    <h2 class="text-h6 mb-4">
      Results
    </h2>

    <!-- ClinGen validation reminder in results -->
    <ClingenWarning
      v-if="result"
      :gene-symbol="result.gene"
      class="mb-4"
    />

    <!-- Summary card -->
    <v-card
      v-if="result"
      class="mb-4"
    >
      <v-card-title class="d-flex align-center flex-wrap">
        {{ result.gene }} - Carrier Frequency Results
        <v-chip
          :color="sourceChipColor"
          size="small"
          class="ml-2"
        >
          {{ sourceAttribution }}
        </v-chip>
      </v-card-title>

      <v-card-text>
        <div class="text-h5 d-flex align-center flex-wrap">
          Global: {{ globalFrequency?.ratio }}
          <span class="text-body-2 text-medium-emphasis">
            ({{ globalFrequency?.percent }})
          </span>
          <v-tooltip location="top">
            <template #activator="{ props: tooltipProps }">
              <v-icon
                v-bind="tooltipProps"
                size="x-small"
                class="ml-1"
                aria-label="Carrier frequency information"
              >
                mdi-information-outline
              </v-icon>
            </template>
            <span class="tooltip-text">
              <strong>Carrier Frequency (2pq)</strong><br>
              The proportion of individuals who carry one copy of a pathogenic variant.
              Carriers are typically unaffected but can pass the variant to offspring.
              Calculated as approximately 2 times the sum of pathogenic allele frequencies.
            </span>
          </v-tooltip>
        </div>
        <div class="text-body-1 mt-2 d-flex align-center flex-wrap">
          Recurrence Risk ({{ indexStatus === 'heterozygous' ? 'carrier' : 'affected' }}):
          <strong class="ml-1">{{ recurrenceRisk?.ratio }}</strong>
          <span class="text-medium-emphasis ml-1">({{ recurrenceRisk?.percent }})</span>
          <v-tooltip location="top">
            <template #activator="{ props: tooltipProps }">
              <v-icon
                v-bind="tooltipProps"
                size="x-small"
                class="ml-1"
                aria-label="Recurrence risk information"
              >
                mdi-information-outline
              </v-icon>
            </template>
            <span class="tooltip-text">
              <strong>Recurrence Risk</strong><br>
              For a carrier index patient: risk that offspring inherits
              both a parental variant and a population variant (carrier freq / 4).<br>
              For an affected index patient: risk that offspring is affected
              (carrier freq / 2).
            </span>
          </v-tooltip>
        </div>
        <div class="text-body-2 mt-2 text-medium-emphasis d-flex align-center flex-wrap">
          Based on {{ filteredCount }} qualifying variant(s)
          <v-tooltip location="top">
            <template #activator="{ props: tooltipProps }">
              <v-icon
                v-bind="tooltipProps"
                size="x-small"
                class="ml-1"
                aria-label="Contributing variants information"
              >
                mdi-information-outline
              </v-icon>
            </template>
            <span class="tooltip-text">
              <strong>Contributing Variants</strong><br>
              The number of pathogenic variants included in this calculation.
              Click "View all variants" below to see details including variant IDs,
              consequences, and individual allele frequencies.
            </span>
          </v-tooltip>
        </div>
      </v-card-text>

      <!-- Filter Panel -->
      <FilterPanel
        v-model="filters"
        :variant-count="filteredCount"
        @reset="resetFilters"
      />
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
        <tr
          :class="[getRowClass(item), { 'population-row': !item.isGlobal }]"
          @click="!item.isGlobal && openPopulationModal(item.code)"
        >
          <td>
            <div class="d-flex align-center">
              {{ item.label }}
              <v-icon
                v-if="!item.isGlobal"
                class="ml-1 population-chevron"
                size="x-small"
                color="grey"
              >
                mdi-chevron-right
              </v-icon>
            </div>
          </td>
          <td class="text-right">
            {{ formatPercent(item.carrierFrequency) }}
          </td>
          <td class="text-right">
            {{ formatRatio(item.carrierFrequency) }}
          </td>
          <td class="text-right">
            {{ item.recurrenceRisk }}
          </td>
          <td class="text-right">
            {{ item.alleleCount }}
          </td>
          <td class="text-right">
            {{ item.alleleNumber?.toLocaleString() ?? '-' }}
          </td>
          <td>
            <v-chip
              v-if="item.notes"
              color="info"
              size="x-small"
            >
              <v-icon
                start
                size="x-small"
              >
                mdi-star
              </v-icon>
              {{ item.notes }}
            </v-chip>
          </td>
        </tr>
      </template>

      <template #bottom />
    </v-data-table>

    <!-- View all variants button -->
    <div
      v-if="filteredCount > 0"
      class="mt-3"
    >
      <v-btn
        variant="text"
        color="primary"
        prepend-icon="mdi-table"
        @click="openAllVariantsModal"
      >
        View all variants ({{ filteredCount }})
      </v-btn>
    </div>

    <!-- Range info -->
    <div
      v-if="result"
      class="text-body-2 mt-4 text-medium-emphasis"
    >
      Range across populations:
      {{ formatRatio(result.minFrequency) }}
      to
      {{ formatRatio(result.maxFrequency) }}
    </div>

    <!-- Text output section -->
    <v-divider class="my-6" />

    <TextOutput
      v-if="result"
      :result="result"
      :frequency-source="frequencySource"
      :index-status="indexStatus"
      :literature-frequency="literatureFrequency"
      :literature-pmid="literaturePmid"
      :using-default="usingDefault"
    />

    <!-- Navigation buttons -->
    <div class="d-flex justify-space-between mt-6">
      <v-btn
        variant="text"
        @click="$emit('back')"
      >
        Back
      </v-btn>
      <v-btn
        variant="outlined"
        color="primary"
        @click="$emit('restart')"
      >
        Start Over
      </v-btn>
    </div>

    <!-- Variant Modal -->
    <VariantModal
      v-model="showVariantModal"
      :variants="modalVariants"
      :population-label="selectedPopulationLabel"
      :population-code="selectedPopulationCode"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { config, getGnomadVersion, getPopulationLabel } from '@/config';
import type { CarrierFrequencyResult, IndexPatientStatus, FrequencySource, GnomadVariant, ClinVarVariant, DisplayVariant, FilterConfig } from '@/types';
import { useFilterStore } from '@/stores/useFilterStore';
import { filterPathogenicVariantsConfigurable } from '@/utils/variant-filters';
import { toDisplayVariants, filterVariantsByPopulation } from '@/utils/variant-display';
import TextOutput from './TextOutput.vue';
import FilterPanel from '@/components/FilterPanel.vue';
import VariantModal from '@/components/VariantModal.vue';
import ClingenWarning from '@/components/ClingenWarning.vue';

interface TableItem {
  label: string;
  code: string; // Population code for drill-down
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
  variants: GnomadVariant[];
  clinvarVariants: ClinVarVariant[];
  filterConfig: FilterConfig;
}>();

const emit = defineEmits<{
  back: [];
  restart: [];
  'update:filterConfig': [config: FilterConfig];
}>();

// Get filter store for reset functionality
const filterStore = useFilterStore();

// Use a computed getter/setter for filters to avoid infinite loop
// The prop is the source of truth; changes emit to parent
const filters = computed({
  get: () => props.filterConfig,
  set: (newFilters: FilterConfig) => {
    emit('update:filterConfig', { ...newFilters });
  },
});

// Compute filtered variants based on current filter settings
const filteredVariants = computed(() => {
  if (!props.variants.length) return [];
  return filterPathogenicVariantsConfigurable(
    props.variants,
    props.clinvarVariants,
    props.filterConfig
  );
});

// Count of filtered variants
const filteredCount = computed(() => filteredVariants.value.length);

// Reset local filters to store defaults
function resetFilters() {
  const defaults = filterStore.defaults;
  emit('update:filterConfig', {
    lofHcEnabled: defaults.lofHcEnabled,
    missenseEnabled: defaults.missenseEnabled,
    clinvarEnabled: defaults.clinvarEnabled,
    clinvarStarThreshold: defaults.clinvarStarThreshold,
  });
}

// Variant modal state
const showVariantModal = ref(false);
const selectedPopulationCode = ref<string | null>(null);

// Computed label for selected population
const selectedPopulationLabel = computed(() => {
  if (!selectedPopulationCode.value) return null;
  return getPopulationLabel(selectedPopulationCode.value);
});

// Compute variants to display in modal
const modalVariants = computed((): DisplayVariant[] => {
  if (!filteredVariants.value.length) return [];

  // Filter to population if selected
  const variantsToShow = selectedPopulationCode.value
    ? filterVariantsByPopulation(filteredVariants.value, selectedPopulationCode.value)
    : filteredVariants.value;

  // Transform to display format
  return toDisplayVariants(variantsToShow, props.clinvarVariants);
});

// Open modal showing all variants
function openAllVariantsModal() {
  selectedPopulationCode.value = null;
  showVariantModal.value = true;
}

// Open modal for a specific population
function openPopulationModal(populationCode: string) {
  selectedPopulationCode.value = populationCode;
  showVariantModal.value = true;
}

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

  // Global row first - use actual global totals, not derived from populations
  const globalCarrierFreq = effectiveFrequency.value;
  if (globalCarrierFreq !== null) {
    const { risk, riskString } = calculateRecurrenceRiskWithValue(globalCarrierFreq);
    items.push({
      label: 'Global',
      code: '', // Global has no population code
      carrierFrequency: globalCarrierFreq,
      ratioDenominator: globalCarrierFreq > 0 ? Math.round(1 / globalCarrierFreq) : null,
      recurrenceRiskValue: risk,
      recurrenceRisk: riskString,
      alleleCount: props.result.globalAlleleCount,
      alleleNumber: props.result.globalAlleleNumber,
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
      code: pop.code, // Population code for drill-down
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

<style scoped>
.population-row {
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.population-row:hover {
  background-color: rgb(var(--v-theme-surface-variant)) !important;
}

.population-row:hover .population-chevron {
  color: rgb(var(--v-theme-primary)) !important;
}

.tooltip-text {
  max-width: 280px;
  display: inline-block;
}
</style>
