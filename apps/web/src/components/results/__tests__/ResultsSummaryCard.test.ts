import { describe, it, expect } from "vitest";
import { mountWithPlugins } from "@/test/helpers";
import ResultsSummaryCard from "../ResultsSummaryCard.vue";
import type { CarrierFrequencyResult } from "@gnomad-cf/core/types";

// Stub OrphanetSection
const stubComponents = {
  OrphanetSection: { template: '<div data-testid="orphanet-stub" />' },
};

const mockResult: CarrierFrequencyResult = {
  gene: "CFTR",
  version: "v4",
  globalCarrierFrequency: 0.04,
  globalAlleleCount: 10,
  globalAlleleNumber: 250,
  populations: [],
  qualifyingVariantCount: 3,
  minFrequency: 0.01,
  maxFrequency: 0.08,
  hasFounderEffect: false,
  geneticPrevalence: 0.0016,
  bayesianPrevalence: 0.0016,
  formula: "hwe",
  homExclusionActive: false,
};

describe("ResultsSummaryCard", () => {
  it("renders gene name, transcript, and hero frequency", () => {
    const wrapper = mountWithPlugins(ResultsSummaryCard, {
      props: {
        result: mockResult,
        canonicalTranscript: "ENST00000003084",
        effectiveFrequency: 0.04,
        indexStatus: "heterozygous",
        penetrance: 1.0,
        useHWEFormula: true,
        sourceAttribution: "gnomAD v4",
        sourceChipColor: "info",
        cacheStatus: "hit",
        processingStatus: null,
        isLoading: false,
        qualifyingVariantCount: 3,
        excludedCount: 0,
        flaggedVariantCount: 0,
        currentFormat: "percent",
        formatFrequency: (f: number | null) =>
          f !== null ? `${(f * 100).toFixed(2)}%` : "-",
        orphanetLoading: false,
        orphanetDiseases: [],
        primaryDisease: null,
        additionalDiseases: [],
      },
      global: { stubs: stubComponents },
    });

    expect(wrapper.find('[data-testid="results-summary-card"]').exists()).toBe(
      true,
    );
    expect(wrapper.text()).toContain("CFTR");
    expect(wrapper.text()).toContain("ENST00000003084");
    expect(wrapper.text()).toContain("4.00%");
    expect(wrapper.text()).toContain("gnomAD v4");
  });

  it("calculates recurrence risk for heterozygous carrier correctly (CF * 0.25)", () => {
    const wrapper = mountWithPlugins(ResultsSummaryCard, {
      props: {
        result: mockResult,
        canonicalTranscript: null,
        effectiveFrequency: 0.04,
        indexStatus: "heterozygous",
        penetrance: 1.0,
        useHWEFormula: true,
        sourceAttribution: "gnomAD v4",
        sourceChipColor: "info",
        cacheStatus: "idle",
        processingStatus: null,
        isLoading: false,
        qualifyingVariantCount: 3,
        excludedCount: 0,
        flaggedVariantCount: 0,
        currentFormat: "percent",
        formatFrequency: (f: number | null) =>
          f !== null ? `${(f * 100).toFixed(2)}%` : "-",
        orphanetLoading: false,
        orphanetDiseases: [],
        primaryDisease: null,
        additionalDiseases: [],
      },
      global: { stubs: stubComponents },
    });

    // 0.04 * 0.25 = 0.01 = 1:100 (1.00%)
    expect(wrapper.text()).toContain("1:100");
    expect(wrapper.text()).toContain("1.00%");
  });

  it("calculates recurrence risk for homozygous patient correctly (CF * 0.5)", () => {
    const wrapper = mountWithPlugins(ResultsSummaryCard, {
      props: {
        result: mockResult,
        canonicalTranscript: null,
        effectiveFrequency: 0.04,
        indexStatus: "homozygous",
        penetrance: 1.0,
        useHWEFormula: true,
        sourceAttribution: "gnomAD v4",
        sourceChipColor: "info",
        cacheStatus: "idle",
        processingStatus: null,
        isLoading: false,
        qualifyingVariantCount: 3,
        excludedCount: 0,
        flaggedVariantCount: 0,
        currentFormat: "percent",
        formatFrequency: (f: number | null) =>
          f !== null ? `${(f * 100).toFixed(2)}%` : "-",
        orphanetLoading: false,
        orphanetDiseases: [],
        primaryDisease: null,
        additionalDiseases: [],
      },
      global: { stubs: stubComponents },
    });

    // 0.04 * 0.5 = 0.02 = 1:50 (2.00%)
    expect(wrapper.text()).toContain("1:50");
    expect(wrapper.text()).toContain("2.00%");
  });

  it("emits refetch on refresh button click", async () => {
    const wrapper = mountWithPlugins(ResultsSummaryCard, {
      props: {
        result: mockResult,
        canonicalTranscript: null,
        effectiveFrequency: 0.04,
        indexStatus: "heterozygous",
        penetrance: 1.0,
        useHWEFormula: true,
        sourceAttribution: "gnomAD v4",
        sourceChipColor: "info",
        cacheStatus: "idle",
        processingStatus: null,
        isLoading: false,
        qualifyingVariantCount: 3,
        excludedCount: 0,
        flaggedVariantCount: 0,
        currentFormat: "percent",
        formatFrequency: (f: number | null) => `${f}`,
        orphanetLoading: false,
        orphanetDiseases: [],
        primaryDisease: null,
        additionalDiseases: [],
      },
      global: { stubs: stubComponents },
    });

    const refreshBtn = wrapper.find('[data-testid="refetch-btn"]');
    await refreshBtn.trigger("click");
    expect(wrapper.emitted("refetch")).toBeTruthy();
  });
});
