// Mock for virtual:pwa-register — this Vite plugin virtual module
// does not exist in the test environment (vitest/happy-dom).
// The mock provides a no-op registerSW so usePwaUpdate.ts can be imported.

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function registerSW(_options?: {
  immediate?: boolean;
  onNeedRefresh?: () => void;
  onOfflineReady?: () => void;
  onRegistered?: (registration: ServiceWorkerRegistration | undefined) => void;
  onRegisterError?: (error: unknown) => void;
}): (reloadPage?: boolean) => Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return async (_reloadPage?: boolean) => {
    // no-op in test environment
  };
}
