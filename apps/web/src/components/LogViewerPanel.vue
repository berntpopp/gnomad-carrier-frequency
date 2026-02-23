<template>
  <v-navigation-drawer
    v-model="modelValue"
    location="right"
    temporary
    :width="drawerWidth"
    class="log-viewer-drawer"
  >
    <div class="pa-4">
      <LogViewer @close="modelValue = false" />
    </div>
  </v-navigation-drawer>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useDisplay } from 'vuetify';
import LogViewer from '@/components/LogViewer.vue';

// Responsive breakpoint detection
const { smAndDown, width: viewportWidth } = useDisplay();

// Use actual viewport width on mobile, fixed width on desktop
// Vuetify doesn't support percentage width, so we use the actual viewport pixel value
const drawerWidth = computed(() => smAndDown.value ? viewportWidth.value : 450);

const modelValue = defineModel<boolean>();
</script>

<style scoped>
/* Ensure drawer doesn't cause layout issues on mobile */
.log-viewer-drawer {
  max-width: 100vw;
}
</style>
