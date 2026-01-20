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

    <!-- Exclusion alert - shows when variants have been manually excluded -->
    <v-alert
      v-if="excludedCount > 0"
      type="info"
      variant="tonal"
      class="mb-4"
      density="compact"
    >
      <template #prepend>
        <v-icon>mdi-filter-remove</v-icon>
      </template>
      {{ excludedCount }} variant(s) manually excluded from calculation.
      Open the variant table to review or restore excluded variants.
    </v-alert>

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
          <v-tooltip
            location="top"
            aria-label="Information"
          >
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
          <v-tooltip
            location="top"
            aria-label="Information"
          >
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
          <!-- Exclusion note when variants have been excluded -->
          <span
            v-if="excludedCount > 0"
            class="ml-1 text-warning"
          >
            ({{ excludedCount }} manually excluded)
          </span>
          <v-tooltip
            location="top"
            aria-label="Information"
          >
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
        :conflicting-count="props.conflictingVariantIds.length"
        :is-loading-submissions="props.isLoadingSubmissions"
        :submissions-progress="props.submissionsProgress"
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
    <div class="table-scroll-wrapper">
      <v-data-table
        v-if="tableItems.length"
        :items="tableItems"
        :headers="headers"
        :sort-by="sortBy"
        density="compact"
        items-per-page="-1"
        class="elevation-1 results-table"
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
    </div>

    <!-- View all variants, export, and share buttons - touch-friendly on mobile -->
    <div
      v-if="filteredCount > 0"
      class="d-flex align-center flex-wrap gap-2 mt-3"
    >
      <v-btn
        variant="text"
        color="primary"
        prepend-icon="mdi-table"
        :min-height="smAndDown ? 44 : undefined"
        @click="openAllVariantsModal"
      >
        View all variants ({{ filteredCount }})
      </v-btn>

      <!-- Export dropdown -->
      <v-menu>
        <template #activator="{ props: menuProps }">
          <v-btn
            v-bind="menuProps"
            variant="outlined"
            color="secondary"
            prepend-icon="mdi-download"
            :min-height="smAndDown ? 44 : undefined"
          >
            Export
            <v-icon end>
              mdi-chevron-down
            </v-icon>
          </v-btn>
        </template>
        <v-list :density="smAndDown ? 'default' : 'compact'">
          <v-list-item
            prepend-icon="mdi-code-json"
            :min-height="smAndDown ? 44 : undefined"
            @click="handleExport('json')"
          >
            <v-list-item-title>Export as JSON</v-list-item-title>
          </v-list-item>
          <v-list-item
            prepend-icon="mdi-file-excel"
            :min-height="smAndDown ? 44 : undefined"
            @click="handleExport('xlsx')"
          >
            <v-list-item-title>Export as Excel</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>

      <!-- Copy link button -->
      <v-tooltip
        location="top"
        aria-label="Information"
      >
        <template #activator="{ props: tooltipProps }">
          <v-btn
            v-bind="tooltipProps"
            variant="outlined"
            :color="copied ? 'success' : 'primary'"
            :prepend-icon="copied ? 'mdi-check' : 'mdi-link'"
            :disabled="!clipboardSupported"
            :min-height="smAndDown ? 44 : undefined"
            aria-label="Copy shareable link to clipboard"
            @click="copyShareLink"
          >
            {{ copied ? 'Link copied!' : 'Copy link' }}
          </v-btn>
        </template>
        <span class="tooltip-text">
          Copy a shareable link with your current gene, filters, and settings.
          Recipients can open this link to see the same calculation.
        </span>
      </v-tooltip>
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

    <!-- Navigation buttons - touch-friendly on mobile -->
    <div class="d-flex justify-space-between mt-6">
      <v-btn
        variant="text"
        :min-height="smAndDown ? 44 : undefined"
        @click="$emit('back')"
      >
        Back
      </v-btn>
      <v-btn
        variant="outlined"
        color="primary"
        :min-height="smAndDown ? 44 : undefined"
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
      :gene="result?.gene"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useClipboard } from '@vueuse/core';
import { useDisplay } from 'vuetify';
import { config, getGnomadVersion, getPopulationLabel } from '@/config';

