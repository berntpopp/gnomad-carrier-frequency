<template>
  <Transition name="fade">
    <v-chip
      v-if="!isOnline"
      size="small"
      color="warning"
      variant="tonal"
      prepend-icon="mdi-wifi-off"
      aria-label="You are offline"
      role="status"
    >
      Offline
    </v-chip>
  </Transition>
</template>

<script setup lang="ts">
import { useNetworkStatus } from '@/composables';

const { isOnline } = useNetworkStatus();
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
