import { describe, it, expect } from "vitest";
import {
  calculateAlleleFrequency,
  calculateCarrierFrequency,
  aggregatePopulationFrequenciesWithConfig,
  buildPopulationFrequencies,
} from "../src/calculations/frequency-calc.js";
import type { VariantFrequencyData } from "../src/types/variant.js";
import { FACTORY_CALC_DEFAULTS } from "../src/types/calculations.js";

describe("frequency-calc module", () => {
  describe("calculateAlleleFrequency", () => {
    it("returns AC / AN when AN > 0", () => {
      expect(calculateAlleleFrequency(10, 1000)).toBe(0.01);
    });

    it("returns null when AN is 0", () => {
      expect(calculateAlleleFrequency(0, 0)).toBeNull();
      expect(calculateAlleleFrequency(1, 0)).toBeNull();
    });
  });

  describe("calculateCarrierFrequency", () => {
    it("returns 2 * sum(pathogenicAFs)", () => {
      expect(calculateCarrierFrequency([0.01, 0.005])).toBe(0.03);
    });

    it("returns 0 for empty array", () => {
      expect(calculateCarrierFrequency([])).toBe(0);
    });
  });

  describe("aggregatePopulationFrequenciesWithConfig & buildPopulationFrequencies", () => {
    const variant: VariantFrequencyData = {
      joint: {
        ac: 40,
        an: 4000,
        homozygote_count: 1,
        hemizygote_count: 0,
        populations: [
          { id: "nfe", ac: 38, an: 2000, homozygote_count: 1 },
          { id: "afr", ac: 2, an: 2000, homozygote_count: 0 },
        ],
      },
    };

    it("aggregates population frequencies with default homozygote exclusion", () => {
      const agg = aggregatePopulationFrequenciesWithConfig(
        [variant],
        "v4",
        FACTORY_CALC_DEFAULTS,
      );

      const nfe = agg.get("nfe");
      expect(nfe).toBeDefined();
      expect(nfe?.totalAC).toBe(38);
      expect(nfe?.maxAN).toBe(2000);
      // VCR for nfe: (38 - 2) / (2000 / 2) = 36 / 1000 = 0.036
      // GCR = 0.036
      expect(nfe?.carrierFrequency).toBeCloseTo(0.036, 5);

      const pops = buildPopulationFrequencies(agg, 0.02, "v4");
      expect(pops.length).toBeGreaterThan(0);
      expect(pops[0].code).toBe("nfe");
      expect(pops[0].carrierFrequency).toBeCloseTo(0.036, 5);
      expect(pops[0].isLowSampleSize).toBe(false);
    });

    it("aggregates with HWE formula when homozygote exclusion is off", () => {
      const agg = aggregatePopulationFrequenciesWithConfig([variant], "v4", {
        useHomExclusion: false,
        useHWEFormula: true,
        penetrance: 1.0,
      });

      const nfe = agg.get("nfe");
      expect(nfe?.carrierFrequency).toBeDefined();
      // q = 38 / 2000 = 0.019, 2pq = 2 * 0.981 * 0.019 = 0.037278
      expect(nfe?.carrierFrequency).toBeCloseTo(0.037278, 5);
    });

    it("aggregates with simplified formula when homozygote exclusion is off", () => {
      const agg = aggregatePopulationFrequenciesWithConfig([variant], "v4", {
        useHomExclusion: false,
        useHWEFormula: false,
        penetrance: 1.0,
      });

      const nfe = agg.get("nfe");
      // 2 * q = 2 * 0.019 = 0.038
      expect(nfe?.carrierFrequency).toBeCloseTo(0.038, 5);
    });

    it("falls back to exome and genome sum when joint data is absent", () => {
      const exomeGenomeVariant: VariantFrequencyData = {
        exome: {
          ac: 4,
          an: 250,
          ac_hom: 0,
          populations: [{ id: "nfe", ac: 4, an: 250, ac_hom: 0 }],
        },
        genome: {
          ac: 2,
          an: 250,
          ac_hom: 0,
          populations: [{ id: "nfe", ac: 2, an: 250, ac_hom: 0 }],
        },
      };

      const agg = aggregatePopulationFrequenciesWithConfig(
        [exomeGenomeVariant],
        "v4",
        FACTORY_CALC_DEFAULTS,
      );

      const nfe = agg.get("nfe");
      expect(nfe?.totalAC).toBe(6);
      expect(nfe?.maxAN).toBe(500);
      // VCR = 6 / 250 = 0.024
      expect(nfe?.carrierFrequency).toBeCloseTo(0.024, 5);
    });

    it("detects founder effects and low sample size correctly", () => {
      const lowSampleVariant: VariantFrequencyData = {
        joint: {
          ac: 10,
          an: 100,
          homozygote_count: 0,
          hemizygote_count: 0,
          populations: [{ id: "asj", ac: 10, an: 100, homozygote_count: 0 }],
        },
      };

      const agg = aggregatePopulationFrequenciesWithConfig(
        [lowSampleVariant],
        "v4",
        FACTORY_CALC_DEFAULTS,
      );

      // Global CF = 0.01. asj CF = 10 / 50 = 0.20 (20x global > 3x threshold)
      const pops = buildPopulationFrequencies(agg, 0.01, "v4");
      const asj = pops.find((p) => p.code === "asj");
      expect(asj?.isFounderEffect).toBe(true);
      expect(asj?.isLowSampleSize).toBe(true);
    });
  });
});
