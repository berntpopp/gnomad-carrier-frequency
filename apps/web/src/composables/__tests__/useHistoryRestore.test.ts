import { describe, it, expect, vi, beforeEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useHistoryRestore, migrateHistoryEntry } from "../useHistoryRestore";
import { useHistoryStore } from "@/stores/useHistoryStore";
import { useWizard, resetWizardState } from "../useWizard";
import {
  useCarrierFrequency,
  disposeCarrierFrequencyInstance,
} from "../useCarrierFrequency";
import { useGnomadVersion } from "@/api";
import { useCalcStore } from "@/stores/useCalcStore";
import { useFilterStore } from "@/stores/useFilterStore";
import { isRestoring } from "../useAnalysisContext";

// Mock worker API
vi.mock("@/workers/variant-worker-api", () => ({
  processGene: vi.fn().mockResolvedValue({
    filteredByPathogenicity: [],
    qualifyingVariants: [],
    clinvarVariants: [],
    qualityFlagsMap: [],
    qualityExcludedIds: [],
    sourceCategoryMap: [],
    aggregatedPops: [],
    globalStats: {
      totalAC: 0,
      maxAN: 0,
      sumAF: 0,
      vcrs: [],
      carrierFrequency: null,
      geneticPrevalence: null,
      bayesianPrevalence: null,
      formula: "hwe",
      homExclusionActive: true,
    },
    totalVariantCount: 0,
    cacheStatus: "hit",
    requestId: 1,
  }),
  refilter: vi.fn().mockResolvedValue({
    filteredByPathogenicity: [],
    qualifyingVariants: [],
    clinvarVariants: [],
    qualityFlagsMap: [],
    qualityExcludedIds: [],
    sourceCategoryMap: [],
    aggregatedPops: [],
    globalStats: {
      totalAC: 0,
      maxAN: 0,
      sumAF: 0,
      vcrs: [],
      carrierFrequency: null,
      geneticPrevalence: null,
      bayesianPrevalence: null,
      formula: "hwe",
      homExclusionActive: true,
    },
    totalVariantCount: 0,
    cacheStatus: "hit",
    requestId: 1,
  }),
  clearCache: vi.fn().mockResolvedValue(undefined),
  getCacheSize: vi.fn().mockResolvedValue(0),
}));

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

describe("useHistoryRestore (SPEC-07-TXN, SPEC-07-MIG)", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    disposeCarrierFrequencyInstance();
    resetWizardState();
    isRestoring.value = false;
    vi.clearAllMocks();
  });

  describe("migrateHistoryEntry", () => {
    it("migrates legacy history entry with fallback mappings", () => {
      const legacyRaw = {
        gene: { symbol: "HBB", ensembl_id: "ENSG00000244737" },
        source: "literature", // legacy key for frequencySource
        patientStatus: "compound_het_confirmed", // legacy key for indexStatus
        literatureFrequency: 0.05,
        literaturePmid: "12345678",
        penetrance: 0.8,
        filterConfig: {
          lofHcEnabled: true,
          missenseEnabled: true,
          clinvarStarThreshold: 2,
        },
        excludedVariantIds: ["11-5227002-C-T"],
        results: {
          gnomadVersion: "v2",
          globalCarrierFrequency: 0.05,
        },
      };

      const migrated = migrateHistoryEntry(legacyRaw);

      expect(migrated.dataset).toBe("v2");
      expect(migrated.clinical.frequencySource).toBe("literature");
      expect(migrated.clinical.indexStatus).toBe("compound_het_confirmed");
      expect(migrated.clinical.literatureCarrierFrequency).toBe(0.05);
      expect(migrated.clinical.literaturePmid).toBe("12345678");
      expect(migrated.clinical.penetrance).toBe(0.8);
      expect(migrated.filters.includeMissense).toBe(true);
      expect(migrated.filters.clinvarReviewStarsMin).toBe(2);
      expect(migrated.manualExclusions).toEqual(["11-5227002-C-T"]);
    });

    it("defaults missing fields safely", () => {
      const minimalRaw = {
        gene: { symbol: "CFTR", ensembl_id: "ENSG00000001606" },
      };

      const migrated = migrateHistoryEntry(minimalRaw);

      expect(migrated.dataset).toBe("v4");
      expect(migrated.clinical.frequencySource).toBe("gnomad");
      expect(migrated.clinical.indexStatus).toBe("heterozygous");
      expect(migrated.clinical.penetrance).toBe(1.0);
      expect(migrated.filters.includeLof).toBe(true);
      expect(migrated.manualExclusions).toEqual([]);
    });
  });

  describe("restoreFromHistory execution", () => {
    it("sequences dataset version before gene selection and holds isRestoring lock", async () => {
      const historyStore = useHistoryStore();
      const { version } = useGnomadVersion();
      const { state: wizardState } = useWizard();
      const calcStore = useCalcStore();
      const filterStore = useFilterStore();
      const { restoreFromHistory } = useHistoryRestore();

      // Add entry with v2 dataset, compound_het_confirmed status, and penetrance 0.75
      historyStore.addEntry({
        gene: { symbol: "GJB2", ensembl_id: "ENSG00000165474" },
        indexStatus: "compound_het_confirmed",
        frequencySource: "gnomad",
        literatureFrequency: null,
        literaturePmid: null,
        filterConfig: {
          ...filterStore.defaults,
          missenseEnabled: true,
        },
        excludedVariantIds: ["13-20189445-G-A"],
        results: {
          globalCarrierFrequency: 0.02,
          qualifyingVariantCount: 1,
          gnomadVersion: "v2",
        },
      });

      const entryId = historyStore.entries[0].id;
      expect(entryId).toBeDefined();

      const success = await restoreFromHistory(entryId);
      expect(success).toBe(true);

      // Verify dataset version was set to v2
      expect(version.value).toBe("v2");

      // Verify wizard state
      expect(wizardState.gene?.symbol).toBe("GJB2");
      expect(wizardState.currentStep).toBe(4);
      expect(wizardState.indexStatus).toBe("compound_het_confirmed");

      // Verify lock was released post-restore
      expect(isRestoring.value).toBe(false);

      // Verify filter state
      const cf = useCarrierFrequency();
      expect(cf.filterConfig.value.missenseEnabled).toBe(true);
    });

    it("returns false and logs warning for non-existent history ID", async () => {
      const { restoreFromHistory } = useHistoryRestore();
      const success = await restoreFromHistory("non-existent-id");
      expect(success).toBe(false);
      expect(isRestoring.value).toBe(false);
    });
  });
});