// Responsive breakpoint detection
const { smAndDown } = useDisplay();
import type { CarrierFrequencyResult, IndexPatientStatus, FrequencySource, GnomadVariant, ClinVarVariant, DisplayVariant, FilterConfig } from '@/types';
import type { ClinVarSubmission } from '@/api/queries';
import { useFilterStore } from '@/stores/useFilterStore';
import { useExport, useAppAnnouncer, useExclusionState } from '@/composables';
import { filterPathogenicVariantsConfigurable } from '@/utils/variant-filters';
import { toDisplayVariants, filterVariantsByPopulation } from '@/utils/variant-display';
import { buildExportData } from '@/utils/export-utils';
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
  submissions: Map<string, ClinVarSubmission[]>;
  conflictingVariantIds: string[];
  isLoadingSubmissions: boolean;
  submissionsProgress: number;
}>();

const emit = defineEmits<{
  back: [];
  restart: [];
  'update:filterConfig': [config: FilterConfig];
}>();

// Get filter store for reset functionality
const filterStore = useFilterStore();

// Get exclusion state (singleton) for displaying excluded count and export data
const { excludedCount, excluded, reasons } = useExclusionState();

// Computed Set of excluded variant IDs for export
const excludedSet = computed(() => new Set(excluded.value));

// Set up export composable
const { exportToJson, exportToExcel } = useExport();

// Set up announcer for screen reader notifications
const { polite: announcePolite, assertive: announceAssertive } = useAppAnnouncer();

// Clipboard for copy link functionality
const { copy, copied, isSupported: clipboardSupported } = useClipboard({
  copiedDuring: 2000, // Show "copied" state for 2 seconds
  legacy: true, // Fallback for older browsers
});

// Copy current URL handler with screen reader announcement
async function copyShareLink() {
  try {
    await copy(window.location.href);
    announcePolite('Link copied to clipboard');
  } catch {
    announceAssertive('Failed to copy link');
  }
}

// Export handler function
function handleExport(format: 'json' | 'xlsx') {
  if (!props.result) return;

  // Convert filtered variants to display format for export
  // Include ALL variants (including excluded) for complete export
  const allFilteredVariants = filterPathogenicVariantsConfigurable(
    props.variants,
    props.clinvarVariants,
    props.filterConfig,
    props.submissions
  );
  const displayVariants = toDisplayVariants(allFilteredVariants, props.clinvarVariants);

  // Build complete export data with exclusion info
  const exportData = buildExportData(
    props.result,
    displayVariants,
    props.filterConfig,
    excludedSet.value,
    reasons
  );

  if (format === 'json') {
    exportToJson(exportData, props.result.gene);
  } else {
    exportToExcel(exportData, props.result.gene);
  }
}

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
    props.filterConfig,
    props.submissions
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
    clinvarIncludeConflicting: defaults.clinvarIncludeConflicting,
    clinvarConflictingThreshold: defaults.clinvarConflictingThreshold,
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

  // Transform to display format with population-specific AC/AN/AF if applicable
  return toDisplayVariants(variantsToShow, props.clinvarVariants, selectedPopulationCode.value);
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
/* Horizontal scroll wrapper for mobile */
.table-scroll-wrapper {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  position: relative;
  margin: 0 -16px; /* Extend to card edges on mobile */
  padding: 0 16px;
}

@media (min-width: 960px) {
  .table-scroll-wrapper {
    margin: 0;
    padding: 0;
  }
}

/* Freeze Population column (first column) */
:deep(.results-table) th:first-child,
:deep(.results-table) td:first-child {
  position: sticky;
  left: 0;
  z-index: 2;
  background: rgb(var(--v-theme-surface));
}

/* Shadow indicator for scrollable content */
:deep(.results-table) th:first-child::after,
:deep(.results-table) td:first-child::after {
  content: '';
  position: absolute;
  top: 0;
  right: -8px;
  bottom: 0;
  width: 8px;
  background: linear-gradient(to right, rgba(0,0,0,0.08), transparent);
  pointer-events: none;
}

/* Global row background for frozen column */
:deep(.bg-grey-lighten-4) td:first-child {
  background: #f5f5f5; /* grey-lighten-4 */
}

/* Founder effect row background for frozen column */
:deep(.bg-blue-lighten-5) td:first-child {
  background: #e3f2fd; /* blue-lighten-5 */
}

.population-row {
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.population-row:hover {
  background-color: rgb(var(--v-theme-surface-variant)) !important;
}

.population-row:hover td:first-child {
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
