import { describe, it, expect, beforeEach } from "vitest";
import { mountWithPlugins } from "@/test/helpers";
import { useWizard } from "@/composables/useWizard";
import StepFrequency from "../StepFrequency.vue";

/**
 * Helper: when Vuetify components are unresolved (minimal test setup),
 * v-btn renders as a custom element. The disabled state is conveyed as:
 *   disabled=""  or  disabled="true"  → button IS disabled
 *   disabled="false"  or absent       → button is NOT disabled
 */
function isVuetifyBtnDisabled(
  wrapper: ReturnType<typeof mountWithPlugins>,
  testId: string,
): boolean {
  const btn = wrapper.find(`[data-testid="${testId}"]`);
  const disabledAttr = btn.attributes("disabled");
  return disabledAttr === "" || disabledAttr === "true";
}

describe("StepFrequency", () => {
  beforeEach(() => {
    const { resetWizard } = useWizard();
    resetWizard();
  });

  it("renders the step container", () => {
    const wrapper = mountWithPlugins(StepFrequency, {
      props: {
        source: "gnomad",
        literatureFrequency: null,
        literaturePmid: null,
        gnomadFrequency: null,
        gnomadLoading: false,
        usingDefault: false,
      },
    });

    expect(wrapper.find('[data-testid="step-frequency"]').exists()).toBe(true);
  });

  it("renders the gnomAD tab", () => {
    const wrapper = mountWithPlugins(StepFrequency, {
      props: {
        source: "gnomad",
        literatureFrequency: null,
        literaturePmid: null,
        gnomadFrequency: null,
        gnomadLoading: false,
        usingDefault: false,
      },
    });

    expect(wrapper.find('[data-testid="freq-tab-gnomad"]').exists()).toBe(true);
  });

  it("renders the next button", () => {
    const wrapper = mountWithPlugins(StepFrequency, {
      props: {
        source: "gnomad",
        literatureFrequency: null,
        literaturePmid: null,
        gnomadFrequency: null,
        gnomadLoading: false,
        usingDefault: false,
      },
    });

    expect(
      wrapper.find('[data-testid="step-frequency-next-btn"]').exists(),
    ).toBe(true);
  });

  it("next button is disabled when gnomAD source selected but no frequency calculated", () => {
    const wrapper = mountWithPlugins(StepFrequency, {
      props: {
        source: "gnomad",
        literatureFrequency: null,
        literaturePmid: null,
        gnomadFrequency: null,
        gnomadLoading: false,
        usingDefault: false,
      },
    });

    expect(isVuetifyBtnDisabled(wrapper, "step-frequency-next-btn")).toBe(true);
  });

  it("next button is enabled when gnomAD frequency is available", () => {
    const wrapper = mountWithPlugins(StepFrequency, {
      props: {
        source: "gnomad",
        literatureFrequency: null,
        literaturePmid: null,
        gnomadFrequency: { percent: "1.00%", ratio: "1:100" },
        gnomadLoading: false,
        usingDefault: false,
      },
    });

    expect(isVuetifyBtnDisabled(wrapper, "step-frequency-next-btn")).toBe(
      false,
    );
  });

  it("next button is enabled when using default source", () => {
    const wrapper = mountWithPlugins(StepFrequency, {
      props: {
        source: "default",
        literatureFrequency: null,
        literaturePmid: null,
        gnomadFrequency: null,
        gnomadLoading: false,
        usingDefault: false,
      },
    });

    expect(isVuetifyBtnDisabled(wrapper, "step-frequency-next-btn")).toBe(
      false,
    );
  });

  it("shows success alert text when gnomAD frequency is calculated", () => {
    const wrapper = mountWithPlugins(StepFrequency, {
      props: {
        source: "gnomad",
        literatureFrequency: null,
        literaturePmid: null,
        gnomadFrequency: { percent: "2.50%", ratio: "1:40" },
        gnomadLoading: false,
        usingDefault: false,
      },
    });

    expect(wrapper.text()).toContain(
      "Carrier frequency calculated from gnomAD data.",
    );
  });

  it("emits complete event when next button clicked with valid data", async () => {
    const wrapper = mountWithPlugins(StepFrequency, {
      props: {
        source: "gnomad",
        literatureFrequency: null,
        literaturePmid: null,
        gnomadFrequency: { percent: "1.00%", ratio: "1:100" },
        gnomadLoading: false,
        usingDefault: false,
      },
    });

    const btn = wrapper.find('[data-testid="step-frequency-next-btn"]');
    await btn.trigger("click");

    expect(wrapper.emitted("complete")).toBeTruthy();
  });
});
