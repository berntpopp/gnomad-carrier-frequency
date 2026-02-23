<template>
  <v-dialog
    v-model="showDialog"
    max-width="600"
    persistent
    :scrim="true"
    aria-label="Clinical Disclaimer"
    data-testid="disclaimer-dialog"
  >
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon
          start
          color="warning"
        >
          mdi-alert-circle
        </v-icon>
        Clinical Disclaimer
      </v-card-title>

      <v-card-text>
        <v-alert
          type="warning"
          variant="tonal"
          class="mb-4"
        >
          <strong>For Research Use Only</strong>
        </v-alert>

        <p class="text-body-1 mb-3">
          This tool provides carrier frequency estimates based on gnomAD population data.
          Results are intended for research and educational purposes.
        </p>

        <p class="text-body-2 mb-3">
          <strong>Important limitations:</strong>
        </p>

        <ul class="text-body-2 mb-4">
          <li>Results should be verified by a clinical laboratory before use in patient care</li>
          <li>This tool does not replace genetic counseling or clinical judgment</li>
          <li>Population frequencies may not reflect specific patient ancestry</li>
          <li>Variant classifications are derived from gnomAD and ClinVar annotations</li>
        </ul>

        <v-divider class="mb-4" />

        <p class="text-caption text-medium-emphasis">
          By clicking "I Understand", you acknowledge these limitations and agree to use
          this tool appropriately within research and educational contexts.
        </p>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn
          color="primary"
          variant="elevated"
          data-testid="disclaimer-accept-btn"
          @click="acknowledge"
        >
          I Understand
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useAppStore } from '@/stores/useAppStore';

const appStore = useAppStore();

const showDialog = computed({
  get: () => appStore.shouldShowDisclaimer,
  set: () => {
    // Only close via acknowledge button, not backdrop click
  },
});

const acknowledge = () => {
  appStore.acknowledgeDisclaimer();
};
</script>
