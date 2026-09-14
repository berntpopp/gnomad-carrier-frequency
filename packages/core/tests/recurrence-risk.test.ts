import { describe, it, expect } from "vitest";
import { calculateRecurrenceRisk } from "../src/calculations/recurrence-risk.js";

describe("calculateRecurrenceRisk", () => {
  describe("Heterozygous Carrier Index (p = 1/2)", () => {
    it("calculates CF * 0.25 when penetrance is 1.0 (default)", () => {
      // CF = 0.04 (1/25) -> Recurrence risk = 0.04 * 0.25 = 0.01 (1/100)
      expect(calculateRecurrenceRisk(0.04, "heterozygous")).toBeCloseTo(0.01, 6);
    });

    it("adjusts by penetrance correctly", () => {
      // CF = 0.04, penetrance = 0.8 -> 0.04 * 0.25 * 0.8 = 0.008
      expect(calculateRecurrenceRisk(0.04, "heterozygous", 0.8)).toBeCloseTo(0.008, 6);
    });

    it("returns 0 when penetrance is 0.0", () => {
      expect(calculateRecurrenceRisk(0.04, "heterozygous", 0.0)).toBe(0.0);
    });

    it("returns 0 when carrier frequency is 0.0", () => {
      expect(calculateRecurrenceRisk(0.0, "heterozygous", 1.0)).toBe(0.0);
    });
  });

  describe("Affected Index (p = 1.0: homozygous / compound_het)", () => {
    it("calculates CF * 0.5 for homozygous index", () => {
      // CF = 0.04 -> 0.04 * 0.5 = 0.02 (1/50)
      expect(calculateRecurrenceRisk(0.04, "homozygous")).toBeCloseTo(0.02, 6);
    });

    it("calculates CF * 0.5 for compound_het_confirmed index", () => {
      expect(calculateRecurrenceRisk(0.04, "compound_het_confirmed")).toBeCloseTo(0.02, 6);
    });

    it("calculates CF * 0.5 for compound_het_assumed index", () => {
      expect(calculateRecurrenceRisk(0.04, "compound_het_assumed")).toBeCloseTo(0.02, 6);
    });

    it("adjusts by penetrance correctly for affected index", () => {
      // CF = 0.02, penetrance = 0.75 -> 0.02 * 0.5 * 0.75 = 0.0075
      expect(calculateRecurrenceRisk(0.02, "homozygous", 0.75)).toBeCloseTo(0.0075, 6);
    });
  });

  describe("Boundary and Edge Cases", () => {
    it("returns null if carrierFrequency is null", () => {
      expect(calculateRecurrenceRisk(null, "heterozygous")).toBeNull();
    });

    it("returns null if carrierFrequency is NaN or infinite", () => {
      expect(calculateRecurrenceRisk(NaN, "heterozygous")).toBeNull();
      expect(calculateRecurrenceRisk(Infinity, "heterozygous")).toBeNull();
      expect(calculateRecurrenceRisk(-Infinity, "heterozygous")).toBeNull();
    });

    it("returns null if carrierFrequency is out of [0, 1] range", () => {
      expect(calculateRecurrenceRisk(-0.01, "heterozygous")).toBeNull();
      expect(calculateRecurrenceRisk(1.01, "heterozygous")).toBeNull();
    });

    it("returns null if penetrance is out of [0, 1] range", () => {
      expect(calculateRecurrenceRisk(0.04, "heterozygous", -0.1)).toBeNull();
      expect(calculateRecurrenceRisk(0.04, "heterozygous", 1.05)).toBeNull();
      expect(calculateRecurrenceRisk(0.04, "heterozygous", NaN)).toBeNull();
    });

    it("returns null if indexStatus is missing or invalid", () => {
      expect(calculateRecurrenceRisk(0.04, null)).toBeNull();
      expect(calculateRecurrenceRisk(0.04, undefined)).toBeNull();
      // @ts-expect-error Testing runtime handling of invalid index status string
      expect(calculateRecurrenceRisk(0.04, "unknown")).toBeNull();
    });
  });
});
