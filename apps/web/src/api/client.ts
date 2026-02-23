// Version-aware GraphQL client for gnomAD API

import { createClient } from 'villus';
import { ref, computed } from 'vue';
import {
  getApiEndpoint,
  getGnomadVersion,
  type GnomadVersion,
} from '@/config';

// Current version state (reactive)
const currentVersion = ref<GnomadVersion>(getGnomadVersion().version);

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
    currentVersion.value = v;
  };

  return {
    version,
    versionConfig,
    setVersion,
  };
}

// Default client for app-wide use
export const graphqlClient = createGnomadClient();
