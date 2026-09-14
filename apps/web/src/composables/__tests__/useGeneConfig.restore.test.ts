import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { nextTick } from "vue";
import { useGeneConfig, resetGeneConfigState } from "../useGeneConfig";
import { useGeneSearch } from "../useGeneSearch";
import { isRestoring, activeContextRevision } from "../useAnalysisContext";
import { useFilterStore } from "@/stores/useFilterStore";
import { useCalcStore } from "@/stores/useCalcStore";
import type { GeneConfig } from "@gnomad-cf/core/gene-config";

// Mock loadGeneConfig
const mockLoadGeneConfig = vi.fn();
vi.mock("@gnomad-cf/core/gene-config", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@gnomad-cf/core/gene-config")>();
  return {
    ...actual,
    loadGeneConfig: (...args: unknown[]) => mockLoadGeneConfig(...args),
  };
});

// Mock villus / graphql client for useGeneSearch
vi.mock("villus", async (importOriginal) => {
  const actual = await importOriginal<typeof import("villus")>();
  return {
    ...actual,
    useQuery: () => ({
      data: { value: null },
      isFetching: { value: false },
      error: { value: null },
      execute: vi.fn(),
    }),
  };
});

const mockCftrConfig: GeneConfig = {
  geneSymbol: "CFTR",
  geneId: "ENSG00000001606",
  hgncId: "HGNC:1884",
  conditionName: "Cystic Fibrosis",
  profiles: [
    {
      profileId: "classic_cf",
      name: "Classic Cystic Fibrosis",
      isDefault: true,
      filterOverrides: {
        lofHcEnabled: true,
        missenseEnabled: false,
        clinvarEnabled: true,
        clinvarStarThreshold: 2,
      },
      penetrance: 1.0,
    },
    {
      profileId: "cftr_rd",
      name: "CFTR-related Disorder",
      isDefault: false,
      filterOverrides: {
        lofHcEnabled: true,
        missenseEnabled: true,
        clinvarEnabled: true,
        clinvarStarThreshold: 1,
      },
      penetrance: 0.5,
    },
  ],
};

