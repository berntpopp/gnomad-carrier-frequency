import { ref, onMounted, onUnmounted, computed } from 'vue';

/**
 * Composable for managing PWA installation.
 * Handles the beforeinstallprompt event and provides installation state.
 */
export function usePwaInstall() {
  const deferredPrompt = ref<BeforeInstallPromptEvent | null>(null);
  const isInstalled = ref(false);

  // Check if already installed via display mode
  const checkIfInstalled = (): boolean => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(display-mode: standalone)').matches;
  };

  // Detect iOS devices
  const isIos = computed((): boolean => {
    if (typeof navigator === 'undefined') return false;
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !('MSStream' in window);
  });

  // Can install if we have a deferred prompt and not already installed
  const canInstall = computed((): boolean => {
    return deferredPrompt.value !== null && !isInstalled.value;
  });

  // Handle beforeinstallprompt event
  const handleBeforeInstallPrompt = (event: BeforeInstallPromptEvent): void => {
    // Prevent the mini-infobar from appearing on mobile
    event.preventDefault();
    // Store the event for later use
    deferredPrompt.value = event;
  };

  // Handle appinstalled event
  const handleAppInstalled = (): void => {
    isInstalled.value = true;
    deferredPrompt.value = null;
  };

  // Prompt the user to install the app
  const promptInstall = async (): Promise<boolean> => {
    if (!deferredPrompt.value) {
      return false;
    }

    // Show the install prompt
    await deferredPrompt.value.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.value.userChoice;

    // Clear the deferred prompt regardless of outcome
    deferredPrompt.value = null;

    return outcome === 'accepted';
  };

  onMounted(() => {
    // Check if already installed
    isInstalled.value = checkIfInstalled();

    // Listen for the beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for the appinstalled event
    window.addEventListener('appinstalled', handleAppInstalled);

    // Listen for display mode changes (e.g., user installs via browser menu)
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = (event: MediaQueryListEvent) => {
      if (event.matches) {
        isInstalled.value = true;
        deferredPrompt.value = null;
      }
    };
    mediaQuery.addEventListener('change', handleDisplayModeChange);
  });

  onUnmounted(() => {
    window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.removeEventListener('appinstalled', handleAppInstalled);
  });

  return {
    canInstall,
    isInstalled,
    isIos,
    promptInstall,
  };
}

export type UsePwaInstallReturn = ReturnType<typeof usePwaInstall>;
