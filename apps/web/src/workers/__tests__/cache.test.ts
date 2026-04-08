import { describe, it, expect, beforeEach } from "vitest";
import "fake-indexeddb/auto";
import {
  openVariantCache,
  getCachedResponse,
  putCachedResponse,
  clearAllCache,
  clearCacheByGene,
  getCacheSize,
  buildCacheKey,
} from "../cache";
import type { CachedResponse } from "../types";

function makeCachedResponse(
  overrides: Partial<CachedResponse> = {},
): CachedResponse {
  return {
    key: "BRCA1:gnomad_r4:GRCh38",
    geneSymbol: "BRCA1",
    dataset: "gnomad_r4",
    referenceGenome: "GRCh38",
    variants: [],
    clinvarVariants: [],
    totalVariantCount: 0,
    storedAt: Date.now(),
    ...overrides,
  };
}

describe("cache", () => {
  beforeEach(async () => {
    const db = await openVariantCache();
    const tx = db.transaction("variant-responses", "readwrite");
    await tx.objectStore("variant-responses").clear();
    await tx.done;
    db.close();
  });

  describe("buildCacheKey", () => {
    it("builds key from gene, dataset, referenceGenome", () => {
      expect(buildCacheKey("TTN", "gnomad_r4", "GRCh38")).toBe(
        "TTN:gnomad_r4:GRCh38",
      );
    });
  });

  describe("put and get", () => {
    it("stores and retrieves a cached response", async () => {
      const entry = makeCachedResponse();
      await putCachedResponse(entry);
      const result = await getCachedResponse(entry.key);
      expect(result).not.toBeNull();
      expect(result!.geneSymbol).toBe("BRCA1");
    });

    it("returns null for missing key", async () => {
      const result = await getCachedResponse("MISSING:key:here");
      expect(result).toBeNull();
    });
  });

  describe("clearAllCache", () => {
    it("removes all entries", async () => {
      await putCachedResponse(makeCachedResponse({ key: "A:d:r" }));
      await putCachedResponse(makeCachedResponse({ key: "B:d:r" }));
      expect(await getCacheSize()).toBe(2);
      await clearAllCache();
      expect(await getCacheSize()).toBe(0);
    });
  });

  describe("clearCacheByGene", () => {
    it("removes entries matching gene across datasets", async () => {
      await putCachedResponse(
        makeCachedResponse({ key: "TTN:gnomad_r4:GRCh38", geneSymbol: "TTN" }),
      );
      await putCachedResponse(
        makeCachedResponse({
          key: "TTN:gnomad_r2_1:GRCh37",
          geneSymbol: "TTN",
        }),
      );
      await putCachedResponse(
        makeCachedResponse({
          key: "BRCA1:gnomad_r4:GRCh38",
          geneSymbol: "BRCA1",
        }),
      );
      await clearCacheByGene("TTN");
      expect(await getCacheSize()).toBe(1);
      expect(await getCachedResponse("BRCA1:gnomad_r4:GRCh38")).not.toBeNull();
      expect(await getCachedResponse("TTN:gnomad_r4:GRCh38")).toBeNull();
    });
  });

  describe("getCacheSize", () => {
    it("returns count of cached entries", async () => {
      expect(await getCacheSize()).toBe(0);
      await putCachedResponse(makeCachedResponse({ key: "A:d:r" }));
      expect(await getCacheSize()).toBe(1);
    });
  });
});
