# TTN Performance Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the app hang when loading TTN (17k+ variants) by moving fetch/filter/aggregate into a Web Worker, adding IndexedDB caching, and optimizing Vue reactivity.

**Architecture:** Three layers — (1) Web Worker pipeline handles fetch, parse, filter, aggregate off the main thread via Comlink; (2) IndexedDB cache (idb library) stores gnomAD responses keyed by gene:dataset:referenceGenome; (3) Main thread uses shallowRef and debounced config changes, receiving only processed results from the worker.

**Tech Stack:** Vue 3, Comlink 4.x, idb 8.x, Vitest, Web Workers (Vite native), @gnomad-cf/core (unchanged)

---

## File Map

### New files

| File | Responsibility |
|------|---------------|
| `apps/web/src/workers/types.ts` | Shared types: WorkerResult, WorkerStatus, CachedResponse, ProcessGeneParams, RefilterParams |
| `apps/web/src/workers/cache.ts` | IndexedDB operations: open DB, get, put, clear, clearByGene, getCacheSize |
| `apps/web/src/workers/variant-pipeline.ts` | Pure functions orchestrating normalize, filter, quality flags, source classification, aggregate |
| `apps/web/src/workers/variant-worker.ts` | Worker entry point: handles messages, calls pipeline + cache |
| `apps/web/src/workers/variant-worker-api.ts` | Comlink wrapper exposing async API to main thread |
| `apps/web/src/workers/__tests__/cache.test.ts` | Cache unit tests |
| `apps/web/src/workers/__tests__/variant-pipeline.test.ts` | Pipeline unit tests |
| `apps/web/src/workers/__tests__/variant-worker-api.test.ts` | Integration tests with mocked worker |

### Modified files

| File | Change |
|------|--------|
| `apps/web/src/composables/useCarrierFrequency.ts` | Replace computed chains with worker API calls, shallowRef, debouncing |
| `apps/web/src/composables/useGeneVariants.ts` | Delegate to worker API instead of villus |
| `apps/web/src/components/VariantTable.vue:380-394` | Remove sourceCategoryMap computed, read from useCarrierFrequency |
| `apps/web/src/components/SettingsDialog.vue:803-834` | Add "Cache" section |
| `apps/web/src/components/wizard/StepResults.vue` | Add per-gene refresh icon, cache badge, processing status |
| `apps/web/package.json` | Add `idb` and `comlink` dependencies |

---

### Task 1: Install Dependencies

**Files:**
- Modify: `apps/web/package.json`

- [ ] **Step 1: Add idb and comlink**

```bash
cd apps/web && bun add idb comlink
```

- [ ] **Step 2: Verify installation**

Run: `bun install`
Expected: Clean install, no errors.

- [ ] **Step 3: Verify types resolve**

Run: `cd /home/bernt-popp/development/gnomad-carrier-frequency && bun run typecheck`
Expected: No new type errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/package.json bun.lock
git commit -m "chore(22): add idb and comlink dependencies"
```

---

### Task 2: Create Shared Worker Types

**Files:**
- Create: `apps/web/src/workers/types.ts`

- [ ] **Step 1: Write the types file**

```typescript
// Shared types for the variant processing web worker

import type {
  GnomadVariant,
  ClinVarVariant,
  FilterConfig,
  QualityFlag,
  QualitySettings,
  QualityExclusionConfig,
  CalcConfig,
} from "@gnomad-cf/core/types";
import type { SourceCategory } from "@gnomad-cf/core/filters";
import type { ClinVarSubmission } from "@gnomad-cf/core/queries";

/**
 * Parameters for processGene worker call.
 * Main thread sends these; worker fetches, caches, filters, aggregates.
 */
export interface ProcessGeneParams {
  geneSymbol: string;
  dataset: string;
  referenceGenome: string;
  apiEndpoint: string;
  filterConfig: FilterConfig;
  qualitySettings: QualitySettings;
  qualityExclusionConfig: QualityExclusionConfig;
  calcConfig: CalcConfig;
  excludedIds: string[];
  submissions: [string, ClinVarSubmission[]][];
  forceRefresh?: boolean;
  requestId: number;
}

/**
 * Parameters for refilter worker call.
 * Uses cached raw variants — no network fetch.
 */
export interface RefilterParams {
  filterConfig: FilterConfig;
  qualitySettings: QualitySettings;
  qualityExclusionConfig: QualityExclusionConfig;
  calcConfig: CalcConfig;
  excludedIds: string[];
  submissions: [string, ClinVarSubmission[]][];
  requestId: number;
}

/**
 * Pre-computed global statistics from the worker pipeline.
 */
export interface WorkerGlobalStats {
  totalAC: number;
  maxAN: number;
  sumAF: number;
  vcrs: number[];
  carrierFrequency: number | null;
  geneticPrevalence: number | null;
  bayesianPrevalence: number | null;
  formula: "hwe" | "simplified";
  homExclusionActive: boolean;
}

/**
 * Aggregated population data — serializable form of the Map returned
 * by aggregatePopulationFrequenciesWithConfig.
 */
export interface AggregatedPopEntry {
  code: string;
  carrierFrequency: number | null;
  sumAF: number;
  totalAC: number;
  maxAN: number;
  geneticPrevalence: number | null;
}

/**
 * Full result returned by the worker after processGene or refilter.
 */
export interface WorkerResult {
  /** Variants passing pathogenicity filters (before manual/quality exclusions) */
  filteredByPathogenicity: GnomadVariant[];
  /** Variants passing all exclusions (pathogenicity + manual + quality) */
  qualifyingVariants: GnomadVariant[];
  /** ClinVar variants from the API response */
  clinvarVariants: ClinVarVariant[];
  /** Quality flags per variant ID (serialized Map entries) */
  qualityFlagsMap: [string, QualityFlag[]][];
  /** Variant IDs excluded by quality config */
  qualityExcludedIds: string[];
  /** Source classification per variant ID (serialized Map entries) */
  sourceCategoryMap: [string, SourceCategory][];
  /** Aggregated population data (serialized from Map) */
  aggregatedPops: AggregatedPopEntry[] | null;
  /** Pre-computed global statistics */
  globalStats: WorkerGlobalStats;
  /** Total raw variant count before any filtering */
  totalVariantCount: number;
  /** Cache status for this request */
  cacheStatus: "hit" | "miss" | "stored" | "unavailable";
  /** Request ID for stale-result detection */
  requestId: number;
}

/**
 * Status updates posted by the worker during processing.
 */
export type WorkerStatus =
  | { type: "fetching"; requestId: number }
  | { type: "parsing"; totalVariants: number; requestId: number }
  | { type: "filtering"; requestId: number }
  | { type: "complete"; result: WorkerResult }
  | { type: "error"; message: string; requestId: number }
  | { type: "cache-hit"; geneSymbol: string; requestId: number };

/**
 * Cached gnomAD response stored in IndexedDB.
 */
export interface CachedResponse {
  key: string;
  geneSymbol: string;
  dataset: string;
  referenceGenome: string;
  variants: GnomadVariant[];
  clinvarVariants: ClinVarVariant[];
  totalVariantCount: number;
  storedAt: number;
}
```

- [ ] **Step 2: Verify types compile**

Run: `cd /home/bernt-popp/development/gnomad-carrier-frequency && bun run typecheck`
Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/workers/types.ts
git commit -m "feat(22): add shared worker types"
```

---

### Task 3: Implement IndexedDB Cache Layer

**Files:**
- Create: `apps/web/src/workers/cache.ts`
- Create: `apps/web/src/workers/__tests__/cache.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// apps/web/src/workers/__tests__/cache.test.ts
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
    // Clear between tests
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
        makeCachedResponse({
          key: "TTN:gnomad_r4:GRCh38",
          geneSymbol: "TTN",
        }),
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
```

- [ ] **Step 2: Install fake-indexeddb dev dependency**

