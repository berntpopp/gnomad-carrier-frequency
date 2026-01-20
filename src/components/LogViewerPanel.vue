<template>
  <v-navigation-drawer
    v-model="modelValue"
    location="right"
    temporary
    :width="smAndDown ? '100%' : 450"
  >
    <div class="pa-4">
      <LogViewer @close="modelValue = false" />
    </div>
  </v-navigation-drawer>
</template>

<script setup lang="ts">
import { useDisplay } from 'vuetify';
import LogViewer from '@/components/LogViewer.vue';

// Responsive breakpoint detection
const { smAndDown } = useDisplay();

const modelValue = defineModel<boolean>();
</script>
