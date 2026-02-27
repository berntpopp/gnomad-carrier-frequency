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
        <v-btn icon variant="text" size="small" @click="close">
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
              <!-- Clinical Disclaimer Section -->
              <v-card variant="outlined" class="mb-4">
                <v-card-title class="text-subtitle-1">
                  <v-icon start size="small"> mdi-alert-circle-outline </v-icon>
                  Clinical Disclaimer
                </v-card-title>

                <v-card-text>
                  <div class="d-flex align-center justify-space-between">
                    <div class="text-body-2">
                      <span v-if="appStore.disclaimerAcknowledged">
                        Acknowledged on {{ appStore.acknowledgedDate }}
                      </span>
                      <span v-else> Not yet acknowledged </span>
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
              <v-card variant="outlined" class="mb-4">
                <v-card-title class="text-subtitle-1">
                  <v-icon start size="small"> mdi-database-sync </v-icon>
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
                          {{ clingenExpired ? "Expired" : "Valid" }}
                        </v-chip>
                      </div>
                      <div class="text-caption text-medium-emphasis">
                        {{ clingenEntryCount }} entries | Last updated:
                        {{ clingenCacheAge }}
                      </div>
                    </div>

                    <v-btn
                      variant="outlined"
                      size="small"
                      :loading="clingenLoading"
                      @click="refreshClingenCache"
                    >
                      <v-icon start size="small"> mdi-refresh </v-icon>
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
              <v-card variant="outlined" class="mb-4">
                <v-card-title class="text-subtitle-1">
                  <v-icon start size="small"> mdi-console </v-icon>
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
                    Maximum number of log entries to keep. Older entries are
                    automatically removed.
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
                      <span class="text-medium-emphasis"
                        >({{ logStore.stats.memoryEstimate }})</span
                      >
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

              <!-- History Settings Section -->
              <v-card variant="outlined" class="mb-4">
                <v-card-title class="text-subtitle-1">
                  <v-icon start size="small"> mdi-history </v-icon>
                  Search History
                </v-card-title>

                <v-card-text>
                  <!-- Entry count and storage info -->
                  <div class="d-flex align-center justify-space-between mb-4">
                    <div class="text-body-2">
                      <strong>Entries:</strong> {{ historyStore.entryCount }}
                    </div>
                    <v-btn
                      v-if="!historyStore.isEmpty"
                      color="error"
                      variant="text"
                      size="small"
                      @click="confirmClearHistory"
                    >
                      Clear History
                    </v-btn>
                  </div>

                  <!-- Max entries slider -->
                  <v-slider
                    v-model="historyMaxEntries"
                    :min="10"
                    :max="200"
                    :step="10"
                    label="Maximum entries"
                    thumb-label
                    class="mb-2"
                    :density="smAndDown ? 'default' : 'compact'"
                    :hide-details="smAndDown"
                  >
                    <template #append>
                      <span class="text-body-2 text-medium-emphasis">
                        {{ historyMaxEntries }}
                      </span>
                    </template>
                  </v-slider>

                  <div class="text-caption text-medium-emphasis">
                    Oldest entries are automatically removed when the limit is
                    exceeded.
                  </div>
                </v-card-text>
              </v-card>

              <!-- Clear History Confirmation Dialog -->
              <v-dialog
                v-model="showClearHistoryDialog"
                max-width="400"
                aria-label="Clear history confirmation"
              >
                <v-card>
                  <v-card-title>Clear Search History?</v-card-title>
                  <v-card-text>
                    This will permanently delete all
                    {{ historyStore.entryCount }} history entries. This action
                    cannot be undone.
                  </v-card-text>
                  <v-card-actions>
                    <v-spacer />
                    <v-btn
                      variant="text"
                      @click="showClearHistoryDialog = false"
                    >
                      Cancel
                    </v-btn>
                    <v-btn
                      color="error"
                      variant="flat"
                      @click="clearAllHistory"
                    >
                      Clear All
                    </v-btn>
                  </v-card-actions>
                </v-card>
              </v-dialog>

              <!-- Default Frequency Format Section -->
              <v-card variant="outlined" class="mb-4">
                <v-card-title class="text-subtitle-1">
                  <v-icon start size="small">mdi-format-list-numbered</v-icon>
                  Default Frequency Format
                </v-card-title>

                <v-card-text>
                  <p class="text-body-2 text-medium-emphasis mb-3">
                    Choose the default display format when starting a new
                    analysis. You can switch formats at any time in the results
                    view.
                  </p>
                  <v-btn-toggle
                    v-model="formatStore.defaultFormat"
                    mandatory
                    density="compact"
                    color="primary"
                    variant="outlined"
                  >
                    <v-btn value="percent" size="small">%</v-btn>
                    <v-btn value="ratio" size="small">1:N</v-btn>
                    <v-btn value="scientific" size="small">sci</v-btn>
                    <v-btn value="per100k" size="small">/100k</v-btn>
                  </v-btn-toggle>
                </v-card-text>
              </v-card>

              <!-- Data Cache Section -->
              <v-card variant="outlined" class="mb-4">
                <v-card-title class="text-subtitle-1">
                  <v-icon start size="small"> mdi-cached </v-icon>
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
                    Using {{ formatBytes(cacheInfo.usage) }} of
                    {{ formatBytes(cacheInfo.quota) }}
                  </div>
                  <div v-else class="text-caption text-medium-emphasis mb-3">
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
                    Clearing cache will remove offline gene data. Fresh data
                    will be fetched on next use.
                  </div>
                </v-card-text>
              </v-card>

              <!-- Install App Section -->
              <v-card variant="outlined" class="mb-4">
                <v-card-title class="text-subtitle-1">
                  <v-icon start size="small"> mdi-download </v-icon>
                  Install App
                </v-card-title>

                <v-card-text>
                  <!-- Already installed -->
                  <template v-if="isInstalled">
                    <div class="d-flex align-center">
                      <v-icon color="success" class="mr-2">
                        mdi-check-circle
                      </v-icon>
                      <span class="text-body-2"
                        >App is installed and ready to use offline.</span
                      >
                    </div>
                  </template>

                  <!-- Can install (browser supports) -->
                  <template v-else-if="canInstall">
                    <div class="text-body-2 mb-3">
                      Install gCFCalc on your device for quick access and
                      offline use.
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
                      <v-icon color="grey" class="mr-2 mt-1">
                        mdi-apple
                      </v-icon>
                      <div>
                        <div class="text-body-2 mb-2">To install on iOS:</div>
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
                      Install option not available in this browser. Try Chrome,
                      Edge, or Safari on iOS.
                    </div>
                  </template>
                </v-card-text>
              </v-card>
            </v-window-item>

            <v-window-item value="filters">
              <p class="text-body-2 text-medium-emphasis mb-4">
                Configure the default filter settings for new calculations.
                These defaults can be overridden per calculation.
              </p>

              <v-switch
                v-model="filterStore.defaults.lofHcEnabled"
                color="secondary"
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
            </v-window-item>

            <v-window-item value="templates">
              <p class="text-body-2 text-medium-emphasis mb-3">
                Customize the clinical text templates. Use the toolbar to insert
                dynamic variables.
              </p>

              <!-- Language selector -->
              <v-btn-toggle
                v-model="templateStore.language"
                color="primary"
                density="compact"
                mandatory
                class="mb-4"
              >
                <v-btn value="de"> German </v-btn>
                <v-btn value="en"> English </v-btn>
              </v-btn-toggle>

              <TemplateEditor />

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
                />

                <v-btn
                  variant="outlined"
                  size="small"
                  color="warning"
                  prepend-icon="mdi-restore"
                  @click="handleResetLanguage"
                >
                  Reset
                  {{ templateStore.language === "de" ? "German" : "English" }}
                </v-btn>
              </div>
            </v-window-item>

            <v-window-item value="quality">
              <p class="text-body-2 text-medium-emphasis mb-4">
                Flag variants that may need review. Flagged variants can be
                excluded per-analysis in the filter panel.
              </p>

              <!-- Card 1: High AF (BA1) -->
              <v-card variant="outlined" class="mb-4">
                <v-card-title class="text-subtitle-1">
                  <v-icon start size="small" color="error"
                    >mdi-alert-circle</v-icon
                  >
                  High Allele Frequency (BA1)
                </v-card-title>
                <v-card-text>
                  <v-switch
                    v-model="qualityStore.defaults.highAfEnabled"
                    color="error"
                    label="Flag variants exceeding AF threshold"
                    density="compact"
                    hide-details
                    class="mb-3"
                  />
                  <v-slider
                    v-model="highAfPercent"
                    :disabled="!qualityStore.defaults.highAfEnabled"
                    :min="1"
                    :max="20"
                    :step="0.5"
                    label="AF Threshold %"
                    thumb-label
                    color="error"
                    density="compact"
                  >
                    <template #append>
                      <span class="text-body-2">{{ highAfPercent }}%</span>
                    </template>
                  </v-slider>
                  <div class="text-caption text-medium-emphasis">
                    ACMG BA1: Variants with allele frequency above this
                    threshold in any population may be too common for a rare
                    recessive disease.
                  </div>
                </v-card-text>
              </v-card>

              <!-- Card 2: High Homozygote Count -->
              <v-card variant="outlined" class="mb-4">
                <v-card-title class="text-subtitle-1">
                  <v-icon start size="small" color="orange">mdi-alert</v-icon>
                  High Homozygote Count
                </v-card-title>
                <v-card-text>
                  <v-switch
                    v-model="qualityStore.defaults.highHomEnabled"
                    color="orange"
                    label="Flag variants with unexpectedly high homozygotes"
                    density="compact"
                    hide-details
                    class="mb-3"
                  />
                  <v-btn-toggle
                    v-model="qualityStore.defaults.highHomMethod"
                    :disabled="!qualityStore.defaults.highHomEnabled"
                    mandatory
                    density="compact"
                    color="orange"
                    variant="outlined"
                    class="mb-3"
                  >
                    <v-btn value="hwe_relative" size="small"
                      >HWE-Relative</v-btn
                    >
                    <v-btn value="absolute" size="small">Absolute</v-btn>
                  </v-btn-toggle>

                  <!-- HWE-relative multiplier -->
                  <v-slider
                    v-if="
                      qualityStore.defaults.highHomMethod === 'hwe_relative'
                    "
                    v-model="qualityStore.defaults.highHomHWEMultiplier"
                    :disabled="!qualityStore.defaults.highHomEnabled"
                    :min="2"
                    :max="20"
                    :step="1"
                    label="HWE Multiplier"
                    thumb-label
                    color="orange"
                    density="compact"
                  >
                    <template #append>
                      <span class="text-body-2"
                        >{{ qualityStore.defaults.highHomHWEMultiplier }}x</span
                      >
                    </template>
                  </v-slider>

                  <!-- Absolute threshold -->
                  <v-slider
                    v-else
                    v-model="qualityStore.defaults.highHomAbsoluteThreshold"
                    :disabled="!qualityStore.defaults.highHomEnabled"
                    :min="1"
                    :max="50"
                    :step="1"
                    label="Max Homozygotes"
                    thumb-label
                    color="orange"
                    density="compact"
                  >
                    <template #append>
                      <span class="text-body-2">{{
                        qualityStore.defaults.highHomAbsoluteThreshold
                      }}</span>
                    </template>
                  </v-slider>

                  <div class="text-caption text-medium-emphasis">
                    Flag when observed homozygotes exceed expected count.
                    HWE-Relative flags if observed > multiplier x HWE-expected
                    (AF^2 x AN).
                  </div>
                </v-card-text>
              </v-card>

              <!-- Card 3: gnomAD Filtered -->
              <v-card variant="outlined" class="mb-4">
                <v-card-title class="text-subtitle-1">
                  <v-icon start size="small" color="amber"
                    >mdi-filter-remove</v-icon
                  >
                  gnomAD Quality Filters
                </v-card-title>
                <v-card-text>
                  <v-switch
                    v-model="qualityStore.defaults.gnomadFilteredEnabled"
                    color="amber"
                    label="Flag variants that failed gnomAD QC filters"
                    density="compact"
                    hide-details
                  />
                  <div class="text-caption text-medium-emphasis mt-2">
                    Variants flagged by gnomAD's internal quality filters (e.g.,
                    random forest, allele balance, inbreeding coefficient) may
                    have lower reliability.
                  </div>
                </v-card-text>
              </v-card>

              <!-- Card 4: Genomes Only -->
              <v-card variant="outlined" class="mb-4">
                <v-card-title class="text-subtitle-1">
                  <v-icon start size="small" color="blue-grey">mdi-dna</v-icon>
                  Genomes Only
                </v-card-title>
                <v-card-text>
                  <v-switch
                    v-model="qualityStore.defaults.genomesOnlyEnabled"
                    color="blue-grey"
                    label="Flag variants observed only in genome data"
                    density="compact"
                    hide-details
                  />
                  <div class="text-caption text-medium-emphasis mt-2">
                    Variants without exome coverage may have different quality
                    characteristics compared to exome-sequenced variants.
                  </div>
                </v-card-text>
              </v-card>

              <v-divider class="my-4" />
              <v-btn
                variant="outlined"
                color="warning"
                size="small"
                prepend-icon="mdi-restore"
                @click="qualityStore.resetToFactoryDefaults()"
              >
                Reset to Factory Defaults
              </v-btn>
            </v-window-item>
          </v-window>
        </div>
      </div>

      <v-divider />

      <v-card-actions class="px-4">
        <v-spacer />
        <v-btn variant="text" @click="close"> Cancel </v-btn>
        <v-btn color="primary" @click="save"> Save </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted, computed, watch } from "vue";
