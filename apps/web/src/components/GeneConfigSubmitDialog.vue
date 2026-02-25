<template>
  <v-dialog
    v-model="dialogOpen"
    max-width="560"
    scrollable
  >
    <template #activator="{ props: activatorProps }">
      <slot
        name="activator"
        :props="activatorProps"
      />
    </template>

    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon
          class="mr-2"
          color="primary"
        >
          mdi-flask-outline
        </v-icon>
        {{ isUpdate ? 'Suggest Config Update' : 'Suggest Gene Config' }}
      </v-card-title>

      <v-card-text>
        <p class="text-body-2 mb-4">
          Pre-fills a GitHub issue with your current settings.
          You'll add clinical rationale and references on GitHub.
        </p>

        <!-- Read-only fields (pre-filled from app state) -->
        <v-text-field
          :model-value="geneSymbol"
          label="Gene symbol"
          variant="outlined"
          density="compact"
          readonly
          class="mb-2"
        />

        <v-text-field
          :model-value="filterSummary"
          label="Filter settings"
          variant="outlined"
          density="compact"
          readonly
          class="mb-2"
        />

        <v-text-field
          :model-value="penetranceDisplay"
          label="Penetrance"
          variant="outlined"
          density="compact"
          readonly
          class="mb-2"
        />

        <v-textarea
          v-if="excludedVariantIds.length > 0"
          :model-value="excludedVariantIds.join('\n')"
          :label="`Excluded variants (${excludedVariantIds.length})`"
          variant="outlined"
          density="compact"
          readonly
          rows="3"
          class="mb-2"
        />

        <v-divider class="my-3" />

        <!-- Editable fields -->
        <v-text-field
          v-model="conditionName"
          label="Condition name"
          variant="outlined"
          density="compact"
          placeholder="e.g. Cystic Fibrosis"
          :rules="[(v: string) => !!v || 'Required']"
          class="mb-2"
        />

        <v-select
          v-model="inheritance"
          :items="inheritanceOptions"
          label="Inheritance pattern"
          variant="outlined"
          density="compact"
          class="mb-2"
        />

        <v-text-field
          v-model="omimId"
          label="OMIM phenotype ID (optional)"
          variant="outlined"
          density="compact"
          placeholder="e.g. 219700"
          class="mb-2"
        />

        <v-select
          v-model="willSubmitPr"
          :items="prOptions"
          label="Will you submit a PR?"
          variant="outlined"
          density="compact"
        />
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn
          variant="text"
          @click="dialogOpen = false"
        >
          Cancel
        </v-btn>
        <v-btn
          color="primary"
          variant="flat"
          :disabled="!conditionName"
          prepend-icon="mdi-open-in-new"
          @click="openGitHubIssue"
        >
          Open on GitHub
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useGeneSearch } from '@/composables/useGeneSearch';
import { useGeneConfig } from '@/composables/useGeneConfig';
import { useExclusionState } from '@/composables/useExclusionState';
import { useFilterStore } from '@/stores/useFilterStore';
import { useCalcStore } from '@/stores/useCalcStore';

const { selectedGene } = useGeneSearch();
const { configLoaded } = useGeneConfig();
const { excluded: excludedVariantIds } = useExclusionState();
const filterStore = useFilterStore();
const calcStore = useCalcStore();

const dialogOpen = ref(false);
const conditionName = ref('');
const inheritance = ref('Autosomal recessive (AR)');
const omimId = ref('');
const willSubmitPr = ref('No, please create the config from this issue');

const inheritanceOptions = [
  'Autosomal recessive (AR)',
  'Autosomal dominant (AD)',
  'X-linked recessive (XLR)',
  'X-linked dominant (XLD)',
];

const prOptions = [
  'Yes, I will submit a PR',
  'No, please create the config from this issue',
];

const isUpdate = computed(() => configLoaded.value);

const geneSymbol = computed(() => selectedGene.value?.symbol ?? '');

const filterSummary = computed(() => filterStore.activeFiltersDescription);

const penetranceDisplay = computed(() => `${Math.round(calcStore.defaults.penetrance * 100)}%`);

function buildFilterRecommendations(): string {
  const d = filterStore.defaults;
  const lines: string[] = [];
  lines.push(`LoF HC: ${d.lofHcEnabled ? 'enabled' : 'disabled'}`);
  lines.push(`Missense: ${d.missenseEnabled ? 'enabled' : 'disabled'}`);
  lines.push(`ClinVar P/LP: ${d.clinvarEnabled ? 'enabled' : 'disabled'}`);
  if (d.clinvarEnabled) {
    lines.push(`ClinVar min stars: ${d.clinvarStarThreshold}`);
    lines.push(`Include conflicting: ${d.clinvarIncludeConflicting ? `yes (>=${d.clinvarConflictingThreshold}% P/LP)` : 'no'}`);
  }
  if (excludedVariantIds.value.length > 0) {
    lines.push('');
    lines.push(`Excluded variants (${excludedVariantIds.value.length}):`);
    for (const id of excludedVariantIds.value) {
      lines.push(`- ${id}`);
    }
  }
  return lines.join('\n');
}

function openGitHubIssue(): void {
  const params = new URLSearchParams();
  params.set('template', 'gene-config.yml');
  params.set('gene-symbol', geneSymbol.value);
  params.set('condition', conditionName.value);
  params.set('inheritance', inheritance.value);
  params.set('penetrance', penetranceDisplay.value);
  params.set('filter-recommendations', buildFilterRecommendations());
  if (omimId.value) {
    params.set('omim-id', omimId.value);
  }
  params.set('will-submit-pr', willSubmitPr.value);

  const url = `https://github.com/berntpopp/gnomad-carrier-frequency/issues/new?${params.toString()}`;
  window.open(url, '_blank', 'noopener');
  dialogOpen.value = false;
}
</script>
