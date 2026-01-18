<template>
  <v-app>
    <v-main>
      <v-container max-width="800">
        <h1 class="text-h4 mb-6">gnomAD Carrier Frequency Calculator</h1>

        <p class="text-body-1 mb-4 text-medium-emphasis">
          Enter a gene symbol to calculate carrier frequency from gnomAD population data.
        </p>

        <!-- Version Selector -->
        <div class="mb-4" style="max-width: 300px">
          <VersionSelector />
        </div>

        <!-- Gene Search -->
        <GeneSearch @select="onGeneSelect" />

        <!-- Filter criteria info (FILT-04) -->
        <v-expansion-panels v-if="selectedGene" class="mt-4">
          <v-expansion-panel title="Variant Filter Criteria">
            <v-expansion-panel-text>
              <p>Variants are included if they meet either criterion:</p>
              <ul class="ml-4">
                <li><strong>LoF HC:</strong> High-confidence loss-of-function (LOFTEE prediction) on canonical transcript</li>
                <li><strong>ClinVar P/LP:</strong> Pathogenic or Likely Pathogenic classification with at least 1 review star</li>
              </ul>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>

        <!-- Results -->
        <FrequencyResults
          :result="result"
          :global-frequency="globalFrequency"
          :using-default="usingDefault"
          :loading="isLoading"
          :error="errorMessage"
          :version="currentVersion"
          @retry="refetch"
        />
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import VersionSelector from '@/components/VersionSelector.vue';
import GeneSearch from '@/components/GeneSearch.vue';
import FrequencyResults from '@/components/FrequencyResults.vue';
import { useCarrierFrequency } from '@/composables';
import type { GeneSearchResult } from '@/api/queries/types';

const {
  setGeneSymbol,
  result,
  globalFrequency,
  usingDefault,
  isLoading,
  errorMessage,
  currentVersion,
  refetch,
} = useCarrierFrequency();

const selectedGene = ref<GeneSearchResult | null>(null);

const onGeneSelect = (gene: GeneSearchResult | null) => {
  selectedGene.value = gene;
  setGeneSymbol(gene?.symbol ?? null);
};
</script>
