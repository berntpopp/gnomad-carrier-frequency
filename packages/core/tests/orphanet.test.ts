import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  selectBestPrevalence,
  selectPrimaryDisease,
  fetchOrphanetData,
  fetchDiseasesByGeneSymbol,
  fetchEpidemiology,
  fetchNaturalHistory,
} from "../src/orphanet/client.js";
import type {
  OrphanetDisease,
  OrphanetPrevalenceEntry,
} from "../src/orphanet/types.js";

describe("Orphanet client & heuristics", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("selectBestPrevalence", () => {
    it("returns null for empty entries", () => {
      expect(selectBestPrevalence([])).toBeNull();
    });

    it("prefers Validated status over Not yet validated", () => {
      const entry1: OrphanetPrevalenceEntry = {
        PrevalenceType: "Point prevalence",
        PrevalenceQualification: "Value and class",
        PrevalenceClass: "1-5 / 10 000",
        ValMoy: "2.0",
        PrevalenceGeographic: "Europe",
        PrevalenceValidationStatus: "Not yet validated",
        Source: "Test",
      };
      const entry2: OrphanetPrevalenceEntry = {
        PrevalenceType: "Prevalence at birth",
        PrevalenceQualification: "Value and class",
        PrevalenceClass: "1-5 / 10 000",
        ValMoy: "2.0",
        PrevalenceGeographic: "Europe",
        PrevalenceValidationStatus: "Validated",
        Source: "Test",
      };

      const best = selectBestPrevalence([entry1, entry2]);
      expect(best?.PrevalenceValidationStatus).toBe("Validated");
    });

    it("prefers Point prevalence over Prevalence at birth when validation status is equal", () => {
      const entry1: OrphanetPrevalenceEntry = {
        PrevalenceType: "Prevalence at birth",
        PrevalenceQualification: "Value and class",
        PrevalenceClass: "1-5 / 10 000",
        ValMoy: "2.0",
        PrevalenceGeographic: "Europe",
        PrevalenceValidationStatus: "Validated",
        Source: "Test",
      };
      const entry2: OrphanetPrevalenceEntry = {
        PrevalenceType: "Point prevalence",
        PrevalenceQualification: "Value and class",
        PrevalenceClass: "1-5 / 10 000",
        ValMoy: "2.0",
        PrevalenceGeographic: "Europe",
        PrevalenceValidationStatus: "Validated",
        Source: "Test",
      };

      const best = selectBestPrevalence([entry1, entry2]);
      expect(best?.PrevalenceType).toBe("Point prevalence");
    });
  });

  describe("selectPrimaryDisease", () => {
    it("returns undefined for empty array", () => {
      expect(selectPrimaryDisease([])).toBeUndefined();
    });

    it("prioritizes Autosomal Recessive diseases", () => {
      const adDisease: OrphanetDisease = {
        orphacode: 100,
        name: "AD Disease",
        orphanetUrl: "https://www.orpha.net/100",
        isAutosomalRecessive: false,
        bestPrevalence: {
          prevalenceClass: "1-5 / 10 000",
          geographic: "Europe",
          validationStatus: "Validated",
          valMoy: 50.0,
        },
      };

      const arDisease: OrphanetDisease = {
        orphacode: 200,
        name: "AR Disease",
        orphanetUrl: "https://www.orpha.net/200",
        isAutosomalRecessive: true,
        bestPrevalence: {
          prevalenceClass: "1-5 / 10 000",
          geographic: "Europe",
          validationStatus: "Validated",
          valMoy: 2.0,
        },
      };

      const primary = selectPrimaryDisease([adDisease, arDisease]);
      expect(primary?.name).toBe("AR Disease");
    });
  });

  describe("fetchOrphanetData integration", () => {
    it("fetches and enriches diseases for gene symbol", async () => {
      const mockGeneRes = {
        data: {
          results: [
            {
              ORPHAcode: 586,
              "Preferred term": "Cystic fibrosis",
              OrphanetURL: "https://www.orpha.net/586",
              Date: "2026-01-01",
              DisorderGeneAssociation: [],
            },
          ],
        },
      };

      const mockEpiRes = {
        data: {
          results: {
            Prevalence: [
              {
                PrevalenceType: "Point prevalence",
                PrevalenceQualification: "Value and class",
                PrevalenceClass: "1-5 / 10 000",
                ValMoy: "0.73",
                PrevalenceGeographic: "Europe",
                PrevalenceValidationStatus: "Validated",
                Source: "Test",
              },
            ],
          },
        },
      };

      const mockNatRes = {
        data: {
          results: {
            TypeOfInheritance: ["Autosomal recessive"],
          },
        },
      };

      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes("/rd-associated-genes/")) {
          return Promise.resolve({ ok: true, json: async () => mockGeneRes });
        }
        if (url.includes("/rd-epidemiology/")) {
          return Promise.resolve({ ok: true, json: async () => mockEpiRes });
        }
        if (url.includes("/rd-natural_history/")) {
          return Promise.resolve({ ok: true, json: async () => mockNatRes });
        }
        return Promise.resolve({ ok: false, status: 404 });
      });

      const result = await fetchOrphanetData("CFTR");
      expect(result.diseases.length).toBe(1);
      expect(result.diseases[0].name).toBe("Cystic fibrosis");
      expect(result.diseases[0].isAutosomalRecessive).toBe(true);
      const primary = selectPrimaryDisease(result.diseases);
      expect(primary?.name).toBe("Cystic fibrosis");
    });

    it("handles 404 cleanly by returning empty diseases", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      });

      const result = await fetchOrphanetData("UNKNOWN");
      expect(result.diseases).toEqual([]);
      expect(selectPrimaryDisease(result.diseases)).toBeUndefined();
    });
  });
});
