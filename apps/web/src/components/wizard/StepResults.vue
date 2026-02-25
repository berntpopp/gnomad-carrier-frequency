<template>
  <div data-testid="step-results">
    <!-- ClinGen validation reminder in results -->
    <ClingenWarning v-if="result" :gene-symbol="result.gene" class="mb-4" />

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
      {{ excludedCount }} variant(s) manually excluded from calculation. Open
      the variant table to review or restore excluded variants.
    </v-alert>

    <!-- Summary card -->
    <v-card
      v-if="result"
      variant="outlined"
      class="mb-6"
      data-testid="results-summary-card"
    >
      <v-card-title
        class="d-flex align-center justify-space-between flex-wrap pb-0"
      >
        <span class="text-h6">
          <em>{{ result.gene }}</em>
          <span
            v-if="canonicalTranscript"
            class="text-body-2 text-medium-emphasis font-weight-regular"
          >
            ({{ canonicalTranscript }})
          </span>
        </span>
        <div class="d-flex align-center ga-2">
          <v-chip :color="sourceChipColor" size="small">
            {{ sourceAttribution }}
          </v-chip>
          <v-chip
            v-if="!calcStore.defaults.useHWEFormula"
            color="warning"
            size="small"
            prepend-icon="mdi-alert"
          >
            Simplified formula
          </v-chip>
        </div>
      </v-card-title>

      <v-card-text class="pt-4">
        <!-- Primary metrics grid -->
        <v-row dense>
          <!-- Carrier Frequency — hero stat -->
          <v-col cols="12" sm="4">
            <div class="stat-cell">
              <v-tooltip location="top">
                <template #activator="{ props: tooltipProps }">
                  <div v-bind="tooltipProps" class="stat-label">
                    Carrier Frequency
                  </div>
                </template>
                <span class="tooltip-text">
                  <strong>Carrier Frequency (2pq)</strong><br />
                  Proportion of individuals carrying one copy of a pathogenic
                  variant. Calculated as ~2 &times; sum of pathogenic allele
                  frequencies.
                </span>
              </v-tooltip>
              <div class="stat-value text-h5">
                {{ globalFrequency?.ratio }}
              </div>
              <div class="stat-detail">
                {{ globalFrequency?.percent }}
              </div>
            </div>
          </v-col>

          <!-- Recurrence Risk -->
          <v-col cols="6" sm="4">
            <div class="stat-cell">
              <v-tooltip location="top">
                <template #activator="{ props: tooltipProps }">
                  <div v-bind="tooltipProps" class="stat-label">
                    Recurrence Risk
                    <span class="text-lowercase"
                      >({{
                        indexStatus === "heterozygous" ? "carrier" : "affected"
                      }})</span
                    >
                  </div>
                </template>
                <span class="tooltip-text">
                  <strong>Recurrence Risk</strong><br />
                  Carrier: risk offspring inherits both a parental and a
                  population variant (freq / 4).<br />
                  Affected: risk offspring is affected (freq / 2).
                </span>
              </v-tooltip>
              <div class="stat-value">
                {{ recurrenceRisk?.ratio }}
              </div>
              <div class="stat-detail">
                {{ recurrenceRisk?.percent }}
              </div>
            </div>
          </v-col>

          <!-- Genetic Prevalence -->
          <v-col v-if="geneticPrevalenceFormatted" cols="6" sm="4">
            <div class="stat-cell">
              <v-tooltip location="top">
                <template #activator="{ props: tooltipProps }">
                  <div v-bind="tooltipProps" class="stat-label">
                    Genetic Prevalence
                  </div>
                </template>
                <span class="tooltip-text">
                  <strong>Genetic Prevalence (q&sup2;)</strong><br />
                  Expected frequency of affected individuals under
                  Hardy-Weinberg Equilibrium. This is the theoretical disease
                  frequency before accounting for penetrance.
                </span>
              </v-tooltip>
              <div class="stat-value">
                {{ geneticPrevalenceFormatted.ratio }}
              </div>
              <div class="stat-detail">
                {{ geneticPrevalenceFormatted.percent }}
              </div>
            </div>
          </v-col>

          <!-- Bayesian Prevalence (only when penetrance < 100%) -->
          <v-col
            v-if="
              bayesianPrevalenceFormatted && calcStore.defaults.penetrance < 1
            "
            cols="6"
            sm="4"
          >
            <div class="stat-cell">
              <v-tooltip location="top">
                <template #activator="{ props: tooltipProps }">
                  <div v-bind="tooltipProps" class="stat-label">
                    Bayesian Prevalence
                    <span class="text-lowercase"
                      >({{
                        Math.round(calcStore.defaults.penetrance * 100)
                      }}%)</span
                    >
                  </div>
                </template>
                <span class="tooltip-text">
                  <strong>Bayesian Prevalence</strong><br />
                  Genetic prevalence adjusted for incomplete penetrance
                  (prevalence &times; penetrance).
                </span>
              </v-tooltip>
              <div class="stat-value">
                {{ bayesianPrevalenceFormatted.ratio }}
              </div>
              <div class="stat-detail">
                {{ bayesianPrevalenceFormatted.percent }}
              </div>
            </div>
          </v-col>
        </v-row>

        <!-- Range across populations -->
        <div class="text-body-2 text-medium-emphasis mt-3">
          Range across populations:
          {{ formatRatio(result.minFrequency) }}
          to
          {{ formatRatio(result.maxFrequency) }}
        </div>

        <!-- Supporting info -->
        <div
          class="text-caption text-medium-emphasis mt-1 d-flex align-center flex-wrap"
        >
          Based on {{ filteredCount }} qualifying variant(s)
          <span v-if="excludedCount > 0" class="ml-1 text-warning">
            ({{ excludedCount }} manually excluded)
          </span>
        </div>
      </v-card-text>
    </v-card>

    <!-- Settings panel -->
    <FilterPanel
      v-model="filters"
      :calc-config="calcStore.defaults"
      :variant-count="filteredCount"
      :conflicting-count="props.conflictingVariantIds.length"
      :is-loading-submissions="props.isLoadingSubmissions"
      :submissions-progress="props.submissionsProgress"
      :submissions-error="props.submissionsError"
      @retry-submissions="emit('retrySubmissions')"
      @update:calc-config="calcStore.setDefaults($event)"
      @reset="resetFilters"
    />

    <!-- Founder effect alert -->
    <v-alert
      v-if="result?.hasFounderEffect"
      type="info"
      variant="tonal"
      class="mb-4"
    >
      Founder effect detected: Some populations show elevated carrier frequency
    </v-alert>

    <!-- Population data section -->
    <v-card v-if="tableItems.length" variant="outlined" class="mb-6">
      <!-- Table toolbar -->
      <div class="d-flex align-center flex-wrap ga-2 px-4 py-3">
        <span class="text-subtitle-2">Population Frequencies</span>
        <v-spacer />

        <v-btn
          variant="text"
          color="primary"
          size="small"
          prepend-icon="mdi-table"
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
              size="small"
              prepend-icon="mdi-download"
            >
              Export
              <v-icon end size="x-small">mdi-chevron-down</v-icon>
            </v-btn>
          </template>
          <v-list density="compact">
            <v-list-item
              prepend-icon="mdi-code-json"
              @click="handleExport('json')"
            >
              <v-list-item-title>Export as JSON</v-list-item-title>
            </v-list-item>
            <v-list-item
              prepend-icon="mdi-file-excel"
              @click="handleExport('xlsx')"
            >
              <v-list-item-title>Export as Excel</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>

        <!-- Copy link button -->
        <v-tooltip location="top">
          <template #activator="{ props: tooltipProps }">
            <v-btn
              v-bind="tooltipProps"
              variant="outlined"
              size="small"
              :color="copied ? 'success' : undefined"
              :prepend-icon="copied ? 'mdi-check' : 'mdi-link'"
              :disabled="!clipboardSupported"
              aria-label="Copy shareable link to clipboard"
              @click="copyShareLink"
            >
              {{ copied ? "Copied!" : "Copy link" }}
            </v-btn>
          </template>
          <span class="tooltip-text">
            Copy a shareable link with your current gene, filters, and settings.
          </span>
        </v-tooltip>
      </div>

      <v-divider />

      <!-- Sortable data table -->
      <div class="table-scroll-wrapper">
        <v-data-table
          :items="tableItems"
          :headers="headers"
          :sort-by="sortBy"
          density="compact"
          items-per-page="-1"
          class="results-table"
          data-testid="population-table"
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
                {{ formatPrevalenceRatio(item.geneticPrevalence) }}
              </td>
              <td class="text-right">
                {{ item.recurrenceRisk }}
              </td>
              <td class="text-right">
                {{ item.alleleCount }}
              </td>
              <td class="text-right">
                {{ item.alleleNumber?.toLocaleString() ?? "-" }}
              </td>
              <td>
                <v-chip v-if="item.notes" color="info" size="x-small">
                  <v-icon start size="x-small">mdi-star</v-icon>
                  {{ item.notes }}
                </v-chip>
              </td>
            </tr>
          </template>

          <template #bottom />
        </v-data-table>
      </div>
    </v-card>

    <!-- Text output section -->
    <v-divider class="mb-6" />

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
import { computed, ref } from "vue";
import { useClipboard } from "@vueuse/core";
import { useDisplay } from "vuetify";
import {
  config,
  getGnomadVersion,
  getPopulationLabel,
} from "@gnomad-cf/core/config";

