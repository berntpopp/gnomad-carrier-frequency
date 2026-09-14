import { describe, it, expect } from "vitest";
import {
  getLoeufInterpretation,
  getPliInterpretation,
} from "../src/types/constraint.js";

describe("constraint metric interpretations", () => {
  describe("getLoeufInterpretation", () => {
    it("handles null LOEUF", () => {
      expect(getLoeufInterpretation(null, "v4")).toEqual({
        level: "unknown",
        label: "N/A",
        color: "grey",
      });
    });

    it("interprets v4 LOEUF thresholds", () => {
      // v4: constrained < 0.6, tolerant > 1.5
      expect(getLoeufInterpretation(0.3, "v4.1").level).toBe("constrained");
      expect(getLoeufInterpretation(1.8, "v4.1").level).toBe("tolerant");
      expect(getLoeufInterpretation(0.9, "v4.1").level).toBe("intermediate");
    });

    it("interprets v2/v3 LOEUF thresholds", () => {
      // v2: constrained < 0.35, tolerant > 1.0
      expect(getLoeufInterpretation(0.2, "v2.1").level).toBe("constrained");
      expect(getLoeufInterpretation(1.2, "v2.1").level).toBe("tolerant");
      expect(getLoeufInterpretation(0.5, "v2.1").level).toBe("intermediate");
    });
  });

  describe("getPliInterpretation", () => {
    it("handles null pLI", () => {
      expect(getPliInterpretation(null)).toEqual({
        label: "N/A",
        color: "grey",
      });
    });

    it("interprets pLI >= 0.9 as intolerant", () => {
      expect(getPliInterpretation(0.95).label).toContain("LoF intolerant");
      expect(getPliInterpretation(0.9).label).toContain("LoF intolerant");
    });

    it("interprets pLI <= 0.1 as tolerant", () => {
      expect(getPliInterpretation(0.05).label).toContain("LoF tolerant");
      expect(getPliInterpretation(0.1).label).toContain("LoF tolerant");
    });

    it("interprets intermediate pLI", () => {
      expect(getPliInterpretation(0.5).label).toBe("Intermediate");
    });
  });
});
