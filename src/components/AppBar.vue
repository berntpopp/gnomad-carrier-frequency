<template>
  <v-app-bar>
    <v-app-bar-title>gnomAD Carrier Frequency Calculator</v-app-bar-title>

    <v-spacer />

    <v-btn
      icon
      variant="text"
      :title="tooltipText"
      @click="toggleTheme()"
    >
      <v-icon>{{ themeIcon }}</v-icon>
    </v-btn>
  </v-app-bar>
</template>

<script setup lang="ts">
import { useAppTheme } from '@/composables';

const { toggleTheme, tooltipText, themeIcon } = useAppTheme();
</script>
