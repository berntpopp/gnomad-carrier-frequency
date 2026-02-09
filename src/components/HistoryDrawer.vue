<template>
  <v-navigation-drawer
    v-model="modelValue"
    location="right"
    temporary
    :width="drawerWidth"
    class="history-drawer"
    data-testid="history-drawer"
  >
    <div class="pa-4">
      <HistoryPanel
        @close="modelValue = false"
        @restore="handleRestore"
      />
    </div>
  </v-navigation-drawer>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useDisplay } from 'vuetify';
import HistoryPanel from '@/components/HistoryPanel.vue';

// Responsive breakpoint detection
const { smAndDown, width: viewportWidth } = useDisplay();

// Full-width on mobile, fixed width on desktop (per CONTEXT.md)
const drawerWidth = computed(() => smAndDown.value ? viewportWidth.value : 450);

const modelValue = defineModel<boolean>();

const emit = defineEmits<{
  restore: [id: string];
}>();

function handleRestore(id: string) {
  // Close drawer before emitting restore
  modelValue.value = false;
  emit('restore', id);
}
</script>

<style scoped>
/* Ensure drawer doesn't cause layout issues on mobile */
.history-drawer {
  max-width: 100vw;
}
</style>
