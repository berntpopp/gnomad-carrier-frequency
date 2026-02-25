import { describe, it, expect, beforeEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useFilterStore } from "../useFilterStore";

describe("useFilterStore", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  describe("default state", () => {
    it("has lofHcEnabled: true by default", () => {
      const store = useFilterStore();
      expect(store.defaults.lofHcEnabled).toBe(true);
    });

    it("has clinvarEnabled: true by default", () => {
      const store = useFilterStore();
      expect(store.defaults.clinvarEnabled).toBe(true);
    });

    it("has missenseEnabled: true by default", () => {
      const store = useFilterStore();
      expect(store.defaults.missenseEnabled).toBe(true);
    });

    it("has clinvarStarThreshold: 2 by default", () => {
      const store = useFilterStore();
      expect(store.defaults.clinvarStarThreshold).toBe(2);
    });

    it("has clinvarIncludeConflicting: false by default", () => {
      const store = useFilterStore();
      expect(store.defaults.clinvarIncludeConflicting).toBe(false);
    });

    it("has clinvarConflictingThreshold: 80 by default", () => {
      const store = useFilterStore();
      expect(store.defaults.clinvarConflictingThreshold).toBe(80);
    });
  });

  describe("setLofHcEnabled", () => {
    it("disables LoF HC filter", () => {
      const store = useFilterStore();
      store.setLofHcEnabled(false);
      expect(store.defaults.lofHcEnabled).toBe(false);
    });

    it("re-enables LoF HC filter", () => {
      const store = useFilterStore();
      store.setLofHcEnabled(false);
      store.setLofHcEnabled(true);
      expect(store.defaults.lofHcEnabled).toBe(true);
    });
  });

  describe("setMissenseEnabled", () => {
    it("toggles missense filter on/off", () => {
      const store = useFilterStore();
      store.setMissenseEnabled(false);
      expect(store.defaults.missenseEnabled).toBe(false);
      store.setMissenseEnabled(true);
      expect(store.defaults.missenseEnabled).toBe(true);
    });
  });

  describe("setClinvarEnabled", () => {
    it("disables ClinVar filter", () => {
      const store = useFilterStore();
      store.setClinvarEnabled(false);
      expect(store.defaults.clinvarEnabled).toBe(false);
    });
  });

  describe("setClinvarStarThreshold", () => {
    it("updates ClinVar star threshold", () => {
      const store = useFilterStore();
      store.setClinvarStarThreshold(3);
      expect(store.defaults.clinvarStarThreshold).toBe(3);
    });

    it("clamps threshold to 0-4 range (below min)", () => {
      const store = useFilterStore();
      store.setClinvarStarThreshold(-1);
      expect(store.defaults.clinvarStarThreshold).toBe(0);
    });

    it("clamps threshold to 0-4 range (above max)", () => {
      const store = useFilterStore();
      store.setClinvarStarThreshold(10);
      expect(store.defaults.clinvarStarThreshold).toBe(4);
    });
  });

  describe("setClinvarIncludeConflicting", () => {
    it("enables conflicting classification inclusion", () => {
      const store = useFilterStore();
      store.setClinvarIncludeConflicting(true);
      expect(store.defaults.clinvarIncludeConflicting).toBe(true);
    });
  });

  describe("setDefaults (partial merge)", () => {
    it("merges partial updates without overwriting unspecified fields", () => {
      const store = useFilterStore();
      store.setDefaults({ clinvarStarThreshold: 0 });
      expect(store.defaults.clinvarStarThreshold).toBe(0);
      expect(store.defaults.lofHcEnabled).toBe(true); // unchanged
    });
  });

  describe("resetToFactoryDefaults", () => {
    it("restores all defaults to factory settings", () => {
      const store = useFilterStore();
      store.setLofHcEnabled(false);
      store.setClinvarStarThreshold(3);
      store.setMissenseEnabled(false);
      store.resetToFactoryDefaults();
      expect(store.defaults.lofHcEnabled).toBe(true);
      expect(store.defaults.clinvarStarThreshold).toBe(2);
      expect(store.defaults.missenseEnabled).toBe(true);
    });
  });

  describe("activeFiltersDescription getter", () => {
    it('returns description including "LoF HC" when enabled', () => {
      const store = useFilterStore();
      expect(store.activeFiltersDescription).toContain("LoF HC");
    });

    it('returns "No filters active" when all disabled', () => {
      const store = useFilterStore();
      store.setLofHcEnabled(false);
      store.setClinvarEnabled(false);
      store.setMissenseEnabled(false);
      expect(store.activeFiltersDescription).toBe("No filters active");
    });
  });
});
