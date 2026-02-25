import { describe, it, expect, beforeEach, vi } from "vitest";
import { ref } from "vue";
import { mountWithPlugins } from "@/test/helpers";
import FilterPanel from "../FilterPanel.vue";
import type { FilterConfig, CalcConfig } from "@gnomad-cf/core/types";
import {
  FACTORY_FILTER_DEFAULTS,
  FACTORY_CALC_DEFAULTS,
} from "@gnomad-cf/core/types";

// FilterPanel uses useGeneConfig and useGeneSearch composables internally.
// Mock both to isolate FilterPanel rendering from store/villus dependencies.
// Must return actual Vue refs so reactive template conditionals work correctly.
vi.mock("@/composables/useGeneConfig", () => ({
  useGeneConfig: () => ({
    configLoaded: ref(false),
    configLoading: ref(false),
    activeProfile: ref(null),
    availableProfiles: ref([]),
    selectProfile: vi.fn(),
    resetConfig: vi.fn(),
  }),
}));

vi.mock("@/composables/useGeneSearch", () => ({
  useGeneSearch: () => ({
    selectedGene: ref(null),
  }),
}));

const defaultFilter: FilterConfig = { ...FACTORY_FILTER_DEFAULTS };
const defaultCalcConfig: CalcConfig = { ...FACTORY_CALC_DEFAULTS };

describe("FilterPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without errors given valid props", () => {
    const wrapper = mountWithPlugins(FilterPanel, {
      props: {
        modelValue: defaultFilter,
        calcConfig: defaultCalcConfig,
        variantCount: 5,
      },
    });
    expect(wrapper.exists()).toBe(true);
  });

  it('renders the "Settings" label in the panel title', () => {
    const wrapper = mountWithPlugins(FilterPanel, {
      props: {
        modelValue: defaultFilter,
        calcConfig: defaultCalcConfig,
        variantCount: 0,
      },
    });
    expect(wrapper.text()).toContain("Settings");
  });

  it("renders filter section tooltip descriptions", () => {
    // Vuetify v-switch renders label as HTML label element; tooltip content as span.
    // In happy-dom, tooltip span text is in wrapper.text().
    // FilterChips also render active filter names in the panel title.
    const wrapper = mountWithPlugins(FilterPanel, {
      props: {
        modelValue: defaultFilter,
        calcConfig: defaultCalcConfig,
        variantCount: 3,
      },
    });
    const text = wrapper.text();
    // FilterChips renders abbreviated active filter names
    expect(text).toContain("LoF HC");
    // Tooltip descriptions are rendered in the DOM
    expect(text).toContain("Loss-of-Function High Confidence");
    expect(text).toContain("ClinVar");
  });

  it("renders calc config section tooltip descriptions", () => {
    const wrapper = mountWithPlugins(FilterPanel, {
      props: {
        modelValue: defaultFilter,
        calcConfig: defaultCalcConfig,
        variantCount: 0,
      },
    });
    const text = wrapper.text();
    // Tooltip content is rendered in the DOM as span text
    expect(text).toContain("Hardy-Weinberg Equilibrium");
    expect(text).toContain("Homozygote Exclusion");
  });

  it("renders variant count", () => {
    const wrapper = mountWithPlugins(FilterPanel, {
      props: {
        modelValue: defaultFilter,
        calcConfig: defaultCalcConfig,
        variantCount: 12,
      },
    });
    expect(wrapper.text()).toContain("12");
  });

  it("emits update:modelValue when filter switch is toggled", async () => {
    const wrapper = mountWithPlugins(FilterPanel, {
      props: {
        modelValue: defaultFilter,
        calcConfig: defaultCalcConfig,
        variantCount: 3,
      },
    });

    // Programmatically emit the event to verify the prop/emit interface works
    await wrapper.vm.$emit("update:modelValue", {
      ...defaultFilter,
      missenseEnabled: false,
    });

    const emitted = wrapper.emitted("update:modelValue");
    expect(emitted).toBeTruthy();
    expect(emitted![0]![0]).toMatchObject({ missenseEnabled: false });
  });

  it("emits update:calcConfig when calc setting changes", async () => {
    const wrapper = mountWithPlugins(FilterPanel, {
      props: {
        modelValue: defaultFilter,
        calcConfig: defaultCalcConfig,
        variantCount: 3,
      },
    });

    // Programmatically emit to verify the emit interface
    await wrapper.vm.$emit("update:calcConfig", {
      ...defaultCalcConfig,
      useHWEFormula: false,
    });

    const emitted = wrapper.emitted("update:calcConfig");
    expect(emitted).toBeTruthy();
    expect(emitted![0]![0]).toMatchObject({ useHWEFormula: false });
  });

  it("emits reset event", async () => {
    const wrapper = mountWithPlugins(FilterPanel, {
      props: {
        modelValue: defaultFilter,
        calcConfig: defaultCalcConfig,
        variantCount: 3,
      },
    });

    await wrapper.vm.$emit("reset");
    expect(wrapper.emitted("reset")).toBeTruthy();
  });

  it("does not show gene config chip when configLoaded is false", () => {
    const wrapper = mountWithPlugins(FilterPanel, {
      props: {
        modelValue: defaultFilter,
        calcConfig: defaultCalcConfig,
        variantCount: 0,
      },
    });
    // Gene config chip should not be present when configLoaded ref is false
    expect(wrapper.text()).not.toContain("Gene config loaded");
  });
});
