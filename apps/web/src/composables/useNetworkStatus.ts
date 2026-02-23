import { ref, watch } from 'vue';
import { useOnline } from '@vueuse/core';

/**
 * Composable for monitoring network connectivity status.
 * Provides reactive online state and notification when connection is restored.
 */
export function useNetworkStatus() {
  const isOnline = useOnline();
  const showBackOnlineNotification = ref(false);

  // Track previous online state to detect reconnection
  let wasOffline = false;

  // Watch for online state changes
  watch(isOnline, (online) => {
    if (online && wasOffline) {
      // Connection restored - show notification
      showBackOnlineNotification.value = true;

      // Auto-hide after 3 seconds
      setTimeout(() => {
        showBackOnlineNotification.value = false;
      }, 3000);
    }

    // Update previous state
    wasOffline = !online;
  }, { immediate: true });

  // Manual dismiss function
  const dismissBackOnlineNotification = (): void => {
    showBackOnlineNotification.value = false;
  };

  return {
    isOnline,
    showBackOnlineNotification,
    dismissBackOnlineNotification,
  };
}

export type UseNetworkStatusReturn = ReturnType<typeof useNetworkStatus>;
