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
      {{ excludedCount }} variant(s) manually excluded from calculation.
      <template #append>
        <v-btn
          variant="text"
          size="small"
          prepend-icon="mdi-table"
          @click="openAllVariantsModal"
        >
          Open variant table
        </v-btn>
      </template>
    </v-alert>

    <!-- Quality exclusion alert - shows when variants excluded by quality flags -->
    <v-alert
      v-if="qualityExcludedCount > 0"
      type="warning"
      variant="tonal"
      class="mb-4"
      density="compact"
    >
      {{ qualityExcludedCount }} variant(s) excluded by quality flags.
    </v-alert>

    <!-- Summary card -->
    <ResultsSummaryCard
      v-if="result"
      :result="result"
      :canonical-transcript="canonicalTranscript"
      :effective-frequency="effectiveFrequency"
      :index-status="indexStatus"
      :penetrance="calcStore.defaults.penetrance"
      :use-h-w-e-formula="calcStore.defaults.useHWEFormula"
      :source-attribution="sourceAttribution"
      :source-chip-color="sourceChipColor"
      :cache-status="cacheStatus"
      :processing-status="processingStatus"
      :is-loading="isLoading"
      :qualifying-variant-count="qualifyingVariantCount"
      :excluded-count="excludedCount"
      :flagged-variant-count="flaggedVariantCount"
      :current-format="currentFormat"
      :format-frequency="formatFrequency"
      :orphanet-loading="orphanetLoading"
      :orphanet-diseases="orphanetDiseases"
      :primary-disease="primaryDisease"
      :additional-diseases="additionalDiseases"
      @refetch="refetch"
      @open-all-variants="openAllVariantsModal"
    />

    <!-- Settings panel -->
    <FilterPanel
      v-model="filters"
      :calc-config="calcStore.defaults"
      :variant-count="qualifyingVariantCount"
      :conflicting-count="props.conflictingVariantIds.length"
      :is-loading-submissions="props.isLoadingSubmissions"
      :submissions-progress="props.submissionsProgress"
      :submissions-error="props.submissionsError"
      v-bind="qualityFilterPanelProps"
      @retry-submissions="emit('retrySubmissions')"
      @update:calc-config="calcStore.setDefaults($event)"
      @update:quality-exclusion-config="setQualityExclusionConfig($event)"
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
    <ResultsPopulationTable
      v-if="result"
      :result="result"
      :effective-frequency="effectiveFrequency"
      :index-status="indexStatus"
      :penetrance="calcStore.defaults.penetrance"
      :source-attribution="sourceAttribution"
      :qualifying-variant-count="qualifyingVariantCount"
      :qualifying-variants="qualifyingVariants ?? []"
      :clinvar-variants="clinvarVariants"
      :variants="variants"
      :filter-config="filterConfig"
      :calc-config="calcStore.defaults"
      :submissions="submissions"
      :excluded-set="excludedSet"
      :reasons="reasons"
      :is-loading="isLoading"
      :current-format="currentFormat"
      :format-frequency="formatFrequency"
      :format-ratio-display="formatRatioDisplay"
      :set-format="setFormat"
      @open-modal="handleOpenModal"
    />

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
        variant="tonal"
        :min-height="smAndDown ? 44 : undefined"
        prepend-icon="mdi-arrow-left"
        @click="$emit('back')"
      >
        Back
      </v-btn>
      <v-btn
        variant="outlined"
        color="primary"
        :min-height="smAndDown ? 44 : undefined"
        prepend-icon="mdi-refresh"
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
import { computed, ref, watch } from "vue";
import { useDisplay } from "vuetify";
import { config, getGnomadVersion, getPopulationLabel } from "@gnomad-cf/core/config";
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
import { useExclusionState, useCarrierFrequency } from "@/composables";
import { useGeneSearch } from "@/composables/useGeneSearch";
import { useDisplayFormat } from "@/composables/useDisplayFormat";
import {
  filterPathogenicVariantsConfigurable,
  toDisplayVariants,
  filterVariantsByPopulation,
} from "@gnomad-cf/core/filters";
import { useOrphanetData } from "@/composables/useOrphanetData";
import TextOutput from "./TextOutput.vue";
import FilterPanel from "@/components/FilterPanel.vue";
import VariantModal from "@/components/VariantModal.vue";
import ClingenWarning from "@/components/ClingenWarning.vue";
import ResultsSummaryCard from "@/components/results/ResultsSummaryCard.vue";
import ResultsPopulationTable from "@/components/results/ResultsPopulationTable.vue";

const { smAndDown } = useDisplay();

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

const filterStore = useFilterStore();
const calcStore = useCalcStore();

const { canonicalTranscript } = useGeneSearch();

const {
  loading: orphanetLoading,
  primaryDisease,
  additionalDiseases,
  diseases: orphanetDiseases,
  fetchForGene: fetchOrphanetForGene,
} = useOrphanetData();

watch(
  () => props.result?.gene,
  (geneSymbol) => {
    if (geneSymbol) {
      fetchOrphanetForGene(geneSymbol);
    }
  },
  { immediate: true },
);

const { excludedCount, excluded, reasons } = useExclusionState();

const {
  isLoading,
  qualityExclusionConfig,
  setQualityExclusionConfig,
  qualityExcludedCount,
  flaggedVariantCount,
  qualifyingVariantCount,
  qualifyingVariants,
  cacheStatus,
  processingStatus,
  refetch,
} = useCarrierFrequency();

const qualityFilterPanelProps = computed(() => ({
  qualityExclusionConfig: qualityExclusionConfig.value,
  qualityExcludedCount: qualityExcludedCount.value,
  flaggedVariantCount: flaggedVariantCount.value,
}));

const excludedSet = computed(() => new Set(excluded.value));

const {
  currentFormat,
  setFormat,
  formatFrequency,
  formatRatio: formatRatioDisplay,
} = useDisplayFormat();

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

const filters = computed({
  get: () => props.filterConfig,
  set: (newFilters: FilterConfig) => {
    emit("update:filterConfig", { ...newFilters });
  },
});

const filteredVariants = computed(() => {
  if (!props.variants.length) return [];
  return filterPathogenicVariantsConfigurable(
    props.variants,
    props.clinvarVariants,
    props.filterConfig,
    props.submissions,
  );
});

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

// Modal handling
const showVariantModal = ref(false);
const selectedPopulationCode = ref<string | null>(null);

const selectedPopulationLabel = computed(() => {
  if (!selectedPopulationCode.value) return null;
  return getPopulationLabel(selectedPopulationCode.value);
});

const modalVariants = computed((): DisplayVariant[] => {
  if (!filteredVariants.value.length) return [];

  const variantsToShow = selectedPopulationCode.value
    ? filterVariantsByPopulation(
        filteredVariants.value,
        selectedPopulationCode.value,
      )
    : filteredVariants.value;

  return toDisplayVariants(
    variantsToShow,
    props.clinvarVariants,
    selectedPopulationCode.value,
  );
});

function openAllVariantsModal() {
  selectedPopulationCode.value = null;
  showVariantModal.value = true;
}

function handleOpenModal(popCode: string | null) {
  selectedPopulationCode.value = popCode;
  showVariantModal.value = true;
}
</script>
