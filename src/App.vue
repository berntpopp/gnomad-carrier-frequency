<template>
  <v-app>
    <VueAnnouncer class="sr-only" />
    <DisclaimerBanner />
    <AppBar
      @open-settings="showSettings = true"
      @open-history="showHistory = true"
      @reset="handleReset"
    />

    <v-main>
      <v-container max-width="900">
        <h1 class="text-h4 mb-2">
          gnomAD Carrier Frequency Calculator
        </h1>
        <p class="text-body-2 text-medium-emphasis mb-6">
          Calculate carrier frequency and recurrence risk from gnomAD population data.
        </p>

        <!-- Show loading state while restoring from URL -->
        <div
          v-if="isRestoringFromUrl"
          class="d-flex flex-column align-center justify-center py-16"
        >
          <v-progress-circular
            indeterminate
            color="primary"
            size="48"
            class="mb-4"
          />
          <div class="text-h6 mb-2">
            Loading shared calculation
          </div>
          <div class="text-body-2 text-medium-emphasis">
            Restoring parameters from URL...
          </div>
        </div>

        <!-- Show wizard when not restoring -->
        <WizardStepper v-else />
      </v-container>
    </v-main>

    <AppFooter @open-log-viewer="showLogViewer = true" />

    <SettingsDialog v-model="showSettings" />
    <LogViewerPanel v-model="showLogViewer" />
    <HistoryDrawer
      v-model="showHistory"
      @restore="handleHistoryRestore"
    />

    <!-- PWA Update Notification -->
    <v-snackbar
      v-model="needRefresh"
      :timeout="-1"
      location="bottom"
      color="primary"
    >
      A new version is available

      <template #actions>
        <v-btn
          variant="text"
          @click="dismissUpdate"
        >
          Later
        </v-btn>
        <v-btn
          color="white"
          variant="tonal"
          @click="updateApp"
        >
          Update
        </v-btn>
      </template>
    </v-snackbar>

    <!-- PWA Offline Ready Notification (first install) -->
    <v-snackbar
      v-model="showOfflineReady"
      :timeout="5000"
      location="bottom"
      color="success"
    >
      App ready for offline use

      <template #actions>
        <v-btn
          variant="text"
          @click="showOfflineReady = false"
        >
          Close
        </v-btn>
      </template>
    </v-snackbar>
  </v-app>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import AppBar from '@/components/AppBar.vue';
import AppFooter from '@/components/AppFooter.vue';
import DisclaimerBanner from '@/components/DisclaimerBanner.vue';
import SettingsDialog from '@/components/SettingsDialog.vue';
import LogViewerPanel from '@/components/LogViewerPanel.vue';
import HistoryDrawer from '@/components/HistoryDrawer.vue';
import WizardStepper from '@/components/wizard/WizardStepper.vue';
import { useLogStore } from '@/stores/useLogStore';
import { useWizard, useUrlState, usePwaUpdate, useHistoryAutoSave } from '@/composables';

const showSettings = ref(false);
const showLogViewer = ref(false);
const showHistory = ref(false);

// Wizard reset
const { resetWizard } = useWizard();

// Initialize URL state synchronization
// This handles restoring state from URL on mount and updating URL as state changes
const { isRestoringFromUrl } = useUrlState();

// PWA update management
const { needRefresh, offlineReady, updateApp, dismissUpdate } = usePwaUpdate();

// Local state for offline-ready notification dismissal
const showOfflineReady = ref(false);

// Watch offlineReady to show notification
watch(offlineReady, (value) => {
  if (value) {
    showOfflineReady.value = true;
  }
});

function handleReset() {
  resetWizard();
}

/**
 * Handle restoring a history entry (placeholder for Plan 03)
 */
function handleHistoryRestore(id: string) {
  // Restoration logic implemented in Plan 03
  console.log('Restore history entry:', id);
}

// Initialize history auto-save
const { initialize: initHistoryAutoSave } = useHistoryAutoSave();
initHistoryAutoSave();

// App startup
const logStore = useLogStore();

onMounted(() => {
  // Handle autoClearOnStart setting
  if (logStore.settings.autoClearOnStart) {
    logStore.clearAll();
  }
});
</script>

<style scoped>
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
