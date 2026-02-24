// Mock for virtual:pwa-register — this Vite plugin virtual module
// does not exist in the test environment (vitest/happy-dom).
// The mock provides a no-op registerSW so usePwaUpdate.ts can be imported.

export function registerSW(_options?: {
  immediate?: boolean
  onNeedRefresh?: () => void
  onOfflineReady?: () => void
  onRegistered?: (registration: ServiceWorkerRegistration | undefined) => void
  onRegisterError?: (error: unknown) => void
}): (reloadPage?: boolean) => Promise<void> {
  return async (_reloadPage?: boolean) => {
    // no-op in test environment
  }
}
