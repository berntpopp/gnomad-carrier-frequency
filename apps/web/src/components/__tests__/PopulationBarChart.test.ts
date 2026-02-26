import { describe, it, expect, beforeEach, vi } from "vitest";
import { ref } from "vue";
import { mountWithPlugins } from "@/test/helpers";
import PopulationBarChart from "../PopulationBarChart.vue";
import type { PopulationFrequency } from "@gnomad-cf/core/types";

// ── Module-level mocks ────────────────────────────────────────────────────────

// useAppTheme uses useDark from @vueuse/core which needs localStorage + matchMedia.
// Mock it to return a stable light-mode result.
vi.mock("@/composables/useTheme", () => ({
  useAppTheme: () => ({
    isDark: ref(false),
    toggleTheme: vi.fn(),
    tooltipText: ref("Switch to dark mode"),
    themeIcon: ref("mdi-weather-night"),
  }),
}));

// useDisplayFormat needs Pinia stores (useFormatStore, useTemplateStore).
// Mock to return a stable percent formatter so tests don't depend on store setup.
vi.mock("@/composables/useDisplayFormat", () => ({
  useDisplayFormat: () => ({
    currentFormat: ref("percent"),
    setFormat: vi.fn(),
    formatFrequency: (f: number | null) =>
      f !== null ? (f * 100).toFixed(2) + "%" : "N/A",
    formatRatio: (f: number | null) =>
      f ? "1:" + Math.round(1 / f) : "-",
  }),
}));

// ── Test fixtures ─────────────────────────────────────────────────────────────

const mockPopulations: PopulationFrequency[] = [
  {
    code: "nfe",
    label: "Non-Finnish European",
    carrierFrequency: 0.04,
    alleleCount: 500,
    alleleNumber: 12500,
    isLowSampleSize: false,
    isFounderEffect: false,
    geneticPrevalence: 0.0004,
  },
  {
    code: "asj",
    label: "Ashkenazi Jewish",
    carrierFrequency: 0.08,
    alleleCount: 200,
    alleleNumber: 2500,
    isLowSampleSize: false,
    isFounderEffect: true,
    geneticPrevalence: 0.0016,
  },
  {
    code: "eas",
    label: "East Asian",
    carrierFrequency: 0.01,
    alleleCount: 50,
    alleleNumber: 5000,
    isLowSampleSize: false,
    isFounderEffect: false,
    geneticPrevalence: 0.000025,
  },
  {
    code: "afr",
    label: "African/African-American",
    carrierFrequency: 0,
    alleleCount: 0,
    alleleNumber: 8000,
    isLowSampleSize: false,
    isFounderEffect: false,
    geneticPrevalence: 0,
  },
];

