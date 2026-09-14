import { describe, it, expect } from "vitest";
import {
  evaluateDecisionMatrix,
  type DecisionMatrixVariant,
} from "../src/calculations/decision-matrix.js";

describe("evaluateDecisionMatrix (Section 2.2.5 Exhaustive 6-Case Matrix)", () => {
  describe("Case 1: Missing / Unsampled Data", () => {
    it("returns Case 1 when raw variants are empty", () => {
      const result = evaluateDecisionMatrix([], [], []);
      expect(result.caseIndex).toBe(1);
      expect(result.rawCarrierFrequency).toBeNull();
      expect(result.carrierFrequency).toBeNull();
      expect(result.geneticPrevalence).toBeNull();
      expect(result.bayesianPrevalence).toBeNull();
      expect(result.uiDisplay).toBe("No data");
      expect(result.flags.missingData).toBe(true);
    });

    it("returns Case 1 when all raw variants have AN = 0", () => {
      const v: DecisionMatrixVariant = { ac: 0, an: 0, hom: 0 };
      const result = evaluateDecisionMatrix([v], [], []);
      expect(result.caseIndex).toBe(1);
      expect(result.uiDisplay).toBe("No data");
      expect(result.flags.missingData).toBe(true);
    });

    it("returns Case 1 when pathogenic variants exist but have sum AN = 0", () => {
      const v: DecisionMatrixVariant = { ac: 1, an: 0, hom: 0 };
      const result = evaluateDecisionMatrix([v], [v], []);
      expect(result.caseIndex).toBe(1);
      expect(result.flags.missingData).toBe(true);
    });

    it("returns Case 1 when included variants exist but have sum AN = 0", () => {
      const v: DecisionMatrixVariant = { ac: 1, an: 0, hom: 0 };
      const result = evaluateDecisionMatrix([v], [v], [v]);
      expect(result.caseIndex).toBe(1);
      expect(result.flags.missingData).toBe(true);
    });
  });

  describe("Case 2: No Pathogenic Candidates", () => {
    const raw: DecisionMatrixVariant[] = [{ ac: 5, an: 10000, hom: 0 }];

    it("returns Not detected when fallback is disabled", () => {
      const result = evaluateDecisionMatrix(raw, [], [], {
        fallbackEnabled: false,
      });
      expect(result.caseIndex).toBe(2);
      expect(result.rawCarrierFrequency).toBeNull();
      expect(result.carrierFrequency).toBeNull();
      expect(result.geneticPrevalence).toBeNull();
      expect(result.uiDisplay).toBe("Not detected");
      expect(result.flags.noQualifyingVariants).toBe(true);
      expect(result.flags.isDefaultFallback).toBe(false);
    });

    it("returns fallback carrier frequency and derived prevalence when fallback is enabled", () => {
      const result = evaluateDecisionMatrix(raw, [], [], {
        fallbackEnabled: true,
        fallbackCF: 0.01,
        penetrance: 0.8,
      });
      expect(result.caseIndex).toBe(2);
      expect(result.rawCarrierFrequency).toBeNull();
      expect(result.carrierFrequency).toBe(0.01);
      // q = 0.005 -> q^2 = 0.000025
      expect(result.geneticPrevalence).toBeCloseTo(0.000025, 8);
      // Bayesian = 0.000025 * 0.8 = 0.000020
      expect(result.bayesianPrevalence).toBeCloseTo(0.00002, 8);
      expect(result.uiDisplay).toContain("(Default assumption)");
      expect(result.flags.isDefaultFallback).toBe(true);
    });
  });

  describe("Case 3: All Candidates Excluded", () => {
    const raw: DecisionMatrixVariant[] = [{ ac: 10, an: 10000, hom: 0 }];
    const path: DecisionMatrixVariant[] = [{ ac: 10, an: 10000, hom: 0 }];

    it("returns Not detected when fallback is disabled", () => {
      const result = evaluateDecisionMatrix(raw, path, [], {
        fallbackEnabled: false,
      });
      expect(result.caseIndex).toBe(3);
      expect(result.carrierFrequency).toBeNull();
      expect(result.uiDisplay).toBe("Not detected");
      expect(result.flags.allExcluded).toBe(true);
      expect(result.flags.isDefaultFallback).toBe(false);
    });

    it("returns fallback CF and prevalence when fallback is enabled", () => {
      const result = evaluateDecisionMatrix(raw, path, [], {
        fallbackEnabled: true,
        fallbackCF: 0.01,
      });
      expect(result.caseIndex).toBe(3);
      expect(result.carrierFrequency).toBe(0.01);
      expect(result.geneticPrevalence).toBeCloseTo(0.000025, 8);
      expect(result.flags.allExcluded).toBe(true);
      expect(result.flags.isDefaultFallback).toBe(true);
    });
  });

  describe("Case 4: Observed Zero", () => {
    const v: DecisionMatrixVariant = { ac: 0, an: 10000, hom: 0 };

    it("returns 0.0 carrier frequency and prevalence for observed zero", () => {
      const result = evaluateDecisionMatrix([v], [v], [v]);
      expect(result.caseIndex).toBe(4);
      expect(result.rawCarrierFrequency).toBe(0.0);
      expect(result.carrierFrequency).toBe(0.0);
      expect(result.geneticPrevalence).toBe(0.0);
      expect(result.bayesianPrevalence).toBe(0.0);
      expect(result.uiDisplay).toBe("0% (0 / 10,000)");
      expect(result.flags.observedZero).toBe(true);
    });
  });

  describe("Case 5: Positive Homozygotes-Only Sites", () => {
    // 2 homozygous individuals: ac = 4, hom = 2
    const v: DecisionMatrixVariant = { ac: 4, an: 10000, hom: 2 };

    it("returns 0.0 with (Homozygotes only) label when homozygote exclusion is active", () => {
      const result = evaluateDecisionMatrix([v], [v], [v], {
        useHomExclusion: true,
      });
      expect(result.caseIndex).toBe(5);
      expect(result.rawCarrierFrequency).toBe(0.0);
      expect(result.carrierFrequency).toBe(0.0);
      // Genetic prevalence q^2 is still computed from raw sumAF: q = 4/10000 = 0.0004 -> q^2 = 1.6e-7
      expect(result.geneticPrevalence).toBeCloseTo(0.0004 * 0.0004, 10);
      expect(result.uiDisplay).toBe("0% (Homozygotes only)");
      expect(result.flags.variantHomozygoteOnly).toBe(true);
    });

    it("calculates positive carrier frequency when homozygote exclusion is disabled (HWE)", () => {
      const result = evaluateDecisionMatrix([v], [v], [v], {
        useHomExclusion: false,
        formula: "hwe",
      });
      expect(result.caseIndex).toBe(5);
      // q = 4 / 10000 = 0.0004, 2pq = 2 * 0.9996 * 0.0004 = 0.00079968
      expect(result.carrierFrequency).toBeCloseTo(0.00079968, 6);
      expect(result.flags.variantHomozygoteOnly).toBe(true);
    });

    it("calculates positive carrier frequency when homozygote exclusion is disabled (simplified)", () => {
      const result = evaluateDecisionMatrix([v], [v], [v], {
        useHomExclusion: false,
        formula: "simplified",
      });
      expect(result.caseIndex).toBe(5);
      // 2 * q = 2 * 0.0004 = 0.0008
      expect(result.carrierFrequency).toBeCloseTo(0.0008, 6);
    });
  });

  describe("Case 6: Normal Residual Calculation", () => {
    // 20 alleles, 1 homozygote: 18 heterozygous alleles
    const v: DecisionMatrixVariant = { ac: 20, an: 10000, hom: 1 };

    it("calculates GCR carrier frequency when homozygote exclusion is active", () => {
      const result = evaluateDecisionMatrix([v], [v], [v], {
        useHomExclusion: true,
        penetrance: 0.9,
      });
      expect(result.caseIndex).toBe(6);
      // VCR = (20 - 2) / (10000 / 2) = 18 / 5000 = 0.0036
      // GCR = 1 - (1 - 0.0036) = 0.0036
      expect(result.carrierFrequency).toBeCloseTo(0.0036, 6);
      // q = 20 / 10000 = 0.002 -> q^2 = 0.000004
      expect(result.geneticPrevalence).toBeCloseTo(0.000004, 8);
      // Bayesian = 0.000004 * 0.9 = 0.0000036
      expect(result.bayesianPrevalence).toBeCloseTo(0.0000036, 8);
      expect(result.uiDisplay).toBe("0.36%");
    });

    it("calculates HWE 2pq carrier frequency when homozygote exclusion is false", () => {
      const result = evaluateDecisionMatrix([v], [v], [v], {
        useHomExclusion: false,
        formula: "hwe",
      });
      expect(result.caseIndex).toBe(6);
      // q = 0.002, 2pq = 2 * 0.998 * 0.002 = 0.003992
      expect(result.carrierFrequency).toBeCloseTo(0.003992, 6);
    });

    it("calculates simplified 2q carrier frequency when formula is simplified", () => {
      const result = evaluateDecisionMatrix([v], [v], [v], {
        useHomExclusion: false,
        formula: "simplified",
      });
      expect(result.caseIndex).toBe(6);
      // 2 * 0.002 = 0.004
      expect(result.carrierFrequency).toBeCloseTo(0.004, 6);
    });

    it("scales bayesian prevalence to 0.0 when penetrance is 0.0", () => {
      const result = evaluateDecisionMatrix([v], [v], [v], {
        penetrance: 0.0,
      });
      expect(result.caseIndex).toBe(6);
      expect(result.bayesianPrevalence).toBe(0.0);
    });
  });
});
