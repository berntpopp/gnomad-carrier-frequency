import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { nextTick } from "vue";
import {
  useCarrierFrequency,
  disposeCarrierFrequencyInstance,
} from "../useCarrierFrequency";
import { activeContextRevision, isRestoring } from "../useAnalysisContext";
import type { WorkerResult } from "@/workers/types";

// Mock worker API
const mockProcessGene = vi.fn();
const mockRefilter = vi.fn();

vi.mock("@/workers/variant-worker-api", () => ({
  processGene: (...args: unknown[]) => mockProcessGene(...args),
  refilter: (...args: unknown[]) => mockRefilter(...args),
  clearCache: vi.fn().mockResolvedValue(undefined),
  getCacheSize: vi.fn().mockResolvedValue(0),
}));

// Mock config
vi.mock("@gnomad-cf/core/config", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@gnomad-cf/core/config")>();
  return {
    ...actual,
    config: {
      ...actual.config,
      settings: {
        ...actual.config.settings,
        defaultCarrierFrequency: 0.01,
      },
    },
    getDatasetId: () => "gnomad_r4",
    getReferenceGenome: () => "GRCh38",
    getApiEndpoint: () => "https://gnomad.broadinstitute.org/api",
  };
});

const dummyVariant = {
  variant_id: "1-12345-A-T",
  pos: 12345,
  ref: "A",
  alt: "T",
  transcript_consequence: {
    consequence_terms: ["stop_gained"],
    gene_id: "ENSG00000001",
    gene_symbol: "CFTR",
    transcript_id: "ENST00000001",
    hgvsc: "c.1A>T",
    hgvsp: "p.Met1?",
    is_canonical: true,
    is_mane_select: true,
    lof: "HC",
  },
};

function createFakeWorkerResult(cf: number, requestId = 1): WorkerResult {
  return {
    filteredByPathogenicity: [dummyVariant as any],
    qualifyingVariants: [dummyVariant as any],
    clinvarVariants: [],
    qualityFlagsMap: [],
    qualityExcludedIds: [],
    sourceCategoryMap: [],
    aggregatedPops: [],
    globalStats: {
      totalAC: 10,
      maxAN: 1000,
      sumAF: 0.01,
      vcrs: [0.01],
      carrierFrequency: cf,
      geneticPrevalence: 0.0001,
      bayesianPrevalence: 0.0001,
      formula: "hwe",
      homExclusionActive: true,
    },
    totalVariantCount: 1,
    cacheStatus: "hit",
    requestId,
  };
}