// Responsive breakpoint detection
const { smAndDown } = useDisplay();
import type {
  CarrierFrequencyResult,
  IndexPatientStatus,
  FrequencySource,
  GnomadVariant,
  ClinVarVariant,
  DisplayVariant,
  FilterConfig,
} from "@gnomad-cf/core/types";
import type { ClinVarSubmission } from "@gnomad-cf/core/queries";
import { useFilterStore } from "@/stores/useFilterStore";
import { useCalcStore } from "@/stores/useCalcStore";
import { useExport, useAppAnnouncer, useExclusionState } from "@/composables";
import { useGeneSearch } from "@/composables/useGeneSearch";
import { filterPathogenicVariantsConfigurable } from "@gnomad-cf/core/filters";
import {
  toDisplayVariants,
  filterVariantsByPopulation,
} from "@gnomad-cf/core/filters";
import { buildExportData } from "@/utils/export-utils";
import { formatPrevalence } from "@gnomad-cf/core/calculations";
import TextOutput from "./TextOutput.vue";
import FilterPanel from "@/components/FilterPanel.vue";
import VariantModal from "@/components/VariantModal.vue";
import ClingenWarning from "@/components/ClingenWarning.vue";

interface TableItem {
  label: string;
  code: string; // Population code for drill-down
  carrierFrequency: number | null;
  ratioDenominator: number | null; // Numeric for sorting (e.g., 25 for "1:25")
  geneticPrevalence: number | null; // Disease prevalence (q^2) for this population
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
  submissionsError: string | null;
}>();

