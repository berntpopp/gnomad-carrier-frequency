<template>
  <v-navigation-drawer
    v-model="modelValue"
    location="right"
    temporary
    :width="drawerWidth"
    class="log-viewer-drawer"
  >
    <div class="pa-4 log-viewer-container">
      <LogViewer @close="modelValue = false" />
    </div>
  </v-navigation-drawer>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useDisplay } from "vuetify";
import LogViewer from "@/components/LogViewer.vue";

// Responsive breakpoint detection
const { smAndDown, width: viewportWidth } = useDisplay();

// Use actual viewport width on mobile, fixed width on desktop
const drawerWidth = computed(() =>
  smAndDown.value ? viewportWidth.value : 460,
);

const modelValue = defineModel<boolean>();
</script>

<style scoped>
/* Ensure drawer doesn't cause layout issues on mobile */
.log-viewer-drawer {
  max-width: 100vw;
  border-left: 1px solid rgba(var(--v-border-color), 0.12) !important;
  box-shadow: -8px 0 32px rgba(0, 0, 0, 0.12) !important;
}

.log-viewer-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}
</style>
