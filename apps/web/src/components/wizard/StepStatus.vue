<template>
  <div data-testid="step-status">
    <h2 class="text-h6 mb-1">Index Patient Status</h2>
    <p class="text-body-2 text-medium-emphasis mb-4">
      Select the genetic status of the index patient and verify penetrance.
    </p>

    <!-- Radio cards grid for index patient status -->
    <v-radio-group
      v-model="statusModel"
      hide-details
      class="status-radio-group"
      aria-label="Index Patient Status"
    >
      <div class="status-cards-grid">
        <!-- Heterozygous carrier -->
        <div
          class="status-card"
          :class="{ 'status-card--active': statusModel === 'heterozygous' }"
          @click="statusModel = 'heterozygous'"
        >
          <div class="d-flex align-start ga-3">
            <v-radio
              value="heterozygous"
              color="primary"
              density="compact"
              class="ma-0 pa-0"
              aria-label="Heterozygous carrier"
              data-testid="status-option-heterozygous"
            />
            <div class="flex-grow-1">
              <div
                class="d-flex align-center justify-space-between flex-wrap ga-1"
              >
                <strong class="text-body-1 font-weight-bold"
                  >Heterozygous carrier</strong
                >
                <v-chip size="x-small" color="primary" variant="tonal">
                  Risk: CF &times; 0.25
                </v-chip>
              </div>
              <div class="text-caption text-medium-emphasis mt-1">
                One pathogenic allele detected. Offspring inherits disease with
                probability 1/4 &times; carrier frequency &times; penetrance.
              </div>
            </div>
          </div>
        </div>

        <!-- Homozygous affected -->
        <div
          class="status-card"
          :class="{ 'status-card--active': statusModel === 'homozygous' }"
          @click="statusModel = 'homozygous'"
        >
          <div class="d-flex align-start ga-3">
            <v-radio
              value="homozygous"
              color="primary"
              density="compact"
              class="ma-0 pa-0"
              aria-label="Homozygous affected"
            />
            <div class="flex-grow-1">
              <div
                class="d-flex align-center justify-space-between flex-wrap ga-1"
              >
                <strong class="text-body-1 font-weight-bold"
                  >Homozygous affected</strong
                >
                <v-chip size="x-small" color="secondary" variant="tonal">
                  Risk: CF &times; 0.5
                </v-chip>
              </div>
              <div class="text-caption text-medium-emphasis mt-1">
                Two identical pathogenic alleles detected. All offspring receive
                an allele; recurrence risk equals 1/2 &times; carrier frequency
                &times; penetrance.
              </div>
            </div>
          </div>
        </div>

        <!-- Compound heterozygous (confirmed) -->
        <div
          class="status-card"
          :class="{
            'status-card--active': statusModel === 'compound_het_confirmed',
          }"
          @click="statusModel = 'compound_het_confirmed'"
        >
          <div class="d-flex align-start ga-3">
            <v-radio
              value="compound_het_confirmed"
              color="primary"
              density="compact"
              class="ma-0 pa-0"
              aria-label="Compound heterozygous (confirmed)"
            />
            <div class="flex-grow-1">
              <div
                class="d-flex align-center justify-space-between flex-wrap ga-1"
              >
                <strong class="text-body-1 font-weight-bold"
                  >Compound heterozygous (confirmed)</strong
                >
                <v-chip size="x-small" color="secondary" variant="tonal">
                  Risk: CF &times; 0.5
                </v-chip>
              </div>
              <div class="text-caption text-medium-emphasis mt-1">
                Two pathogenic alleles confirmed on opposite chromosomes (in
                trans). Recurrence risk equals 1/2 &times; carrier frequency
                &times; penetrance.
              </div>
            </div>
          </div>
        </div>

        <!-- Compound heterozygous (assumed) -->
        <div
          class="status-card"
          :class="{
            'status-card--active': statusModel === 'compound_het_assumed',
          }"
          @click="statusModel = 'compound_het_assumed'"
        >
          <div class="d-flex align-start ga-3">
            <v-radio
              value="compound_het_assumed"
              color="primary"
              density="compact"
              class="ma-0 pa-0"
              aria-label="Compound heterozygous (assumed)"
            />
            <div class="flex-grow-1">
              <div
                class="d-flex align-center justify-space-between flex-wrap ga-1"
              >
                <strong class="text-body-1 font-weight-bold"
                  >Compound heterozygous (assumed)</strong
                >
                <v-chip size="x-small" color="secondary" variant="tonal">
                  Risk: CF &times; 0.5
                </v-chip>
              </div>
              <div class="text-caption text-medium-emphasis mt-1">
                Two pathogenic alleles detected, phase assumed by clinical
                phenotype. Treated as affected (1/2 &times; carrier frequency
                &times; penetrance).
              </div>
            </div>
          </div>
        </div>
      </div>
    </v-radio-group>

    <!-- Penetrance configuration card -->
    <v-card variant="outlined" class="mt-4 pa-4 penetrance-card">
      <div class="d-flex align-center justify-space-between mb-2">
        <div class="d-flex align-center ga-2">
          <v-icon size="small" color="primary">mdi-chart-bell-curve</v-icon>
          <span class="text-subtitle-2 font-weight-bold"
            >Disease Penetrance</span
          >
        </div>
        <v-chip
          size="small"
          color="primary"
          variant="flat"
          class="font-weight-medium"
        >
          {{ penetrancePercent }}%
        </v-chip>
      </div>
      <p class="text-caption text-medium-emphasis mb-3">
        Proportion of individuals with the disease genotype who express the
        clinical phenotype. Classic AR conditions are 100% (fully penetrant).
        Reduced penetrance scales recurrence risk and Bayesian prevalence
        accordingly.
      </p>
      <v-slider
        :model-value="penetrancePercent"
        :min="0"
        :max="100"
        :step="1"
        color="primary"
        label="Disease Penetrance (%)"
        aria-label="Disease Penetrance (%)"
        hide-details
        thumb-label
        class="mt-1"
        @update:model-value="updatePenetrance"
      />
    </v-card>

    <!-- Action buttons with minimum 44px touch targets -->
    <div class="d-flex justify-space-between mt-6">
      <v-btn
        variant="tonal"
        min-height="44"
        prepend-icon="mdi-arrow-left"
        @click="$emit('back')"
      >
        Back
      </v-btn>
      <v-btn
        color="primary"
        min-height="44"
        append-icon="mdi-arrow-right"
        data-testid="step-status-next-btn"
        @click="$emit('complete')"
      >
        Continue
      </v-btn>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { IndexPatientStatus } from "@gnomad-cf/core/types";
