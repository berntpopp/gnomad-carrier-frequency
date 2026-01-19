<template>
  <v-dialog
    v-model="modelValue"
    :max-width="activeTab === 'templates' ? 900 : 600"
    persistent
    @update:model-value="(val: boolean) => val ? onDialogOpen() : undefined"
  >
    <v-card ref="dialogCard">
      <v-card-title class="d-flex align-center">
        <span>Settings</span>
        <v-spacer />
        <v-btn
          icon
          variant="text"
          @click="close"
        >
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>

      <v-tabs v-model="activeTab">
        <v-tab value="general">
          General
        </v-tab>
        <v-tab value="filters">
          Filters
        </v-tab>
        <v-tab value="templates">
          Templates
        </v-tab>
      </v-tabs>

      <v-card-text>
        <v-tabs-window v-model="activeTab">
          <v-tabs-window-item value="general">
            <!-- Clinical Disclaimer Section -->
            <v-card
              variant="outlined"
              class="mb-4"
            >
              <v-card-title class="text-subtitle-1">
                <v-icon
                  start
                  size="small"
                >
                  mdi-alert-circle-outline
                </v-icon>
                Clinical Disclaimer
              </v-card-title>

              <v-card-text>
                <div class="d-flex align-center justify-space-between">
                  <div class="text-body-2">
                    <span v-if="appStore.disclaimerAcknowledged">
                      Acknowledged on {{ appStore.acknowledgedDate }}
                    </span>
                    <span v-else>
                      Not yet acknowledged
                    </span>
                  </div>

                  <v-btn
                    v-if="appStore.disclaimerAcknowledged"
                    variant="text"
                    size="small"
                    @click="appStore.resetDisclaimer()"
                  >
                    Show Again
                  </v-btn>
                </div>
              </v-card-text>
            </v-card>

            <!-- ClinGen Cache Management Section -->
            <v-card
              variant="outlined"
              class="mb-4"
            >
              <v-card-title class="text-subtitle-1">
                <v-icon
                  start
                  size="small"
                >
                  mdi-database-sync
                </v-icon>
                ClinGen Data Cache
              </v-card-title>

              <v-card-text>
                <div class="d-flex align-center justify-space-between mb-2">
                  <div>
                    <div class="text-body-2">
                      <strong>Status:</strong>
                      <v-chip
                        :color="clingenExpired ? 'warning' : 'success'"
                        size="x-small"
                        class="ml-2"
                      >
                        {{ clingenExpired ? 'Expired' : 'Valid' }}
                      </v-chip>
                    </div>
                    <div class="text-caption text-medium-emphasis">
                      {{ clingenEntryCount }} entries | Last updated: {{ clingenCacheAge }}
                    </div>
                  </div>

                  <v-btn
                    variant="outlined"
                    size="small"
                    :loading="clingenLoading"
                    @click="refreshClingenCache"
                  >
                    <v-icon
                      start
                      size="small"
                    >
                      mdi-refresh
                    </v-icon>
                    Refresh
                  </v-btn>
                </div>

                <v-alert
                  v-if="clingenError"
                  type="error"
                  variant="tonal"
                  density="compact"
                  class="mt-2"
                >
                  {{ clingenError }}
                </v-alert>

                <div class="text-caption text-medium-emphasis mt-2">
                  ClinGen data is used to validate gene-disease associations.
                  Cache expires after 30 days and refreshes automatically.
                </div>
              </v-card-text>
            </v-card>

            <!-- Logging Configuration Section -->
            <v-card
              variant="outlined"
              class="mb-4"
            >
              <v-card-title class="text-subtitle-1">
                <v-icon
                  start
                  size="small"
                >
                  mdi-console
                </v-icon>
                Application Logging
              </v-card-title>

              <v-card-text>
                <v-slider
                  v-model="logStore.settings.maxEntries"
                  :min="100"
                  :max="2000"
                  :step="100"
                  label="Max Log Entries"
                  thumb-label
                  class="mb-2"
                />
                <div class="text-caption text-medium-emphasis mb-3">
                  Maximum number of log entries to keep. Older entries are automatically removed.
                </div>

                <v-switch
                  v-model="logStore.settings.autoClearOnStart"
                  label="Clear logs on app start"
                  density="compact"
                  hide-details
                  class="mb-2"
                />

                <div class="d-flex align-center justify-space-between mt-3">
                  <div class="text-body-2">
                    Current: {{ logStore.stats.totalCount }} entries
                    <span class="text-medium-emphasis">({{ logStore.stats.memoryEstimate }})</span>
                  </div>
                  <v-btn
                    variant="text"
                    size="small"
                    color="warning"
                    @click="logStore.clearAll()"
                  >
                    Clear All
                  </v-btn>
                </div>
              </v-card-text>
            </v-card>
          </v-tabs-window-item>
          <v-tabs-window-item value="filters">
            <p class="text-body-2 text-medium-emphasis mb-4">
              Configure the default filter settings for new calculations.
              These defaults can be overridden per calculation.
            </p>

            <v-switch
              v-model="filterStore.defaults.lofHcEnabled"
              color="primary"
              label="LoF High Confidence"
              hint="Include variants with LOFTEE High Confidence annotation on canonical transcript"
              persistent-hint
              density="compact"
              class="mb-2"
            />

            <v-switch
              v-model="filterStore.defaults.missenseEnabled"
              color="secondary"
              label="Include Missense"
              hint="Include missense variants, inframe insertions, and inframe deletions"
              persistent-hint
              density="compact"
              class="mb-2"
            />

            <v-switch
              v-model="filterStore.defaults.clinvarEnabled"
              color="success"
              label="ClinVar Pathogenic/Likely Pathogenic"
              hint="Include variants classified as Pathogenic or Likely Pathogenic in ClinVar"
              persistent-hint
              density="compact"
              class="mb-4"
            />

            <v-slider
              v-model="filterStore.defaults.clinvarStarThreshold"
              :disabled="!filterStore.defaults.clinvarEnabled"
              :min="0"
              :max="4"
              :step="1"
              :ticks="tickLabels"
              show-ticks="always"
              tick-size="4"
              label="ClinVar Minimum Stars"
              hint="Minimum gold star review status required for ClinVar variants"
              persistent-hint
              thumb-label
              color="success"
              class="mb-4"
            />

            <v-divider class="my-4" />

            <v-btn
              variant="outlined"
              color="warning"
              size="small"
              prepend-icon="mdi-restore"
              @click="filterStore.resetToFactoryDefaults()"
            >
              Reset to Factory Defaults
            </v-btn>
          </v-tabs-window-item>
          <v-tabs-window-item value="templates">
            <div class="d-flex flex-column flex-md-row ga-4">
              <!-- Editor column -->
              <div class="flex-grow-1">
                <p class="text-body-2 text-medium-emphasis mb-4">
                  Customize the clinical text templates. Use {{ formatVariablePlaceholder('variable') }} syntax for dynamic values.
                </p>

                <!-- Language selector -->
                <v-btn-toggle
                  v-model="templateStore.language"
                  color="primary"
                  density="compact"
                  mandatory
                  class="mb-4"
                >
                  <v-btn value="de">
                    German
                  </v-btn>
                  <v-btn value="en">
                    English
                  </v-btn>
                </v-btn-toggle>

                <TemplateEditor ref="templateEditorRef" />

                <!-- Import/Export/Reset buttons -->
                <v-divider class="my-4" />

                <div class="d-flex flex-wrap ga-2">
                  <v-btn
                    variant="outlined"
                    size="small"
                    prepend-icon="mdi-download"
                    @click="handleExportTemplates"
                  >
                    Export Templates
                  </v-btn>

                  <v-btn
                    variant="outlined"
                    size="small"
                    prepend-icon="mdi-upload"
                    @click="fileInputRef?.click()"
                  >
                    Import Templates
                  </v-btn>
                  <input
                    ref="fileInputRef"
                    type="file"
                    accept=".json"
                    style="display: none"
                    @change="handleImportTemplates"
                  >

                  <v-btn
                    variant="outlined"
                    size="small"
                    color="warning"
                    prepend-icon="mdi-restore"
                    @click="handleResetLanguage"
                  >
                    Reset {{ templateStore.language === 'de' ? 'German' : 'English' }}
                  </v-btn>
                </div>
              </div>

              <!-- Variable picker column -->
              <div style="min-width: 280px">
                <VariablePicker @select="handleVariableSelect" />
              </div>
            </div>
          </v-tabs-window-item>
        </v-tabs-window>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn
          variant="text"
          @click="close"
        >
          Cancel
        </v-btn>
        <v-btn
          color="primary"
          @click="save"
        >
          Save
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue';
import { useFocusTrap } from '@vueuse/integrations/useFocusTrap';
import { useFilterStore } from '@/stores/useFilterStore';
import { useAppStore } from '@/stores/useAppStore';
import { useLogStore } from '@/stores/useLogStore';
import { useTemplateStore } from '@/stores/useTemplateStore';
import { useClingenValidity } from '@/composables';
import TemplateEditor from '@/components/TemplateEditor.vue';
import VariablePicker from '@/components/VariablePicker.vue';

