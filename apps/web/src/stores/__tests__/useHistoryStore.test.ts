import { describe, it, expect, beforeEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useHistoryStore } from "../useHistoryStore";
import type { HistoryEntry } from "@gnomad-cf/core/types";

/** Build a minimal valid HistoryEntry payload (omitting id and timestamp — addEntry adds those) */
function makeEntry(symbol = "CFTR"): Omit<HistoryEntry, "id" | "timestamp"> {
  return {
    gene: { ensembl_id: "ENSG00000001626", symbol },
    indexStatus: "affected",
    frequencySource: "gnomad",
    literatureFrequency: null,
    literaturePmid: null,
    filterConfig: {
      lofHcEnabled: true,
      missenseEnabled: true,
      clinvarEnabled: true,
      clinvarStarThreshold: 2,
      clinvarIncludeConflicting: false,
      clinvarConflictingThreshold: 80,
    },
    excludedVariantIds: [],
    results: {
      globalCarrierFrequency: 0.04,
      qualifyingVariantCount: 3,
      gnomadVersion: "v4.1",
    },
  };
}

describe("useHistoryStore", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  describe("default state", () => {
    it("starts with empty entries array", () => {
      const store = useHistoryStore();
      expect(store.entries).toEqual([]);
    });

    it("starts with maxEntries: 50", () => {
      const store = useHistoryStore();
      expect(store.settings.maxEntries).toBe(50);
    });

    it("isEmpty getter returns true initially", () => {
      const store = useHistoryStore();
      expect(store.isEmpty).toBe(true);
    });

    it("mostRecent getter returns null initially", () => {
      const store = useHistoryStore();
      expect(store.mostRecent).toBeNull();
    });
  });

  describe("addEntry", () => {
    it("adds an entry to the history", () => {
      const store = useHistoryStore();
      store.addEntry(makeEntry());
      expect(store.entries.length).toBe(1);
    });

    it("prepends entry (newest first)", () => {
      const store = useHistoryStore();
      store.addEntry(makeEntry("CFTR"));
      store.addEntry(makeEntry("HEXA"));
      expect(store.entries[0]!.gene.symbol).toBe("HEXA");
      expect(store.entries[1]!.gene.symbol).toBe("CFTR");
    });

    it("assigns a unique id and timestamp to each entry", () => {
      const store = useHistoryStore();
      store.addEntry(makeEntry());
      const entry = store.entries[0]!;
      expect(typeof entry.id).toBe("string");
      expect(entry.id.length).toBeGreaterThan(0);
      expect(typeof entry.timestamp).toBe("number");
      expect(entry.timestamp).toBeGreaterThan(0);
    });

    it("entryCount getter reflects added entries", () => {
      const store = useHistoryStore();
      store.addEntry(makeEntry());
      store.addEntry(makeEntry());
      expect(store.entryCount).toBe(2);
    });

    it("mostRecent getter returns the latest entry", () => {
      const store = useHistoryStore();
      store.addEntry(makeEntry("CFTR"));
      store.addEntry(makeEntry("HEXA"));
      expect(store.mostRecent!.gene.symbol).toBe("HEXA");
    });
  });

  describe("deleteEntry", () => {
    it("removes entry by ID", () => {
      const store = useHistoryStore();
      store.addEntry(makeEntry("CFTR"));
      const id = store.entries[0]!.id;
      store.deleteEntry(id);
      expect(store.entries.length).toBe(0);
    });

    it("does nothing for unknown ID", () => {
      const store = useHistoryStore();
      store.addEntry(makeEntry());
      store.deleteEntry("non-existent-id");
      expect(store.entries.length).toBe(1);
    });
  });

  describe("clearAll", () => {
    it("empties all entries", () => {
      const store = useHistoryStore();
      store.addEntry(makeEntry("CFTR"));
      store.addEntry(makeEntry("HEXA"));
      store.clearAll();
      expect(store.entries).toEqual([]);
      expect(store.isEmpty).toBe(true);
    });
  });

  describe("setMaxEntries", () => {
    it("updates maxEntries setting", () => {
      const store = useHistoryStore();
      store.setMaxEntries(100);
      expect(store.settings.maxEntries).toBe(100);
    });

    it("clamps to minimum 10", () => {
      const store = useHistoryStore();
      store.setMaxEntries(1);
      expect(store.settings.maxEntries).toBe(10);
    });

    it("clamps to maximum 200", () => {
      const store = useHistoryStore();
      store.setMaxEntries(999);
      expect(store.settings.maxEntries).toBe(200);
    });

    it("enforces new limit by trimming excess entries immediately", () => {
      const store = useHistoryStore();
      // Add 15 entries
      for (let i = 0; i < 15; i++) {
        store.addEntry(makeEntry(`GENE${i}`));
      }
      expect(store.entries.length).toBe(15);
      // Reduce max to 10 (minimum allowed value)
      store.setMaxEntries(10);
      expect(store.entries.length).toBe(10);
    });
  });

  describe("updateEntry", () => {
    it("updates entry fields by ID while preserving id and timestamp", () => {
      const store = useHistoryStore();
      store.addEntry(makeEntry("CFTR"));
      const original = store.entries[0]!;
      store.updateEntry(original.id, { excludedVariantIds: ["VAR001"] });
      const updated = store.entries[0]!;
      expect(updated.id).toBe(original.id);
      expect(updated.timestamp).toBe(original.timestamp);
      expect(updated.excludedVariantIds).toEqual(["VAR001"]);
    });
  });

  describe("getEntry", () => {
    it("finds entry by id", () => {
      const store = useHistoryStore();
      store.addEntry(makeEntry("CFTR"));
      const id = store.entries[0]!.id;
      const found = store.getEntry(id);
      expect(found?.gene.symbol).toBe("CFTR");
    });

    it("returns undefined for unknown id", () => {
      const store = useHistoryStore();
      expect(store.getEntry("unknown")).toBeUndefined();
    });
  });

  describe("groupedByDate getter", () => {
    it("returns empty array when no entries", () => {
      const store = useHistoryStore();
      expect(store.groupedByDate).toEqual([]);
    });

    it("groups entries by date", () => {
      const store = useHistoryStore();
      store.addEntry(makeEntry("CFTR"));
      store.addEntry(makeEntry("HEXA"));
      expect(store.groupedByDate.length).toBeGreaterThan(0);
      expect(store.groupedByDate[0]!.entries.length).toBeGreaterThanOrEqual(1);
    });
  });
});
