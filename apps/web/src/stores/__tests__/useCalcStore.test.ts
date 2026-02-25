import { describe, it, expect, beforeEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useCalcStore } from "../useCalcStore";

describe("useCalcStore", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  describe("default state", () => {
    it("has useHWEFormula: true by default", () => {
      const store = useCalcStore();
      expect(store.defaults.useHWEFormula).toBe(true);
    });

    it("has useHomExclusion: true by default", () => {
      const store = useCalcStore();
      expect(store.defaults.useHomExclusion).toBe(true);
    });

    it("has penetrance: 1.0 by default", () => {
      const store = useCalcStore();
      expect(store.defaults.penetrance).toBe(1.0);
    });
  });

  describe("setUseHWEFormula", () => {
    it("disables HWE formula", () => {
      const store = useCalcStore();
      store.setUseHWEFormula(false);
      expect(store.defaults.useHWEFormula).toBe(false);
    });

    it("re-enables HWE formula", () => {
      const store = useCalcStore();
      store.setUseHWEFormula(false);
      store.setUseHWEFormula(true);
      expect(store.defaults.useHWEFormula).toBe(true);
    });
  });

  describe("setUseHomExclusion", () => {
    it("disables homozygote exclusion", () => {
      const store = useCalcStore();
      store.setUseHomExclusion(false);
      expect(store.defaults.useHomExclusion).toBe(false);
    });
  });

  describe("setPenetrance", () => {
    it("sets penetrance to 0.5", () => {
      const store = useCalcStore();
      store.setPenetrance(0.5);
      expect(store.defaults.penetrance).toBe(0.5);
    });

    it("clamps penetrance to 0 when given negative value", () => {
      const store = useCalcStore();
      store.setPenetrance(-0.1);
      expect(store.defaults.penetrance).toBe(0);
    });

    it("clamps penetrance to 1 when given value > 1", () => {
      const store = useCalcStore();
      store.setPenetrance(1.5);
      expect(store.defaults.penetrance).toBe(1);
    });

    it("accepts penetrance of 0 (non-penetrant)", () => {
      const store = useCalcStore();
      store.setPenetrance(0);
      expect(store.defaults.penetrance).toBe(0);
    });
  });

  describe("setDefaults (partial merge)", () => {
    it("merges partial updates without overwriting unspecified fields", () => {
      const store = useCalcStore();
      store.setDefaults({ useHWEFormula: false });
      expect(store.defaults.useHWEFormula).toBe(false);
      expect(store.defaults.useHomExclusion).toBe(true); // unchanged
      expect(store.defaults.penetrance).toBe(1.0); // unchanged
    });
  });

  describe("resetToFactoryDefaults", () => {
    it("restores all defaults to factory settings", () => {
      const store = useCalcStore();
      store.setUseHWEFormula(false);
      store.setUseHomExclusion(false);
      store.setPenetrance(0.5);
      store.resetToFactoryDefaults();
      expect(store.defaults.useHWEFormula).toBe(true);
      expect(store.defaults.useHomExclusion).toBe(true);
      expect(store.defaults.penetrance).toBe(1.0);
    });
  });
});
