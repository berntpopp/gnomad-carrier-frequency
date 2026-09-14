<template>
  <div class="d-flex align-center flex-wrap ga-2 px-4 py-3">
    <span class="text-subtitle-2">Population Frequencies</span>

    <v-btn-toggle
      :model-value="currentFormat"
      mandatory
      density="compact"
      color="primary"
      variant="outlined"
      aria-label="Frequency display format"
      @update:model-value="emit('setFormat', $event as DisplayFormat)"
    >
      <v-tooltip
        v-for="option in formatOptions"
        :key="option.value"
        location="top"
      >
        <template #activator="{ props: tooltipProps }">
          <v-btn
            v-bind="tooltipProps"
            :value="option.value"
            size="small"
            :aria-label="option.label"
          >
            {{ option.symbol }}
          </v-btn>
        </template>
        {{ option.tooltip }}
      </v-tooltip>
    </v-btn-toggle>

    <v-spacer />

    <v-tooltip location="top">
      <template #activator="{ props: tooltipProps }">
        <v-btn
          v-bind="tooltipProps"
          variant="flat"
          color="primary"
          size="small"
          prepend-icon="mdi-table-eye"
          @click="emit('openModal', null)"
        >
          Variants ({{ qualifyingVariantsCount }})
        </v-btn>
      </template>
      View all qualifying variants with details, quality flags, and source
      classification.
    </v-tooltip>

    <!-- Export dropdown -->
    <ResultsExportMenu
      :result="result"
      :variants="variants"
      :clinvar-variants="clinvarVariants"
      :filter-config="filterConfig"
      :calc-config="calcConfig"
      :submissions="submissions"
      :excluded-set="excludedSet"
      :reasons="reasons"
    />

    <!-- Subcontinental toggle (v2 only) -->
    <v-tooltip v-if="isV2" location="top">
      <template #activator="{ props: tooltipProps }">
        <v-btn
          v-bind="tooltipProps"
          size="small"
          :variant="showSubcontinental ? 'flat' : 'outlined'"
          :color="showSubcontinental ? 'primary' : undefined"
          :disabled="qualifyingVariantsCount === 0 || isLoading"
          :loading="isLoadingSubcontinental"
          prepend-icon="mdi-sitemap"
          data-testid="subcontinental-toggle"
          @click="emit('toggleSubcontinental')"
        >
          Sub
        </v-btn>
      </template>
      Fetch subcontinental breakdowns (NFE/EAS). May be slow — queries each
      variant individually.
    </v-tooltip>
    <v-tooltip v-else location="top">
      <template #activator="{ props: tooltipProps }">
        <v-chip
          v-bind="tooltipProps"
          size="small"
          variant="outlined"
          color="grey"
          class="ml-2"
          data-testid="subcontinental-v2-only"
        >
          <v-icon start size="x-small">mdi-information</v-icon>
          Sub (v2 only)
        </v-chip>
      </template>
      Subcontinental population breakdowns are only available for gnomAD
      v2.1.1 queries.
    </v-tooltip>
  </div>
</template>

<script setup lang="ts">
import type {
  CarrierFrequencyResult,
  GnomadVariant,
  ClinVarVariant,
  FilterConfig,
  CalcConfig,
  ExclusionReason,
} from "@gnomad-cf/core/types";
import type { ClinVarSubmission } from "@gnomad-cf/core/queries";
import type { DisplayFormat } from "@gnomad-cf/core/calculations";
import ResultsExportMenu from "./ResultsExportMenu.vue";

defineProps<{
  result: CarrierFrequencyResult;
  currentFormat: DisplayFormat;
  qualifyingVariantsCount: number;
  variants: GnomadVariant[];
  clinvarVariants: ClinVarVariant[];
  filterConfig: FilterConfig;
  calcConfig: CalcConfig;
  submissions: Map<string, ClinVarSubmission[]>;
  excludedSet: Set<string>;
  reasons: Map<string, ExclusionReason>;
  isV2: boolean;
  showSubcontinental: boolean;
  isLoading: boolean;
  isLoadingSubcontinental: boolean;
}>();

const emit = defineEmits<{
  setFormat: [format: DisplayFormat];
  openModal: [popCode: string | null];
  toggleSubcontinental: [];
}>();

const formatOptions = [
  {
    value: "percent" as DisplayFormat,
    symbol: "%",
    label: "Percentage",
    tooltip: "Display as percentage (e.g. 4.31%)",
  },
  {
    value: "ratio" as DisplayFormat,
    symbol: "1:N",
    label: "Ratio",
    tooltip: "Display as ratio (e.g. 1:23)",
  },
  {
    value: "scientific" as DisplayFormat,
    symbol: "sci",
    label: "Scientific notation",
    tooltip: "Display in scientific notation (e.g. 4.31 × 10⁻²)",
  },
  {
    value: "per100k" as DisplayFormat,
    symbol: "/100k",
    label: "Per 100,000",
    tooltip: "Display per 100,000 individuals",
  },
];
</script>
