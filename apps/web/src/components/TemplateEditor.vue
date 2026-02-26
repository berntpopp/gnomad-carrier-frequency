<template>
  <div class="template-editor">
    <!-- Section selector row -->
    <div class="d-flex align-center flex-wrap ga-2 mb-3">
      <v-select
        v-model="selectedPerspective"
        :items="perspectiveItems"
        label="Perspective"
        density="compact"
        variant="outlined"
        hide-details
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
      <v-chip
        v-if="hasCustomization"
        size="small"
        color="warning"
        variant="tonal"
        closable
        @click:close="resetSection"
      >
        Modified — click to reset
      </v-chip>
    </div>

    <!-- Variable insertion toolbar -->
    <div class="variable-toolbar d-flex align-center flex-wrap ga-1 mb-2">
      <span class="text-caption text-medium-emphasis mr-1">Insert:</span>
      <v-chip
        v-for="v in quickVariables"
        :key="v.name"
        size="small"
        color="secondary"
        variant="tonal"
        class="variable-chip"
        @click="insertVariable(v.name)"
      >
        {{ v.name }}
      </v-chip>
      <v-menu location="bottom start" :close-on-content-click="false">
        <template #activator="{ props: menuProps }">
          <v-btn
            v-bind="menuProps"
            size="small"
            variant="tonal"
            prepend-icon="mdi-plus"
            density="compact"
          >
            More
          </v-btn>
        </template>
        <v-card width="340" max-height="360">
          <v-card-text class="pa-2">
            <v-text-field
              v-model="variableSearch"
              prepend-inner-icon="mdi-magnify"
              placeholder="Search variables..."
              density="compact"
              variant="plain"
              hide-details
              clearable
              class="mb-1"
            />
            <v-divider class="mb-1" />
            <v-list density="compact" class="pa-0">
              <template v-for="cat in filteredCategories" :key="cat.id">
                <v-list-subheader class="text-caption font-weight-bold">
                  {{ cat.label }}
                </v-list-subheader>
                <v-list-item
                  v-for="variable in cat.variables"
                  :key="variable.name"
                  class="variable-menu-item"
                  @click="insertVariable(variable.name)"
                >
                  <template #prepend>
                    <v-chip size="x-small" color="secondary" variant="flat" class="mr-2">
                      {{ variable.name }}
                    </v-chip>
                  </template>
                  <v-list-item-title class="text-body-2">
                    {{ variable.description }}
                  </v-list-item-title>
                  <v-list-item-subtitle class="text-caption">
                    e.g. {{ variable.example }}
                  </v-list-item-subtitle>
                </v-list-item>
              </template>
            </v-list>
          </v-card-text>
        </v-card>
      </v-menu>
    </div>

    <!-- Edit / Preview toggle -->
    <v-tabs v-model="editorTab" density="compact" class="mb-0">
      <v-tab value="edit" size="small">
        <v-icon start size="small">mdi-pencil</v-icon>
        Edit
      </v-tab>
      <v-tab value="preview" size="small">
        <v-icon start size="small">mdi-eye</v-icon>
        Preview
      </v-tab>
    </v-tabs>

    <v-window v-model="editorTab">
      <!-- Edit tab: single textarea -->
      <v-window-item value="edit">
        <!-- Hint for variable-only sections -->
        <v-alert
          v-if="isVariableOnly"
          type="info"
          variant="tonal"
          density="compact"
          class="mt-2 mb-1"
        >
          This section uses a computed variable that is expanded at render time.
          You can replace it with custom text and variables.
        </v-alert>
        <v-textarea
          ref="textareaRef"
          v-model="templateText"
          variant="outlined"
          density="compact"
          rows="6"
          hide-details
          class="mt-2 template-textarea"
          placeholder="Enter template text — use the toolbar above to insert {{variables}}"
        />
      </v-window-item>

      <!-- Preview tab: rendered with variable chips -->
      <v-window-item value="preview">
        <div class="template-preview pa-3 mt-2 rounded border">
          <template v-if="isVariableOnly">
            <div class="text-medium-emphasis text-body-2 mb-2">
              <v-icon size="small" class="mr-1">mdi-information-outline</v-icon>
              This variable expands to status-specific text at render time:
            </div>
            <div class="text-body-2 font-italic">
              "{{ variableOnlyExample }}"
            </div>
          </template>
          <template v-else>
            <template v-for="(segment, idx) in parsedTemplate" :key="idx">
              <span v-if="segment.type === 'text'" class="text-body-2">{{ segment.content }}</span>
              <v-chip
                v-else
                size="small"
                color="secondary"
                variant="flat"
                class="mx-1"
              >
                {{ segment.content }}
              </v-chip>
            </template>
          </template>
        </div>
      </v-window-item>
    </v-window>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useTemplateStore } from "@/stores/useTemplateStore";
import { parseTemplate } from "@gnomad-cf/core/templates";
import type { Perspective } from "@gnomad-cf/core/types";
import {
  TEMPLATE_VARIABLES,
  type TemplateVariable,
} from "@gnomad-cf/core/config/template-variables";

