import { ref, computed } from 'vue';
import type { Ref } from 'vue';
import { watch } from 'vue';
import { loadGeneConfig } from '@gnomad-cf/core/gene-config';
import type { GeneConfig, ConditionProfile } from '@gnomad-cf/core/gene-config';
import { useGeneSearch } from './useGeneSearch';
import { useFilterStore } from '@/stores/useFilterStore';
import { useCalcStore } from '@/stores/useCalcStore';

// Module-level state — singleton pattern, matches useGeneSearch.
// Active config is intentionally NOT persisted: it should re-apply from the
// registered seed configs on each session when a gene is selected.
const activeGeneConfig: Ref<GeneConfig | null> = ref(null);
const activeProfile: Ref<ConditionProfile | null> = ref(null);
const configLoaded: Ref<boolean> = ref(false);
const configLoading: Ref<boolean> = ref(false);

export interface UseGeneConfigReturn {
  activeGeneConfig: Ref<GeneConfig | null>;
  activeProfile: Ref<ConditionProfile | null>;
  configLoaded: Ref<boolean>;
  configLoading: Ref<boolean>;
  availableProfiles: Ref<ConditionProfile[]>;
  selectProfile: (profileId: string) => void;
  resetConfig: () => void;
}

export function useGeneConfig(): UseGeneConfigReturn {
  const { selectedGene } = useGeneSearch();
  const filterStore = useFilterStore();
  const calcStore = useCalcStore();

  /**
   * Apply a profile's overrides to the filter and calc stores.
   * Resets to factory defaults first, then applies the profile's overrides
   * for a clean slate on each profile switch.
   */
  function applyProfile(profile: ConditionProfile): void {
    // Always reset to factory defaults before applying profile overrides
    filterStore.resetToFactoryDefaults();
    calcStore.resetToFactoryDefaults();

    // Apply filter overrides (partial merge on top of factory defaults)
    if (profile.filterOverrides) {
      filterStore.setDefaults(profile.filterOverrides);
    }

    // Apply penetrance override
    if (profile.penetrance !== undefined) {
      calcStore.setPenetrance(profile.penetrance);
    }
  }

  // Watch selectedGene and load/apply gene config automatically
  watch(
    selectedGene,
    async (gene) => {
      // No gene selected — reset everything to factory defaults
      if (gene == null) {
        activeGeneConfig.value = null;
        activeProfile.value = null;
        configLoaded.value = false;
        configLoading.value = false;
        filterStore.resetToFactoryDefaults();
        calcStore.resetToFactoryDefaults();
        return;
      }

      configLoading.value = true;
      const config = await loadGeneConfig(gene.symbol);
      configLoading.value = false;

      // Gene has no config — reset to factory defaults to prevent state bleed
      if (config === null) {
        activeGeneConfig.value = null;
        activeProfile.value = null;
        configLoaded.value = false;
        filterStore.resetToFactoryDefaults();
        calcStore.resetToFactoryDefaults();
        return;
      }

      // Config found — set state and apply default profile
      activeGeneConfig.value = config;
      const defaultProfile = config.profiles.find((p) => p.isDefault)!;
      activeProfile.value = defaultProfile;
      configLoaded.value = true;

      applyProfile(defaultProfile);
    },
    { immediate: true },
  );

  /**
   * Switch to a different condition profile.
   * Resets stores to factory defaults, then applies the new profile's overrides.
   */
  function selectProfile(profileId: string): void {
    if (activeGeneConfig.value === null) return;

    const profile = activeGeneConfig.value.profiles.find((p) => p.profileId === profileId);
    if (!profile) return;

    activeProfile.value = profile;
    applyProfile(profile);
  }

  /**
   * Dismiss the gene config — reset all stores to factory defaults
   * and clear the reactive config state.
   */
  function resetConfig(): void {
    filterStore.resetToFactoryDefaults();
    calcStore.resetToFactoryDefaults();
    activeGeneConfig.value = null;
    activeProfile.value = null;
    configLoaded.value = false;
  }

  const availableProfiles = computed<ConditionProfile[]>(
    () => activeGeneConfig.value?.profiles ?? [],
  );

  return {
    activeGeneConfig,
    activeProfile,
    configLoaded,
    configLoading,
    availableProfiles,
    selectProfile,
    resetConfig,
  };
}
