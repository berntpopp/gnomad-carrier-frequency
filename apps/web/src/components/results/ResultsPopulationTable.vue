<template>
  <v-card v-if="tableItems.length" variant="outlined" class="mb-6">
    <!-- Table toolbar -->
    <ResultsTableToolbar
      :result="result"
      :current-format="currentFormat"
      :qualifying-variants-count="qualifyingVariantCount ?? qualifyingVariants?.length ?? 0"
      :variants="variants"
      :clinvar-variants="clinvarVariants"
      :filter-config="filterConfig"
      :calc-config="calcConfig"
      :submissions="submissions"
      :excluded-set="excludedSet"
      :reasons="reasons"
      :is-v2="isV2"
      :show-subcontinental="showSubcontinental"
      :is-loading="isLoading"
      :is-loading-subcontinental="isLoadingSubcontinental"
      @set-format="setFormat"
      @open-modal="emit('openModal', $event)"
      @toggle-subcontinental="showSubcontinental = !showSubcontinental"
    />

    <!-- Table / Chart tabs -->
    <v-tabs v-model="populationTab" density="compact" class="px-4">
      <v-tab value="table" size="small" data-testid="table-tab">
        <v-icon start size="small">mdi-table</v-icon>
        Table
      </v-tab>
      <v-tab value="chart" size="small" data-testid="chart-tab">
        <v-icon start size="small">mdi-chart-bar</v-icon>
        Chart
      </v-tab>
    </v-tabs>

    <v-divider />

    <v-window v-model="populationTab">
      <!-- Chart tab -->
      <v-window-item value="chart">
        <ResultsChartTab
          :result="result"
          :effective-frequency="effectiveFrequency"
          :source-attribution="sourceAttribution"
          @open-modal="emit('openModal', $event)"
        />
      </v-window-item>

      <!-- Table tab -->
      <v-window-item value="table">
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
                @click="!item.isGlobal && emit('openModal', item.code)"
              >
                <td>
                  <div class="d-flex align-center">
                    <!-- Expand/collapse chevron for source breakdown (non-global rows only) -->
                    <v-tooltip location="top">
                      <template #activator="{ props: tooltipProps }">
                        <v-btn
                          v-if="!item.isGlobal"
                          v-bind="tooltipProps"
                          :icon="
                            isPopExpanded(item.code)
                              ? 'mdi-chevron-down'
                              : 'mdi-chevron-right'
                          "
                          variant="plain"
                          density="compact"
                          size="small"
                          class="population-expand-btn mr-1"
                          :aria-label="
                            isPopExpanded(item.code)
                              ? 'Collapse source breakdown'
                              : 'Expand source breakdown'
                          "
                          @click="togglePopExpand(item.code, $event)"
                        />
                      </template>
                      {{
                        isPopExpanded(item.code)
                          ? "Hide source breakdown"
                          : "Show source breakdown"
                      }}
                    </v-tooltip>
                    <span class="population-label">{{ item.label }}</span>
                  </div>
                </td>
                <td class="text-right">
                  {{ formatFrequency(item.carrierFrequency) }}
                </td>
                <td class="text-right">
                  {{ formatRatioDisplay(item.carrierFrequency) }}
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
              <!-- Source breakdown expansion rows -->
              <template v-if="!item.isGlobal && isPopExpanded(item.code)">
                <tr
                  v-for="srcRow in getSourceBreakdown(item.code)"
                  :key="`${item.code}-${srcRow.sourceCategory}`"
                  class="source-breakdown-row"
                  :style="{
                    borderLeft: `3px solid ${getSourceBorderColor(srcRow.sourceCategory)}`,
                  }"
                >
                  <td>
                    <div class="d-flex align-center pl-6">
                      <v-chip
                        :color="sourceCategoryColor(srcRow.sourceCategory)"
                        size="x-small"
                        class="mr-2"
                      >
                        {{ srcRow.label }}
                      </v-chip>
                      <span class="text-caption text-medium-emphasis">
                        {{ srcRow.variantCount }} variant{{
                          srcRow.variantCount === 1 ? "" : "s"
                        }}
                      </span>
                    </div>
                  </td>
                  <td class="text-right">
                    {{ formatSourceFrequency(srcRow.carrierFrequency) }}
                  </td>
                  <td class="text-right">
                    {{ formatRatioDisplay(srcRow.carrierFrequency) }}
                  </td>
                  <td class="text-right">-</td>
                  <td class="text-right">-</td>
                  <td class="text-right">{{ srcRow.alleleCount }}</td>
                  <td class="text-right">
                    {{
                      srcRow.alleleNumber > 0
                        ? srcRow.alleleNumber.toLocaleString()
                        : "-"
                    }}
                  </td>
                  <td v-if="hasNotes" />
                </tr>
              </template>

              <!-- Subcontinental loading row -->
              <template
                v-if="
                  showSubcontinental &&
                  hasSubpopulations(item.code) &&
                  isLoadingSubcontinental &&
                  !item.isGlobal
                "
              >
                <tr class="subcontinental-loading-row">
                  <td :colspan="headers.length">
                    <v-progress-linear
                      :model-value="subcontinentalProgress"
                      color="primary"
                      height="4"
                      class="my-1"
                    />
                  </td>
                </tr>
              </template>

              <!-- Subcontinental error row -->
              <template
                v-if="
                  showSubcontinental &&
                  subcontinentalError &&
                  hasSubpopulations(item.code) &&
                  !item.isGlobal
                "
              >
                <tr class="subcontinental-error-row">
                  <td :colspan="headers.length">
                    <v-alert
                      type="warning"
                      variant="tonal"
                      density="compact"
                      class="ma-1"
                    >
                      Failed to load subcontinental data.
                      {{ subcontinentalError }}
                    </v-alert>
                  </td>
                </tr>
              </template>

              <!-- Subcontinental sub-rows -->
              <template
                v-if="
                  showSubcontinental &&
                  !isLoadingSubcontinental &&
                  !item.isGlobal
                "
              >
                <tr
                  v-for="sub in getSubcontinentalRows(item.code)"
                  :key="`subpop-${sub.code}`"
                  class="subcontinental-row"
                >
                  <td>
                    <div class="d-flex align-center pl-8">
                      <span class="text-body-2">{{ sub.label }}</span>
                      <v-chip
                        v-if="sub.isLowSampleSize"
                        color="warning"
                        size="x-small"
                        class="ml-2"
                        variant="tonal"
                      >
                        <v-icon start size="x-small">mdi-alert</v-icon>
                        Low sample
                      </v-chip>
                      <v-chip
                        v-if="sub.isFounderEffect"
                        color="info"
                        size="x-small"
                        class="ml-2"
                        variant="tonal"
                      >
                        <v-icon start size="x-small">mdi-star</v-icon>
                        Founder effect
                      </v-chip>
                    </div>
                  </td>
                  <td class="text-right">
                    {{ formatFrequency(sub.carrierFrequency) }}
                  </td>
                  <td class="text-right">
                    {{ formatRatioDisplay(sub.carrierFrequency) }}
                  </td>
                  <td class="text-right">-</td>
                  <td class="text-right">-</td>
                  <td class="text-right">{{ sub.alleleCount }}</td>
                  <td class="text-right">
                    {{
                      sub.alleleNumber > 0
                        ? sub.alleleNumber.toLocaleString()
                        : "-"
                    }}
                  </td>
                  <td />
                </tr>
              </template>
            </template>

            <template #bottom />
          </v-data-table>
        </div>
      </v-window-item>
    </v-window>
  </v-card>
