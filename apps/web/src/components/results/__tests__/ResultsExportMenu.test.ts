import { describe, it, expect, vi, beforeEach } from "vitest";
import { mountWithPlugins } from "@/test/helpers";
import ResultsExportMenu from "../ResultsExportMenu.vue";
import type {
  CarrierFrequencyResult,
  FilterConfig,
  CalcConfig,
} from "@gnomad-cf/core/types";

const mockExportToJson = vi.fn();
const mockExportToExcel = vi.fn();
const mockExportPopulationsTsv = vi.fn();
const mockExportVariantsTsv = vi.fn();

vi.mock("@/composables/useExport", () => ({
  useExport: () => ({
    exportToJson: mockExportToJson,
    exportToExcel: mockExportToExcel,
    exportPopulationsTsv: mockExportPopulationsTsv,
    exportVariantsTsv: mockExportVariantsTsv,
  }),
}));

const mockResult: CarrierFrequencyResult = {
  gene: "CFTR",
  version: "v4",
  globalCarrierFrequency: 0.04,
  globalAlleleCount: 10,
  globalAlleleNumber: 250,
  populations: [],
  qualifyingVariantCount: 1,
  minFrequency: 0.04,
  maxFrequency: 0.04,
  hasFounderEffect: false,
  geneticPrevalence: 0.0016,
  bayesianPrevalence: 0.0016,
  formula: "hwe",
  homExclusionActive: false,
};

const mockFilterConfig: FilterConfig = {
  lofHcEnabled: true,
  missenseEnabled: false,
  clinvarEnabled: true,
  clinvarStarThreshold: 1,
  clinvarIncludeConflicting: false,
  clinvarConflictingThreshold: 75,
};

const mockCalcConfig: CalcConfig = {
  useHWEFormula: true,
  useHomExclusion: true,
  penetrance: 1.0,
};

describe("ResultsExportMenu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders export button", () => {
    const wrapper = mountWithPlugins(ResultsExportMenu, {
      props: {
        result: mockResult,
        variants: [],
        clinvarVariants: [],
        filterConfig: mockFilterConfig,
        calcConfig: mockCalcConfig,
        submissions: new Map(),
        excludedSet: new Set(),
        reasons: new Map(),
      },
    });

    expect(wrapper.text()).toContain("Export");
  });
});
