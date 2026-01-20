<template>
  <div>
    <h2 class="text-h6 mb-4">
      Frequency Source
    </h2>
    <p class="text-body-2 text-medium-emphasis mb-4">
      Choose the source for carrier frequency calculation.
      <v-tooltip location="top" aria-label="Frequency source information">
        <template #activator="{ props: tooltipProps }">
          <v-icon
            v-bind="tooltipProps"
            size="x-small"
            class="ml-1"
            aria-label="Population selection information"
          >
            mdi-information-outline
          </v-icon>
        </template>
        <span class="tooltip-text">
          <strong>Population Selection</strong><br>
          Select the population that best matches the patient's genetic ancestry.
          gnomAD populations are based on genetic clustering, not self-reported ethnicity.
          If ancestry is unknown, consider using global frequencies.
        </span>
      </v-tooltip>
    </p>

    <v-card variant="outlined">
      <v-tabs
        v-model="activeTab"
        bg-color="primary"
      >
        <v-tab value="gnomad">
          gnomAD
        </v-tab>
        <v-tab value="literature">
          Literature
        </v-tab>
        <v-tab value="default">
          Default
        </v-tab>
      </v-tabs>

      <v-card-text>
        <v-window v-model="activeTab">
          <!-- gnomAD Tab -->
          <v-window-item value="gnomad">
            <div
              v-if="gnomadLoading"
              class="d-flex align-center justify-center pa-4"
            >
              <v-progress-circular
                indeterminate
                color="primary"
                class="mr-4"
              />
              <span class="text-body-2">Calculating carrier frequency from gnomAD...</span>
            </div>

            <div v-else-if="usingDefault">
              <v-alert
                type="info"
                variant="tonal"
                class="mb-4"
              >
                No qualifying pathogenic variants found in gnomAD.
                Using default carrier frequency assumption.
              </v-alert>
              <p class="text-body-2">
                Default carrier frequency: <strong>1:100 (1.00%)</strong>
              </p>
            </div>

            <div v-else-if="gnomadFrequency">
              <v-alert
                type="success"
                variant="tonal"
                class="mb-4"
              >
                Carrier frequency calculated from gnomAD data.
              </v-alert>
              <p class="text-body-1 mb-4">
                Calculated carrier frequency:
                <strong>{{ gnomadFrequency.ratio }}</strong>
                ({{ gnomadFrequency.percent }})
              </p>
            </div>

            <div v-else>
              <v-alert
                type="warning"
                variant="tonal"
              >
                Unable to calculate carrier frequency. Please select a gene first.
              </v-alert>
            </div>
          </v-window-item>

          <!-- Literature Tab -->
          <v-window-item value="literature">
            <v-form v-model="literatureFormValid">
              <v-text-field
                v-model="localFrequency"
                label="Carrier Frequency"
                hint="Enter as decimal (e.g., 0.01 for 1:100)"
                persistent-hint
                :rules="frequencyRules"
                validate-on="blur"
                type="number"
                step="0.001"
                min="0"
                max="1"
                class="mb-4"
              />
              <v-text-field
                v-model="localPmid"
                label="PMID"
                hint="PubMed ID for the source publication"
                persistent-hint
                :rules="pmidRules"
                validate-on="blur"
              />
            </v-form>
          </v-window-item>

          <!-- Default Tab -->
          <v-window-item value="default">
            <v-alert
              type="info"
              variant="tonal"
              class="mb-4"
            >
              Using default carrier frequency assumption: <strong>1:100 (1.00%)</strong>
            </v-alert>
            <p class="text-body-2">
              Use this option when no gene-specific data is available,
              or as a conservative estimate for rare conditions.
            </p>
          </v-window-item>
        </v-window>
      </v-card-text>
    </v-card>

    <div class="d-flex justify-space-between mt-6">
      <v-btn
        variant="text"
        @click="$emit('back')"
      >
        Back
      </v-btn>
      <v-btn
        color="primary"
        :disabled="!isCurrentSourceValid"
        @click="$emit('complete')"
      >
        Continue
      </v-btn>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { FrequencySource } from '@/types';

const props = defineProps<{
  source: FrequencySource;
  literatureFrequency: number | null;
  literaturePmid: string | null;
  gnomadFrequency: { percent: string; ratio: string } | null;
  gnomadLoading: boolean;
  usingDefault: boolean;
}>();

const emit = defineEmits<{
  'update:source': [source: FrequencySource];
  'update:literatureFrequency': [freq: number | null];
  'update:literaturePmid': [pmid: string | null];
  complete: [];
  back: [];
}>();

// Local form state for literature inputs
const localFrequency = ref<string>(
  props.literatureFrequency !== null ? String(props.literatureFrequency) : ''
);
const localPmid = ref<string>(props.literaturePmid ?? '');
const literatureFormValid = ref(false);

// Tab state bound to source
const activeTab = computed({
  get: () => props.source,
  set: (value: FrequencySource) => {
    emit('update:source', value);
  },
});

// Validation rules
const frequencyRules = [
  (v: string) => !!v || 'Frequency is required',
  (v: string) => !isNaN(parseFloat(v)) || 'Must be a number',
  (v: string) => {
    const num = parseFloat(v);
    return (num > 0 && num <= 1) || 'Must be between 0 and 1 (exclusive/inclusive)';
  },
];

const pmidRules = [
  (v: string) => !!v || 'PMID is required',
  (v: string) => /^\d+$/.test(v) || 'PMID must be numeric',
];

// Watch local literature values and emit updates
watch(localFrequency, (value) => {
  const num = parseFloat(value);
  emit('update:literatureFrequency', !isNaN(num) ? num : null);
});

watch(localPmid, (value) => {
  emit('update:literaturePmid', value || null);
});

// Sync with parent state changes
watch(
  () => props.literatureFrequency,
  (value) => {
    if (value !== null) {
      localFrequency.value = String(value);
    }
  }
);

watch(
  () => props.literaturePmid,
  (value) => {
    localPmid.value = value ?? '';
  }
);

// Compute validation for current source
const isGnomadValid = computed(() => {
  return props.gnomadFrequency !== null || props.usingDefault;
});

const isLiteratureValid = computed(() => {
  const freq = parseFloat(localFrequency.value);
  const pmid = localPmid.value;
  return !isNaN(freq) && freq > 0 && freq <= 1 && /^\d+$/.test(pmid);
});

const isCurrentSourceValid = computed(() => {
  switch (props.source) {
    case 'gnomad':
      return isGnomadValid.value && !props.gnomadLoading;
    case 'literature':
      return isLiteratureValid.value;
    case 'default':
      return true; // Default is always valid
    default:
      return false;
  }
});
</script>

<style scoped>
.tooltip-text {
  max-width: 280px;
  display: inline-block;
}
</style>
