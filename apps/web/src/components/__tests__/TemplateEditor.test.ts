import { describe, it, expect, beforeEach, vi } from "vitest";
import { mountWithPlugins } from "@/test/helpers";
import TemplateEditor from "../TemplateEditor.vue";

// Helper to create standard template store state for tests
function makeTemplateStoreState(language: "en" | "de" = "en") {
  return {
    templates: {
      language,
      genderStyle: "*",
      patientSex: "male",
      enabledSections: {
        affected: ["geneIntro", "inheritance"],
        carrier: ["geneIntro"],
        familyMember: ["geneIntro"],
      },
      customSections: {},
    },
  };
}

describe("TemplateEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without errors when template store has default state", () => {
    // TemplateEditor calls templateStore.getEffectiveTemplate() and parseTemplate().
    // stubActions: false is required so the real store actions/getters run and
    // return actual template strings rather than undefined.
    const wrapper = mountWithPlugins(TemplateEditor, {
      piniaOptions: { stubActions: false },
      storeInitialState: makeTemplateStoreState("en"),
    });
    expect(wrapper.exists()).toBe(true);
  });

  it("renders the template editor container div", () => {
    const wrapper = mountWithPlugins(TemplateEditor, {
      piniaOptions: { stubActions: false },
      storeInitialState: makeTemplateStoreState("en"),
    });
    // TemplateEditor has .template-editor class on root div
    expect(wrapper.find(".template-editor").exists()).toBe(true);
  });

  it("renders perspective selector", () => {
    const wrapper = mountWithPlugins(TemplateEditor, {
      piniaOptions: { stubActions: false },
      storeInitialState: makeTemplateStoreState("en"),
    });
    // Template has two v-selects: perspective and section
    const html = wrapper.html();
    expect(html.toLowerCase()).toContain("perspective");
  });

  it("renders section selector", () => {
    const wrapper = mountWithPlugins(TemplateEditor, {
      piniaOptions: { stubActions: false },
      storeInitialState: makeTemplateStoreState("en"),
    });
    const html = wrapper.html();
    expect(html.toLowerCase()).toContain("section");
  });

  it("renders with German language templates", () => {
    const wrapper = mountWithPlugins(TemplateEditor, {
      piniaOptions: { stubActions: false },
      storeInitialState: makeTemplateStoreState("de"),
    });
    expect(wrapper.exists()).toBe(true);
    expect(wrapper.find(".template-editor").exists()).toBe(true);
  });

  it("renders textarea for template editing", () => {
    const wrapper = mountWithPlugins(TemplateEditor, {
      piniaOptions: { stubActions: false },
      storeInitialState: makeTemplateStoreState("en"),
    });
    // v-textarea renders as a stub in test env
    const html = wrapper.html();
    expect(html).toContain("v-textarea");
  });
});
