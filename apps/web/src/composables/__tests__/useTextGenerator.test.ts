import { describe, it, expect, beforeEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useTextGenerator } from "../useTextGenerator";
import type { CarrierFrequencyResult } from "@gnomad-cf/core/types";

function createMockResult(
  version: "v4" | "v3" | "v2" = "v4",
  cf = 0.04,
): CarrierFrequencyResult {
  return {
    gene: "CFTR",
    version,
    globalCarrierFrequency: cf,
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
}

describe("useTextGenerator (ARCH-5, SPEC-10)", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  describe("Dynamic gnomAD attribution", () => {
    it("dynamically resolves v4 display name and URL", () => {
      const generator = useTextGenerator(() => ({
        result: createMockResult("v4"),
        frequencySource: "gnomad",
        indexStatus: "heterozygous",
        literatureFrequency: null,
        literaturePmid: null,
        usingDefault: false,
      }));

      const context = generator.templateContext.value;
      expect(context).not.toBeNull();
      expect(context?.source).toContain("gnomAD v4.1");
      expect(context?.source).toContain("https://gnomad.broadinstitute.org");
      expect(context?.source).toContain("accessed");
    });

    it("dynamically resolves v2 display name for legacy assembly GRCh37", () => {
      const generator = useTextGenerator(() => ({
        result: createMockResult("v2"),
        frequencySource: "gnomad",
        indexStatus: "heterozygous",
        literatureFrequency: null,
        literaturePmid: null,
        usingDefault: false,
      }));

      const context = generator.templateContext.value;
      expect(context).not.toBeNull();
      expect(context?.source).toContain("gnomAD v2.1.1");
      expect(context?.source).toContain("https://gnomad.broadinstitute.org");
    });

    it("formats default assumption when usingDefault is true", () => {
      const generator = useTextGenerator(() => ({
        result: createMockResult("v4"),
        frequencySource: "gnomad",
        indexStatus: "heterozygous",
        literatureFrequency: null,
        literaturePmid: null,
        usingDefault: true,
      }));

      const context = generator.templateContext.value;
      expect(context?.source).toBe("(default assumption, no gnomAD data)");

      generator.setLanguage("de");
      const deContext = generator.templateContext.value;
      expect(deContext?.source).toBe("(Standardannahme mangels gnomAD-Daten)");
    });

    it("formats literature source with PubMed ID", () => {
      const generator = useTextGenerator(() => ({
        result: createMockResult("v4"),
        frequencySource: "literature",
        indexStatus: "heterozygous",
        literatureFrequency: 0.03,
        literaturePmid: "32165498",
        usingDefault: false,
      }));

      const context = generator.templateContext.value;
      expect(context?.source).toBe("(PMID: 32165498)");
      expect(context?.carrierFrequency).toBe("3.00%");
    });
  });

  describe("Recurrence risk calculations", () => {
    it("calculates 1/4 risk for heterozygous carrier index patient", () => {
      // CF = 0.04 (1:25) -> Recurrence risk = 0.04 * 0.25 = 0.01 (1:100, 1.00%)
      const generator = useTextGenerator(() => ({
        result: createMockResult("v4", 0.04),
        frequencySource: "gnomad",
        indexStatus: "heterozygous",
        literatureFrequency: null,
        literaturePmid: null,
        usingDefault: false,
      }));

      const context = generator.templateContext.value;
      expect(context?.recurrenceRiskPercent).toBe("1.00%");
      expect(context?.recurrenceRiskRatio).toBe("1:100");
    });

    it("calculates 1/2 risk for homozygous affected index patient", () => {
      // CF = 0.04 -> Recurrence risk = 0.04 * 0.5 = 0.02 (1:50, 2.00%)
      const generator = useTextGenerator(() => ({
        result: createMockResult("v4", 0.04),
        frequencySource: "gnomad",
        indexStatus: "homozygous",
        literatureFrequency: null,
        literaturePmid: null,
        usingDefault: false,
      }));

      const context = generator.templateContext.value;
      expect(context?.recurrenceRiskPercent).toBe("2.00%");
      expect(context?.recurrenceRiskRatio).toBe("1:50");
    });

    it("scales recurrence risk by penetrance fraction", () => {
      // CF = 0.04, heterozygous, penetrance = 0.5 -> 0.04 * 0.25 * 0.5 = 0.005 (0.50%, 1:200)
      const generator = useTextGenerator(() => ({
        result: createMockResult("v4", 0.04),
        frequencySource: "gnomad",
        indexStatus: "heterozygous",
        literatureFrequency: null,
        literaturePmid: null,
        usingDefault: false,
        penetrance: 0.5,
      }));

      const context = generator.templateContext.value;
      expect(context?.recurrenceRiskPercent).toBe("0.50%");
      expect(context?.recurrenceRiskRatio).toBe("1:200");
    });
  });

  describe("German and English text generation", () => {
    it("generates German text with proper commas and dative form", () => {
      const generator = useTextGenerator(() => ({
        result: createMockResult("v4", 0.04),
        frequencySource: "gnomad",
        indexStatus: "heterozygous",
        literatureFrequency: null,
        literaturePmid: null,
        usingDefault: false,
      }));

      generator.setLanguage("de");
      const context = generator.templateContext.value;
      expect(context?.carrierFrequency).toBe("4,00%");
      expect(context?.recurrenceRiskPercent).toBe("1,00%");
      expect(context?.source).toContain("abgerufen am");

      const text = generator.generateText("affected");
      expect(text).toContain("CFTR");
    });
  });
});
