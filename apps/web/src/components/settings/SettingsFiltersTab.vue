<template>
  <div>
    <p class="text-body-2 text-medium-emphasis mb-4">
      Configure the default filter settings for new calculations. These defaults
      can be overridden per calculation.
    </p>

    <v-switch
      v-model="filterStore.defaults.lofHcEnabled"
      color="secondary"
      label="LoF High Confidence"
      hint="Include variants with LOFTEE High Confidence annotation on canonical transcript"
      persistent-hint
      density="compact"
      class="mb-2"
    />

    <v-switch
      v-model="filterStore.defaults.missenseEnabled"
      color="secondary"
      label="Include Missense"
      hint="Include missense variants, inframe insertions, and inframe deletions"
      persistent-hint
      density="compact"
      class="mb-2"
    />

    <v-switch
      v-model="filterStore.defaults.clinvarEnabled"
      color="success"
      label="ClinVar Pathogenic/Likely Pathogenic"
      hint="Include variants classified as Pathogenic or Likely Pathogenic in ClinVar"
      persistent-hint
      density="compact"
      class="mb-4"
    />

    <v-slider
      v-model="filterStore.defaults.clinvarStarThreshold"
      :disabled="!filterStore.defaults.clinvarEnabled"
      :min="0"
      :max="4"
      :step="1"
      :ticks="tickLabels"
      show-ticks="always"
      tick-size="4"
      label="ClinVar Minimum Stars"
      hint="Minimum gold star review status required for ClinVar variants"
      persistent-hint
      thumb-label
      color="success"
      class="mb-4"
    />

    <v-divider class="my-4" />

    <v-btn
      variant="outlined"
      color="warning"
      size="small"
      prepend-icon="mdi-restore"
      @click="filterStore.resetToFactoryDefaults()"
    >
      Reset to Factory Defaults
    </v-btn>
  </div>
</template>

<script setup lang="ts">
import { useFilterStore } from "@/stores/useFilterStore";

const filterStore = useFilterStore();

const tickLabels = {
  0: "0",
  1: "1",
  2: "2",
  3: "3",
  4: "4",
};
</script>