const templateStore = useTemplateStore();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const textareaRef = ref<any>(null);

// Editor mode
const editorTab = ref("edit");

// Selection state — default to "inheritance" which has visible editable text
const selectedPerspective = ref<Perspective>("affected");
const selectedSection = ref("inheritance");

// Variable toolbar search
const variableSearch = ref("");

// Quick-access variables (most commonly used in clinical templates)
const quickVariables = [
  { name: "gene" },
  { name: "carrierFrequencyRatio" },
  { name: "recurrenceRiskPercent" },
  { name: "source" },
];

// Variable categories for the "More" menu
interface Category {
  id: TemplateVariable["category"];
  label: string;
  variables: TemplateVariable[];
}

const categoryLabels: Record<TemplateVariable["category"], string> = {
  gene: "Gene",
  frequency: "Frequency",
  risk: "Risk",
  context: "Context",
  formatting: "Formatting (German)",
};

const allCategories = computed((): Category[] => {
  return (Object.keys(categoryLabels) as TemplateVariable["category"][])
    .map((id) => ({
      id,
      label: categoryLabels[id],
      variables: TEMPLATE_VARIABLES.filter((v) => v.category === id),
    }))
    .filter((cat) => cat.variables.length > 0);
});

const filteredCategories = computed((): Category[] => {
  const q = variableSearch.value?.toLowerCase().trim();
  if (!q) return allCategories.value;
  return allCategories.value
    .map((cat) => ({
      ...cat,
      variables: cat.variables.filter(
        (v) =>
          v.name.toLowerCase().includes(q) ||
          v.description.toLowerCase().includes(q),
      ),
    }))
    .filter((cat) => cat.variables.length > 0);
});

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
  if (
    items.length > 0 &&
    !items.find((i) => i.value === selectedSection.value)
  ) {
    selectedSection.value = items[0]?.value ?? "";
  }
});

// Current template text (custom or default)
const templateText = computed({
  get: () =>
    templateStore.getEffectiveTemplate(
      selectedPerspective.value,
      selectedSection.value,
    ),
  set: (value: string) => {
    const key = `${selectedPerspective.value}.${selectedSection.value}`;
    if (value === getDefaultTemplate()) {
      templateStore.resetCustomSection(key);
    } else {
      templateStore.setCustomSection(key, value);
    }
  },
});

// Check if current section has customization
const hasCustomization = computed(() =>
  templateStore.hasCustomization(
    selectedPerspective.value,
    selectedSection.value,
  ),
);

// Parse template for preview highlighting
const parsedTemplate = computed(() => parseTemplate(templateText.value));

// Detect if template is just variable placeholder(s) with no prose
const isVariableOnly = computed(() => {
  const text = templateText.value.trim();
  const withoutVars = text.replace(/\{\{[^}]+\}\}/g, "").trim();
  return text.length > 0 && withoutVars.length === 0;
});

// Show example text for variable-only sections in preview
const variableOnlyExample = computed(() => {
  const text = templateText.value.trim();
  const match = text.match(/\{\{(\w+)\}\}/);
  if (!match) return "";
  const varName = match[1];
  const variable = TEMPLATE_VARIABLES.find((v) => v.name === varName);
  return variable?.example ?? text;
});

// Get default template for comparison
function getDefaultTemplate(): string {
  const templates = templateStore.defaultTemplates;
  return (
    templates.perspectives[selectedPerspective.value]?.sections[
      selectedSection.value
    ]?.template ?? ""
  );
}

// Reset current section to default
function resetSection() {
  const key = `${selectedPerspective.value}.${selectedSection.value}`;
  templateStore.resetCustomSection(key);
}

// Insert variable at cursor position in textarea
function insertVariable(variableName: string) {
  // Switch to edit tab if on preview
  editorTab.value = "edit";

  const textarea = textareaRef.value?.$el?.querySelector(
    "textarea",
  ) as HTMLTextAreaElement | null;
  const currentText = templateText.value;
  const insertion = `{{${variableName}}}`;

  if (!textarea) {
    templateText.value = currentText + insertion;
    return;
  }

  const start = textarea.selectionStart ?? currentText.length;
  const end = textarea.selectionEnd ?? start;

  templateText.value =
    currentText.slice(0, start) + insertion + currentText.slice(end);

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
  min-height: 120px;
  white-space: pre-wrap;
  word-break: break-word;
}

.border {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.variable-chip {
  cursor: pointer;
  transition: transform 0.1s;
}

.variable-chip:hover {
  transform: scale(1.05);
}

.variable-menu-item {
  cursor: pointer;
  border-radius: 4px;
}

.variable-menu-item:hover {
  background-color: rgba(var(--v-theme-primary), 0.08);
}

:deep(.template-textarea textarea) {
  font-family: monospace;
  font-size: 0.875rem;
  line-height: 1.5;
}
</style>
