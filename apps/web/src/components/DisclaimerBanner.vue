<template>
  <v-dialog
    v-model="showDialog"
    max-width="600"
    persistent
    :scrim="true"
    aria-label="Clinical Disclaimer"
    data-testid="disclaimer-dialog"
  >
    <v-card class="modal-card" rounded="lg">
      <v-card-title class="d-flex align-center px-6 pt-5 pb-3">
        <div class="modal-icon-badge warning-badge mr-3">
          <v-icon size="22" color="warning">mdi-alert-circle</v-icon>
        </div>
        <div>
          <div class="text-h6 font-weight-bold">Clinical Disclaimer</div>
          <div class="text-caption text-medium-emphasis">
            Research and educational use notice
          </div>
        </div>
      </v-card-title>

      <v-divider />

      <v-card-text class="px-6 py-4">
        <v-alert
          type="warning"
          variant="tonal"
          density="comfortable"
          class="mb-4 clinical-alert"
        >
          <div class="d-flex align-center justify-space-between">
            <strong class="text-subtitle-2 font-weight-bold"
              >For Research Use Only</strong
            >
            <v-chip
              size="small"
              color="warning"
              variant="flat"
              class="font-mono"
            >
              RUO
            </v-chip>
          </div>
        </v-alert>

        <p class="text-body-2 mb-4 text-high-emphasis">
          This tool calculates carrier frequency and recurrence risk estimates
          based on gnomAD population data. All computations and results are
          intended for research, academic, and educational workflows.
        </p>

        <div class="text-subtitle-2 font-weight-bold mb-2">
          Important Clinical Limitations
        </div>

        <div class="limitations-list mb-4">
          <div class="limitation-item">
            <v-icon size="small" color="warning" class="mr-2 flex-shrink-0"
              >mdi-flask-outline</v-icon
            >
            <span class="text-body-2"
              >Results must be verified by an accredited clinical laboratory
              prior to medical decision-making.</span
            >
          </div>
          <div class="limitation-item">
            <v-icon size="small" color="warning" class="mr-2 flex-shrink-0"
              >mdi-account-heart-outline</v-icon
            >
            <span class="text-body-2"
              >This tool does not replace formal genetic counseling, risk
              assessment, or clinical judgment.</span
            >
          </div>
          <div class="limitation-item">
            <v-icon size="small" color="warning" class="mr-2 flex-shrink-0"
              >mdi-earth</v-icon
            >
            <span class="text-body-2"
              >Population-level allele frequencies may not reflect
              patient-specific ancestry or admixed lineages.</span
            >
          </div>
          <div class="limitation-item">
            <v-icon size="small" color="warning" class="mr-2 flex-shrink-0"
              >mdi-database-check-outline</v-icon
            >
            <span class="text-body-2"
              >Variant classifications originate from public gnomAD and ClinVar
              records.</span
            >
          </div>
        </div>

        <v-divider class="mb-3" />

        <p class="text-caption text-medium-emphasis mb-0">
          By clicking &ldquo;I Understand&rdquo;, you acknowledge these
          limitations and agree to use this tool appropriately within research
          and educational contexts.
        </p>
      </v-card-text>

      <v-divider />

      <v-card-actions class="px-6 py-4">
        <v-spacer />
        <v-btn
          color="primary"
          variant="elevated"
          min-height="44"
          min-width="150"
          class="font-weight-bold"
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
import { computed } from "vue";
import { useAppStore } from "@/stores/useAppStore";

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

<style scoped>
.modal-card {
  border: 1px solid rgba(var(--v-border-color), 0.12);
  box-shadow: 0 12px 36px -4px rgba(0, 0, 0, 0.16) !important;
}

.modal-icon-badge {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.warning-badge {
  background: rgba(var(--v-theme-warning), 0.12);
}

.clinical-alert {
  border: 1px solid rgba(var(--v-theme-warning), 0.25);
  border-radius: 8px;
}

.limitations-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.limitation-item {
  display: flex;
  align-items: flex-start;
  padding: 8px 12px;
  border-radius: 6px;
  background: rgba(var(--v-theme-surface-variant), 0.25);
  border: 1px solid rgba(var(--v-border-color), 0.06);
}
</style>
