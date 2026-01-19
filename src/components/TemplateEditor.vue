<template>
  <div class="template-editor">
    <!-- Section selector -->
    <div class="d-flex align-center mb-3">
      <v-select
        v-model="selectedPerspective"
        :items="perspectiveItems"
        label="Perspective"
        density="compact"
        variant="outlined"
        hide-details
        class="mr-2"
        style="max-width: 200px"
      />
      <v-select
        v-model="selectedSection"
        :items="sectionItems"
        label="Section"
        density="compact"
        variant="outlined"
        hide-details
        style="max-width: 200px"
      />
    </div>

    <!-- Editor area -->
    <div class="editor-container mb-3">
      <div class="editor-label text-caption text-medium-emphasis mb-1">
        Template Text
        <v-chip
          v-if="hasCustomization"
          size="x-small"
          color="warning"
          class="ml-2"
        >
          Modified
        </v-chip>
      </div>

      <!-- Preview with highlighted variables -->
      <div
        class="template-preview pa-3 rounded border"
        @click="focusTextarea"
      >
        <template
          v-for="(segment, idx) in parsedTemplate"
          :key="idx"
        >
          <span v-if="segment.type === 'text'">{{ segment.content }}</span>
          <v-chip
            v-else
            size="small"
            color="primary"
            variant="flat"
            class="mx-1"
          >
            {{ formatVariable(segment.content) }}
          </v-chip>
        </template>
      </div>

      <!-- Textarea for actual editing -->
      <v-textarea
        ref="textareaRef"
        v-model="templateText"
        variant="outlined"
        density="compact"
        rows="4"
        hide-details
        class="mt-2"
        placeholder="Enter template text with {{variables}}"
      />
    </div>

    <!-- Actions -->
    <div class="d-flex align-center ga-2">
      <v-btn
        v-if="hasCustomization"
        variant="text"
        size="small"
        color="warning"
        @click="resetSection"
      >
        Reset Section
      </v-btn>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useTemplateStore } from '@/stores/useTemplateStore';
import { parseTemplate } from '@/utils/template-parser';
import type { Perspective } from '@/types';

const templateStore = useTemplateStore();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const textareaRef = ref<any>(null);

// Selection state
const selectedPerspective = ref<Perspective>('affected');
const selectedSection = ref('geneIntro');

// Format variable for display (avoids template literal with braces in Vue template)
function formatVariable(name: string): string {
  return `{{${name}}}`;
}

// Perspective options
const perspectiveItems = computed(() => {
  const templates = templateStore.defaultTemplates;
  return Object.entries(templates.perspectives).map(([key, config]) => ({
    title: config.label,
    value: key as Perspective,
  }));
});

// Section options based on selected perspective
const sectionItems = computed(() => {
  const templates = templateStore.defaultTemplates;
  const perspective = templates.perspectives[selectedPerspective.value];
  if (!perspective) return [];

  return Object.entries(perspective.sections).map(([key, section]) => ({
    title: section.label,
    value: key,
  }));
});

// Reset section selection when perspective changes
watch(selectedPerspective, () => {
  const items = sectionItems.value;
  if (items.length > 0 && !items.find((i) => i.value === selectedSection.value)) {
    selectedSection.value = items[0]?.value ?? '';
  }
});

// Current template text (custom or default)
const templateText = computed({
  get: () =>
    templateStore.getEffectiveTemplate(
      selectedPerspective.value,
      selectedSection.value
    ),
  set: (value: string) => {
    const key = `${selectedPerspective.value}.${selectedSection.value}`;
    if (value === getDefaultTemplate()) {
      // If matches default, remove customization
      templateStore.resetCustomSection(key);
    } else {
      templateStore.setCustomSection(key, value);
    }
  },
});

// Check if current section has customization
const hasCustomization = computed(() =>
  templateStore.hasCustomization(selectedPerspective.value, selectedSection.value)
);

// Parse template for highlighting
const parsedTemplate = computed(() => parseTemplate(templateText.value));

// Get default template for comparison
function getDefaultTemplate(): string {
  const templates = templateStore.defaultTemplates;
  return (
    templates.perspectives[selectedPerspective.value]?.sections[
      selectedSection.value
    ]?.template ?? ''
  );
}

// Reset current section to default
function resetSection() {
  const key = `${selectedPerspective.value}.${selectedSection.value}`;
  templateStore.resetCustomSection(key);
}

// Focus textarea when preview clicked
function focusTextarea() {
  // VTextarea exposes input via $el query
  const textarea = textareaRef.value?.$el?.querySelector('textarea');
  textarea?.focus();
}

// Public method for variable insertion
function insertVariable(variableName: string) {
  const textarea = textareaRef.value?.$el?.querySelector('textarea') as HTMLTextAreaElement | null;
  const currentText = templateText.value;
  const insertion = `{{${variableName}}}`;

  if (!textarea) {
    // Just append if no textarea focus
    templateText.value = currentText + insertion;
    return;
  }

  const start = textarea.selectionStart ?? currentText.length;
  const end = textarea.selectionEnd ?? start;

  templateText.value = currentText.slice(0, start) + insertion + currentText.slice(end);

  // Restore cursor position after insertion
  requestAnimationFrame(() => {
    textarea.selectionStart = textarea.selectionEnd = start + insertion.length;
    textarea.focus();
  });
}

defineExpose({ insertVariable });
</script>

<style scoped>
.template-preview {
  background-color: rgb(var(--v-theme-surface-variant));
  min-height: 80px;
  cursor: text;
  white-space: pre-wrap;
  word-break: break-word;
}

.border {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
</style>