</template>

<script setup lang="ts">
import { computed, ref, toRef } from "vue";
import type {
  CarrierFrequencyResult,
  IndexPatientStatus,
  GnomadVariant,
  ClinVarVariant,
  FilterConfig,
  CalcConfig,
  ExclusionReason,
} from "@gnomad-cf/core/types";
import type { ClinVarSubmission } from "@gnomad-cf/core/queries";
import {
  calculateRecurrenceRisk,
  formatPrevalence,
} from "@gnomad-cf/core/calculations";
import type { DisplayFormat } from "@gnomad-cf/core/calculations";
import { sourceCategoryColor } from "@gnomad-cf/core/filters";
import { usePopulationBreakdown } from "@/composables/usePopulationBreakdown";
import ResultsChartTab from "./ResultsChartTab.vue";
import ResultsTableToolbar from "./ResultsTableToolbar.vue";

interface TableItem {
  label: string;
  code: string;
  carrierFrequency: number | null;
  ratioDenominator: number | null;
  geneticPrevalence: number | null;
  recurrenceRiskValue: number | null;
  recurrenceRisk: string;
  alleleCount: number;
  alleleNumber: number | null;
  isFounderEffect: boolean;
  isGlobal: boolean;
  notes: string;
}

const props = defineProps<{
  result: CarrierFrequencyResult;
  effectiveFrequency: number | null;
  indexStatus: IndexPatientStatus;
  penetrance: number;
  sourceAttribution: string;
  qualifyingVariantCount?: number;
  qualifyingVariants?: GnomadVariant[];
  clinvarVariants: ClinVarVariant[];
  variants: GnomadVariant[];
  filterConfig: FilterConfig;
  calcConfig: CalcConfig;
  submissions: Map<string, ClinVarSubmission[]>;
  excludedSet: Set<string>;
  reasons: Map<string, ExclusionReason>;
  isLoading: boolean;
  currentFormat: DisplayFormat;
  formatFrequency: (freq: number | null) => string;
  formatRatioDisplay: (freq: number | null) => string;
  setFormat: (format: DisplayFormat) => void;
}>();

