import { ref } from 'vue';
import { registerSW } from 'virtual:pwa-register';

/**
 * Composable for managing PWA service worker updates.
 *
 * Handles the lifecycle of service worker updates:
 * - Detects when a new version is available (needRefresh)
 * - Detects when app is ready for offline use (offlineReady)
 * - Provides updateApp() to activate the waiting service worker
 * - Provides dismissUpdate() to decline the update (user can update later)
 *
 * Per CONTEXT.md: "On app version update: clear app shell cache but preserve gene data cache"
 * This is handled by Workbox's cleanupOutdatedCaches which only clears the precache,
 * not runtime caches like gnomad-api-cache.
 */

export interface UsePwaUpdateReturn {
  /** True when a new app version is available and waiting to be activated */
  needRefresh: ReturnType<typeof ref<boolean>>;
  /** True when app has been cached and is ready for offline use (first install) */
  offlineReady: ReturnType<typeof ref<boolean>>;
  /** Activate the waiting service worker to update to the new version */
  updateApp: () => Promise<void>;
  /** Dismiss the update notification (user can update later via browser) */
  dismissUpdate: () => void;
}

export function usePwaUpdate(): UsePwaUpdateReturn {
  const needRefresh = ref(false);
  const offlineReady = ref(false);

  // Store the updateSW function reference from registerSW
  let updateSW: ((reloadPage?: boolean) => Promise<void>) | undefined;

  // Register service worker with callbacks
  updateSW = registerSW({
    onNeedRefresh() {
      needRefresh.value = true;
    },
    onOfflineReady() {
      offlineReady.value = true;
    },
    onRegisteredSW(swUrl, registration) {
      // Service worker registered successfully
      // The swUrl and registration are available if needed for debugging
      console.debug('[PWA] Service worker registered:', swUrl);

      // Check for updates periodically (every hour)
      if (registration) {
        setInterval(
          () => {
            registration.update();
          },
          60 * 60 * 1000
        );
      }
    },
    onRegisterError(error) {
      console.error('[PWA] Service worker registration failed:', error);
    },
  });

  /**
   * Activate the waiting service worker to update to the new version.
   * This will reload the page to apply the update.
   */
  async function updateApp(): Promise<void> {
    if (updateSW) {
      await updateSW(true); // true = reload page after activation
    }
  }

  /**
   * Dismiss the update notification.
   * User can still update later via browser mechanisms.
   */
  function dismissUpdate(): void {
    needRefresh.value = false;
  }

  return {
    needRefresh,
    offlineReady,
    updateApp,
    dismissUpdate,
  };
}
