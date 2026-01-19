<template>
  <div v-if="geneSymbol">
    <!-- Loading state -->
    <v-alert
      v-if="isLoading"
      type="info"
      variant="tonal"
      density="compact"
      class="mb-4"
    >
      <template #prepend>
        <v-progress-circular
          indeterminate
          size="20"
          width="2"
        />
      </template>
      Checking ClinGen gene-disease validity...
    </v-alert>

    <!-- Error state (cache fetch failed) -->
    <v-alert
      v-else-if="error"
      type="warning"
      variant="tonal"
      density="compact"
      class="mb-4"
    >
      <template #title>ClinGen Data Unavailable</template>
      <template #text>
        Unable to verify gene-disease validity. {{ error }}
      </template>
    </v-alert>

    <!-- Valid AR association (positive confirmation) -->
    <v-alert
      v-else-if="validity.hasAutosomalRecessive"
      type="success"
      variant="tonal"
      density="compact"
      class="mb-4"
    >
      <template #title>
        <v-icon start size="small">mdi-check-circle</v-icon>
        ClinGen AR Validated
      </template>
      <template #text>
        <div>
          <strong>{{ geneSymbol }}</strong> has validated autosomal recessive gene-disease association(s):
        </div>
        <ul class="mt-1 mb-0">
          <li v-for="entry in validity.arEntries" :key="entry.mondoId">
            {{ entry.diseaseLabel }}
            <v-chip
              size="x-small"
              variant="outlined"
              class="ml-1"
            >
              {{ entry.classification }}
            </v-chip>
          </li>
        </ul>
      </template>
    </v-alert>

    <!-- Gene found but no AR association (warning) -->
    <v-alert
      v-else-if="validity.found && !validity.hasAutosomalRecessive"
      type="warning"
      variant="tonal"
      density="compact"
      class="mb-4"
    >
      <template #title>
        <v-icon start size="small">mdi-alert</v-icon>
        No AR Association in ClinGen
      </template>
      <template #text>
        <div>
          <strong>{{ geneSymbol }}</strong> is in ClinGen but has no validated autosomal recessive associations.
        </div>
        <div
          v-if="validity.entries.length > 0"
          class="mt-1"
        >
          Found associations:
          <ul class="mt-1 mb-0">
            <li v-for="entry in validity.entries" :key="entry.mondoId">
              {{ entry.diseaseLabel }} ({{ entry.moi }})
              <v-chip
                size="x-small"
                variant="outlined"
                class="ml-1"
              >
                {{ entry.classification }}
              </v-chip>
            </li>
          </ul>
        </div>
        <div class="text-caption mt-2 text-medium-emphasis">
          Carrier frequency calculations assume autosomal recessive inheritance.
          Verify the inheritance pattern is appropriate for your clinical context.
        </div>
      </template>
    </v-alert>

    <!-- Gene not found in ClinGen (info/warning) -->
    <v-alert
      v-else-if="hasData && !validity.found"
      type="info"
      variant="tonal"
      density="compact"
      class="mb-4"
    >
      <template #title>
        <v-icon start size="small">mdi-information</v-icon>
        Gene Not in ClinGen
      </template>
      <template #text>
        <div>
          <strong>{{ geneSymbol }}</strong> was not found in the ClinGen gene-disease validity database.
        </div>
        <div class="text-caption mt-2 text-medium-emphasis">
          This does not mean the gene is not associated with disease.
          ClinGen curations are ongoing. Check primary literature for gene-disease associations.
        </div>
      </template>
    </v-alert>
  </div>
</template>

<script setup lang="ts">
import { computed, watch, onMounted } from 'vue';
import { useClingenValidity } from '@/composables';
import type { ClingenValidityResult } from '@/types';

const props = defineProps<{
  geneSymbol: string | null;
}>();

const {
  isLoading,
  error,
  hasData,
  fetchData,
  checkGene,
} = useClingenValidity();

// Compute validity result for current gene
const validity = computed<ClingenValidityResult>(() => {
  if (!props.geneSymbol || !hasData.value) {
    return { found: false, hasAutosomalRecessive: false, entries: [], arEntries: [] };
  }
  return checkGene(props.geneSymbol);
});

// Fetch ClinGen data on mount if not cached
onMounted(() => {
  fetchData();
});

// Re-fetch if data expires while component is mounted
watch(
  () => props.geneSymbol,
  () => {
    if (props.geneSymbol) {
      fetchData(); // Will skip if cache is valid
    }
  },
  { immediate: true }
);
</script>
