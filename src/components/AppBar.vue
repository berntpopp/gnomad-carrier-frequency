<template>
  <v-app-bar density="compact" :elevation="2">
    <v-app-bar-title class="text-body-1 font-weight-bold">
      gCFCalc
    </v-app-bar-title>

    <v-spacer />

    <v-tooltip text="Toggle theme" location="bottom">
      <template #activator="{ props }">
        <v-btn
          v-bind="props"
          icon
          variant="text"
          :title="tooltipText"
          @click="toggleTheme()"
        >
          <v-icon>{{ themeIcon }}</v-icon>
        </v-btn>
      </template>
    </v-tooltip>

    <v-tooltip text="Settings" location="bottom">
      <template #activator="{ props }">
        <v-btn
          v-bind="props"
          icon
          variant="text"
          title="Settings"
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
