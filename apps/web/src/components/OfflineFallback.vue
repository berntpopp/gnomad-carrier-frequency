<template>
  <Transition name="slide-fade">
    <v-alert
      v-if="!isOnline"
      type="warning"
      variant="tonal"
      icon="mdi-wifi-off"
      aria-live="polite"
      class="mb-4"
    >
      You're offline. Connect to use the calculator.
    </v-alert>
  </Transition>
</template>

<script setup lang="ts">
import { useNetworkStatus } from "@/composables";

const { isOnline } = useNetworkStatus();
</script>

<style scoped>
.slide-fade-enter-active {
  transition:
    opacity 0.25s ease-out,
    transform 0.25s ease-out;
}

.slide-fade-leave-active {
  transition:
    opacity 0.25s ease-in,
    transform 0.25s ease-in;
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateY(-10px);
  opacity: 0;
}
</style>
