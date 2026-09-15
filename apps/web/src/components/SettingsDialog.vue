<template>
  <v-dialog
    v-model="modelValue"
    :max-width="920"
    :fullscreen="smAndDown"
    persistent
    aria-label="Settings"
    data-testid="settings-dialog"
    @update:model-value="(val: boolean) => (val ? onDialogOpen() : undefined)"
  >
    <v-card
      ref="dialogCard"
      class="settings-dialog-card modal-card"
      rounded="lg"
    >
      <v-card-title class="d-flex align-center px-6 pt-5 pb-3">
        <div class="modal-icon-badge primary-badge mr-3">
          <v-icon size="22" color="primary">mdi-cog-outline</v-icon>
        </div>
        <div>
          <div class="text-h6 font-weight-bold">Settings</div>
          <div class="text-caption text-medium-emphasis">
            Configure application defaults, clinical templates, and quality
            parameters
          </div>
        </div>
        <v-spacer />
        <v-btn
          icon
          variant="text"
          size="small"
          aria-label="Close settings"
          class="modal-close-btn"
          @click="close"
        >
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>

      <v-divider />

      <!-- Mobile: dropdown section selector -->
      <div v-if="smAndDown" class="px-4 py-3 border-bottom">
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
                <v-icon size="small" class="mr-2">{{
                  selectItem.raw.icon
                }}</v-icon>
              </template>
            </v-list-item>
          </template>
          <template #selection="{ item: selectItem }">
            <v-icon size="small" class="mr-2">{{ selectItem.raw.icon }}</v-icon>
            <span class="font-weight-medium">{{ selectItem.title }}</span>
          </template>
        </v-select>
      </div>

      <!-- Desktop: sidebar + content layout -->
      <div class="settings-body" :class="{ 'flex-column': smAndDown }">
        <!-- Sidebar nav (desktop only) -->
        <div v-if="!smAndDown" class="settings-nav">
          <div class="px-3 pt-3 pb-2">
            <v-text-field
              v-model="searchQuery"
              prepend-inner-icon="mdi-magnify"
              placeholder="Search settings..."
              density="compact"
              variant="outlined"
              hide-details
              clearable
              class="settings-search-field"
            />
          </div>

          <v-divider class="mb-2" />

          <v-list
            v-model:selected="navSelection"
            density="compact"
            nav
            mandatory
            color="primary"
            class="px-2"
          >
            <v-list-item
              v-for="section in filteredSections"
              :key="section.id"
              :value="section.id"
              :data-testid="`settings-tab-${section.id}`"
              :prepend-icon="section.icon"
              rounded="lg"
              class="mb-1 py-2"
              @click="activeSection = section.id"
            >
              <v-list-item-title class="font-weight-medium">
                {{ section.title }}
              </v-list-item-title>
              <v-list-item-subtitle class="settings-nav-subtitle text-caption">
                {{ section.subtitle }}
              </v-list-item-subtitle>
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

      <v-card-actions class="px-6 py-4">
        <v-spacer />
        <v-btn
          variant="outlined"
          min-height="44"
          min-width="100"
          @click="close"
        >
          Cancel
        </v-btn>
        <v-btn
          color="primary"
          variant="flat"
          min-height="44"
          min-width="100"
          @click="save"
        >
          Save
        </v-btn>
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

.modal-card {
  border: 1px solid rgba(var(--v-border-color), 0.12);
  box-shadow: 0 16px 40px -8px rgba(0, 0, 0, 0.2) !important;
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

.border-bottom {
  border-bottom: 1px solid rgba(var(--v-border-color), 0.12);
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
  width: 240px;
  min-width: 240px;
  border-right: 1px solid rgba(var(--v-border-color), 0.12);
  overflow-y: auto;
  background: rgba(var(--v-theme-surface-variant), 0.08);
}

.settings-nav-subtitle {
  opacity: 0.85 !important;
  color: rgb(var(--v-theme-on-surface)) !important;
}

.settings-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
  min-height: 0;
}
</style>
