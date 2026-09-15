<template>
  <v-dialog
    v-model="dialog"
    max-width="540"
    aria-label="About this application"
  >
    <template #activator="{ props }">
      <slot name="activator" :props="props" />
    </template>

    <v-card class="modal-card" rounded="lg">
      <v-card-title class="d-flex align-center px-6 pt-5 pb-3">
        <div class="modal-icon-badge primary-badge mr-3">
          <v-icon size="22" color="primary">mdi-dna</v-icon>
        </div>
        <div>
          <div class="text-h6 font-weight-bold">About gCFCalc</div>
          <div class="text-caption text-medium-emphasis">
            Genomics carrier frequency analysis suite
          </div>
        </div>
        <v-spacer />
        <v-btn
          icon
          variant="text"
          aria-label="Close about dialog"
          class="modal-close-btn"
          @click="dialog = false"
        >
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>

      <v-divider />

      <v-card-text class="px-6 py-5">
        <!-- Hero Header -->
        <div class="d-flex align-center ga-4 mb-4">
          <div class="hero-logo-box">
            <v-icon size="36" color="primary">mdi-dna</v-icon>
          </div>
          <div>
            <div class="text-subtitle-1 font-weight-bold">
              gnomAD Carrier Frequency Calculator
            </div>
            <div class="d-flex align-center ga-2 mt-1">
              <v-chip
                size="small"
                variant="tonal"
                color="primary"
                class="font-mono"
              >
                v{{ version }}
              </v-chip>
              <span class="ruo-badge">Research Use Only</span>
            </div>
          </div>
        </div>

        <p class="text-body-2 text-medium-emphasis mb-4">
          A high-performance web application designed for clinical geneticists
          and counselors to compute carrier frequencies, carrier rates, and
          recurrence risks for autosomal recessive conditions using gnomAD
          population data.
        </p>

        <!-- Feature List -->
        <div class="feature-box mb-4">
          <div
            class="text-caption font-weight-bold text-uppercase text-medium-emphasis mb-2"
          >
            Core Capabilities
          </div>
          <div class="feature-item d-flex align-start ga-2 mb-2">
            <v-icon size="18" color="primary" class="mt-0-5"
              >mdi-check-circle-outline</v-icon
            >
            <div class="text-body-2">
              <strong>Direct gnomAD API:</strong> Parameterized GraphQL queries
              against gnomAD v4.1 (GRCh38) and v2.1.1 (GRCh37).
            </div>
          </div>
          <div class="feature-item d-flex align-start ga-2 mb-2">
            <v-icon size="18" color="primary" class="mt-0-5"
              >mdi-check-circle-outline</v-icon
            >
            <div class="text-body-2">
              <strong>Stratified Calculations:</strong> Hardy-Weinberg
              equilibrium carrier frequencies ($2pq$) across all global
              ancestries.
            </div>
          </div>
          <div class="feature-item d-flex align-start ga-2 mb-2">
            <v-icon size="18" color="primary" class="mt-0-5"
              >mdi-check-circle-outline</v-icon
            >
            <div class="text-body-2">
              <strong>ClinGen Integration:</strong> Gene-disease clinical
              validity curations cached and validated offline.
            </div>
          </div>
          <div class="feature-item d-flex align-start ga-2">
            <v-icon size="18" color="primary" class="mt-0-5"
              >mdi-check-circle-outline</v-icon
            >
            <div class="text-body-2">
              <strong>Clinical Reporting:</strong> Automated, standardized
              German and English documentation paragraphs.
            </div>
          </div>
        </div>

        <!-- Metadata & Links -->
        <div class="meta-section pa-3 rounded mb-4">
          <div class="d-flex justify-space-between align-center mb-1">
            <span class="text-caption text-medium-emphasis">Author:</span>
            <span class="text-body-2 font-weight-medium">Bernt Popp, MD</span>
          </div>
          <div class="d-flex justify-space-between align-center">
            <span class="text-caption text-medium-emphasis">License:</span>
            <span class="text-body-2 font-mono">MIT Open Source</span>
          </div>
        </div>

        <div class="d-flex ga-3">
          <v-btn
            variant="outlined"
            size="small"
            min-height="44"
            class="flex-1"
            href="https://github.com/berntpopp/gnomad-carrier-frequency"
            target="_blank"
            rel="noopener noreferrer"
          >
            <v-icon start size="small">mdi-github</v-icon>
            GitHub Repository
          </v-btn>
          <v-btn
            variant="outlined"
            size="small"
            min-height="44"
            class="flex-1"
            href="https://github.com/berntpopp/gnomad-carrier-frequency/issues"
            target="_blank"
            rel="noopener noreferrer"
          >
            <v-icon start size="small">mdi-bug-outline</v-icon>
            Report Issue
          </v-btn>
        </div>
      </v-card-text>

      <v-divider />

      <v-card-actions class="px-6 py-4">
        <v-spacer />
        <v-btn
          variant="outlined"
          min-height="44"
          min-width="100"
          @click="dialog = false"
        >
          Close
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref } from "vue";

const dialog = ref(false);
const version = import.meta.env.VITE_APP_VERSION ?? "1.9.0";
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

.primary-badge {
  background: rgba(var(--v-theme-primary), 0.12);
}

.modal-close-btn {
  min-width: 44px;
  min-height: 44px;
}

.hero-logo-box {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  background: rgba(var(--v-theme-primary), 0.1);
  border: 1px solid rgba(var(--v-theme-primary), 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.ruo-badge {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(var(--v-theme-warning), 0.15);
  color: rgb(var(--v-theme-warning));
}

.feature-box {
  border: 1px solid rgba(var(--v-border-color), 0.12);
  border-radius: 8px;
  padding: 12px 14px;
  background: rgba(var(--v-theme-surface-variant), 0.15);
}

.mt-0-5 {
  margin-top: 2px;
}

.meta-section {
  background: rgba(var(--v-theme-surface-variant), 0.25);
  border: 1px solid rgba(var(--v-border-color), 0.08);
}
</style>
