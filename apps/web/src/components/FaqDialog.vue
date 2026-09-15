<template>
  <v-dialog
    v-model="dialog"
    max-width="720"
    scrollable
    aria-label="Frequently Asked Questions"
  >
    <template #activator="{ props }">
      <slot name="activator" :props="props" />
    </template>

    <v-card class="modal-card" rounded="lg">
      <v-card-title class="d-flex align-center px-6 pt-5 pb-3">
        <div class="modal-icon-badge primary-badge mr-3">
          <v-icon size="22" color="primary">mdi-help-circle-outline</v-icon>
        </div>
        <div>
          <div class="text-h6 font-weight-bold">{{ faq.title }}</div>
          <div class="text-caption text-medium-emphasis">
            Answers to common questions about calculations, interpretation, and
            data
          </div>
        </div>
        <v-spacer />
        <v-btn
          icon
          variant="text"
          aria-label="Close FAQ"
          class="modal-close-btn"
          @click="dialog = false"
        >
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>

      <v-divider />

      <v-card-text class="px-6 py-4">
        <div class="d-flex justify-space-between align-center mb-4">
          <span class="text-body-2 text-medium-emphasis">
            {{ totalQuestions }} questions across
            {{ faq.categories.length }} categories
          </span>
          <v-btn
            variant="text"
            size="small"
            min-height="36"
            class="text-caption"
            @click="toggleAllPanels"
          >
            <v-icon start size="small">
              {{ allExpanded ? "mdi-collapse-all" : "mdi-expand-all" }}
            </v-icon>
            {{ allExpanded ? "Collapse All" : "Expand All" }}
          </v-btn>
        </div>

        <div v-for="category in faq.categories" :key="category.id" class="mb-5">
          <div class="category-header d-flex align-center mb-2">
            <span class="text-overline font-weight-bold text-primary mr-2">
              {{ category.title }}
            </span>
            <v-divider />
          </div>

          <v-expansion-panels
            v-model="categoryPanels[category.id]"
            variant="accordion"
            multiple
            class="faq-panels"
          >
            <v-expansion-panel
              v-for="item in category.questions"
              :key="item.id"
              :value="item.id"
              class="faq-panel mb-2"
            >
              <v-expansion-panel-title
                class="faq-question-title text-subtitle-2 font-weight-bold py-3 px-4"
              >
                {{ item.question }}
              </v-expansion-panel-title>
              <v-expansion-panel-text class="faq-answer-text px-4 pb-3">
                <p class="text-body-2 text-high-emphasis faq-answer-paragraph">
                  {{ item.answer }}
                </p>
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>
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
import { ref, computed } from "vue";
import faq from "@gnomad-cf/core/config/help/faq.json";

const dialog = ref(false);

// Track open panel IDs per category
const categoryPanels = ref<Record<string, string[]>>({});

// Initialize panels map
faq.categories.forEach((cat) => {
  categoryPanels.value[cat.id] = [];
});

const totalQuestions = computed(() =>
  faq.categories.reduce((acc, cat) => acc + cat.questions.length, 0),
);

const allExpanded = computed(() => {
  return faq.categories.every((cat) => {
    const open = categoryPanels.value[cat.id] ?? [];
    return open.length === cat.questions.length;
  });
});

function toggleAllPanels() {
  const shouldExpand = !allExpanded.value;
  faq.categories.forEach((cat) => {
    categoryPanels.value[cat.id] = shouldExpand
      ? cat.questions.map((q) => q.id)
      : [];
  });
}
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

.category-header {
  letter-spacing: 0.08em;
}

.faq-panel {
  border: 1px solid rgba(var(--v-border-color), 0.12) !important;
  border-radius: 8px !important;
  overflow: hidden;
  box-shadow: none !important;
  transition: border-color 0.15s ease;
}

.faq-panel:hover {
  border-color: rgba(var(--v-border-color), 0.28) !important;
}

.faq-answer-paragraph {
  line-height: 1.6;
}
</style>
