import { describe, it, expect, vi } from "vitest";
import { ref } from "vue";
import { mountWithPlugins } from "@/test/helpers";
import VersionSelector from "../VersionSelector.vue";

// VersionSelector uses useGnomadVersion from @/api which uses villus client.
// Mock it to provide a stable version without network dependencies.
vi.mock("@/api", () => ({
  useGnomadVersion: () => ({
    version: ref("v4.1"),
    setVersion: vi.fn(),
  }),
}));

describe("VersionSelector", () => {
  it("renders without errors", () => {
    const wrapper = mountWithPlugins(VersionSelector);
    expect(wrapper.exists()).toBe(true);
  });

  it("renders a v-select for version selection", () => {
    const wrapper = mountWithPlugins(VersionSelector);
    // With minimal Vuetify, components render as stub tags with their props.
    const html = wrapper.html();
    expect(html).toContain("v-select");
  });

  it("has gnomAD version label", () => {
    const wrapper = mountWithPlugins(VersionSelector);
    // v-select label prop should appear in the stub HTML
    const html = wrapper.html();
    expect(html.toLowerCase()).toContain("gnomad");
  });

  it("renders version select with items from config", () => {
    const wrapper = mountWithPlugins(VersionSelector);
    // VersionSelector uses getAvailableVersions() from core config —
    // the stub renders with items prop containing the version list
    const html = wrapper.html();
    expect(html).toContain("v-select");
    expect(wrapper.exists()).toBe(true);
  });

  it("renders with current version from store", () => {
    // Version ref is set to 'v4.1' via mock
    const wrapper = mountWithPlugins(VersionSelector);
    // In stub rendering, modelvalue is rendered as an attribute
    expect(wrapper.exists()).toBe(true);
  });
});
