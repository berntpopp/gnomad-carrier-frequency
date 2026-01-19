<template>
  <v-navigation-drawer
    v-model="modelValue"
    location="right"
    temporary
    width="450"
  >
    <div class="pa-4">
      <LogViewer @close="modelValue = false" />
    </div>
  </v-navigation-drawer>
</template>

<script setup lang="ts">
import LogViewer from '@/components/LogViewer.vue';

const modelValue = defineModel<boolean>();
</script>
