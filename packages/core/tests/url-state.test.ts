import { describe, it, expect } from "vitest";
import {
  parseUrlState,
  encodeFilterFlags,
  decodeFilterFlags,
  filtersMatchDefaults,
  calcMatchesDefaults,
  UrlStateSchema,
} from "../src/types/url-state.js";
import { FACTORY_FILTER_DEFAULTS } from "../src/types/filter.js";
import { FACTORY_CALC_DEFAULTS } from "../src/types/calculations.js";

describe("url-state utilities and schema", () => {
  describe("parseUrlState", () => {
    it("parses empty params with defaults", () => {
      const state = parseUrlState({});
      expect(state.step).toBe(1);
      expect(state.status).toBe("heterozygous");
      expect(state.source).toBe("gnomad");
      expect(state.penetrance).toBe(1.0);
    });

    it("parses valid parameters", () => {
      const state = parseUrlState({
        gene: "CFTR",
        step: "3",
        status: "homozygous",
        source: "literature",
        litFreq: "0.02",
        litPmid: "12345678",
        penetrance: "0.8",
      });
      expect(state.gene).toBe("CFTR");
      expect(state.step).toBe(3);
      expect(state.status).toBe("homozygous");
      expect(state.source).toBe("literature");
      expect(state.litFreq).toBe(0.02);
      expect(state.litPmid).toBe("12345678");
      expect(state.penetrance).toBe(0.8);
    });

    it("falls back to defaults on invalid values", () => {
      const state = parseUrlState({
        step: "99", // invalid step
        penetrance: "2.5", // invalid penetrance
      });
      expect(state.step).toBe(1);
      expect(state.penetrance).toBe(1.0);
    });
  });

  describe("encodeFilterFlags & decodeFilterFlags", () => {
    it("encodes all filters active", () => {
      const encoded = encodeFilterFlags({
        ...FACTORY_FILTER_DEFAULTS,
        lofHcEnabled: true,
        missenseEnabled: true,
        clinvarEnabled: true,
      });
      expect(encoded).toBe("lmc");
    });

    it("encodes subset of filters", () => {
      const encoded = encodeFilterFlags({
        ...FACTORY_FILTER_DEFAULTS,
        lofHcEnabled: true,
        missenseEnabled: false,
        clinvarEnabled: true,
      });
      expect(encoded).toBe("lc");
    });

    it("encodes none when all filters disabled", () => {
      const encoded = encodeFilterFlags({
        ...FACTORY_FILTER_DEFAULTS,
        lofHcEnabled: false,
        missenseEnabled: false,
        clinvarEnabled: false,
      });
      expect(encoded).toBe("none");
    });

    it("decodes none to all false", () => {
      const decoded = decodeFilterFlags("none");
      expect(decoded.lofHcEnabled).toBe(false);
      expect(decoded.missenseEnabled).toBe(false);
      expect(decoded.clinvarEnabled).toBe(false);
    });

    it("decodes flags string correctly", () => {
      const decoded = decodeFilterFlags("lm");
      expect(decoded.lofHcEnabled).toBe(true);
      expect(decoded.missenseEnabled).toBe(true);
      expect(decoded.clinvarEnabled).toBe(false);
    });
  });

  describe("filtersMatchDefaults & calcMatchesDefaults", () => {
    it("matches filter defaults", () => {
      expect(filtersMatchDefaults({ ...FACTORY_FILTER_DEFAULTS })).toBe(true);
      expect(
        filtersMatchDefaults({
          ...FACTORY_FILTER_DEFAULTS,
          lofHcEnabled: false,
        }),
      ).toBe(false);
    });

    it("matches calc defaults", () => {
      expect(calcMatchesDefaults({ ...FACTORY_CALC_DEFAULTS })).toBe(true);
      expect(
        calcMatchesDefaults({
          ...FACTORY_CALC_DEFAULTS,
          penetrance: 0.5,
        }),
      ).toBe(false);
    });
  });
});