const emit = defineEmits<{
  openModal: [populationCode: string | null];
}>();

const safeQualifyingVariants = computed(() => props.qualifyingVariants ?? []);

const {
  isV2,
  showSubcontinental,
  isLoadingSubcontinental,
  subcontinentalProgress,
  subcontinentalError,
  getSubcontinentalRows,
  hasSubpopulations,
  togglePopExpand,
  isPopExpanded,
  getSourceBreakdown,
  formatSourceFrequency,
  getSourceBorderColor,
} = usePopulationBreakdown({
  result: toRef(props, "result"),
  qualifyingVariants: safeQualifyingVariants,
  clinvarVariants: toRef(props, "clinvarVariants"),
  filterConfig: toRef(props, "filterConfig"),
  calcConfig: toRef(props, "calcConfig"),
  submissions: toRef(props, "submissions"),
  formatFrequency: props.formatFrequency,
});

const populationTab = ref<"chart" | "table">("table");

const hasNotes = computed(() =>
  tableItems.value.some((item) => item.notes.length > 0),
);

const headers = computed(() => {
  const base = [
    { title: "Population", key: "label", sortable: true },
    {
      title: "Carrier Frequency",
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
    {
      title: "AN",
      key: "alleleNumber",
      sortable: true,
      align: "end" as const,
    },
  ];
  if (hasNotes.value) {
    base.push({ title: "Notes", key: "notes", sortable: true });
  }
  return base;
});

const sortBy = ref([{ key: "carrierFrequency", order: "desc" as const }]);

function calculateRecurrenceRiskWithValue(freq: number): {
  risk: number | null;
  riskString: string;
} {
  const risk = calculateRecurrenceRisk(
    freq,
    props.indexStatus,
    props.penetrance,
  );
  const riskString =
    risk !== null && risk > 0
      ? `1:${Math.round(1 / risk).toLocaleString()}`
      : risk === 0
        ? "0"
        : "-";
  return { risk, riskString };
}

function formatPrevalenceRatio(prevalence: number | null): string {
  if (prevalence === null || prevalence === 0) return "-";
  const formatted = formatPrevalence(prevalence);
  return formatted.ratio;
}

const tableItems = computed((): TableItem[] => {
  if (!props.result) return [];

  const items: TableItem[] = [];

  const globalCarrierFreq = props.effectiveFrequency;
  if (globalCarrierFreq !== null) {
    const { risk, riskString } =
      calculateRecurrenceRiskWithValue(globalCarrierFreq);
    items.push({
      label: "Global",
      code: "",
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

  for (const pop of props.result.populations) {
    const { risk, riskString } =
      pop.carrierFrequency !== null
        ? calculateRecurrenceRiskWithValue(pop.carrierFrequency)
        : { risk: null, riskString: "-" };

    items.push({
      label: pop.label,
      code: pop.code,
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

function getRowClass(item: TableItem): string {
  if (item.isGlobal) return "bg-grey-lighten-4 font-weight-bold";
  if (item.isFounderEffect) return "bg-blue-lighten-5";
  return "";
}
</script>

<style scoped>
.table-scroll-wrapper {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

:deep(.results-table) th:first-child,
:deep(.results-table) td:first-child {
  position: sticky;
  left: 0;
  z-index: 2;
  background: rgb(var(--v-theme-surface));
}

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

:deep(.bg-grey-lighten-4) td:first-child {
  background: #f5f5f5;
}

:deep(.bg-blue-lighten-5) td:first-child {
  background: #e3f2fd;
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

.population-row:hover .population-expand-btn {
  color: rgb(var(--v-theme-primary)) !important;
}

.source-breakdown-row {
  background-color: rgba(var(--v-theme-surface-variant), 0.3);
}

.source-breakdown-row td {
  font-size: 0.875rem;
  padding-top: 2px !important;
  padding-bottom: 2px !important;
}

.source-breakdown-row:hover {
  background-color: rgba(var(--v-theme-surface-variant), 0.5) !important;
}

.subcontinental-row {
  background: rgba(var(--v-theme-surface-variant), 0.15);
}

.subcontinental-row td {
  font-size: 0.85em;
}

.subcontinental-loading-row td {
  padding: 0 !important;
}
</style>
