import { describe, it, expect } from "vitest";
import { loadTemplateContent } from "../src/templates/load-templates.js";

describe("loadTemplateContent", () => {
  it("loads English template successfully", async () => {
    const template = await loadTemplateContent("en");
    expect(template).toBeDefined();
    expect(typeof template).toBe("object");
    expect(template).toHaveProperty("language", "en");
    expect(template).toHaveProperty("perspectives");
  });

  it("loads German template successfully", async () => {
    const template = await loadTemplateContent("de");
    expect(template).toBeDefined();
    expect(typeof template).toBe("object");
    expect(template).toHaveProperty("language", "de");
    expect(template).toHaveProperty("perspectives");
  });

  it("throws informative error on unsupported language", async () => {
    await expect(
      loadTemplateContent("fr" as "en" | "de"),
    ).rejects.toThrow(/Failed to load template for language "fr"/);
  });
});
