<template>
  <v-app-bar
    density="compact"
    :elevation="2"
  >
    <div class="app-bar-content">
      <v-tooltip
        text="Calculate carrier frequency and recurrence risk from gnomAD population data."
        location="bottom"
        max-width="300"
      >
        <template #activator="{ props }">
          <v-app-bar-title
            v-bind="props"
            class="app-logo text-body-1 font-weight-bold"
            @click="emit('reset')"
          >
            gCFCalc
          </v-app-bar-title>
        </template>
      </v-tooltip>

      <v-spacer />

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

      <v-tooltip
        text="Settings"
        location="bottom"
        aria-label="Settings"
      >
        <template #activator="{ props }">
          <v-btn
            v-bind="props"
            icon
            variant="text"
            title="Settings"
            aria-label="Settings"
            @click="emit('openSettings')"
          >
            <v-icon>mdi-cog</v-icon>
          </v-btn>
        </template>
      </v-tooltip>
    </div>
  </v-app-bar>
</template>

<script setup lang="ts">
import { useAppTheme } from '@/composables';

const { toggleTheme, tooltipText, themeIcon } = useAppTheme();

const emit = defineEmits<{
  openSettings: [];
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
  transition: color 0.2s ease, transform 0.2s ease;
}

.app-logo:hover {
  color: rgb(var(--v-theme-primary));
  transform: scale(1.05);
  animation-play-state: paused;
}

@keyframes subtle-pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.85;
  }
}
</style>