```bash
cd apps/web && bun add -d fake-indexeddb
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd /home/bernt-popp/development/gnomad-carrier-frequency && bun run test -- --project web --testPathPattern cache.test`
Expected: FAIL — module `../cache` not found.

- [ ] **Step 4: Write the cache implementation**

```typescript
// apps/web/src/workers/cache.ts
import { openDB, type IDBPDatabase } from "idb";
import type { CachedResponse } from "./types";

const DB_NAME = "gnomad-cf-cache";
const DB_VERSION = 1;
const STORE_NAME = "variant-responses";

/**
 * Open (or create) the variant cache database.
 * Safe to call multiple times — idb handles upgrades.
 */
export async function openVariantCache(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    },
  });
}

/**
 * Build a cache key from gene, dataset, and reference genome.
 */
export function buildCacheKey(
  geneSymbol: string,
  dataset: string,
  referenceGenome: string,
): string {
  return `${geneSymbol}:${dataset}:${referenceGenome}`;
}

/**
 * Retrieve a cached response by key. Returns null if not found.
 */
export async function getCachedResponse(
  key: string,
): Promise<CachedResponse | null> {
  const db = await openVariantCache();
  try {
    const result = await db.get(STORE_NAME, key);
    return (result as CachedResponse) ?? null;
  } finally {
    db.close();
  }
}

/**
 * Store a response in the cache, overwriting any existing entry with the same key.
 */
export async function putCachedResponse(entry: CachedResponse): Promise<void> {
  const db = await openVariantCache();
  try {
    await db.put(STORE_NAME, entry);
  } finally {
    db.close();
  }
}

/**
 * Clear all cached responses.
 */
export async function clearAllCache(): Promise<void> {
  const db = await openVariantCache();
  try {
    await db.clear(STORE_NAME);
  } finally {
    db.close();
  }
}

/**
 * Clear all cached responses for a specific gene (across all datasets/versions).
 * Iterates the store and deletes keys starting with `{geneSymbol}:`.
 */
export async function clearCacheByGene(geneSymbol: string): Promise<void> {
  const db = await openVariantCache();
  try {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const prefix = `${geneSymbol}:`;

    let cursor = await store.openCursor();
    while (cursor) {
      if (typeof cursor.key === "string" && cursor.key.startsWith(prefix)) {
        await cursor.delete();
      }
      cursor = await cursor.continue();
    }
    await tx.done;
  } finally {
    db.close();
  }
}

/**
 * Get the number of cached gene responses.
 */
export async function getCacheSize(): Promise<number> {
  const db = await openVariantCache();
  try {
    return await db.count(STORE_NAME);
  } finally {
    db.close();
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd /home/bernt-popp/development/gnomad-carrier-frequency && bun run test -- --project web --testPathPattern cache.test`
Expected: All 6 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/workers/cache.ts apps/web/src/workers/__tests__/cache.test.ts apps/web/package.json bun.lock
git commit -m "feat(22): implement IndexedDB cache layer with tests"
```

---

### Task 4: Implement Variant Processing Pipeline

**Files:**
- Create: `apps/web/src/workers/variant-pipeline.ts`
- Create: `apps/web/src/workers/__tests__/variant-pipeline.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// apps/web/src/workers/__tests__/variant-pipeline.test.ts
import { describe, it, expect } from "vitest";
import { processVariants } from "../variant-pipeline";
import type { GnomadVariant, ClinVarVariant } from "@gnomad-cf/core/types";
import { FACTORY_FILTER_DEFAULTS } from "@gnomad-cf/core/types";
import { FACTORY_QUALITY_DEFAULTS, FACTORY_EXCLUSION_DEFAULTS } from "@gnomad-cf/core/types";
import { FACTORY_CALC_DEFAULTS } from "@gnomad-cf/core/types";

// Minimal variant that passes LoF HC filter
function makeLoFVariant(id: string, ac: number, an: number): GnomadVariant {
  return {
    variant_id: id,
    pos: 100,
    ref: "A",
    alt: "T",
    joint: {
      ac,
      an,
      homozygote_count: 0,
      hemizygote_count: 0,
      populations: [{ id: "nfe", ac, an, homozygote_count: 0 }],
    },
    transcript_consequence: {
      gene_symbol: "TEST",
      transcript_id: "ENST00000001",
      canonical: true,
      consequence_terms: ["stop_gained"],
      lof: "HC",
      lof_filter: null,
      lof_flags: null,
      hgvsc: "c.100A>T",
      hgvsp: "p.Lys34Ter",
    },
  };
}

// Variant that should NOT pass filters (no LoF, no ClinVar match)
function makeNonPathogenicVariant(id: string): GnomadVariant {
  return {
    variant_id: id,
    pos: 200,
    ref: "C",
    alt: "G",
    joint: {
      ac: 5,
      an: 100000,
      homozygote_count: 0,
      hemizygote_count: 0,
      populations: [],
    },
    transcript_consequence: {
      gene_symbol: "TEST",
      transcript_id: "ENST00000001",
      canonical: true,
      consequence_terms: ["synonymous_variant"],
      lof: null,
      lof_filter: null,
      lof_flags: null,
      hgvsc: null,
      hgvsp: null,
    },
  };
}

