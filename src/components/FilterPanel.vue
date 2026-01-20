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
            <div class="d-flex align-center">
              <v-switch
                :model-value="modelValue.lofHcEnabled"
                color="primary"
                label="LoF High Confidence"
                :density="smAndDown ? 'default' : 'compact'"
                hide-details
                @update:model-value="updateFilter('lofHcEnabled', $event)"
              />
              <v-tooltip location="top">
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
                  <strong>Loss-of-Function High Confidence</strong><br>
                  Includes predicted loss-of-function variants (nonsense, frameshift,
                  splice site) that pass gnomAD quality filters. These variants typically
                  result in no protein product.
                </span>
              </v-tooltip>
            </div>
          </v-col>

          <v-col
            cols="12"
            md="6"
          >
            <div class="d-flex align-center">
              <v-switch
                :model-value="modelValue.missenseEnabled"
                color="secondary"
                label="Include Missense"
                :density="smAndDown ? 'default' : 'compact'"
                hide-details
                @update:model-value="updateFilter('missenseEnabled', $event)"
              />
              <v-tooltip location="top">
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
                  <strong>Missense Variants</strong><br>
                  Includes single amino acid substitutions. Not all missense variants
                  are pathogenic. Enable this if ClinVar P/LP missense variants should
                  be included in the calculation.
                </span>
              </v-tooltip>
            </div>
          </v-col>

          <v-col
            cols="12"
            md="6"
          >
            <div class="d-flex align-center">
              <v-switch
                :model-value="modelValue.clinvarEnabled"
                color="success"
                label="ClinVar P/LP"
                :density="smAndDown ? 'default' : 'compact'"
                hide-details
                @update:model-value="updateFilter('clinvarEnabled', $event)"
              />
              <v-tooltip location="top">
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
                  <strong>ClinVar Pathogenic/Likely Pathogenic</strong><br>
                  Includes variants classified as Pathogenic or Likely Pathogenic
                  in ClinVar. This captures known disease-causing variants that may
                  not be predicted as LoF.
                </span>
              </v-tooltip>
            </div>
          </v-col>

          <v-col
            cols="12"
            md="6"
          >
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
                @update:model-value="updateFilter('clinvarStarThreshold', $event)"
              />
              <v-tooltip location="top">
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
                  <strong>ClinVar Review Stars</strong><br>
                  Minimum number of review stars required. Higher stars indicate
                  more evidence and expert review.<br>
                  0: Any assertion<br>
                  1: Single submitter<br>
                  2: Multiple submitters with consensus<br>
                  3: Reviewed by expert panel<br>
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
                @update:model-value="updateFilter('clinvarIncludeConflicting', $event)"
              />
              <v-tooltip location="top">
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
                  <strong>Conflicting Classifications</strong><br>
                  When enabled, variants marked as "Conflicting interpretations"
                  in ClinVar will be included if the majority of individual
                  submissions classify them as Pathogenic or Likely Pathogenic.
                  The threshold below sets the minimum P/LP percentage required.
                </span>
              </v-tooltip>
            </div>
          </v-col>

          <v-col
            cols="12"
            md="6"
          >
            <div class="d-flex align-start">
              <v-slider
                :model-value="modelValue.clinvarConflictingThreshold"
                :disabled="!modelValue.clinvarEnabled || !modelValue.clinvarIncludeConflicting"
                :min="50"
                :max="100"
                :step="5"
                label="P/LP Threshold %"
                :density="smAndDown ? 'default' : 'compact'"
                thumb-label
                color="warning"
                class="flex-grow-1"
                @update:model-value="updateFilter('clinvarConflictingThreshold', $event)"
              />
              <v-tooltip location="top">
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
                  <strong>P/LP Threshold</strong><br>
                  Minimum percentage of ClinVar submissions that must classify
                  the variant as Pathogenic or Likely Pathogenic for it to be
                  included. Default is 80%.
                </span>
              </v-tooltip>
            </div>
          </v-col>

          <!-- Warning alert for conflicting filter -->
          <v-col
            v-if="modelValue.clinvarIncludeConflicting && modelValue.clinvarEnabled"
            cols="12"
          >
            <v-alert
              type="warning"
              variant="tonal"
              density="compact"
            >
              <template #prepend>
                <v-icon>mdi-alert</v-icon>
              </template>
              <div class="text-body-2">
                <strong>Performance warning:</strong>
                Fetching individual ClinVar submissions can be slow for genes with many
                conflicting variants. This may take up to 20 seconds for some genes.
              </div>
              <div
                v-if="conflictingCount > 0"
                class="text-body-2 mt-1"
              >
                Found <strong>{{ conflictingCount }}</strong> variant(s) with conflicting classifications.
                <span v-if="isLoadingSubmissions">
                  Loading submissions... {{ submissionsProgress }}%
                </span>
              </div>
            </v-alert>
          </v-col>
        </v-row>

        <v-divider class="my-3" />

        <div class="d-flex align-center justify-space-between flex-wrap ga-2">
          <div class="text-body-2">
            <strong>{{ variantCount }}</strong> qualifying variant(s)
          </div>

          <v-btn
            variant="text"
            :size="smAndDown ? 'default' : 'small'"
            :min-height="smAndDown ? 44 : undefined"
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
import { useDisplay } from 'vuetify';
import FilterChips from './FilterChips.vue';
import type { FilterConfig } from '@/types';

const props = defineProps<{
  modelValue: FilterConfig;
  variantCount: number;
  conflictingCount?: number;
  isLoadingSubmissions?: boolean;
  submissionsProgress?: number;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: FilterConfig];
  reset: [];
}>();

// Responsive breakpoint detection
const { smAndDown } = useDisplay();

const panel = ref<number | undefined>(undefined);

const isExpanded = computed(() => panel.value === 0);

// Default values for optional props
const conflictingCount = computed(() => props.conflictingCount ?? 0);
const isLoadingSubmissions = computed(() => props.isLoadingSubmissions ?? false);
const submissionsProgress = computed(() => props.submissionsProgress ?? 0);

// Show tick labels only on desktop to prevent overlap on mobile
const showTickLabels = computed(() => !smAndDown.value ? 'always' : true);

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

<style scoped>
.tooltip-text {
  max-width: 280px;
  display: inline-block;
}
</style>