const modelValue = defineModel<boolean>();

const activeTab = ref('general');
const dialogCard = ref<HTMLElement | null>(null);
const filterStore = useFilterStore();
const appStore = useAppStore();
const logStore = useLogStore();
const templateStore = useTemplateStore();
const templateEditorRef = ref<InstanceType<typeof TemplateEditor> | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);

const {
  isLoading: clingenLoading,
  error: clingenError,
  isExpired: clingenExpired,
  cacheAge: clingenCacheAge,
  entryCount: clingenEntryCount,
  refreshCache: refreshClingenCache,
} = useClingenValidity();

const tickLabels = {
  0: '0',
  1: '1',
  2: '2',
  3: '3',
  4: '4',
};

const { activate, deactivate } = useFocusTrap(dialogCard, {
  immediate: false,
  allowOutsideClick: true,
  escapeDeactivates: true,
  returnFocusOnDeactivate: true,
});

async function onDialogOpen() {
  await nextTick();
  activate();
}

function close() {
  deactivate();
  modelValue.value = false;
}

function save() {
  // Filter store auto-persists, just close
  close();
}

// Template helper to avoid template literal with braces in Vue template
function formatVariablePlaceholder(name: string): string {
  return `{{${name}}}`;
}

// Handle variable selection from picker
function handleVariableSelect(variableName: string) {
  templateEditorRef.value?.insertVariable(variableName);
}

// Export templates to JSON file
function handleExportTemplates() {
  const data = templateStore.exportTemplates();
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `templates_${data.language}_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Import templates from JSON file
function handleImportTemplates(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target?.result as string);
      const success = templateStore.importTemplates(data);
      if (!success) {
        alert('Invalid template file format');
      }
    } catch {
      alert('Failed to parse template file');
    }
    // Reset file input
    input.value = '';
  };
  reader.readAsText(file);
}

// Reset templates for current language
function handleResetLanguage() {
  if (confirm(`Reset all ${templateStore.language === 'de' ? 'German' : 'English'} templates to defaults?`)) {
    templateStore.resetLanguageTemplates(templateStore.language);
  }
}
</script>
