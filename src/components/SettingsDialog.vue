<template>
  <v-dialog
    v-model="modelValue"
    :max-width="dialogMaxWidth"
    :fullscreen="smAndDown"
    persistent
    aria-label="Settings"
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

            <!-- Data Cache Section -->
            <v-card
              variant="outlined"
              class="mb-4"
            >
              <v-card-title class="text-subtitle-1">
                <v-icon
                  start
                  size="small"
                >
                  mdi-cached
                </v-icon>
                Data Cache
              </v-card-title>

              <v-card-text>
                <div class="text-body-2 mb-2">
                  Gene and API data cached for offline use.
                </div>

                <div
                  v-if="cacheInfo"
                  class="text-caption text-medium-emphasis mb-3"
                >
                  Using {{ formatBytes(cacheInfo.usage) }} of {{ formatBytes(cacheInfo.quota) }}
                </div>
                <div
                  v-else
                  class="text-caption text-medium-emphasis mb-3"
                >
                  Storage information not available
                </div>

                <v-alert
                  v-if="cacheCleared"
                  type="success"
                  variant="tonal"
                  density="compact"
                  class="mb-3"
                >
                  Cache cleared successfully
                </v-alert>

                <v-btn
                  variant="outlined"
                  size="small"
                  color="warning"
                  prepend-icon="mdi-delete"
                  :loading="cacheClearing"
                  @click="clearGeneDataCache"
                >
                  Clear Cache
                </v-btn>

                <div class="text-caption text-medium-emphasis mt-3">
                  Clearing cache will remove offline gene data. Fresh data will be fetched on next use.
                </div>
              </v-card-text>
            </v-card>

            <!-- Install App Section -->
            <v-card
              variant="outlined"
              class="mb-4"
            >
              <v-card-title class="text-subtitle-1">
                <v-icon
                  start
                  size="small"
                >
                  mdi-download
                </v-icon>
                Install App
              </v-card-title>

              <v-card-text>
                <!-- Already installed -->
                <template v-if="isInstalled">
                  <div class="d-flex align-center">
                    <v-icon
                      color="success"
                      class="mr-2"
                    >
                      mdi-check-circle
                    </v-icon>
                    <span class="text-body-2">App is installed and ready to use offline.</span>
                  </div>
                </template>

                <!-- Can install (browser supports) -->
                <template v-else-if="canInstall">
                  <div class="text-body-2 mb-3">
                    Install gCFCalc on your device for quick access and offline use.
                  </div>
                  <v-btn
                    color="primary"
                    prepend-icon="mdi-download"
                    @click="promptInstall"
                  >
                    Install
                  </v-btn>
                </template>

                <!-- iOS device -->
                <template v-else-if="isIos">
                  <div class="d-flex align-start">
                    <v-icon
                      color="grey"
                      class="mr-2 mt-1"
                    >
                      mdi-apple
                    </v-icon>
                    <div>
                      <div class="text-body-2 mb-2">
                        To install on iOS:
                      </div>
                      <ol class="text-caption text-medium-emphasis pl-4 mb-0">
                        <li>Tap the Share button</li>
                        <li>Select "Add to Home Screen"</li>
                      </ol>
                    </div>
                  </div>
                </template>

                <!-- Not installable -->
                <template v-else>
                  <div class="text-body-2 text-medium-emphasis">
                    Install option not available in this browser. Try Chrome, Edge, or Safari on iOS.
                  </div>
                </template>
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
import { ref, nextTick, onMounted, computed } from 'vue';
import { useFocusTrap } from '@vueuse/integrations/useFocusTrap';
import { useDisplay } from 'vuetify';
import { useFilterStore } from '@/stores/useFilterStore';
import { useAppStore } from '@/stores/useAppStore';
import { useLogStore } from '@/stores/useLogStore';
import { useTemplateStore } from '@/stores/useTemplateStore';
import { useClingenValidity, usePwaInstall } from '@/composables';
import TemplateEditor from '@/components/TemplateEditor.vue';
import VariablePicker from '@/components/VariablePicker.vue';

// Responsive breakpoint detection
const { smAndDown } = useDisplay();

// Computed dialog max-width (undefined for fullscreen mode)
const dialogMaxWidth = computed(() => {
  if (smAndDown.value) return undefined;
  return activeTab.value === 'templates' ? 900 : 600;
});

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

// PWA Install
const { canInstall, isInstalled, isIos, promptInstall } = usePwaInstall();

// Data Cache management
interface CacheInfo {
  usage: number;
  quota: number;
}

const cacheInfo = ref<CacheInfo | null>(null);
const cacheClearing = ref(false);
const cacheCleared = ref(false);

/**
 * Get storage estimate from browser API
 */
async function loadCacheInfo(): Promise<void> {
  if (navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      cacheInfo.value = {
        usage: estimate.usage ?? 0,
        quota: estimate.quota ?? 0,
      };
    } catch {
      cacheInfo.value = null;
    }
  }
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Clear gene data caches (gnomad-api-cache and clingen-api-cache)
 */
async function clearGeneDataCache(): Promise<void> {
  cacheClearing.value = true;
  cacheCleared.value = false;

  try {
    // Delete both API caches
    const gnomadDeleted = await caches.delete('gnomad-api-cache');
    const clingenDeleted = await caches.delete('clingen-api-cache');

    if (gnomadDeleted || clingenDeleted) {
      cacheCleared.value = true;
      // Reload cache info
      await loadCacheInfo();
      // Reset cleared message after 3 seconds
      setTimeout(() => {
        cacheCleared.value = false;
      }, 3000);
    }
  } catch (error) {
    console.error('Failed to clear cache:', error);
  } finally {
    cacheClearing.value = false;
  }
}

// Load cache info on mount
onMounted(() => {
  loadCacheInfo();
});

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
