<template>
  <v-card
    v-if="appStore.shouldShowOnboarding"
    variant="tonal"
    color="primary"
    :elevation="2"
    class="mb-4"
    data-testid="welcome-card"
  >
    <v-card-text>
      <p class="text-body-1 mb-3">
        This tool calculates carrier frequencies for autosomal recessive
        conditions using gnomAD population data, and generates clinical
        documentation text ready to paste into patient letters.
      </p>
      <p class="text-body-2 text-medium-emphasis mb-4">
        Search for any gene symbol above, or use the quick-start below to see
        the tool in action with CFTR (cystic fibrosis).
      </p>
      <v-btn
        color="primary"
        variant="elevated"
        data-testid="welcome-cftr-btn"
        @click="onQuickStart"
      >
        Try with CFTR
      </v-btn>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { watch } from "vue";
import { useAppStore } from "@/stores/useAppStore";
import { useGeneSearch } from "@/composables";
import { useWizard } from "@/composables";

const appStore = useAppStore();
const { prefillGene } = useGeneSearch();
const { state } = useWizard();

// Dismiss onboarding when user manually selects a gene (without clicking quick-start)
watch(
  () => state.gene,
  (gene) => {
    if (gene !== null && appStore.shouldShowOnboarding) {
      appStore.dismissOnboarding();
    }
  },
);

const onQuickStart = () => {
  appStore.dismissOnboarding();
  prefillGene("CFTR");
};
</script>
