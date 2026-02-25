<template>
  <v-app-bar density="compact" :elevation="2">
    <div class="app-bar-content">
      <v-tooltip
        v-if="!xs"
        text="Start new calculation"
        location="bottom"
        aria-label="Start new calculation"
      >
        <template #activator="{ props: tooltipProps }">
          <v-app-bar-title
            v-bind="tooltipProps"
            class="app-logo text-body-1 font-weight-bold"
            @click="emit('reset')"
          >
            <v-icon size="small" class="mr-1">mdi-home</v-icon>
            gCFCalc
          </v-app-bar-title>
        </template>
      </v-tooltip>

      <v-chip
        v-if="xs && state.currentStep > 1 && state.gene"
        size="small"
        color="primary"
        variant="tonal"
        class="ml-2"
        data-testid="gene-context-chip"
        @click="goToStep(1)"
      >
        {{ state.gene.symbol }} &middot; {{ version }}
      </v-chip>

      <OfflineIndicator class="ml-3" />

      <v-spacer />

      <v-tooltip
        text="Search history"
        location="bottom"
        aria-label="Search history"
      >
        <template #activator="{ props }">
          <v-btn
            v-bind="props"
            icon
            variant="text"
            title="Search history"
            aria-label="Search history"
            data-testid="footer-history-btn"
            @click="emit('openHistory')"
          >
            <v-icon>mdi-history</v-icon>
          </v-btn>
        </template>
      </v-tooltip>

      <v-tooltip
        text="Toggle theme"
        location="bottom"
        aria-label="Toggle theme"
      >
        <template #activator="{ props }">
          <v-btn
            v-bind="props"
            icon
            variant="text"
            :title="tooltipText"
            aria-label="Toggle theme"
            @click="toggleTheme()"
          >
            <v-icon>{{ themeIcon }}</v-icon>
          </v-btn>
        </template>
      </v-tooltip>

      <v-tooltip text="Settings" location="bottom" aria-label="Settings">
        <template #activator="{ props }">
          <v-btn
            v-bind="props"
            icon
            variant="text"
            title="Settings"
            aria-label="Settings"
            data-testid="footer-settings-btn"
            @click="emit('openSettings')"
          >
            <v-icon>mdi-cog</v-icon>
          </v-btn>
        </template>
      </v-tooltip>
    </div>

    <!-- Back online notification snackbar -->
    <v-snackbar
      v-model="showBackOnlineNotification"
      :timeout="3000"
      color="success"
      location="top"
    >
      Back online

      <template #actions>
        <v-btn variant="text" @click="dismissBackOnlineNotification">
          Close
        </v-btn>
      </template>
    </v-snackbar>
  </v-app-bar>
</template>

<script setup lang="ts">
import { useDisplay } from "vuetify";
import { useAppTheme, useNetworkStatus, useWizard } from "@/composables";
import { useGnomadVersion } from "@/api";
import OfflineIndicator from "@/components/OfflineIndicator.vue";

const { xs } = useDisplay();
const { toggleTheme, tooltipText, themeIcon } = useAppTheme();
const { showBackOnlineNotification, dismissBackOnlineNotification } =
  useNetworkStatus();
const { state, goToStep } = useWizard();
const { version } = useGnomadVersion();

const emit = defineEmits<{
  openSettings: [];
  openHistory: [];
  reset: [];
}>();
</script>

<style scoped>
.app-bar-content {
  display: flex;
  align-items: center;
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
  padding: 0 16px;
}

.app-logo {
  cursor: pointer;
  animation: subtle-pulse 3s ease-in-out infinite;
  transition:
    color 0.2s ease,
    transform 0.2s ease;
}

.app-logo:hover {
  color: rgb(var(--v-theme-primary));
  transform: scale(1.05);
  animation-play-state: paused;
}

@keyframes subtle-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.85;
  }
}
</style>