describe("useGeneConfig Restore & Atomic Token Guard (SPEC-07-TXN, NEW-03)", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    isRestoring.value = false;
    activeContextRevision.value = 1;
    resetGeneConfigState();
    const { clearSelection } = useGeneSearch();
    clearSelection();
    vi.clearAllMocks();
  });

  afterEach(() => {
    resetGeneConfigState();
    const { clearSelection } = useGeneSearch();
    clearSelection();
  });

  it("preserves restored settings when a restore-started load completes post-unlock", async () => {
    let resolveConfig: (cfg: GeneConfig | null) => void = () => {};
    const configPromise = new Promise<GeneConfig | null>((resolve) => {
      resolveConfig = resolve;
    });
    mockLoadGeneConfig.mockReturnValue(configPromise);

    const filterStore = useFilterStore();
    const { selectGene } = useGeneSearch();
    const geneConfig = useGeneConfig();

    // 1. Enter restore transaction
    isRestoring.value = true;

    // 2. Restored custom settings applied to store
    filterStore.setDefaults({
      lofHcEnabled: false,
      missenseEnabled: true,
      clinvarStarThreshold: 3,
    });

    // 3. Gene selected during restore
    selectGene({
      symbol: "CFTR",
      name: "cystic fibrosis transmembrane conductance regulator",
      ensembl_id: "ENSG00000001606",
    });
    await nextTick();

    // Load was initiated while isRestoring was true
    expect(mockLoadGeneConfig).toHaveBeenCalledWith("CFTR");

    // 4. Restore completes and unlocks mutex
    isRestoring.value = false;

    // 5. Config resolves post-unlock
    resolveConfig(mockCftrConfig);
    await nextTick();
    await nextTick();

    // Verify: metadata is populated for display, but default profile is NOT applied
    expect(geneConfig.activeGeneConfig.value?.geneSymbol).toBe("CFTR");
    expect(geneConfig.activeProfile.value).toBeNull();

    // Restored custom store settings MUST be strictly preserved (not overwritten by profile defaults)
    expect(filterStore.defaults.missenseEnabled).toBe(true);
    expect(filterStore.defaults.lofHcEnabled).toBe(false);
    expect(filterStore.defaults.clinvarStarThreshold).toBe(3);
  });

  it("discards superseded same-symbol loads without mutating state", async () => {
    let resolveFirst: (cfg: GeneConfig | null) => void = () => {};
    const firstPromise = new Promise<GeneConfig | null>((resolve) => {
      resolveFirst = resolve;
    });

    const secondPromise = Promise.resolve(mockCftrConfig);

    mockLoadGeneConfig
      .mockImplementationOnce(() => firstPromise)
      .mockImplementationOnce(() => secondPromise);

    const { selectGene } = useGeneSearch();
    useGeneConfig();

    // First selection
    selectGene({
      symbol: "CFTR",
      name: "CFTR",
      ensembl_id: "ENSG00000001606",
    });
    await nextTick();

    // Rapid re-selection of same symbol creates second token
    selectGene({
      symbol: "CFTR",
      name: "CFTR",
      ensembl_id: "ENSG00000001606",
    });
    await nextTick();

    // Resolve first (superseded) load with dummy different config
    const staleConfig: GeneConfig = {
      ...mockCftrConfig,
      conditionName: "Stale Condition",
    };
    resolveFirst(staleConfig);
    await nextTick();
    await nextTick();

    // The second load result should be authoritative
    const geneConfig = useGeneConfig();
    expect(geneConfig.activeGeneConfig.value?.conditionName).toBe(
      "Cystic Fibrosis",
    );
  });

  it("clears previous profile when switching to an unconfigured gene without resetting restored stores", async () => {
    mockLoadGeneConfig.mockResolvedValueOnce(mockCftrConfig);

    const { selectGene } = useGeneSearch();
    const geneConfig = useGeneConfig();
    const filterStore = useFilterStore();

    // 1. Normal selection of CFTR loads config and profile
    selectGene({
      symbol: "CFTR",
      name: "CFTR",
      ensembl_id: "ENSG00000001606",
    });
    await nextTick();
    await nextTick();

    expect(geneConfig.activeProfile.value?.profileId).toBe("classic_cf");

    // 2. Begin restore of unconfigured gene TTN with specific settings
    isRestoring.value = true;
    filterStore.setDefaults({
      lofHcEnabled: true,
      missenseEnabled: true,
      clinvarStarThreshold: 0,
    });

    mockLoadGeneConfig.mockResolvedValueOnce(null); // TTN has no config

    selectGene({
      symbol: "TTN",
      name: "titin",
      ensembl_id: "ENSG00000155657",
    });
    await nextTick();
    await nextTick();

    // CFTR profile must be cleared
    expect(geneConfig.activeGeneConfig.value).toBeNull();
    expect(geneConfig.activeProfile.value).toBeNull();
    expect(geneConfig.configLoaded.value).toBe(false);

    // Restored settings must NOT be reset to factory defaults
    expect(filterStore.defaults.missenseEnabled).toBe(true);
    expect(filterStore.defaults.clinvarStarThreshold).toBe(0);
  });

  it("updates filter and calc stores and increments activeContextRevision when selecting profile", async () => {
    mockLoadGeneConfig.mockResolvedValue(mockCftrConfig);

    const { selectGene } = useGeneSearch();
    const geneConfig = useGeneConfig();
    const filterStore = useFilterStore();
    const calcStore = useCalcStore();

    selectGene({
      symbol: "CFTR",
      name: "CFTR",
      ensembl_id: "ENSG00000001606",
    });
    await nextTick();
    await nextTick();

    expect(geneConfig.activeProfile.value?.profileId).toBe("classic_cf");
    const startRevision = activeContextRevision.value;

    // Switch profile to CFTR-RD
    geneConfig.selectProfile("cftr_rd");

    expect(geneConfig.activeProfile.value?.profileId).toBe("cftr_rd");
    expect(filterStore.defaults.missenseEnabled).toBe(true);
    expect(calcStore.defaults.penetrance).toBe(0.5);
    expect(activeContextRevision.value).toBeGreaterThan(startRevision);
  });
});
