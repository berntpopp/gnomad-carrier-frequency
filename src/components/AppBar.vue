<template>
  <v-app-bar
    density="compact"
    :elevation="2"
  >
    <v-app-bar-title class="text-body-1 font-weight-bold">
      gCFCalc
    </v-app-bar-title>

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
  </v-app-bar>
</template>

<script setup lang="ts">
import { useAppTheme } from '@/composables';

const { toggleTheme, tooltipText, themeIcon } = useAppTheme();

const emit = defineEmits<{
  openSettings: [];
}>();
</script>
