<template>
  <v-dialog
    v-model="dialog"
    max-width="700"
    scrollable
    aria-label="Calculation Methodology"
  >
    <template #activator="{ props }">
      <slot name="activator" :props="props" />
    </template>

    <v-card class="modal-card" rounded="lg">
      <v-card-title class="d-flex align-center px-6 pt-5 pb-3">
        <div class="modal-icon-badge info-badge mr-3">
          <v-icon size="22" color="info">mdi-function-variant</v-icon>
        </div>
        <div>
          <div class="text-h6 font-weight-bold">{{ methodology.title }}</div>
          <div class="text-caption text-medium-emphasis">
            Mathematical & clinical genetics formulation
          </div>
        </div>
        <v-spacer />
        <v-btn
          icon
          variant="text"
          aria-label="Close methodology"
          class="modal-close-btn"
          @click="dialog = false"
        >
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>

      <v-divider />

      <v-card-text class="methodology-content px-6 py-4">
        <template v-for="section in methodology.sections" :key="section.id">
          <h3
            class="text-subtitle-1 font-weight-bold mt-4 mb-2 d-flex align-center"
          >
            <v-icon size="18" color="primary" class="mr-2"
              >mdi-chevron-right</v-icon
            >
            {{ section.title }}
          </h3>
          <p class="text-body-2 mb-3 text-medium-emphasis">
            {{ section.content }}
          </p>

          <!-- Formula display -->
          <div v-if="section.formula" class="formula-card mb-4 pa-4">
            <div
              class="text-subtitle-2 font-weight-bold mb-3 d-flex align-center"
            >
              <v-icon size="small" color="primary" class="mr-2"
                >mdi-math-compass</v-icon
              >
              Genotype Frequencies
            </div>
            <div
              v-for="item in section.formula.genotypes"
              :key="item.genotype"
              class="d-flex align-center justify-space-between mb-2 formula-row"
            >
              <code class="font-mono formula-code">{{ item.frequency }}</code>
              <span class="text-body-2">{{ item.genotype }}</span>
            </div>
          </div>

          <!-- Steps list -->
          <div v-if="section.steps" class="steps-container mb-4">
            <div
              v-for="(step, sIdx) in section.steps"
              :key="step"
              class="step-item d-flex align-start mb-2 pa-3"
            >
              <div class="step-badge mr-3">{{ sIdx + 1 }}</div>
              <div class="text-body-2">{{ step }}</div>
            </div>
          </div>

          <!-- Bullet list -->
          <ul v-if="section.list" class="text-body-2 mb-4 clinical-bullet-list">
            <li v-for="item in section.list" :key="item" class="mb-1">
              {{ item }}
            </li>
          </ul>
        </template>
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
import methodology from "@gnomad-cf/core/config/help/methodology.json";

const dialog = ref(false);
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

.info-badge {
  background: rgba(var(--v-theme-info), 0.12);
}

.modal-close-btn {
  min-width: 44px;
  min-height: 44px;
}

.formula-card {
  border: 1px solid rgba(var(--v-border-color), 0.12);
  border-radius: 8px;
  background: rgba(var(--v-theme-surface-variant), 0.25);
}

.formula-row {
  padding: 6px 10px;
  background: rgba(var(--v-theme-surface), 0.7);
  border-radius: 6px;
  border: 1px solid rgba(var(--v-border-color), 0.06);
}

.formula-code {
  background: rgba(var(--v-theme-primary), 0.1);
  color: rgb(var(--v-theme-primary));
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 600;
}

.steps-container {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.step-item {
  border: 1px solid rgba(var(--v-border-color), 0.1);
  border-radius: 8px;
  background: rgba(var(--v-theme-surface-variant), 0.15);
}

.step-badge {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgb(var(--v-theme-primary));
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 700;
  flex-shrink: 0;
}

.clinical-bullet-list {
  padding-left: 20px;
}
</style>