const emit = defineEmits<{
  back: [];
  restart: [];
  retrySubmissions: [];
  "update:filterConfig": [config: FilterConfig];
}>();

// Get filter store for reset functionality
const filterStore = useFilterStore();
// Get calc store for export metadata and calc config access
const calcStore = useCalcStore();

// Formatted prevalence for display in summary card
const geneticPrevalenceFormatted = computed(() => {
  const gp = props.result?.geneticPrevalence ?? null;
  if (gp === null) return null;
  return formatPrevalence(gp);
});

const bayesianPrevalenceFormatted = computed(() => {
  const bp = props.result?.bayesianPrevalence ?? null;
  if (bp === null) return null;
  return formatPrevalence(bp);
});

// Get canonical transcript from gene details (fetched at gene selection time)
const { canonicalTranscript } = useGeneSearch();

// Get exclusion state (singleton) for displaying excluded count and export data
const { excludedCount, excluded, reasons } = useExclusionState();

// Computed Set of excluded variant IDs for export
const excludedSet = computed(() => new Set(excluded.value));

// Set up export composable
const { exportToJson, exportToExcel } = useExport();

// Set up announcer for screen reader notifications
const { polite: announcePolite, assertive: announceAssertive } =
  useAppAnnouncer();

// Clipboard for copy link functionality
const {
  copy,
  copied,
  isSupported: clipboardSupported,
} = useClipboard({
  copiedDuring: 2000, // Show "copied" state for 2 seconds
  legacy: true, // Fallback for older browsers
});

// Copy current URL handler with screen reader announcement
async function copyShareLink() {
  try {
    await copy(window.location.href);
    announcePolite("Link copied to clipboard");
  } catch {
    announceAssertive("Failed to copy link");
  }
}

