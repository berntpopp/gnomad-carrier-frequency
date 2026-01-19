// Version-aware GraphQL client for gnomAD API

import { createClient } from 'villus';
import { ref, computed } from 'vue';
import {
  getApiEndpoint,
  getGnomadVersion,
  type GnomadVersion,
} from '@/config';
import { useLogStore } from '@/stores/useLogStore';

// Current version state (reactive)
const currentVersion = ref<GnomadVersion>(getGnomadVersion().version);

/**
 * Module-level logging helper for API operations
 * Uses try/catch since store may not be initialized during app startup
 */
function logApi(
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR',
  message: string,
  details?: unknown
) {
  try {
    const store = useLogStore();
    store.log(level, 'api', message, details);
  } catch {
    // Store not yet initialized, skip logging
  }
}

/**
 * Create a villus GraphQL client for a specific gnomAD version
 * Uses API endpoint from config
 *
 * Note: All gnomAD versions use the same endpoint, but dataset differs in queries.
 * This structure allows for future API endpoint changes per version.
 */
export function createGnomadClient(version?: GnomadVersion) {
  const v = version ?? currentVersion.value;
  const endpoint = getApiEndpoint(v);

  logApi('DEBUG', 'Creating GraphQL client', { version: v, endpoint });

  return createClient({
    url: endpoint,
  });
}

/**
 * Composable for accessing and changing the current gnomAD version
 * Provides reactive version state and version-specific config
 */
export function useGnomadVersion() {
  const version = computed(() => currentVersion.value);
  const versionConfig = computed(() => getGnomadVersion(currentVersion.value));

  const setVersion = (v: GnomadVersion) => {
    const oldVersion = currentVersion.value;
    currentVersion.value = v;
    logApi('INFO', 'gnomAD version changed', { from: oldVersion, to: v });
  };

  return {
    version,
    versionConfig,
    setVersion,
  };
}

// Default client for app-wide use
export const graphqlClient = createGnomadClient();
