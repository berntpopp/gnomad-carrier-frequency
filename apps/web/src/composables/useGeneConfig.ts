import { ref, computed } from "vue";
import type { Ref } from "vue";
import { watch } from "vue";
import { loadGeneConfig } from "@gnomad-cf/core/gene-config";
import type { GeneConfig, ConditionProfile } from "@gnomad-cf/core/gene-config";
import { useGeneSearch } from "./useGeneSearch";
import { useFilterStore } from "@/stores/useFilterStore";
import { useCalcStore } from "@/stores/useCalcStore";
import { isRestoring, incrementRevision } from "./useAnalysisContext";

// Module-level state — singleton pattern, matches useGeneSearch.
// Active config is intentionally NOT persisted: it should re-apply from the
// registered seed configs on each session when a gene is selected.
const activeGeneConfig: Ref<GeneConfig | null> = ref(null);
const activeProfile: Ref<ConditionProfile | null> = ref(null);
const configLoaded: Ref<boolean> = ref(false);
const configLoading: Ref<boolean> = ref(false);

let activeConfigToken: symbol = Symbol("configToken");

export function resetGeneConfigState(): void {
  activeGeneConfig.value = null;
  activeProfile.value = null;
  configLoaded.value = false;
  configLoading.value = false;
  activeConfigToken = Symbol("configToken");
}

export function invalidateActiveConfigToken(): void {
  activeConfigToken = Symbol("configToken");
}

// Guard to ensure the selectedGene watcher is only registered once,
// even when multiple components call useGeneConfig().
let watcherInitialized = false;

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

  // Watch selectedGene and load/apply gene config automatically.
  // Guard ensures only one watcher is registered across all callers.
  if (!watcherInitialized) {
    watcherInitialized = true;
    watch(
      selectedGene,
      async (gene) => {
        const wasStartedDuringRestore = isRestoring.value;
        const reqToken = Symbol("reqToken");
        activeConfigToken = reqToken;
        const targetSymbol = gene?.symbol ?? null;

        // No gene selected — reset everything to factory defaults
        if (targetSymbol == null) {
          if (activeConfigToken !== reqToken) return;
          activeGeneConfig.value = null;
          activeProfile.value = null;
          configLoaded.value = false;
          configLoading.value = false;
          if (!wasStartedDuringRestore && !isRestoring.value) {
            filterStore.resetToFactoryDefaults();
            calcStore.resetToFactoryDefaults();
          }
          return;
        }

        configLoading.value = true;
        const config = await loadGeneConfig(targetSymbol);

        // Atomic token & symbol guard: reject superseded tokens and mismatched targets BEFORE ANY MUTATION
        if (
          activeConfigToken !== reqToken ||
          selectedGene.value?.symbol !== targetSymbol
        ) {
          return;
        }

        configLoading.value = false;

        // Settlement branch during restore: populate metadata only, clear obsolete profiles on null, never mutate stores
        if (wasStartedDuringRestore || isRestoring.value) {
          if (config !== null) {
            activeGeneConfig.value = config;
            activeProfile.value = null; // Suppress default profile activation
            configLoaded.value = true;
          } else {
            // Unconfigured gene: clear obsolete previous gene profiles without resetting stores
            activeGeneConfig.value = null;
            activeProfile.value = null;
            configLoaded.value = false;
          }
          return;
        }

        // Normal navigation settlement branch:
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
        const defaultProfile =
          config.profiles.find((p) => p.isDefault) ??
          config.profiles[0] ??
          null;
        activeProfile.value = defaultProfile;
        configLoaded.value = true;

        if (defaultProfile) {
          applyProfile(defaultProfile);
        }
      },
      { immediate: true },
    );
  }

  /**
   * Switch to a different condition profile.
   * Resets stores to factory defaults, then applies the new profile's overrides.
   */
  function selectProfile(profileId: string): void {
    if (activeGeneConfig.value === null) return;

    const profile = activeGeneConfig.value.profiles.find(
      (p) => p.profileId === profileId,
    );
    if (!profile) return;

    activeProfile.value = profile;
    applyProfile(profile);
    incrementRevision();
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
    incrementRevision();
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