import { useFocusTrap } from "@vueuse/integrations/useFocusTrap";
import { useDisplay } from "vuetify";
import { useFilterStore } from "@/stores/useFilterStore";
import { useAppStore } from "@/stores/useAppStore";
import { useLogStore } from "@/stores/useLogStore";
import { useTemplateStore } from "@/stores/useTemplateStore";
import { useHistoryStore } from "@/stores/useHistoryStore";
import { useFormatStore } from "@/stores/useFormatStore";
import { useQualityStore } from "@/stores/useQualityStore";
import {
  useClingenValidity,
  usePwaInstall,
  useConfirmDialog,
} from "@/composables";
import TemplateEditor from "@/components/TemplateEditor.vue";

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
      "disclaimer clingen cache logging history install app format frequency pwa",
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

const filterStore = useFilterStore();
const appStore = useAppStore();
const logStore = useLogStore();
const templateStore = useTemplateStore();
const historyStore = useHistoryStore();
const formatStore = useFormatStore();
const qualityStore = useQualityStore();
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

// Confirm dialog
const { ask } = useConfirmDialog();

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
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
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
    const gnomadDeleted = await caches.delete("gnomad-api-cache");
    const clingenDeleted = await caches.delete("clingen-api-cache");

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
    console.error("Failed to clear cache:", error);
  } finally {
    cacheClearing.value = false;
  }
}