const defaultProps = {
  populations: mockPopulations,
  globalCarrierFrequency: null as number | null,
  gene: "CFTR",
  gnomadVersion: "gnomAD v4.1",
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("PopulationBarChart", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders SVG with bars for non-zero populations", () => {
    const wrapper = mountWithPlugins(PopulationBarChart, {
      props: defaultProps,
    });

    // SVG element should be rendered (non-zero populations exist)
    const svg = wrapper.find("svg");
    expect(svg.exists()).toBe(true);

    // AFR has carrierFrequency=0 and is hidden by visiblePops filter.
    // Three non-zero populations: NFE, ASJ, EAS → 3 bar groups.
    const barGroups = wrapper.findAll("g[data-code]");
    expect(barGroups).toHaveLength(3);
  });

  it("sorts bars by frequency descending", () => {
    const wrapper = mountWithPlugins(PopulationBarChart, {
      props: defaultProps,
    });

    // data-code attributes on <g> elements reflect sort order
    const barGroups = wrapper.findAll("g[data-code]");
    const codes = barGroups.map((g) => g.attributes("data-code"));

    // Sorted descending: ASJ (0.08) > NFE (0.04) > EAS (0.01)
    expect(codes).toEqual(["asj", "nfe", "eas"]);
  });

  it("applies distinct color to founder effect populations", () => {
    const wrapper = mountWithPlugins(PopulationBarChart, {
      props: defaultProps,
    });

    // Find the bar group for ASJ (isFounderEffect: true)
    const asjGroup = wrapper.find('g[data-code="asj"]');
    expect(asjGroup.exists()).toBe(true);

    // The bar rect inside that group should have the founder color fill
    // In light mode (isDark=false), founder color is #D55E00
    const barRect = asjGroup.find("rect");
    expect(barRect.exists()).toBe(true);
    expect(barRect.attributes("fill")).toBe("#D55E00");
  });

  it("renders global reference line when globalCarrierFrequency provided", () => {
    const wrapper = mountWithPlugins(PopulationBarChart, {
      props: { ...defaultProps, globalCarrierFrequency: 0.03 },
    });

    // A dashed reference line should be rendered inside the SVG
    const dashLine = wrapper.find('line[stroke-dasharray]');
    expect(dashLine.exists()).toBe(true);
    expect(dashLine.attributes("stroke-dasharray")).toBe("4,3");
  });

  it("hides reference line when globalCarrierFrequency is null", () => {
    const wrapper = mountWithPlugins(PopulationBarChart, {
      props: { ...defaultProps, globalCarrierFrequency: null },
    });

    // No dashed reference line should exist
    const dashLine = wrapper.find('line[stroke-dasharray]');
    expect(dashLine.exists()).toBe(false);
  });

  it("shows empty state when all populations have zero frequency", () => {
    const zeroPopulations: PopulationFrequency[] = mockPopulations.map(
      (p) => ({ ...p, carrierFrequency: 0 }),
    );

    const wrapper = mountWithPlugins(PopulationBarChart, {
      props: { ...defaultProps, populations: zeroPopulations },
    });

    // Empty state message should be visible
    expect(wrapper.text()).toContain("No population data available");

    // No SVG bars should exist
    expect(wrapper.find("svg").exists()).toBe(false);
  });

  it("displays formatted frequency values", () => {
    const wrapper = mountWithPlugins(PopulationBarChart, {
      props: defaultProps,
    });

    const text = wrapper.text();

    // Our mock formatter outputs "8.00%" for 0.08, "4.00%" for 0.04, etc.
    expect(text).toContain("8.00%");
    expect(text).toContain("4.00%");
    expect(text).toContain("1.00%");
  });

  it("exposes svgRef via defineExpose", () => {
    const wrapper = mountWithPlugins(PopulationBarChart, {
      props: defaultProps,
    });

    // The component exposes { svgRef } — accessible via wrapper.vm
    // In the happy-dom environment, SVGSVGElement may not be a full DOM element,
    // but svgRef should at least be defined (not undefined).
    const vm = wrapper.vm as { svgRef: SVGSVGElement | null };
    // svgRef is defined as a ref — the exposed value exists on the vm
    expect("svgRef" in vm).toBe(true);
  });

  it("does not render bar for AFR population with zero frequency", () => {
    const wrapper = mountWithPlugins(PopulationBarChart, {
      props: defaultProps,
    });

    // AFR has carrierFrequency=0 → filtered out by visiblePops computed
    const afrGroup = wrapper.find('g[data-code="afr"]');
    expect(afrGroup.exists()).toBe(false);
  });

  it("normal populations use blue fill in light mode", () => {
    const wrapper = mountWithPlugins(PopulationBarChart, {
      props: defaultProps,
    });

    // NFE is not a founder population → should use normal blue (#0072B2 in light mode)
    const nfeGroup = wrapper.find('g[data-code="nfe"]');
    expect(nfeGroup.exists()).toBe(true);

    const barRect = nfeGroup.find("rect");
    expect(barRect.exists()).toBe(true);
    expect(barRect.attributes("fill")).toBe("#0072B2");
  });

  it("renders population-chart data-testid on root container", () => {
    const wrapper = mountWithPlugins(PopulationBarChart, {
      props: defaultProps,
    });

    expect(wrapper.find('[data-testid="population-chart"]').exists()).toBe(true);
  });
});