import { useCalcStore } from "@/stores/useCalcStore";

const props = defineProps<{
  modelValue: IndexPatientStatus;
}>();

const emit = defineEmits<{
  "update:modelValue": [status: IndexPatientStatus];
  complete: [];
  back: [];
}>();

const calcStore = useCalcStore();

// Two-way binding for radio group
const statusModel = computed({
  get: () => props.modelValue,
  set: (value: IndexPatientStatus) => {
    emit("update:modelValue", value);
  },
});

const penetrancePercent = computed(() =>
  Math.round(calcStore.defaults.penetrance * 100),
);

function updatePenetrance(val: number) {
  calcStore.setPenetrance(val / 100);
}
</script>

<style scoped>
.status-cards-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.status-card {
  border: 1px solid rgba(var(--v-border-color), 0.12);
  border-radius: 8px;
  padding: 12px 16px;
  cursor: pointer;
  background: rgb(var(--v-theme-surface));
  transition:
    border-color 0.15s ease,
    background-color 0.15s ease,
    box-shadow 0.15s ease;
}

.status-card:hover {
  border-color: rgba(var(--v-border-color), 0.3);
  background-color: rgba(var(--v-theme-surface-variant), 0.2);
}

.status-card--active {
  border-color: rgb(var(--v-theme-primary));
  background-color: rgba(var(--v-theme-primary), 0.04) !important;
  box-shadow: 0 0 0 1px rgb(var(--v-theme-primary));
}

.penetrance-card {
  border: 1px solid rgba(var(--v-border-color), 0.12);
  border-radius: 8px;
}
</style>
