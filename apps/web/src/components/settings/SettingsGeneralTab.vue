<template>
  <div>
    <!-- Clinical Disclaimer Section -->
    <v-card variant="outlined" class="mb-4">
      <v-card-title class="text-subtitle-1">
        <v-icon start size="small">mdi-alert-circle-outline</v-icon>
        Clinical Disclaimer
      </v-card-title>

      <v-card-text>
        <div class="d-flex align-center justify-space-between">
          <div class="text-body-2">
            <span v-if="appStore.disclaimerAcknowledged">
              Acknowledged on {{ appStore.acknowledgedDate }}
            </span>
            <span v-else>Not yet acknowledged</span>
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
        <v-icon start size="small">mdi-database-sync</v-icon>
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
            <v-icon start size="small">mdi-refresh</v-icon>
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
          ClinGen data is used to validate gene-disease associations. Cache
          expires after 30 days and refreshes automatically.
        </div>
      </v-card-text>
    </v-card>

    <!-- Variant Cache Management Section -->
    <v-card variant="outlined" class="mb-4">
      <v-card-title class="text-subtitle-1">
        <v-icon start size="small">mdi-database-outline</v-icon>
        Variant Data Cache
      </v-card-title>

      <v-card-text>
        <div class="text-body-2 mb-3">
          Variant data fetched from gnomAD is cached locally for faster repeat
          access. Cache is keyed by gene, dataset, and genome build.
        </div>

        <div class="d-flex align-center justify-space-between">
          <div class="text-body-2">
            <span>
              {{ variantCacheSize }} gene{{ variantCacheSize === 1 ? "" : "s" }}
              cached
            </span>
          </div>

          <v-btn
            variant="text"
            size="small"
            :disabled="variantCacheSize === 0"
            @click="handleClearVariantCache"
          >
            <v-icon start size="small">mdi-delete-outline</v-icon>
            Clear Cache
          </v-btn>
        </div>
      </v-card-text>
    </v-card>

    <!-- Logging Configuration Section -->
    <v-card variant="outlined" class="mb-4">
      <v-card-title class="text-subtitle-1">
        <v-icon start size="small">mdi-console</v-icon>
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
          Maximum number of log entries to keep. Older entries are automatically
          removed.
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
            <span class="text-medium-emphasis">
              ({{ logStore.stats.memoryEstimate }})
            </span>
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
        <v-icon start size="small">mdi-history</v-icon>
        Search History
      </v-card-title>

      <v-card-text>
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
          Oldest entries are automatically removed when the limit is exceeded.
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
          {{ historyStore.entryCount }} history entries. This action cannot be
          undone.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showClearHistoryDialog = false">
            Cancel
          </v-btn>
          <v-btn color="error" variant="flat" @click="clearAllHistory">
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
          Choose the default display format when starting a new analysis. You
          can switch formats at any time in the results view.
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
        <v-icon start size="small">mdi-cached</v-icon>
        Data Cache
      </v-card-title>

      <v-card-text>
        <div class="text-body-2 mb-2">
          Gene and API data cached for offline use.
        </div>

        <div v-if="cacheInfo" class="text-caption text-medium-emphasis mb-3">
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
          Clearing cache will remove offline gene data. Fresh data will be
          fetched on next use.
        </div>
      </v-card-text>
    </v-card>

    <!-- Install App Section -->
    <v-card variant="outlined" class="mb-4">
      <v-card-title class="text-subtitle-1">
        <v-icon start size="small">mdi-download</v-icon>
        Install App
      </v-card-title>

      <v-card-text>
        <!-- Already installed -->
        <template v-if="isInstalled">
          <div class="d-flex align-center">
            <v-icon color="success" class="mr-2">mdi-check-circle</v-icon>
            <span class="text-body-2">
              App is installed and ready to use offline.
            </span>
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
            <v-icon color="grey" class="mr-2 mt-1">mdi-apple</v-icon>
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
            Install option not available in this browser. Try Chrome, Edge, or
            Safari on iOS.
          </div>
        </template>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from "vue";
import { useDisplay } from "vuetify";
import { useAppStore } from "@/stores/useAppStore";
import { useLogStore } from "@/stores/useLogStore";
import { useHistoryStore } from "@/stores/useHistoryStore";
import { useFormatStore } from "@/stores/useFormatStore";
import {
  useClingenValidity,
  usePwaInstall,
  useCarrierFrequency,
  useLogger,
} from "@/composables";

const props = defineProps<{
  isOpen?: boolean;
}>();

const { smAndDown } = useDisplay();
const logger = useLogger("settings");

const appStore = useAppStore();
const logStore = useLogStore();
const historyStore = useHistoryStore();
const formatStore = useFormatStore();

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

async function loadCacheInfo(): Promise<void> {
  if (
    typeof navigator !== "undefined" &&
    navigator.storage &&
    navigator.storage.estimate
  ) {
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

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

async function clearGeneDataCache(): Promise<void> {
  cacheClearing.value = true;
  cacheCleared.value = false;

  try {
    if (typeof caches !== "undefined") {
      const gnomadDeleted = await caches.delete("gnomad-api-cache");
      const clingenDeleted = await caches.delete("clingen-api-cache");

      if (gnomadDeleted || clingenDeleted) {
        cacheCleared.value = true;
        await loadCacheInfo();
        setTimeout(() => {
          cacheCleared.value = false;
        }, 3000);
      }
    }
  } catch (error) {
    logger.error("Failed to clear cache", { error });
  } finally {
    cacheClearing.value = false;
  }
}

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

// Variant cache management
const { clearVariantCache, getVariantCacheSize } = useCarrierFrequency();
const variantCacheSize = ref(0);

async function loadVariantCacheSize() {
  try {
    variantCacheSize.value = await getVariantCacheSize();
  } catch {
    variantCacheSize.value = 0;
  }
}

async function handleClearVariantCache() {
  try {
    await clearVariantCache();
    variantCacheSize.value = 0;
  } catch (err) {
    logger.error("Failed to clear variant cache", err);
  }
}

function refreshData() {
  loadCacheInfo();
  loadVariantCacheSize();
}

onMounted(() => {
  refreshData();
});

watch(
  () => props.isOpen,
  (val) => {
    if (val) {
      refreshData();
    }
  },
);

defineExpose({
  refreshData,
  loadVariantCacheSize,
});
</script>
