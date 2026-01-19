<template>
  <v-dialog
    v-model="modelValue"
    max-width="600"
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
            <p class="text-body-2">
              Template editing will appear here.
            </p>
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
import { useClingenValidity } from '@/composables';

const modelValue = defineModel<boolean>();

const activeTab = ref('general');
const dialogCard = ref<HTMLElement | null>(null);
const filterStore = useFilterStore();
const appStore = useAppStore();

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
</script>