// Export handler function
function handleExport(format: "json" | "xlsx") {
  if (!props.result) return;

  // Convert filtered variants to display format for export
  // Include ALL variants (including excluded) for complete export
  const allFilteredVariants = filterPathogenicVariantsConfigurable(
    props.variants,
    props.clinvarVariants,
    props.filterConfig,
    props.submissions,
  );
  const displayVariants = toDisplayVariants(
    allFilteredVariants,
    props.clinvarVariants,
  );

  // Build complete export data with exclusion info
  const exportData = buildExportData(
    props.result,
    displayVariants,
    props.filterConfig,
    calcStore.defaults,
    excludedSet.value,
    reasons,
  );

  if (format === "json") {
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
    emit("update:filterConfig", { ...newFilters });
  },
});

// Compute filtered variants based on current filter settings
const filteredVariants = computed(() => {
  if (!props.variants.length) return [];
  return filterPathogenicVariantsConfigurable(
    props.variants,
    props.clinvarVariants,
    props.filterConfig,
    props.submissions,
  );
});

// Count of filtered variants
const filteredCount = computed(() => filteredVariants.value.length);

// Reset local filters and calc settings to store defaults
function resetFilters() {
  const defaults = filterStore.defaults;
  emit("update:filterConfig", {
    lofHcEnabled: defaults.lofHcEnabled,
    missenseEnabled: defaults.missenseEnabled,
    clinvarEnabled: defaults.clinvarEnabled,
    clinvarStarThreshold: defaults.clinvarStarThreshold,
    clinvarIncludeConflicting: defaults.clinvarIncludeConflicting,
    clinvarConflictingThreshold: defaults.clinvarConflictingThreshold,
  });
  calcStore.resetToFactoryDefaults();
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
    ? filterVariantsByPopulation(
        filteredVariants.value,
        selectedPopulationCode.value,
      )
    : filteredVariants.value;

  // Transform to display format with population-specific AC/AN/AF if applicable
  return toDisplayVariants(
    variantsToShow,
    props.clinvarVariants,
    selectedPopulationCode.value,
  );
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
  { title: "Population", key: "label", sortable: true },
  {
    title: "Carrier Freq (%)",
    key: "carrierFrequency",
    sortable: true,
    align: "end" as const,
  },
  {
    title: "Ratio",
    key: "ratioDenominator",
    sortable: true,
    align: "end" as const,
  },
  {
    title: "Prevalence",
    key: "geneticPrevalence",
    sortable: true,
    align: "end" as const,
  },
  {
    title: "Recurrence Risk",
    key: "recurrenceRiskValue",
    sortable: true,
    align: "end" as const,
  },
  { title: "AC", key: "alleleCount", sortable: true, align: "end" as const },
  { title: "AN", key: "alleleNumber", sortable: true, align: "end" as const },
  { title: "Notes", key: "notes", sortable: true },
]);

// Default sort by carrier frequency descending
const sortBy = ref([{ key: "carrierFrequency", order: "desc" as const }]);