// Load cache info on mount
onMounted(() => {
  loadCacheInfo();
});

// History settings
const showClearHistoryDialog = ref(false);

const historyMaxEntries = computed({
  get: () => historyStore.settings.maxEntries,
  set: (value: number) => historyStore.setMaxEntries(value),
});

function confirmClearHistory() {
  showClearHistoryDialog.value = true;
}

function clearAllHistory() {
  historyStore.clearAll();
  showClearHistoryDialog.value = false;
}

const tickLabels = {
  0: "0",
  1: "1",
  2: "2",
  3: "3",
  4: "4",
};

// Quality tab: High AF percentage computed (0-1 stored, 0-100 displayed)
const highAfPercent = computed({
  get: () => qualityStore.defaults.highAfThreshold * 100,
  set: (v: number) => qualityStore.setDefaults({ highAfThreshold: v / 100 }),
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
}

function close() {
  deactivate();
  modelValue.value = false;
}

function save() {
  // Filter store auto-persists, just close
  close();
}

// Export templates to JSON file
function handleExportTemplates() {
  const data = templateStore.exportTemplates();
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `templates_${data.language}_${new Date().toISOString().split("T")[0]}.json`;
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

  // Reset file input before reading to prevent holding the file input open
  input.value = "";

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const data = JSON.parse(e.target?.result as string);

      // Validate structure without applying yet
      if (
        !data ||
        typeof data !== "object" ||
        !data.version ||
        !data.language ||
        !data.customSections ||
        !data.enabledSections
      ) {
        await ask({
          title: "Import Error",
          message: "Invalid template file format.",
          confirmText: "OK",
          cancelText: "",
        });
        return;
      }

      // Build summary for confirmation
      const langName = data.language === "de" ? "German" : "English";
      const sectionCount = Object.values(
        data.enabledSections as Record<string, string[]>,
      ).flat().length;

      const confirmed = await ask({
        title: "Import Templates",
        message: `Import ${langName} templates with ${sectionCount} enabled sections?`,
        confirmText: "Import",
        cancelText: "Cancel",
        confirmColor: "primary",
      });

      if (confirmed) {
        templateStore.importTemplates(data);
      }
    } catch {
      await ask({
        title: "Import Error",
        message: "Failed to parse template file.",
        confirmText: "OK",
        cancelText: "",
      });
    }
  };
  reader.readAsText(file);
}

// Reset templates for current language
async function handleResetLanguage() {
  const langName = templateStore.language === "de" ? "German" : "English";
  const confirmed = await ask({
    title: "Reset Templates",
    message: `This will reset all ${langName} templates to defaults. This cannot be undone.`,
    confirmText: "Yes, reset",
    cancelText: "Keep current",
    confirmColor: "error",
  });
  if (confirmed) {
    templateStore.resetLanguageTemplates(templateStore.language);
  }
}
</script>

<style scoped>
/*
 * Fixed-height dialog layout.
 *
 * Vuetify's VDialog.css sets .v-overlay__content to a flex column with
 * max-height: calc(100% - 48px), and the child .v-card gets
 * flex: 1 1 100% — so the card sizes to its container, ignoring any
 * explicit `height` we put on it.
 *
 * The correct approach: set a fixed height on .v-overlay__content via
 * :deep(), then let the card fill it naturally with flex: 1.
 */
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
