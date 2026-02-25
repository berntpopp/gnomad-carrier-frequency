<template>
  <v-expansion-panels v-model="panel" class="mb-6">
    <v-expansion-panel>
      <v-expansion-panel-title>
        <div class="d-flex align-center flex-wrap ga-2">
          <span class="text-subtitle-2">Settings</span>
          <FilterChips v-if="!isExpanded" :filters="modelValue" />
          <v-chip
            v-if="configLoading"
            color="info"
            size="x-small"
            variant="outlined"
          >
            <v-progress-circular
              indeterminate
              size="12"
              width="2"
              class="mr-1"
            />
            Loading config
          </v-chip>
          <v-chip
            v-else-if="configLoaded"
            color="info"
            size="x-small"
            prepend-icon="mdi-dna"
            closable
            @click:close="resetConfig"
          >
            Gene config loaded
          </v-chip>
        </div>
      </v-expansion-panel-title>

      <v-expansion-panel-text>
        <v-select
          v-if="configLoaded && availableProfiles.length > 1"
          :model-value="activeProfile?.profileId"
          :items="
            availableProfiles.map((p) => ({
              title: p.displayName,
              value: p.profileId,
            }))
          "
          label="Condition profile"
          density="compact"
          variant="outlined"
          hide-details
          class="mb-3"
          @update:model-value="selectProfile($event)"
        />

        <v-row dense>
          <v-col cols="12" md="6">
            <div class="d-flex align-center">
              <v-switch
                :model-value="modelValue.lofHcEnabled"
                color="secondary"
                label="LoF High Confidence"
                :density="smAndDown ? 'default' : 'compact'"
                hide-details
                @update:model-value="updateFilter('lofHcEnabled', $event)"
              />
              <v-tooltip location="top" aria-label="Filter information">
                <template #activator="{ props: tooltipProps }">
                  <v-icon
                    v-bind="tooltipProps"
                    size="x-small"
                    class="ml-1"
                    aria-label="LoF High Confidence filter information"
                  >
                    mdi-information-outline
                  </v-icon>
                </template>
                <span class="tooltip-text">
                  <strong>Loss-of-Function High Confidence</strong><br />
                  Includes predicted loss-of-function variants (nonsense,
                  frameshift, splice site) that pass gnomAD quality filters.
                  These variants typically result in no protein product.
                </span>
              </v-tooltip>
            </div>
          </v-col>

          <v-col cols="12" md="6">
            <div class="d-flex align-center">
              <v-switch
                :model-value="modelValue.missenseEnabled"
                color="secondary"
                label="Include Missense"
                :density="smAndDown ? 'default' : 'compact'"
                hide-details
                @update:model-value="updateFilter('missenseEnabled', $event)"
              />
              <v-tooltip location="top" aria-label="Filter information">
                <template #activator="{ props: tooltipProps }">
                  <v-icon
                    v-bind="tooltipProps"
                    size="x-small"
                    class="ml-1"
                    aria-label="Missense filter information"
                  >
                    mdi-information-outline
                  </v-icon>
                </template>
                <span class="tooltip-text">
                  <strong>Missense Variants</strong><br />
                  Includes single amino acid substitutions. Not all missense
                  variants are pathogenic. Enable this if ClinVar P/LP missense
                  variants should be included in the calculation.
                </span>
              </v-tooltip>
            </div>
          </v-col>

          <v-col cols="12" md="6">
            <div class="d-flex align-center">
              <v-switch
                :model-value="modelValue.clinvarEnabled"
                color="success"
                label="ClinVar P/LP"
                :density="smAndDown ? 'default' : 'compact'"
                hide-details
                @update:model-value="updateFilter('clinvarEnabled', $event)"
              />
              <v-tooltip location="top" aria-label="Filter information">
                <template #activator="{ props: tooltipProps }">
                  <v-icon
                    v-bind="tooltipProps"
                    size="x-small"
                    class="ml-1"
                    aria-label="ClinVar filter information"
                  >
                    mdi-information-outline
                  </v-icon>
                </template>
                <span class="tooltip-text">
                  <strong>ClinVar Pathogenic/Likely Pathogenic</strong><br />
                  Includes variants classified as Pathogenic or Likely
                  Pathogenic in ClinVar. This captures known disease-causing
                  variants that may not be predicted as LoF.
                </span>
              </v-tooltip>
            </div>
          </v-col>

          <v-col cols="12" md="6">
            <div class="d-flex align-start">
              <v-slider
                :model-value="modelValue.clinvarStarThreshold"
                :disabled="!modelValue.clinvarEnabled"
                :min="0"
                :max="4"
                :step="1"
                :ticks="smAndDown ? undefined : tickLabels"
                :show-ticks="showTickLabels"
                tick-size="4"
                label="ClinVar Min Stars"
                :density="smAndDown ? 'default' : 'compact'"
                thumb-label
                color="success"
                class="flex-grow-1"
                @update:model-value="
                  updateFilter('clinvarStarThreshold', $event)
                "
              />
              <v-tooltip location="top" aria-label="Filter information">
                <template #activator="{ props: tooltipProps }">
                  <v-icon
                    v-bind="tooltipProps"
                    size="x-small"
                    class="ml-1 mt-3"
                    aria-label="ClinVar review stars information"
                  >
                    mdi-information-outline
                  </v-icon>
                </template>
                <span class="tooltip-text">
                  <strong>ClinVar Review Stars</strong><br />
                  Minimum number of review stars required. Higher stars indicate
                  more evidence and expert review.<br />
                  0: Any assertion<br />
                  1: Single submitter<br />
                  2: Multiple submitters with consensus<br />
                  3: Reviewed by expert panel<br />
                  4: Practice guideline
                </span>
              </v-tooltip>
            </div>
          </v-col>

          <!-- Conflicting classification filter -->
          <v-col cols="12">
            <v-divider class="mb-3" />
            <div class="d-flex align-center">
              <v-switch
                :model-value="modelValue.clinvarIncludeConflicting"
                :disabled="!modelValue.clinvarEnabled"
                color="warning"
                label="Include conflicting with majority P/LP"
                :density="smAndDown ? 'default' : 'compact'"
                hide-details
                @update:model-value="
                  updateFilter('clinvarIncludeConflicting', $event)
                "
              />
              <v-tooltip location="top" aria-label="Filter information">
                <template #activator="{ props: tooltipProps }">
                  <v-icon
                    v-bind="tooltipProps"
                    size="x-small"
                    class="ml-1"
                    aria-label="Conflicting classification filter information"
                  >
                    mdi-information-outline
                  </v-icon>
                </template>
                <span class="tooltip-text">
                  <strong>Conflicting Classifications</strong><br />
                  When enabled, variants marked as "Conflicting interpretations"
                  in ClinVar will be included if the majority of individual
                  submissions classify them as Pathogenic or Likely Pathogenic.
                  The threshold below sets the minimum P/LP percentage required.
                </span>
              </v-tooltip>
            </div>
          </v-col>

          <v-col cols="12" md="6">
            <div class="d-flex align-start">
              <v-slider
                :model-value="modelValue.clinvarConflictingThreshold"
                :disabled="
                  !modelValue.clinvarEnabled ||
                  !modelValue.clinvarIncludeConflicting
                "
                :min="50"
                :max="100"
                :step="5"
                label="P/LP Threshold %"
                :density="smAndDown ? 'default' : 'compact'"
                thumb-label
                color="warning"
                class="flex-grow-1"
                @update:model-value="
                  updateFilter('clinvarConflictingThreshold', $event)
                "
              />
              <v-tooltip location="top" aria-label="Filter information">
                <template #activator="{ props: tooltipProps }">
                  <v-icon
                    v-bind="tooltipProps"
                    size="x-small"
                    class="ml-1 mt-3"
                    aria-label="P/LP threshold information"
                  >
                    mdi-information-outline
                  </v-icon>
                </template>
                <span class="tooltip-text">
                  <strong>P/LP Threshold</strong><br />
                  Minimum percentage of ClinVar submissions that must classify
                  the variant as Pathogenic or Likely Pathogenic for it to be
                  included. Default is 80%.
                </span>
              </v-tooltip>
            </div>
          </v-col>

          <!-- Conflicting submissions status -->
          <v-col
            v-if="
              modelValue.clinvarIncludeConflicting && modelValue.clinvarEnabled
            "
            cols="12"
          >
            <!-- Error state -->
            <v-alert
              v-if="submissionsError"
              type="error"
              variant="tonal"
              density="compact"
            >
              <div class="text-body-2">
                <strong>Submissions fetch failed:</strong>
                {{ submissionsError }}
              </div>
              <template #append>
                <v-btn
                  variant="text"
                  size="small"
                  prepend-icon="mdi-refresh"
                  @click="emit('retrySubmissions')"
                >
                  Retry
                </v-btn>
              </template>
            </v-alert>

            <!-- Loading state -->
            <v-alert
              v-else-if="isLoadingSubmissions"
              type="info"
              variant="tonal"
              density="compact"
            >
              <div class="text-body-2">
                Fetching submissions for
                <strong>{{ conflictingCount }}</strong> conflicting
                variant(s)...
              </div>
              <v-progress-linear
                :model-value="submissionsProgress"
                color="info"
                height="6"
                rounded
                class="mt-2"
              />
              <div class="text-caption text-medium-emphasis mt-1">
                {{ submissionsProgress }}% complete
              </div>
            </v-alert>

            <!-- Success / idle state -->
            <v-alert
              v-else-if="conflictingCount > 0"
              type="success"
              variant="tonal"
              density="compact"
            >
              <div class="text-body-2">
                Resolved <strong>{{ conflictingCount }}</strong> conflicting
                variant(s). Variants with &ge;{{
                  modelValue.clinvarConflictingThreshold
                }}% P/LP submissions are included.
              </div>
            </v-alert>
          </v-col>

          <!-- Calculation settings -->
          <v-col cols="12" md="6">
            <div class="d-flex align-center">
              <v-switch
                :model-value="calcConfig.useHWEFormula"
                color="primary"
                label="HWE Formula (2pq)"
                :density="smAndDown ? 'default' : 'compact'"
                hide-details
                @update:model-value="updateCalcConfig('useHWEFormula', $event)"
              />
              <v-tooltip location="top" aria-label="Calculation information">
                <template #activator="{ props: tooltipProps }">
                  <v-icon
                    v-bind="tooltipProps"
                    size="x-small"
                    class="ml-1"
                    aria-label="HWE formula information"
                  >
                    mdi-information-outline
                  </v-icon>
                </template>
                <span class="tooltip-text">
                  <strong>Hardy-Weinberg Equilibrium Formula</strong><br />
                  When enabled (default), carrier frequency is calculated as 2pq
                  where p = 1 - q and q = sum of pathogenic allele frequencies.
                  This is the standard epidemiological approach.<br /><br />
                  When disabled, the simplified formula 2 * SumAF is used
                  instead. This underestimates carrier frequency slightly but
                  matches some published methods.
                </span>
              </v-tooltip>
            </div>
          </v-col>

          <v-col cols="12" md="6">
            <div class="d-flex align-center">
              <v-switch
                :model-value="calcConfig.useHomExclusion"
                color="primary"
                label="Homozygote Exclusion"
                :density="smAndDown ? 'default' : 'compact'"
                hide-details
                @update:model-value="
                  updateCalcConfig('useHomExclusion', $event)
                "
              />
              <v-tooltip location="top" aria-label="Calculation information">
                <template #activator="{ props: tooltipProps }">
                  <v-icon
                    v-bind="tooltipProps"
                    size="x-small"
                    class="ml-1"
                    aria-label="Homozygote exclusion information"
                  >
                    mdi-information-outline
                  </v-icon>
                </template>
                <span class="tooltip-text">
                  <strong>Homozygote Exclusion (VCR/GCR)</strong><br />
                  When enabled (default), uses Variant Carrier Rate (VCR) per
                  variant and Gene Carrier Rate (GCR) aggregation. This accounts
                  for observed homozygotes in gnomAD data and avoids
                  double-counting compound heterozygotes.<br /><br />
                  When disabled, carrier frequency is computed directly from the
                  HWE or simplified formula without homozygote correction.
                </span>
              </v-tooltip>
            </div>
          </v-col>

          <v-col cols="12" md="6">
            <div class="d-flex align-start">
              <v-slider
                :model-value="penetrancePercent"
                :min="0"
                :max="100"
                :step="5"
                label="Penetrance %"
                :density="smAndDown ? 'default' : 'compact'"
                thumb-label
                color="primary"
                class="flex-grow-1"
                @update:model-value="updatePenetrance($event)"
              />
              <v-tooltip location="top" aria-label="Calculation information">
                <template #activator="{ props: tooltipProps }">
                  <v-icon
                    v-bind="tooltipProps"
                    size="x-small"
                    class="ml-1 mt-3"
                    aria-label="Penetrance information"
                  >
                    mdi-information-outline
                  </v-icon>
                </template>
                <span class="tooltip-text">
                  <strong>Penetrance</strong><br />
                  The proportion of individuals with the disease genotype who
                  actually express the disease phenotype. Default is 100% (fully
                  penetrant).<br /><br />
                  Reducing penetrance scales the Bayesian prevalence
                  accordingly. For example, 80% penetrance means only 80% of
                  genetically affected individuals are expected to be clinically
                  affected.
                </span>
              </v-tooltip>
            </div>
          </v-col>
        </v-row>

        <v-divider class="my-3" />

        <div class="d-flex align-center justify-space-between flex-wrap ga-2">
          <div class="text-body-2">
            <strong>{{ variantCount }}</strong> qualifying variant(s)
          </div>

          <div class="d-flex align-center flex-wrap ga-2">
            <v-btn
              variant="text"
              :size="smAndDown ? 'default' : 'small'"
              :min-height="smAndDown ? 44 : undefined"
              prepend-icon="mdi-refresh"
              @click="emit('reset')"
            >
              Reset to Defaults
            </v-btn>

            <GeneConfigSubmitDialog>
              <template #activator="{ props: dialogProps }">
                <v-btn
                  v-bind="dialogProps"
                  variant="text"
                  :size="smAndDown ? 'default' : 'small'"
                  :min-height="smAndDown ? 44 : undefined"
                  prepend-icon="mdi-flask-outline"
                  :disabled="!selectedGene"
                >
                  {{
                    configLoaded
                      ? "Suggest Config Update"
                      : "Suggest Gene Config"
                  }}
                </v-btn>
              </template>
            </GeneConfigSubmitDialog>
          </div>
        </div>
      </v-expansion-panel-text>
    </v-expansion-panel>
  </v-expansion-panels>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useDisplay } from "vuetify";