// Calculate effective carrier frequency based on source
const effectiveFrequency = computed((): number | null => {
  switch (props.frequencySource) {
    case "gnomad":
      return props.result?.globalCarrierFrequency ?? null;
    case "literature":
      return props.literatureFrequency;
    case "default":
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
  const divisor = props.indexStatus === "heterozygous" ? 4 : 2;
  const risk = freq / divisor;

  return {
    risk,
    percent: `${(risk * 100).toFixed(config.settings.frequencyDecimalPlaces)}%`,
    ratio: risk > 0 ? `1:${Math.round(1 / risk).toLocaleString()}` : "N/A",
  };
});

// Source attribution for display
const sourceAttribution = computed((): string => {
  switch (props.frequencySource) {
    case "gnomad":
      if (props.usingDefault) {
        return "Default (no gnomAD data)";
      }
      if (props.result) {
        const versionConfig = getGnomadVersion(props.result.version);
        return versionConfig.displayName;
      }
      return "gnomAD";
    case "literature":
      return `Literature (PMID: ${props.literaturePmid})`;
    case "default":
      return "Default assumption";
    default:
      return "Unknown";
  }
});

// Source chip color
const sourceChipColor = computed((): string => {
  switch (props.frequencySource) {
    case "gnomad":
      return props.usingDefault ? "warning" : "info";
    case "literature":
      return "success";
    case "default":
      return "warning";
    default:
      return "default";
  }
});

// Build table items from result
const tableItems = computed((): TableItem[] => {
  if (!props.result) return [];

  const items: TableItem[] = [];

  // Global row first - use actual global totals, not derived from populations
  const globalCarrierFreq = effectiveFrequency.value;
  if (globalCarrierFreq !== null) {
    const { risk, riskString } =
      calculateRecurrenceRiskWithValue(globalCarrierFreq);
    items.push({
      label: "Global",
      code: "", // Global has no population code
      carrierFrequency: globalCarrierFreq,
      ratioDenominator:
        globalCarrierFreq > 0 ? Math.round(1 / globalCarrierFreq) : null,
      geneticPrevalence: props.result.geneticPrevalence,
      recurrenceRiskValue: risk,
      recurrenceRisk: riskString,
      alleleCount: props.result.globalAlleleCount,
      alleleNumber: props.result.globalAlleleNumber,
      isFounderEffect: false,
      isGlobal: true,
      notes: "",
    });
  }

  // Population rows
  for (const pop of props.result.populations) {
    const { risk, riskString } =
      pop.carrierFrequency !== null
        ? calculateRecurrenceRiskWithValue(pop.carrierFrequency)
        : { risk: null, riskString: "-" };

    items.push({
      label: pop.label,
      code: pop.code, // Population code for drill-down
      carrierFrequency: pop.carrierFrequency,
      ratioDenominator:
        pop.carrierFrequency !== null && pop.carrierFrequency > 0
          ? Math.round(1 / pop.carrierFrequency)
          : null,
      geneticPrevalence: pop.geneticPrevalence,
      recurrenceRiskValue: risk,
      recurrenceRisk: riskString,
      alleleCount: pop.alleleCount,
      alleleNumber: pop.alleleNumber,
      isFounderEffect: pop.isFounderEffect,
      isGlobal: false,
      notes: pop.isFounderEffect ? "Founder effect" : "",
    });
  }

  return items;
});

// Helper: Calculate recurrence risk with both numeric value and formatted string
function calculateRecurrenceRiskWithValue(freq: number): {
  risk: number;
  riskString: string;
} {
  const divisor = props.indexStatus === "heterozygous" ? 4 : 2;
  const risk = freq / divisor;
  const riskString =
    risk > 0 ? `1:${Math.round(1 / risk).toLocaleString()}` : "N/A";
  return { risk, riskString };
}

// Row styling
function getRowClass(item: TableItem): string {
  if (item.isGlobal) return "bg-grey-lighten-4 font-weight-bold";
  if (item.isFounderEffect) return "bg-blue-lighten-5";
  return "";
}

// Formatters
function formatPercent(freq: number | null): string {
  if (freq === null) return "Not detected";
  return `${(freq * 100).toFixed(config.settings.frequencyDecimalPlaces)}%`;
}

function formatRatio(freq: number | null): string {
  if (freq === null || freq === 0) return "-";
  return `1:${Math.round(1 / freq).toLocaleString()}`;
}

// Format prevalence as ratio for table display (returns '-' for null/zero)
function formatPrevalenceRatio(prevalence: number | null): string {
  if (prevalence === null || prevalence === 0) return "-";
  const formatted = formatPrevalence(prevalence);
  return formatted.ratio;
}
</script>

<style scoped>
/* Horizontal scroll wrapper for mobile */
.table-scroll-wrapper {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
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
  content: "";
  position: absolute;
  top: 0;
  right: -8px;
  bottom: 0;
  width: 8px;
  background: linear-gradient(to right, rgba(0, 0, 0, 0.08), transparent);
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

/* Stat cell layout */
.stat-cell {
  padding: 8px 0;
}

.stat-label {
  font-size: 0.75rem;
  font-weight: 500;
  letter-spacing: 0.025em;
  color: rgba(var(--v-theme-on-surface), 0.6);
  text-transform: uppercase;
  margin-bottom: 2px;
  cursor: help;
}

.stat-value {
  font-size: 1.25rem;
  font-weight: 700;
  line-height: 1.3;
  color: rgba(var(--v-theme-on-surface), 0.87);
}

.stat-value.text-h5 {
  font-size: 1.5rem !important;
}

.stat-detail {
  font-size: 0.8125rem;
  color: rgba(var(--v-theme-on-surface), 0.5);
}
</style>