describe("useCarrierFrequency Concurrency & Monotonic Revision Machine", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    disposeCarrierFrequencyInstance();
    activeContextRevision.value = 1;
    isRestoring.value = false;
    vi.clearAllMocks();
  });

  afterEach(() => {
    disposeCarrierFrequencyInstance();
  });

  it("rapid filter toggles increment activeContextRevision", async () => {
    const cf = useCarrierFrequency();
    const startRevision = activeContextRevision.value;

    cf.setFilterConfig({
      ...cf.filterConfig.value,
      includeMissense: true,
    });
    expect(activeContextRevision.value).toBeGreaterThan(startRevision);

    const rev2 = activeContextRevision.value;
    cf.setFilterConfig({
      ...cf.filterConfig.value,
      includeClinvarPathogenic: false,
    });
    expect(activeContextRevision.value).toBeGreaterThan(rev2);
  });

  it("discards intermediate worker results from stale revisions", async () => {
    let resolveFirstWorker: (result: WorkerResult) => void = () => {};
    const firstWorkerPromise = new Promise<WorkerResult>((resolve) => {
      resolveFirstWorker = resolve;
    });

    let resolveSecondWorker: (result: WorkerResult) => void = () => {};
    const secondWorkerPromise = new Promise<WorkerResult>((resolve) => {
      resolveSecondWorker = resolve;
    });

    mockProcessGene
      .mockImplementationOnce(() => firstWorkerPromise)
      .mockImplementationOnce(() => secondWorkerPromise);

    const cf = useCarrierFrequency();
    cf.setGeneSymbol("CFTR");
    await nextTick();

    // First call to processGene started
    expect(mockProcessGene).toHaveBeenCalledTimes(1);
    expect(cf.isCalculating.value).toBe(true);

    // Toggle filter while first worker call is in flight -> revision increments
    cf.setFilterConfig({
      ...cf.filterConfig.value,
      includeMissense: true,
    });
    await nextTick();

    // Resolve first worker with stale carrierFrequency = 0.02
    resolveFirstWorker(createFakeWorkerResult(0.02));
    await nextTick();
    await nextTick();

    // Result 0.02 should NOT be committed because revision was superseded
    expect(cf.result.value?.globalCarrierFrequency).not.toBe(0.02);

    // Coalesced successor should have been dispatched
    expect(mockProcessGene).toHaveBeenCalledTimes(2);

    // Resolve second worker with fresh carrierFrequency = 0.04
    resolveSecondWorker(createFakeWorkerResult(0.04));
    await nextTick();
    await nextTick();

    // Fresh result MUST be committed
    expect(cf.result.value?.globalCarrierFrequency).toBe(0.04);
    expect(cf.isCalculating.value).toBe(false);
  });

  it("clears execution ownership in finally block before triggering follow-up", async () => {
    let resolveWorker: (result: WorkerResult) => void = () => {};
    const workerPromise = new Promise<WorkerResult>((resolve) => {
      resolveWorker = resolve;
    });

    mockProcessGene.mockImplementationOnce(() => workerPromise);

    const cf = useCarrierFrequency();
    cf.setGeneSymbol("CFTR");
    await nextTick();

    expect(cf.isCalculating.value).toBe(true);

    // Trigger revision change while in flight
    cf.setFilterConfig({
      ...cf.filterConfig.value,
      includeMissense: true,
    });
    await nextTick();

    // Mock next call to check that isCalculating transitions
    mockProcessGene.mockImplementationOnce(() =>
      Promise.resolve(createFakeWorkerResult(0.05)),
    );

    resolveWorker(createFakeWorkerResult(0.01));
    await nextTick();
    await nextTick();

    expect(mockProcessGene).toHaveBeenCalledTimes(2);
    expect(cf.result.value?.globalCarrierFrequency).toBe(0.05);
    expect(cf.isCalculating.value).toBe(false);
  });

  it("executes a single coalesced successor when multiple edits occur while in flight", async () => {
    let resolveWorker: (result: WorkerResult) => void = () => {};
    const workerPromise = new Promise<WorkerResult>((resolve) => {
      resolveWorker = resolve;
    });

    mockProcessGene.mockImplementationOnce(() => workerPromise);

    const cf = useCarrierFrequency();
    cf.setGeneSymbol("CFTR");
    await nextTick();

    expect(mockProcessGene).toHaveBeenCalledTimes(1);

    // Multiple rapid edits while in flight
    cf.setFilterConfig({ ...cf.filterConfig.value, clinvarStarThreshold: 2 });
    cf.setFilterConfig({ ...cf.filterConfig.value, clinvarStarThreshold: 3 });
    cf.setFilterConfig({ ...cf.filterConfig.value, includeMissense: true });
    await nextTick();

    mockProcessGene.mockImplementationOnce(() =>
      Promise.resolve(createFakeWorkerResult(0.08)),
    );

    resolveWorker(createFakeWorkerResult(0.01));
    await nextTick();
    await nextTick();

    // Exactly 2 total calls: the original (stale) + exactly 1 coalesced successor
    expect(mockProcessGene).toHaveBeenCalledTimes(2);
    expect(cf.result.value?.globalCarrierFrequency).toBe(0.08);
  });

  it("discards result and executes new gene when gene symbol switches while in flight", async () => {
    let resolveCftr: (result: WorkerResult) => void = () => {};
    const cftrPromise = new Promise<WorkerResult>((resolve) => {
      resolveCftr = resolve;
    });

    mockProcessGene.mockImplementationOnce(() => cftrPromise);

    const cf = useCarrierFrequency();
    cf.setGeneSymbol("CFTR");
    await nextTick();

    expect(cf.isCalculating.value).toBe(true);

    // Switch gene while CFTR is in flight
    cf.setGeneSymbol("TTN");
    await nextTick();

    // Mock TTN fetch
    mockProcessGene.mockImplementationOnce(() =>
      Promise.resolve(createFakeWorkerResult(0.12)),
    );

    // Resolve stale CFTR
    resolveCftr(createFakeWorkerResult(0.01));
    await nextTick();
    await nextTick();

    // TTN should have run and committed
    expect(cf.result.value?.gene).toBe("TTN");
    expect(cf.result.value?.globalCarrierFrequency).toBe(0.12);
    expect(cf.isCalculating.value).toBe(false);
  });
});