import FilterChips from "./FilterChips.vue";
import GeneConfigSubmitDialog from "./GeneConfigSubmitDialog.vue";
import type { FilterConfig, CalcConfig } from "@gnomad-cf/core/types";
import { useGeneConfig } from "@/composables/useGeneConfig";
import { useGeneSearch } from "@/composables/useGeneSearch";

const {
  configLoaded,
  configLoading,
  activeProfile,
  availableProfiles,
  selectProfile,
  resetConfig,
} = useGeneConfig();
const { selectedGene } = useGeneSearch();

const props = defineProps<{
  modelValue: FilterConfig;
  calcConfig: CalcConfig;
  variantCount: number;
  conflictingCount?: number;
  isLoadingSubmissions?: boolean;
  submissionsProgress?: number;
  submissionsError?: string | null;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: FilterConfig];
  "update:calcConfig": [value: CalcConfig];
  retrySubmissions: [];
  reset: [];
}>();

// Responsive breakpoint detection
const { smAndDown } = useDisplay();

const panel = ref<number | undefined>(undefined);

const isExpanded = computed(() => panel.value === 0);

// Default values for optional props
const conflictingCount = computed(() => props.conflictingCount ?? 0);
const isLoadingSubmissions = computed(
  () => props.isLoadingSubmissions ?? false,
);
const submissionsProgress = computed(() => props.submissionsProgress ?? 0);
const submissionsError = computed(() => props.submissionsError ?? null);

// Show tick labels only on desktop to prevent overlap on mobile
const showTickLabels = computed(() => (!smAndDown.value ? "always" : true));

const tickLabels = {
  0: "0",
  1: "1",
  2: "2",
  3: "3",
  4: "4",
};

// Penetrance displayed as 0-100% integer
const penetrancePercent = computed(() =>
  Math.round(props.calcConfig.penetrance * 100),
);

function updateFilter<K extends keyof FilterConfig>(
  key: K,
  value: FilterConfig[K],
) {
  emit("update:modelValue", {
    ...props.modelValue,
    [key]: value,
  });
}

function updateCalcConfig<K extends keyof CalcConfig>(
  key: K,
  value: CalcConfig[K],
) {
  emit("update:calcConfig", { ...props.calcConfig, [key]: value });
}

function updatePenetrance(percentValue: number) {
  updateCalcConfig("penetrance", percentValue / 100);
}
</script>

<style scoped>
.tooltip-text {
  max-width: 280px;
  display: inline-block;
}
</style>
