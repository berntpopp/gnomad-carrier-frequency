import { describe, it, expect, vi } from "vitest";
import { ref } from "vue";
import { usePopulationBreakdown } from "../usePopulationBreakdown";
import type {
  CarrierFrequencyResult,
  FilterConfig,
  CalcConfig,
} from "@gnomad-cf/core/types";

vi.mock("@/composables", () => ({
  useSubcontinentalData: () => ({
    isLoading: ref(false),
    progress: ref(0),
    error: ref(null),
    subcontinentalFrequencies: ref([]),
    fetchForVariants: vi.fn(),
    clear: vi.fn(),
  }),
  useUrlState: () => ({
    subcontinentalEnabled: ref(false),
  }),
}));

describe("usePopulationBreakdown", () => {
  const result = ref<CarrierFrequencyResult | null>({
    gene: "CFTR",
    version: "v2",
    globalCarrierFrequency: 0.04,
    globalAlleleCount: 10,
    globalAlleleNumber: 250,
    populations: [
      {
        code: "nfe",
        label: "Non-Finnish European",
        carrierFrequency: 0.04,
        alleleCount: 10,
        alleleNumber: 250,
        geneticPrevalence: 0.0016,
        isFounderEffect: false,
      },
    ],
    qualifyingVariantCount: 1,
    minFrequency: 0.04,
    maxFrequency: 0.04,
    hasFounderEffect: false,
    geneticPrevalence: 0.0016,
    bayesianPrevalence: 0.0016,
    formula: "hwe",
    homExclusionActive: false,
  });

  const filterConfig = ref<FilterConfig>({
    lofHcEnabled: true,
    missenseEnabled: false,
    clinvarEnabled: true,
    clinvarStarThreshold: 1,
    clinvarIncludeConflicting: false,
    clinvarConflictingThreshold: 75,
  });

  const calcConfig = ref<CalcConfig>({
    useHWEFormula: true,
    useHomExclusion: true,
    penetrance: 1.0,
  });

  it("identifies v2 dataset correctly", () => {
    const { isV2 } = usePopulationBreakdown({
      result,
      qualifyingVariants: ref([]),
      clinvarVariants: ref([]),
      filterConfig,
      calcConfig,
      submissions: ref(new Map()),
      formatFrequency: (f) => `${f}`,
    });

    expect(isV2.value).toBe(true);
  });

  it("manages expandable population codes correctly", () => {
    const { togglePopExpand, isPopExpanded } = usePopulationBreakdown({
      result,
      qualifyingVariants: ref([]),
      clinvarVariants: ref([]),
      filterConfig,
      calcConfig,
      submissions: ref(new Map()),
      formatFrequency: (f) => `${f}`,
    });

    const mockEvent = { stopPropagation: vi.fn() } as unknown as Event;

    expect(isPopExpanded("nfe")).toBe(false);
    togglePopExpand("nfe", mockEvent);
    expect(isPopExpanded("nfe")).toBe(true);
    expect(mockEvent.stopPropagation).toHaveBeenCalled();
    togglePopExpand("nfe", mockEvent);
    expect(isPopExpanded("nfe")).toBe(false);
  });

  it("returns correct source border colors", () => {
    const { getSourceBorderColor } = usePopulationBreakdown({
      result,
      qualifyingVariants: ref([]),
      clinvarVariants: ref([]),
      filterConfig,
      calcConfig,
      submissions: ref(new Map()),
      formatFrequency: (f) => `${f}`,
    });

    expect(getSourceBorderColor("clinvar_only")).toBe("#2196F3");
    expect(getSourceBorderColor("plof_only")).toBe("#673AB7");
    expect(getSourceBorderColor("both")).toBe("#4CAF50");
    expect(getSourceBorderColor("other")).toBe("transparent");
  });
});
