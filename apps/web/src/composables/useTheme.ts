import { computed, watch } from 'vue';
import { useDark, useToggle } from '@vueuse/core';
import { useTheme } from 'vuetify';

/**
 * Composable for managing application theme (light/dark mode).
 * Uses VueUse useDark for persistence and system preference detection,
 * synced with Vuetify's theme system.
 */
export function useAppTheme() {
  const vuetifyTheme = useTheme();

  // VueUse handles localStorage persistence and system preference detection
  const isDark = useDark({
    storageKey: 'carrier-freq-theme',
    valueDark: 'dark',
    valueLight: 'light',
  });

  const toggleTheme = useToggle(isDark);

  // Sync VueUse dark state with Vuetify theme
  watch(
    isDark,
    (dark) => {
      vuetifyTheme.change(dark ? 'dark' : 'light');
    },
    { immediate: true }
  );

  // Computed properties for UI
  const tooltipText = computed(() =>
    isDark.value ? 'Switch to light mode' : 'Switch to dark mode'
  );

  const themeIcon = computed(() =>
    isDark.value ? 'mdi-weather-sunny' : 'mdi-weather-night'
  );

  return {
    isDark,
    toggleTheme,
    tooltipText,
    themeIcon,
  };
}

export type UseAppThemeReturn = ReturnType<typeof useAppTheme>;