describe("processVariants", () => {
  const clinvarVariants: ClinVarVariant[] = [];

  it("filters to pathogenic variants and computes all outputs", () => {
    const variants = [
      makeLoFVariant("1-100-A-T", 10, 100000),
      makeLoFVariant("1-200-C-G", 5, 100000),
      makeNonPathogenicVariant("1-300-T-A"),
    ];

    const result = processVariants({
      variants,
      clinvarVariants,
      filterConfig: FACTORY_FILTER_DEFAULTS,
      qualitySettings: FACTORY_QUALITY_DEFAULTS,
      qualityExclusionConfig: FACTORY_EXCLUSION_DEFAULTS,
      calcConfig: FACTORY_CALC_DEFAULTS,
      excludedIds: [],
      submissions: [],
      version: "v4",
    });

    // 2 of 3 variants pass pathogenicity filter
    expect(result.filteredByPathogenicity).toHaveLength(2);
    // No exclusions, so qualifying = filtered
    expect(result.qualifyingVariants).toHaveLength(2);
    // Quality flags computed for each filtered variant
    expect(result.qualityFlagsMap.length).toBe(2);
    // Source categories computed
    expect(result.sourceCategoryMap.length).toBe(2);
    // Global stats computed
    expect(result.globalStats.carrierFrequency).not.toBeNull();
    expect(result.globalStats.totalAC).toBe(15);
    // Total variant count is the raw count
    expect(result.totalVariantCount).toBe(3);
  });

  it("applies manual exclusions to qualifying set but not filteredByPathogenicity", () => {
    const variants = [
      makeLoFVariant("1-100-A-T", 10, 100000),
      makeLoFVariant("1-200-C-G", 5, 100000),
    ];

    const result = processVariants({
      variants,
      clinvarVariants,
      filterConfig: FACTORY_FILTER_DEFAULTS,
      qualitySettings: FACTORY_QUALITY_DEFAULTS,
      qualityExclusionConfig: FACTORY_EXCLUSION_DEFAULTS,
      calcConfig: FACTORY_CALC_DEFAULTS,
      excludedIds: ["1-100-A-T"],
      submissions: [],
      version: "v4",
    });

    expect(result.filteredByPathogenicity).toHaveLength(2);
    expect(result.qualifyingVariants).toHaveLength(1);
    expect(result.qualifyingVariants[0].variant_id).toBe("1-200-C-G");
  });

  it("returns empty results when no variants pass filters", () => {
    const variants = [makeNonPathogenicVariant("1-300-T-A")];

    const result = processVariants({
      variants,
      clinvarVariants,
      filterConfig: FACTORY_FILTER_DEFAULTS,
      qualitySettings: FACTORY_QUALITY_DEFAULTS,
      qualityExclusionConfig: FACTORY_EXCLUSION_DEFAULTS,
      calcConfig: FACTORY_CALC_DEFAULTS,
      excludedIds: [],
      submissions: [],
      version: "v4",
    });

    expect(result.filteredByPathogenicity).toHaveLength(0);
    expect(result.qualifyingVariants).toHaveLength(0);
    expect(result.globalStats.carrierFrequency).toBeNull();
    expect(result.aggregatedPops).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /home/bernt-popp/development/gnomad-carrier-frequency && bun run test -- --project web --testPathPattern variant-pipeline.test`
Expected: FAIL — module `../variant-pipeline` not found.

- [ ] **Step 3: Write the pipeline implementation**

```typescript
// apps/web/src/workers/variant-pipeline.ts
// Pure functions that orchestrate the variant processing pipeline.
// Runs inside the web worker — no Vue dependencies.

import type {
  GnomadVariant,
  ClinVarVariant,
  FilterConfig,
  QualitySettings,
  QualityExclusionConfig,
  QualityFlag,
  CalcConfig,
} from "@gnomad-cf/core/types";
import type { GnomadVersion } from "@gnomad-cf/core/config";
import type { ClinVarSubmission } from "@gnomad-cf/core/queries";
import type { SourceCategory } from "@gnomad-cf/core/filters";
import {
  filterPathogenicVariantsConfigurable,
  classifyVariantSource,
} from "@gnomad-cf/core/filters";
import {
  computeQualityFlags,
  shouldExcludeByQuality,
} from "@gnomad-cf/core/filters";
import {
  aggregatePopulationFrequenciesWithConfig,
  calculateVCR,
  calculateGCR,
  calculateHWECarrierFrequency,
  calculateSimplifiedCarrierFrequency,
  calculateGeneticPrevalence,
  calculateBayesianPrevalence,
} from "@gnomad-cf/core/calculations";
import { config } from "@gnomad-cf/core/config";
import type {
  WorkerGlobalStats,
  AggregatedPopEntry,
} from "./types";

const { defaultCarrierFrequency } = config.settings;

export interface ProcessVariantsInput {
  variants: GnomadVariant[];
  clinvarVariants: ClinVarVariant[];
  filterConfig: FilterConfig;
  qualitySettings: QualitySettings;
  qualityExclusionConfig: QualityExclusionConfig;
  calcConfig: CalcConfig;
  excludedIds: string[];
  submissions: [string, ClinVarSubmission[]][];
  version: GnomadVersion;
}

export interface ProcessVariantsOutput {
  filteredByPathogenicity: GnomadVariant[];
  qualifyingVariants: GnomadVariant[];
  clinvarVariants: ClinVarVariant[];
  qualityFlagsMap: [string, QualityFlag[]][];
  qualityExcludedIds: string[];
  sourceCategoryMap: [string, SourceCategory][];
  aggregatedPops: AggregatedPopEntry[] | null;
  globalStats: WorkerGlobalStats;
  totalVariantCount: number;
}

/**
 * Run the full variant processing pipeline.
 * This is the main computation function — called by both processGene and refilter.
 */
export function processVariants(
  input: ProcessVariantsInput,
): ProcessVariantsOutput {
  const {
    variants,
    clinvarVariants,
    filterConfig,
    qualitySettings,
    qualityExclusionConfig,
    calcConfig,
    excludedIds,
    submissions,
    version,
  } = input;

  const submissionsMap = new Map(submissions);
  const excludedSet = new Set(excludedIds);

  // 1. Pathogenicity filter
  const filteredByPathogenicity = filterPathogenicVariantsConfigurable(
    variants,
    clinvarVariants,
    filterConfig,
    submissionsMap,
  );

  // 2. Quality flags for all pathogenicity-filtered variants
  const qualityFlagsEntries: [string, QualityFlag[]][] = [];
  for (const v of filteredByPathogenicity) {
    const flags = computeQualityFlags(v, qualitySettings);
    qualityFlagsEntries.push([v.variant_id, flags]);
  }

  // 3. Quality-excluded IDs
  const qualityExcludedIds: string[] = [];
  for (const [variantId, flags] of qualityFlagsEntries) {
    if (
      flags.length > 0 &&
      shouldExcludeByQuality(flags, qualityExclusionConfig)
    ) {
      qualityExcludedIds.push(variantId);
    }
  }
  const qualityExcludedSet = new Set(qualityExcludedIds);

  // 4. Qualifying variants (after manual + quality exclusions)
  const qualifyingVariants = filteredByPathogenicity.filter(
    (v) => !excludedSet.has(v.variant_id) && !qualityExcludedSet.has(v.variant_id),
  );

  // 5. Source classification for each filteredByPathogenicity variant
  const sourceCategoryEntries: [string, SourceCategory][] = [];
  for (const v of filteredByPathogenicity) {
    const category = classifyVariantSource(
      v,
      clinvarVariants,
      filterConfig,
      submissionsMap,
    );
    sourceCategoryEntries.push([v.variant_id, category]);
  }

  // 6. Aggregate population frequencies from qualifying variants
  let aggregatedPops: AggregatedPopEntry[] | null = null;
  if (qualifyingVariants.length > 0) {
    const aggMap = aggregatePopulationFrequenciesWithConfig(
      qualifyingVariants,
      version,
      calcConfig,
    );
    aggregatedPops = Array.from(aggMap.entries()).map(([code, data]) => ({
      code,
      ...data,
    }));
  }

  // 7. Global statistics
  const globalStats = computeGlobalStats(
    qualifyingVariants,
    calcConfig,
    filteredByPathogenicity.length === 0,
  );

  return {
    filteredByPathogenicity,
    qualifyingVariants,
    clinvarVariants,
    qualityFlagsMap: qualityFlagsEntries,
    qualityExcludedIds,
    sourceCategoryMap: sourceCategoryEntries,
    aggregatedPops,
    globalStats,
    totalVariantCount: variants.length,
  };
}

/**
 * Compute global carrier frequency, prevalence, and related stats.
 * Mirrors the logic from useCarrierFrequency.ts globalStats computed.
 */
function computeGlobalStats(
  qualifyingVariants: GnomadVariant[],
  calcConfig: CalcConfig,
  usingDefault: boolean,
): WorkerGlobalStats {
  const empty: WorkerGlobalStats = {
    totalAC: 0,
    maxAN: 0,
    sumAF: 0,
    vcrs: [],
    carrierFrequency: null,
    geneticPrevalence: null,
    bayesianPrevalence: null,
    formula: calcConfig.useHWEFormula ? "hwe" : "simplified",
    homExclusionActive: calcConfig.useHomExclusion,
  };

  if (usingDefault) {
    return { ...empty, carrierFrequency: defaultCarrierFrequency };
  }
  if (qualifyingVariants.length === 0) {
    return empty;
  }

  let sumAF = 0;
  let totalAC = 0;
  let maxAN = 0;
  const vcrs: number[] = [];

  for (const variant of qualifyingVariants) {
    let combinedAC: number;
    let combinedAN: number;
    let combinedAcHom: number;

    if (variant.joint) {
      combinedAC = variant.joint.ac;
      combinedAN = variant.joint.an;
      combinedAcHom = variant.joint.homozygote_count;
    } else {
      const exomeAC = variant.exome?.ac ?? 0;
      const genomeAC = variant.genome?.ac ?? 0;
      const exomeAN = variant.exome?.an ?? 0;
      const genomeAN = variant.genome?.an ?? 0;
      combinedAC = exomeAC + genomeAC;
      combinedAN = exomeAN + genomeAN;
      combinedAcHom = (variant.exome?.ac_hom ?? 0) + (variant.genome?.ac_hom ?? 0);
    }

    totalAC += combinedAC;
    maxAN = Math.max(maxAN, combinedAN);

    if (combinedAN > 0) {
      sumAF += combinedAC / combinedAN;
      if (calcConfig.useHomExclusion) {
        vcrs.push(calculateVCR(combinedAC, combinedAN, combinedAcHom));
      }
    }
  }

  const geneticPrevalence =
    sumAF > 0 ? calculateGeneticPrevalence([sumAF]) : null;
  const bayesianPrevalence =
    geneticPrevalence !== null
      ? calculateBayesianPrevalence(geneticPrevalence, calcConfig.penetrance)
      : null;

  let carrierFrequency: number | null = null;
  if (sumAF > 0) {
    if (calcConfig.useHomExclusion) {
      const gcr = calculateGCR(vcrs);
      carrierFrequency = gcr > 0 ? gcr : null;
    } else if (calcConfig.useHWEFormula) {
      const cf = calculateHWECarrierFrequency([sumAF]);
      carrierFrequency = cf > 0 ? cf : null;
    } else {
      const cf = calculateSimplifiedCarrierFrequency([sumAF]);
      carrierFrequency = cf > 0 ? cf : null;
    }
  }

  return {
    totalAC,
    maxAN,
    sumAF,
    vcrs,
    carrierFrequency,
    geneticPrevalence,
    bayesianPrevalence,
    formula: calcConfig.useHWEFormula ? "hwe" : "simplified",
    homExclusionActive: calcConfig.useHomExclusion,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /home/bernt-popp/development/gnomad-carrier-frequency && bun run test -- --project web --testPathPattern variant-pipeline.test`
Expected: All 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/workers/variant-pipeline.ts apps/web/src/workers/__tests__/variant-pipeline.test.ts
git commit -m "feat(22): implement variant processing pipeline with tests"
```

---

### Task 5: Implement Web Worker Entry Point

**Files:**
- Create: `apps/web/src/workers/variant-worker.ts`

- [ ] **Step 1: Write the worker implementation**

```typescript
// apps/web/src/workers/variant-worker.ts
// Web Worker entry point — handles messages via Comlink.
// Owns: fetch, cache, pipeline orchestration.

import * as Comlink from "comlink";
import { GENE_VARIANTS_QUERY } from "@gnomad-cf/core/queries";
import type {
  GeneVariantsResponse,
  GeneVariant,
  GeneClinvarVariant,
} from "@gnomad-cf/core/queries";
import type { GnomadVariant, ClinVarVariant } from "@gnomad-cf/core/types";
import type {
  ProcessGeneParams,
  RefilterParams,
  WorkerResult,
  CachedResponse,
} from "./types";
import {
  buildCacheKey,
  getCachedResponse,
  putCachedResponse,
  clearAllCache,
  clearCacheByGene,
  getCacheSize as getCacheSizeFromDB,
} from "./cache";
import { processVariants } from "./variant-pipeline";
import type { GnomadVersion } from "@gnomad-cf/core/config";

// In-memory state: raw variants for the current gene (used by refilter)
let currentVariants: GnomadVariant[] = [];
let currentClinvarVariants: ClinVarVariant[] = [];
let currentVersion: GnomadVersion = "v4";

/**
 * Normalize GeneVariant (API shape) to GnomadVariant (core shape).
 */
function normalizeVariant(v: GeneVariant): GnomadVariant {
  return {
    variant_id: v.variant_id,
    pos: v.pos,
    ref: v.ref,
    alt: v.alt,
    exome: v.exome ?? undefined,
    genome: v.genome ?? undefined,
    joint: v.joint ?? undefined,
    transcript_consequence: v.transcript_consequence,
  };
}

/**
 * Normalize GeneClinvarVariant to ClinVarVariant.
 */
function normalizeClinvar(cv: GeneClinvarVariant): ClinVarVariant {
  return {
    variant_id: cv.variant_id,
    clinvar_variation_id: cv.clinvar_variation_id,
    clinical_significance: cv.clinical_significance,
    gold_stars: cv.gold_stars,
    review_status: cv.review_status,
    pos: cv.pos,
    ref: cv.ref,
    alt: cv.alt,
  };
}

/**
 * Infer GnomadVersion from dataset string.
 */
function datasetToVersion(dataset: string): GnomadVersion {
  if (dataset.includes("r4")) return "v4";
  if (dataset.includes("r3")) return "v3";
  return "v2";
}

const workerApi = {
  async processGene(params: ProcessGeneParams): Promise<WorkerResult> {
    const {
      geneSymbol,
      dataset,
      referenceGenome,
      apiEndpoint,
      filterConfig,
      qualitySettings,
      qualityExclusionConfig,
      calcConfig,
      excludedIds,
      submissions,
      forceRefresh,
      requestId,
    } = params;

    const cacheKey = buildCacheKey(geneSymbol, dataset, referenceGenome);
    const version = datasetToVersion(dataset);
    let cacheStatus: WorkerResult["cacheStatus"] = "miss";

    // Try cache first (unless forceRefresh)
    if (!forceRefresh) {
      try {
        const cached = await getCachedResponse(cacheKey);
        if (cached) {
          currentVariants = cached.variants;
          currentClinvarVariants = cached.clinvarVariants;
          currentVersion = version;
          cacheStatus = "hit";

          const output = processVariants({
            variants: currentVariants,
            clinvarVariants: currentClinvarVariants,
            filterConfig,
            qualitySettings,
            qualityExclusionConfig,
            calcConfig,
            excludedIds,
            submissions,
            version,
          });

          return { ...output, cacheStatus, requestId };
        }
      } catch {
        // IndexedDB unavailable — proceed without cache
        cacheStatus = "unavailable";
      }
    }

    // Fetch from gnomAD API
    const response = await fetch(apiEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: GENE_VARIANTS_QUERY,
        variables: { geneSymbol, dataset, referenceGenome },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error("gnomAD API rate limit reached. Please wait a moment and try again.");
      }
      throw new Error(`Failed to fetch variant data (HTTP ${response.status}).`);
    }

    const json = (await response.json()) as { data?: GeneVariantsResponse; errors?: Array<{ message: string }> };

    if (json.errors?.length) {
      throw new Error(json.errors[0].message);
    }

    const gene = json.data?.gene;
    if (!gene) {
      throw new Error(`Gene "${geneSymbol}" not found in gnomAD database.`);
    }

    // Normalize
    currentVariants = gene.variants.map(normalizeVariant);
    currentClinvarVariants = gene.clinvar_variants.map(normalizeClinvar);
    currentVersion = version;

    // Cache the response
    if (cacheStatus !== "unavailable") {
      try {
        await putCachedResponse({
          key: cacheKey,
          geneSymbol,
          dataset,
          referenceGenome,
          variants: currentVariants,
          clinvarVariants: currentClinvarVariants,
          totalVariantCount: currentVariants.length,
          storedAt: Date.now(),
        });
        cacheStatus = "stored";
      } catch {
        // Cache write failed — continue without caching
        cacheStatus = "unavailable";
      }
    }

    // Process
    const output = processVariants({
      variants: currentVariants,
      clinvarVariants: currentClinvarVariants,
      filterConfig,
      qualitySettings,
      qualityExclusionConfig,
      calcConfig,
      excludedIds,
      submissions,
      version,
    });

    return { ...output, cacheStatus, requestId };
  },

  async refilter(params: RefilterParams): Promise<WorkerResult> {
    const output = processVariants({
      variants: currentVariants,
      clinvarVariants: currentClinvarVariants,
      filterConfig: params.filterConfig,
      qualitySettings: params.qualitySettings,
      qualityExclusionConfig: params.qualityExclusionConfig,
      calcConfig: params.calcConfig,
      excludedIds: params.excludedIds,
      submissions: params.submissions,
      version: currentVersion,
    });

    return {
      ...output,
      cacheStatus: "hit", // refilter always uses in-memory data
      requestId: params.requestId,
    };
  },

  async clearCache(geneSymbol?: string): Promise<void> {
    if (geneSymbol) {
      await clearCacheByGene(geneSymbol);
    } else {
      await clearAllCache();
    }
  },

  async getCacheSize(): Promise<number> {
    return getCacheSizeFromDB();
  },
};

export type VariantWorkerAPI = typeof workerApi;

Comlink.expose(workerApi);
```

- [ ] **Step 2: Verify types compile**

Run: `cd /home/bernt-popp/development/gnomad-carrier-frequency && bun run typecheck`
Expected: No new type errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/workers/variant-worker.ts
git commit -m "feat(22): implement web worker entry point with Comlink"
```

---

### Task 6: Create Comlink Worker API Wrapper

**Files:**
- Create: `apps/web/src/workers/variant-worker-api.ts`

- [ ] **Step 1: Write the API wrapper**

```typescript
// apps/web/src/workers/variant-worker-api.ts
// Wraps the web worker with Comlink for type-safe async calls.
// Singleton — one worker instance shared across the app.

import * as Comlink from "comlink";
import type { VariantWorkerAPI } from "./variant-worker";
import type { ProcessGeneParams, RefilterParams, WorkerResult } from "./types";

let worker: Worker | null = null;
let api: Comlink.Remote<VariantWorkerAPI> | null = null;

/**
 * Get or create the singleton variant worker.
 * Uses Vite's native worker support for correct bundling.
 */
function getWorkerAPI(): Comlink.Remote<VariantWorkerAPI> {
  if (api) return api;

  worker = new Worker(
    new URL("./variant-worker.ts", import.meta.url),
    { type: "module" },
  );

  api = Comlink.wrap<VariantWorkerAPI>(worker);
  return api;
}

/**
 * Process a gene: fetch (or load from cache), filter, aggregate.
 */
export async function processGene(
  params: ProcessGeneParams,
): Promise<WorkerResult> {
  return getWorkerAPI().processGene(params);
}

/**
 * Re-filter using the worker's in-memory cached variants.
 * No network fetch — instant for filter/exclusion changes.
 */
export async function refilter(
  params: RefilterParams,
): Promise<WorkerResult> {
  return getWorkerAPI().refilter(params);
}

/**
 * Clear cached variant responses.
 * @param geneSymbol - If provided, clears only entries for this gene.
 *                     If omitted, clears all cached entries.
 */
export async function clearCache(geneSymbol?: string): Promise<void> {
  return getWorkerAPI().clearCache(geneSymbol);
}

/**
 * Get the number of cached gene responses.
 */
export async function getCacheSize(): Promise<number> {
  return getWorkerAPI().getCacheSize();
}

/**
 * Terminate the worker and reset the singleton.
 * Used for error recovery (worker crash) and cleanup.
 */
export function terminateWorker(): void {
  if (worker) {
    worker.terminate();
    worker = null;
    api = null;
  }
}
```

- [ ] **Step 2: Verify types compile**

Run: `cd /home/bernt-popp/development/gnomad-carrier-frequency && bun run typecheck`
Expected: No new type errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/workers/variant-worker-api.ts
git commit -m "feat(22): add Comlink worker API wrapper"
```

---

### Task 7: Refactor useGeneVariants to Use Worker

**Files:**
- Modify: `apps/web/src/composables/useGeneVariants.ts`

- [ ] **Step 1: Rewrite useGeneVariants as thin wrapper**

Replace the entire file content with:

```typescript
// apps/web/src/composables/useGeneVariants.ts
// Thin wrapper that delegates variant fetching to the web worker.
// Preserves the same public interface (UseGeneVariantsReturn) for consumers.

import { computed, ref, watch, type Ref } from "vue";
import type { GeneVariantsResponse } from "@gnomad-cf/core/queries";
import type { GnomadVariant, ClinVarVariant } from "@gnomad-cf/core/types";
import {
  getDatasetId,
  getReferenceGenome,
  getApiEndpoint,
  type GnomadVersion,
} from "@gnomad-cf/core/config";
import { useGnomadVersion } from "@/api";

export interface UseGeneVariantsReturn {
  gene: Ref<GeneVariantsResponse["gene"]>;
  variants: Ref<GnomadVariant[]>;
  clinvarVariants: Ref<ClinVarVariant[]>;
  isLoading: Ref<boolean>;
  hasError: Ref<boolean>;
  errorMessage: Ref<string | null>;
  refetch: () => Promise<void>;
  hasData: Ref<boolean>;
  currentVersion: Ref<GnomadVersion>;
}

/**
 * useGeneVariants is now a state container only.
 * Actual fetching is done by the worker via useCarrierFrequency.
 * This composable stores the results and exposes the same interface.
 */
export function useGeneVariants(
  geneSymbol: Ref<string | null>,
): UseGeneVariantsReturn {
  const { version } = useGnomadVersion();

  // State populated by useCarrierFrequency after worker completes
  const variants = ref<GnomadVariant[]>([]);
  const clinvarVariants = ref<ClinVarVariant[]>([]);
  const isLoading = ref(false);
  const errorMessage = ref<string | null>(null);
  const hasData = ref(false);

  const gene = computed(() => (hasData.value ? ({} as GeneVariantsResponse["gene"]) : null));
  const hasError = computed(() => errorMessage.value !== null);

  // Reset state when gene changes
  watch(geneSymbol, () => {
    variants.value = [];
    clinvarVariants.value = [];
    hasData.value = false;
    errorMessage.value = null;
  });

  const refetch = async () => {
    // No-op — refetch is triggered via worker in useCarrierFrequency
  };

  return {
    gene,
    variants,
    clinvarVariants,
    isLoading,
    hasError,
    errorMessage,
    refetch,
    hasData,
    currentVersion: version,
  };
}
```

- [ ] **Step 2: Verify types compile**

Run: `cd /home/bernt-popp/development/gnomad-carrier-frequency && bun run typecheck`
Expected: May have warnings — address in Task 8 when useCarrierFrequency is refactored.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/composables/useGeneVariants.ts
git commit -m "refactor(22): convert useGeneVariants to worker-backed state container"
```

---

### Task 8: Refactor useCarrierFrequency to Use Worker

**Files:**
- Modify: `apps/web/src/composables/useCarrierFrequency.ts`

This is the largest change. The composable becomes a thin orchestrator that:
1. Sends processGene/refilter calls to the worker
2. Stores results in shallowRefs
3. Debounces all config changes
4. Manages the requestId generation counter

- [ ] **Step 1: Rewrite useCarrierFrequency**

Replace the entire file content of `apps/web/src/composables/useCarrierFrequency.ts` with:

```typescript
import { computed, ref, shallowRef, watch, type Ref } from "vue";
import { watchDebounced } from "@vueuse/core";
import { useClinvarSubmissions } from "./useClinvarSubmissions";
import { useExclusionState } from "./useExclusionState";
import {
  getConflictingVariantIds,
} from "@gnomad-cf/core/filters";
import {
  buildPopulationFrequencies,
  formatCarrierFrequency,
  formatPrevalence,
} from "@gnomad-cf/core/calculations";
import {
  config,
  getDatasetId,
  getReferenceGenome,
  getApiEndpoint,
  type GnomadVersion,
} from "@gnomad-cf/core/config";
import { useGnomadVersion } from "@/api";
import { useFilterStore } from "@/stores/useFilterStore";
import { useCalcStore } from "@/stores/useCalcStore";
import { useQualityStore } from "@/stores/useQualityStore";
import type { ClinVarSubmission } from "@gnomad-cf/core/queries";
import type {
  CarrierFrequencyResult,
  IndexPatientStatus,
  PopulationFrequency,
  GnomadVariant,
  ClinVarVariant,
  FilterConfig,
  QualityFlag,
  QualityExclusionConfig,
} from "@gnomad-cf/core/types";
import type { SourceCategory } from "@gnomad-cf/core/filters";
import type { WorkerResult, AggregatedPopEntry } from "@/workers/types";
import {
  processGene,
  refilter,
  clearCache,
  getCacheSize,
  terminateWorker,
} from "@/workers/variant-worker-api";

const { defaultCarrierFrequency } = config.settings;

export interface UseCarrierFrequencyReturn {
  geneSymbol: Ref<string | null>;
  setGeneSymbol: (symbol: string | null) => void;
  isLoading: Ref<boolean>;
  hasError: Ref<boolean>;
  errorMessage: Ref<string | null>;
  result: Ref<CarrierFrequencyResult | null>;
  globalFrequency: Ref<{ percent: string; ratio: string } | null>;
  populations: Ref<PopulationFrequency[]>;
  qualifyingVariantCount: Ref<number>;
  hasFounderEffect: Ref<boolean>;
  usingDefault: Ref<boolean>;
  geneticPrevalenceFormatted: Ref<{ ratio: string; percent: string } | null>;
  bayesianPrevalenceFormatted: Ref<{ ratio: string; percent: string } | null>;
  variants: Ref<GnomadVariant[]>;
  clinvarVariants: Ref<ClinVarVariant[]>;
  filterConfig: Ref<FilterConfig>;
  setFilterConfig: (config: FilterConfig) => void;
  submissions: Ref<Map<string, ClinVarSubmission[]>>;
  conflictingVariantIds: Ref<string[]>;
  isLoadingSubmissions: Ref<boolean>;
  submissionsProgress: Ref<number>;
  submissionsError: Ref<string | null>;
  retryFailedSubmissions: () => Promise<void>;
  currentVersion: Ref<GnomadVersion>;
  excludedCount: Ref<number>;
  totalPathogenicCount: Ref<number>;
  qualityExclusionConfig: Ref<QualityExclusionConfig>;
  setQualityExclusionConfig: (config: QualityExclusionConfig) => void;
  qualityFlagsMap: Ref<Map<string, QualityFlag[]>>;
  qualityExcludedCount: Ref<number>;
  flaggedVariantCount: Ref<number>;
  filteredByPathogenicity: Ref<GnomadVariant[]>;
  qualifyingVariants: Ref<GnomadVariant[]>;
  calculateRisk: (status: IndexPatientStatus) => {
    risk: number;
    percent: string;
    ratio: string;
  } | null;
  refetch: () => Promise<void>;
  // New: worker-specific
  processingStatus: Ref<string | null>;
  cacheStatus: Ref<WorkerResult["cacheStatus"] | null>;
  sourceCategoryMap: Ref<Map<string, SourceCategory>>;
  clearVariantCache: (geneSymbol?: string) => Promise<void>;
  getVariantCacheSize: () => Promise<number>;
}

let instance: UseCarrierFrequencyReturn | null = null;

export function useCarrierFrequency(): UseCarrierFrequencyReturn {
  if (instance) return instance;

  const geneSymbol = ref<string | null>(null);
  const { version } = useGnomadVersion();
  const filterStore = useFilterStore();
  const calcStore = useCalcStore();
  const qualityStore = useQualityStore();

  const setGeneSymbol = (symbol: string | null) => {
    geneSymbol.value = symbol?.toUpperCase() ?? null;
  };

  // Config state
  const filterConfig = ref<FilterConfig>({
    lofHcEnabled: filterStore.defaults.lofHcEnabled,
    missenseEnabled: filterStore.defaults.missenseEnabled,
    clinvarEnabled: filterStore.defaults.clinvarEnabled,
    clinvarStarThreshold: filterStore.defaults.clinvarStarThreshold,
    clinvarIncludeConflicting: filterStore.defaults.clinvarIncludeConflicting,
    clinvarConflictingThreshold: filterStore.defaults.clinvarConflictingThreshold,
  });
  const setFilterConfig = (cfg: FilterConfig) => {
    filterConfig.value = { ...cfg };
  };

  const qualityExclusionConfig = ref<QualityExclusionConfig>({
    ...qualityStore.exclusionDefaults,
  });
  const setQualityExclusionConfig = (cfg: QualityExclusionConfig) => {
    qualityExclusionConfig.value = { ...cfg };
  };

  // Exclusion state
  const { excluded, excludedCount } = useExclusionState();
  const debouncedExcluded = ref<Set<string>>(new Set());
  watchDebounced(
    excluded,
    (newExcluded) => { debouncedExcluded.value = new Set(newExcluded); },
    { debounce: 500, maxWait: 2000, immediate: true },
  );

  // ClinVar submissions (stays on main thread)
  const {
    submissions,
    isLoading: isLoadingSubmissions,
    error: submissionsError,
    progress: submissionsProgress,
    fetchSubmissions,
    retryFailed,
    clearSubmissions,
  } = useClinvarSubmissions();

  // Worker result state — shallowRefs for large arrays
  const isLoading = ref(false);
  const hasError = ref(false);
  const errorMessage = ref<string | null>(null);
  const processingStatus = ref<string | null>(null);
  const cacheStatus = ref<WorkerResult["cacheStatus"] | null>(null);

  const filteredByPathogenicity = shallowRef<GnomadVariant[]>([]);
  const qualifyingVariants = shallowRef<GnomadVariant[]>([]);
  const clinvarVariantsRef = shallowRef<ClinVarVariant[]>([]);
  const qualityFlagsMap = shallowRef<Map<string, QualityFlag[]>>(new Map());
  const qualityExcludedIds = shallowRef<Set<string>>(new Set());
  const sourceCategoryMap = shallowRef<Map<string, SourceCategory>>(new Map());
  const aggregatedPops = shallowRef<AggregatedPopEntry[] | null>(null);
  const workerGlobalStats = shallowRef<WorkerResult["globalStats"] | null>(null);
  const hasData = ref(false);

  // Request ID generation counter for stale-result detection
  let latestRequestId = 0;

  /**
   * Apply a WorkerResult to the reactive state.
   * Only applies if requestId matches the latest dispatched request.
   */
  function applyResult(result: WorkerResult): void {
    if (result.requestId !== latestRequestId) return; // stale

    filteredByPathogenicity.value = result.filteredByPathogenicity;
    qualifyingVariants.value = result.qualifyingVariants;
    clinvarVariantsRef.value = result.clinvarVariants;
    qualityFlagsMap.value = new Map(result.qualityFlagsMap);
    qualityExcludedIds.value = new Set(result.qualityExcludedIds);
    sourceCategoryMap.value = new Map(result.sourceCategoryMap);
    aggregatedPops.value = result.aggregatedPops;
    workerGlobalStats.value = result.globalStats;
    cacheStatus.value = result.cacheStatus;
    hasData.value = true;
    hasError.value = false;
    errorMessage.value = null;
    isLoading.value = false;
    processingStatus.value = null;
  }

  /**
   * Dispatch processGene to the worker.
   */
  async function dispatchProcessGene(forceRefresh = false): Promise<void> {
    const gene = geneSymbol.value;
    if (!gene) return;

    latestRequestId++;
    const requestId = latestRequestId;

    isLoading.value = true;
    hasError.value = false;
    errorMessage.value = null;
    processingStatus.value = `Fetching variants for ${gene}...`;

    try {
      const result = await processGene({
        geneSymbol: gene,
        dataset: getDatasetId(version.value),
        referenceGenome: getReferenceGenome(version.value),
        apiEndpoint: getApiEndpoint(version.value),
        filterConfig: filterConfig.value,
        qualitySettings: qualityStore.defaults,
        qualityExclusionConfig: qualityExclusionConfig.value,
        calcConfig: calcStore.defaults,
        excludedIds: Array.from(debouncedExcluded.value),
        submissions: Array.from(submissions.value.entries()),
        forceRefresh,
        requestId,
      });

      applyResult(result);
    } catch (err) {
      if (requestId !== latestRequestId) return; // stale
      hasError.value = true;
      errorMessage.value = err instanceof Error ? err.message : "Failed to load variant data.";
      isLoading.value = false;
      processingStatus.value = null;

      // Worker crash recovery: terminate and retry once
      if (errorMessage.value?.includes("Something went wrong")) {
        terminateWorker();
      }
    }
  }

  /**
   * Dispatch refilter to the worker.
   */
  async function dispatchRefilter(): Promise<void> {
    if (!hasData.value) return;

    latestRequestId++;
    const requestId = latestRequestId;

    try {
      const result = await refilter({
        filterConfig: filterConfig.value,
        qualitySettings: qualityStore.defaults,
        qualityExclusionConfig: qualityExclusionConfig.value,
        calcConfig: calcStore.defaults,
        excludedIds: Array.from(debouncedExcluded.value),
        submissions: Array.from(submissions.value.entries()),
        requestId,
      });

      applyResult(result);
    } catch (err) {
      if (requestId !== latestRequestId) return;
      hasError.value = true;
      errorMessage.value = err instanceof Error ? err.message : "Failed to process variants.";
    }
  }

  // Trigger processGene when gene or version changes
  watch([geneSymbol, version], () => {
    clearSubmissions();
    qualityExclusionConfig.value = { ...qualityStore.exclusionDefaults };
    if (geneSymbol.value) {
      dispatchProcessGene();
    } else {
      hasData.value = false;
      filteredByPathogenicity.value = [];
      qualifyingVariants.value = [];
      clinvarVariantsRef.value = [];
    }
  });

  // Debounced refilter on config/exclusion changes
  watchDebounced(
    [filterConfig, qualityExclusionConfig, () => calcStore.defaults],
    () => { dispatchRefilter(); },
    { debounce: 300, maxWait: 1000 },
  );

  watchDebounced(
    debouncedExcluded,
    () => { dispatchRefilter(); },
    { debounce: 100, maxWait: 500 },
  );

  // Auto-fetch submissions for conflicting variants
  const conflictingVariantIds = computed(() =>
    getConflictingVariantIds(clinvarVariantsRef.value),
  );

  watch(
    [() => filterConfig.value.clinvarIncludeConflicting, conflictingVariantIds],
    async ([includeConflicting, ids]) => {
      if (includeConflicting && ids.length > 0) {
        const missingIds = ids.filter((id) => !submissions.value.has(id));
        if (missingIds.length > 0) {
          await fetchSubmissions(missingIds);
        }
      }
    },
    { immediate: true },
  );

  // Refilter when submissions arrive
  watch(submissions, () => {
    if (hasData.value) dispatchRefilter();
  }, { deep: true });

  // Derived state (lightweight — no heavy iteration on main thread)
  const totalPathogenicCount = computed(() => filteredByPathogenicity.value.length);
  const qualifyingVariantCount = computed(() => qualifyingVariants.value.length);
  const usingDefault = computed(() => hasData.value && totalPathogenicCount.value === 0);
  const qualityExcludedCount = computed(() => qualityExcludedIds.value.size);
  const flaggedVariantCount = computed(() => {
    let count = 0;
    for (const flags of qualityFlagsMap.value.values()) {
      if (flags.length > 0) count++;
    }
    return count;
  });

  const globalCarrierFrequency = computed(
    () => workerGlobalStats.value?.carrierFrequency ?? null,
  );

  const populations = computed((): PopulationFrequency[] => {
    if (!aggregatedPops.value || globalCarrierFrequency.value === null) return [];
    // Convert AggregatedPopEntry[] back to Map for buildPopulationFrequencies
    const aggMap = new Map(
      aggregatedPops.value.map((e) => [
        e.code,
        {
          carrierFrequency: e.carrierFrequency,
          sumAF: e.sumAF,
          totalAC: e.totalAC,
          maxAN: e.maxAN,
          geneticPrevalence: e.geneticPrevalence,
        },
      ]),
    );
    return buildPopulationFrequencies(aggMap, globalCarrierFrequency.value, version.value);
  });

  const hasFounderEffect = computed(() =>
    populations.value.some((p) => p.isFounderEffect),
  );

  const globalFrequency = computed(() => {
    if (globalCarrierFrequency.value === null) return null;
    return formatCarrierFrequency(globalCarrierFrequency.value);
  });

  const geneticPrevalenceFormatted = computed(() => {
    const gp = workerGlobalStats.value?.geneticPrevalence;
    if (gp === null || gp === undefined) return null;
    return formatPrevalence(gp);
  });

  const bayesianPrevalenceFormatted = computed(() => {
    const bp = workerGlobalStats.value?.bayesianPrevalence;
    if (bp === null || bp === undefined) return null;
    return formatPrevalence(bp);
  });

  const result = computed((): CarrierFrequencyResult | null => {
    if (!geneSymbol.value || !hasData.value) return null;
    const stats = workerGlobalStats.value;
    if (!stats) return null;

    const freqs = populations.value
      .map((p) => p.carrierFrequency)
      .filter((f): f is number => f !== null);

    return {
      gene: geneSymbol.value,
      version: version.value,
      globalCarrierFrequency: stats.carrierFrequency,
      globalAlleleCount: stats.totalAC,
      globalAlleleNumber: stats.maxAN,
      populations: populations.value,
      qualifyingVariantCount: qualifyingVariantCount.value,
      minFrequency: freqs.length ? Math.min(...freqs) : null,
      maxFrequency: freqs.length ? Math.max(...freqs) : null,
      hasFounderEffect: hasFounderEffect.value,
      geneticPrevalence: stats.geneticPrevalence,
      bayesianPrevalence: stats.bayesianPrevalence,
      formula: stats.formula,
      homExclusionActive: stats.homExclusionActive,
    };
  });

  const calculateRisk = (status: IndexPatientStatus) => {
    if (globalCarrierFrequency.value === null) return null;
    const divisor = status === "heterozygous" ? 4 : 2;
    const risk = globalCarrierFrequency.value / divisor;
    return {
      risk,
      percent: `${(risk * 100).toFixed(2)}%`,
      ratio: risk > 0 ? `1:${Math.round(1 / risk)}` : "N/A",
    };
  };

  instance = {
    geneSymbol,
    setGeneSymbol,
    isLoading,
    hasError,
    errorMessage,
    result,
    globalFrequency,
    populations,
    qualifyingVariantCount,
    hasFounderEffect,
    usingDefault,
    geneticPrevalenceFormatted,
    bayesianPrevalenceFormatted,
    variants: filteredByPathogenicity, // alias for backward compat
    clinvarVariants: clinvarVariantsRef,
    filterConfig,
    setFilterConfig,
    submissions,
    conflictingVariantIds,
    isLoadingSubmissions,
    submissionsProgress,
    submissionsError,
    retryFailedSubmissions: retryFailed,
    currentVersion: version,
    excludedCount,
    totalPathogenicCount,
    qualityExclusionConfig,
    setQualityExclusionConfig,
    qualityFlagsMap,
    qualityExcludedCount,
    flaggedVariantCount,
    filteredByPathogenicity,
    qualifyingVariants,
    calculateRisk,
    refetch: () => dispatchProcessGene(true),
    processingStatus,
    cacheStatus,
    sourceCategoryMap,
    clearVariantCache: clearCache,
    getVariantCacheSize: getCacheSize,
  };

  return instance;
}
```

- [ ] **Step 2: Verify types compile**

Run: `cd /home/bernt-popp/development/gnomad-carrier-frequency && bun run typecheck`
Expected: Clean or only unrelated warnings.

- [ ] **Step 3: Run existing tests**

Run: `cd /home/bernt-popp/development/gnomad-carrier-frequency && bun run test`
Expected: Tests pass (some may need mock updates — fix in Task 9).

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/composables/useCarrierFrequency.ts
git commit -m "refactor(22): rewrite useCarrierFrequency as worker orchestrator"
```

---

### Task 9: Update VariantTable to Use Worker-Provided Source Categories

**Files:**
- Modify: `apps/web/src/components/VariantTable.vue:369-394`

- [ ] **Step 1: Replace the sourceCategoryMap computed**

In `apps/web/src/components/VariantTable.vue`, replace lines 369-394 (the `sourceCategoryMap` computed and its imports from `useCarrierFrequency`):

Remove these lines from the destructured `useCarrierFrequency()` call (around line 373):
```typescript
  filteredByPathogenicity,
  clinvarVariants,
  filterConfig,
  submissions,
```

Add `sourceCategoryMap` to the destructured call instead:
```typescript
const {
  qualityFlagsMap,
  sourceCategoryMap,
} = useCarrierFrequency();
```

Delete the entire `sourceCategoryMap` computed block (lines 380-394):
```typescript
// DELETE THIS:
const sourceCategoryMap = computed((): Map<string, SourceCategory> => {
  ...
});
```

Remove the `classifyVariantSource` import from `@gnomad-cf/core/filters` (line 349) — it's no longer needed in this file.

- [ ] **Step 2: Verify types compile**

Run: `cd /home/bernt-popp/development/gnomad-carrier-frequency && bun run typecheck`
Expected: No new type errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/VariantTable.vue
git commit -m "refactor(22): use worker-provided sourceCategoryMap in VariantTable"
```

---

### Task 10: Add Cache Section to Settings Dialog

**Files:**
- Modify: `apps/web/src/components/SettingsDialog.vue`

- [ ] **Step 1: Add the "Cache" section definition**

In `SettingsDialog.vue`, add to the `sections` array (after the existing "general" entry, around line 811):

No — add it as part of the existing "general" section since it already has "Disclaimer, cache, logging, history" in its subtitle. Instead, add a new card inside the `general` v-window-item.

After the existing "ClinGen Data Cache" card (around line 127), add:

```vue
<!-- Variant Cache Management Section -->
<v-card variant="outlined" class="mb-4">
  <v-card-title class="text-subtitle-1">
    <v-icon start size="small"> mdi-database-outline </v-icon>
    Variant Data Cache
  </v-card-title>

  <v-card-text>
    <div class="text-body-2 mb-3">
      Variant data fetched from gnomAD is cached locally for faster
      repeat access. Cache is keyed by gene, dataset, and genome
      build.
    </div>

    <div class="d-flex align-center justify-space-between">
      <div class="text-body-2">
        <span>{{ variantCacheSize }} gene{{ variantCacheSize === 1 ? '' : 's' }} cached</span>
      </div>

      <v-btn
        variant="text"
        size="small"
        :disabled="variantCacheSize === 0"
        @click="handleClearVariantCache"
      >
        <v-icon start size="small">mdi-delete-outline</v-icon>
        Clear Cache
      </v-btn>
    </div>
  </v-card-text>
</v-card>
```

In the `<script setup>` section, add:

```typescript
import { useCarrierFrequency } from "@/composables";

const { clearVariantCache, getVariantCacheSize } = useCarrierFrequency();

const variantCacheSize = ref(0);

async function loadVariantCacheSize() {
  try {
    variantCacheSize.value = await getVariantCacheSize();
  } catch {
    variantCacheSize.value = 0;
  }
}

async function handleClearVariantCache() {
  await clearVariantCache();
  variantCacheSize.value = 0;
}

// Load cache size when dialog opens
function onDialogOpen() {
  loadVariantCacheSize();
}
```

Update the `keywords` for the "general" section to include "variant":
```typescript
keywords: "disclaimer clingen cache logging history install app format frequency pwa variant",
```

- [ ] **Step 2: Verify types compile and app builds**

Run: `cd /home/bernt-popp/development/gnomad-carrier-frequency && bun run typecheck && bun run build`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/SettingsDialog.vue
git commit -m "feat(22): add variant cache management to Settings dialog"
```

---

### Task 11: Add Per-Gene Refresh and Cache Badge to StepResults

**Files:**
- Modify: `apps/web/src/components/wizard/StepResults.vue`

- [ ] **Step 1: Add refresh icon and cache badge**

In the `<script setup>` section of `StepResults.vue`, add to the existing `useCarrierFrequency()` destructure:

```typescript
const {
  // ... existing destructured values ...
  cacheStatus,
  processingStatus,
  refetch,
} = useCarrierFrequency();
```

In the template, find the gene name display (look for `geneSymbol` or the gene title area) and add adjacent:

```vue
<!-- Per-gene refresh button -->
<v-btn
  icon
  variant="text"
  size="x-small"
  :loading="isLoading"
  title="Re-fetch variant data from gnomAD"
  @click="refetch"
>
  <v-icon size="small">mdi-refresh</v-icon>
</v-btn>

<!-- Cache status badge -->
<v-chip
  v-if="cacheStatus === 'hit'"
  size="x-small"
  variant="tonal"
  color="blue-grey"
  class="ml-2"
>
  Cached
</v-chip>
```

Add processing status text near the loading indicator:

```vue
<div v-if="processingStatus" class="text-body-2 text-medium-emphasis mt-1">
  {{ processingStatus }}
</div>
```

- [ ] **Step 2: Verify the app builds**

Run: `cd /home/bernt-popp/development/gnomad-carrier-frequency && bun run build`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/wizard/StepResults.vue
git commit -m "feat(22): add per-gene refresh button and cache badge"
```

---

### Task 12: Fix Existing Tests

**Files:**
- Modify: Various test files that mock useCarrierFrequency or useGeneVariants

- [ ] **Step 1: Run all tests to identify failures**

Run: `cd /home/bernt-popp/development/gnomad-carrier-frequency && bun run test 2>&1 | head -100`
Expected: Some test failures due to changed composable interfaces.

- [ ] **Step 2: Update test mocks**

For each failing test, update the mock of `useCarrierFrequency` to include the new properties:

```typescript
// Add to existing mocks where useCarrierFrequency is mocked:
processingStatus: ref(null),
cacheStatus: ref(null),
sourceCategoryMap: ref(new Map()),
clearVariantCache: vi.fn(),
getVariantCacheSize: vi.fn().mockResolvedValue(0),
```

- [ ] **Step 3: Run tests to verify all pass**

Run: `cd /home/bernt-popp/development/gnomad-carrier-frequency && bun run test`
Expected: All tests PASS.

- [ ] **Step 4: Commit**

```bash
git add -u
git commit -m "test(22): update existing test mocks for worker-backed composables"
```

---

### Task 13: Verify Full Build and Typecheck

**Files:** None (verification only)

- [ ] **Step 1: Run typecheck**

Run: `cd /home/bernt-popp/development/gnomad-carrier-frequency && bun run typecheck`
Expected: No type errors.

- [ ] **Step 2: Run full build**

Run: `cd /home/bernt-popp/development/gnomad-carrier-frequency && bun run build`
Expected: Build succeeds, worker is bundled.

- [ ] **Step 3: Run all tests**

Run: `cd /home/bernt-popp/development/gnomad-carrier-frequency && bun run test`
Expected: All tests pass.

- [ ] **Step 4: Run lint**

Run: `cd /home/bernt-popp/development/gnomad-carrier-frequency && bun run lint`
Expected: No new lint errors.

- [ ] **Step 5: Commit any fixups**

```bash
git add -u
git commit -m "chore(22): fix lint and type issues"
```

---

### Task 14: Manual Smoke Test

**Files:** None (verification only)

- [ ] **Step 1: Start dev server**

Run: `cd /home/bernt-popp/development/gnomad-carrier-frequency && bun run dev`

- [ ] **Step 2: Test with a normal gene (CFTR)**

1. Navigate to http://localhost:5173
2. Search for CFTR
3. Verify variants load, filter, and display correctly
4. Verify carrier frequency calculation matches expected values

- [ ] **Step 3: Test with TTN (the problematic gene)**

1. Search for TTN
2. Verify the app does NOT hang
3. Verify loading status message appears ("Fetching variants for TTN...")
4. Verify results eventually display
5. Toggle filters — verify interactions remain responsive

- [ ] **Step 4: Test cache behavior**

1. Search for TTN again (or reload the page and re-search)
2. Verify "Cached" badge appears
3. Verify load is faster than first time
4. Go to Settings > General > Variant Data Cache
5. Verify cache count shows 1+ genes cached
6. Click "Clear Cache"
7. Re-search TTN — verify it re-fetches (no "Cached" badge initially)

- [ ] **Step 5: Test per-gene refresh**

1. With TTN loaded and showing "Cached" badge
2. Click the refresh icon next to the gene name
3. Verify it re-fetches and results update
