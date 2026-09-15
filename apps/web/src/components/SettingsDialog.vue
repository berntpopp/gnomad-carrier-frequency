<template>
  <v-dialog
    v-model="modelValue"
    :max-width="900"
    :fullscreen="smAndDown"
    persistent
    aria-label="Settings"
    data-testid="settings-dialog"
    @update:model-value="(val: boolean) => (val ? onDialogOpen() : undefined)"
  >
    <v-card ref="dialogCard" class="settings-dialog-card">
      <v-card-title class="d-flex align-center px-4 py-3">
        <v-icon class="mr-2">mdi-cog</v-icon>
        <span>Settings</span>
        <v-spacer />
        <v-btn
          icon
          variant="text"
          size="small"
          aria-label="Close settings"
          @click="close"
        >
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>

      <v-divider />

      <!-- Mobile: dropdown section selector -->
      <div v-if="smAndDown" class="px-4 pt-3">
        <v-select
          v-model="activeSection"
          :items="filteredSections"
          item-title="title"
          item-value="id"
          density="compact"
          variant="outlined"
          hide-details
        >
          <template #item="{ item: selectItem, props: itemProps }">
            <v-list-item v-bind="itemProps">
              <template #prepend>
                <v-icon size="small">{{ selectItem.raw.icon }}</v-icon>
              </template>
            </v-list-item>
          </template>
          <template #selection="{ item: selectItem }">
            <v-icon size="small" class="mr-2">{{ selectItem.raw.icon }}</v-icon>
            {{ selectItem.title }}
          </template>
        </v-select>
      </div>

      <!-- Desktop: sidebar + content layout -->
      <div class="settings-body" :class="{ 'flex-column': smAndDown }">
        <!-- Sidebar nav (desktop only) -->
        <div v-if="!smAndDown" class="settings-nav">
          <v-text-field
            v-model="searchQuery"
            prepend-inner-icon="mdi-magnify"
            placeholder="Search settings..."
            density="compact"
            variant="plain"
            hide-details
            clearable
            class="mx-3 mt-2 mb-1"
          />

          <v-divider class="mb-1" />

          <v-list
            v-model:selected="navSelection"
            density="compact"
            nav
            mandatory
            color="primary"
          >
            <v-list-item
              v-for="section in filteredSections"
              :key="section.id"
              :value="section.id"
              :data-testid="`settings-tab-${section.id}`"
              :prepend-icon="section.icon"
              @click="activeSection = section.id"
            >
              <v-list-item-title>{{ section.title }}</v-list-item-title>
              <v-list-item-subtitle>{{
                section.subtitle
              }}</v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </div>

        <!-- Content area -->
        <div class="settings-content">
          <v-window v-model="activeSection">
            <v-window-item value="general">
              <SettingsGeneralTab ref="generalTabRef" :is-open="modelValue" />
            </v-window-item>

            <v-window-item value="filters">
              <SettingsFiltersTab />
            </v-window-item>

            <v-window-item value="templates">
              <SettingsTemplatesTab />
            </v-window-item>

            <v-window-item value="quality">
              <SettingsQualityTab />
            </v-window-item>
          </v-window>
        </div>
      </div>

      <v-divider />

      <v-card-actions class="px-4">
        <v-spacer />
        <v-btn variant="text" @click="close">Cancel</v-btn>
        <v-btn color="primary" @click="save">Save</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, nextTick, computed, watch } from "vue";
import { useFocusTrap } from "@vueuse/integrations/useFocusTrap";
import { useDisplay } from "vuetify";
import SettingsGeneralTab from "./settings/SettingsGeneralTab.vue";
import SettingsFiltersTab from "./settings/SettingsFiltersTab.vue";
import SettingsTemplatesTab from "./settings/SettingsTemplatesTab.vue";
import SettingsQualityTab from "./settings/SettingsQualityTab.vue";

// Responsive breakpoint detection
const { smAndDown } = useDisplay();

const modelValue = defineModel<boolean>();

// Section definitions for sidebar navigation
interface SettingsSection {
  id: string;
  title: string;
  icon: string;
  subtitle: string;
  keywords: string;
}

const sections: SettingsSection[] = [
  {
    id: "general",
    title: "General",
    icon: "mdi-cog-outline",
    subtitle: "Disclaimer, cache, logging, history",
    keywords:
      "disclaimer clingen cache logging history install app format frequency pwa variant",
  },
  {
    id: "filters",
    title: "Filters",
    icon: "mdi-filter-variant",
    subtitle: "Variant inclusion criteria",
    keywords: "lof missense clinvar stars pathogenic filter variant",
  },
  {
    id: "templates",
    title: "Templates",
    icon: "mdi-file-document-edit-outline",
    subtitle: "Clinical text customization",
    keywords: "template clinical text german english language import export",
  },
  {
    id: "quality",
    title: "Quality",
    icon: "mdi-shield-check-outline",
    subtitle: "Quality flag thresholds",
    keywords:
      "quality flag allele frequency homozygote gnomad filtered genomes ba1",
  },
];

const activeSection = ref("general");
const searchQuery = ref("");
const dialogCard = ref<HTMLElement | null>(null);
const generalTabRef = ref<InstanceType<typeof SettingsGeneralTab> | null>(null);

// Keep v-list selection in sync with activeSection
const navSelection = computed({
  get: () => [activeSection.value],
  set: (val: string[]) => {
    const first = val[0];
    if (first !== undefined) activeSection.value = first;
  },
});

// Filter sections by search query
const filteredSections = computed(() => {
  const q = searchQuery.value?.toLowerCase().trim();
  if (!q) return sections;
  return sections.filter(
    (s) =>
      s.title.toLowerCase().includes(q) ||
      s.subtitle.toLowerCase().includes(q) ||
      s.keywords.includes(q),
  );
});

// Auto-select first match when search narrows results
watch(filteredSections, (filtered) => {
  if (
    filtered.length > 0 &&
    !filtered.some((s) => s.id === activeSection.value)
  ) {
    const first = filtered[0];
    if (first !== undefined) activeSection.value = first.id;
  }
});

const { activate, deactivate } = useFocusTrap(dialogCard, {
  immediate: false,
  allowOutsideClick: true,
  escapeDeactivates: true,
  returnFocusOnDeactivate: true,
});

async function onDialogOpen() {
  await nextTick();
  activate();
  generalTabRef.value?.refreshData?.();
}

function close() {
  deactivate();
  modelValue.value = false;
}

function save() {
  // Store auto-persists, just close
  close();
}
</script>

<style scoped>
:deep(.v-overlay__content) {
  height: min(90vh, 810px);
}

.settings-dialog-card {
  display: flex;
  flex-direction: column;
}

.settings-body {
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.settings-nav {
  width: 220px;
  min-width: 220px;
  border-right: thin solid rgba(var(--v-border-color), var(--v-border-opacity));
  overflow-y: auto;
}

.settings-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px 24px;
  min-height: 0;
}
</style>
