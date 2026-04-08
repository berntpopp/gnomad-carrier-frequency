# TTN Performance Fix — Design Spec

**Issue:** [#22 — TTN makes app hang](https://github.com/berntpopp/gnomad-carrier-frequency/issues/22)
**Date:** 2026-04-08
**Status:** Approved design

## Problem

The gene TTN has 17,000+ variants. The app fetches all variants in a single GraphQL response (gnomAD API offers no pagination), then processes them synchronously on the main thread through a cascade of Vue computed properties. This blocks the UI for seconds, making the app appear frozen.

The bottleneck is not the network fetch — it is the client-side processing: JSON parsing, normalization, pathogenicity filtering, quality flag computation, frequency aggregation, and reactive tracking of 17k+ objects.

## Solution Overview

Three independent optimization layers:

1. **Web Worker Pipeline** — Move fetch, parse, filter, and aggregate entirely off the main thread
2. **IndexedDB Cache** — Version-keyed caching of gnomAD responses to eliminate repeat fetches
3. **Reactivity Optimization** — `shallowRef` for large arrays, debounced config changes, eliminated computed chains

The main thread never processes the full raw gnomAD response through heavy computed chains. It receives already-normalized, already-filtered worker outputs — which are still arrays of variant objects that the table, exports, and subcontinental follow-up code consume directly.

## Architecture

```
+-----------------------------------------------------------+
|  Main Thread (Vue/Vuetify)                                |
|                                                           |
|  useCarrierFrequency  -->  VariantTable                   |
|    (receives processed     (v-data-table, paginated)      |
|     results via refs)                                     |
|         ^                                                 |
|    postMessage (Comlink)                                  |
|         |                                                 |
+---------|--------------------------------------------------+
|  Web Worker                                               |
|                                                           |
|  fetch gnomAD --> parse JSON --> filter --> aggregate      |
|       |                              |                    |
|       v                              v                    |
|  IndexedDB cache             Return processed results     |
|  (idb library)               to main thread               |
+-----------------------------------------------------------+
```

## Layer 1: Web Worker Pipeline

### New files

- `apps/web/src/workers/variant-worker.ts` — Worker implementation
- `apps/web/src/workers/variant-worker-api.ts` — Comlink wrapper
- `apps/web/src/workers/types.ts` — Shared types
- `apps/web/src/workers/cache.ts` — IndexedDB operations

### Worker API

```typescript
interface VariantWorkerAPI {
  processGene(params: {
    geneSymbol: string;
    dataset: string;
    referenceGenome: string;
    apiEndpoint: string;
    filterConfig: FilterConfig;
    qualityConfig: QualityConfig;
    calcConfig: CalcConfig;
    excludedIds: string[];
    forceRefresh?: boolean;
  }): Promise<WorkerResult>;

  refilter(params: {
    filterConfig: FilterConfig;
    qualityConfig: QualityConfig;
    calcConfig: CalcConfig;
    excludedIds: string[];
  }): Promise<WorkerResult>;

  clearCache(geneSymbol?: string): Promise<void>;
  getCacheSize(): Promise<number>;
}
```

### Worker result shape

The current app exposes both pre-exclusion (`filteredByPathogenicity`) and post-exclusion (`qualifyingVariants`) sets, and downstream code depends on that split (e.g., `VariantTable` source classification uses `filteredByPathogenicity`, while `StepResults` subcontinental lookup uses `qualifyingVariants`). The worker result preserves this contract explicitly.

```typescript
interface WorkerResult {
  // Pre-exclusion: variants passing pathogenicity filters only.
  // Used by VariantTable display, source classification, and quality flag UI.
  filteredByPathogenicity: GnomadVariant[];

  // Post-exclusion: variants passing pathogenicity + manual + quality exclusions.
  // Used by frequency calculations, population table, exports, subcontinental follow-up.
  qualifyingVariants: GnomadVariant[];

  // ClinVar variants (unchanged from API response, normalized)
  clinvarVariants: ClinVarVariant[];

  // Quality flags for all filteredByPathogenicity variants
  qualityFlagsMap: [string, QualityFlag[]][];

  // IDs excluded by quality config (subset of filteredByPathogenicity)
  qualityExcludedIds: string[];

  // Source classification for each variant in filteredByPathogenicity.
  // Pre-computed in worker to avoid recomputing on main thread.
  sourceCategoryMap: [string, SourceCategory][];

  // Pre-computed population aggregation from qualifyingVariants
  aggregatedPops: AggregatedPopulations | null;

  // Pre-computed global statistics from qualifyingVariants
  globalStats: {
    totalAC: number;
    maxAN: number;
    sumAF: number;
    vcrs: number[];
    carrierFrequency: number | null;
    geneticPrevalence: number | null;
    bayesianPrevalence: number | null;
    formula: 'hwe' | 'simplified';
    homExclusionActive: boolean;
  };

  // Total raw variant count before any filtering
  totalVariantCount: number;

  cacheStatus: 'hit' | 'miss' | 'stored' | 'unavailable';

  // Monotonically increasing counter — main thread ignores results
  // whose requestId doesn't match the latest dispatched request.
  requestId: number;
}
```

### Worker status messages

```typescript
type WorkerStatus =
  | { type: 'fetching'; requestId: number }
  | { type: 'parsing'; totalVariants: number; requestId: number }
  | { type: 'filtering'; requestId: number }
  | { type: 'complete'; result: WorkerResult }
  | { type: 'error'; message: string; requestId: number }
  | { type: 'cache-hit'; geneSymbol: string; requestId: number }
```

### Stale result / race policy

When users change gene, version, or settings rapidly, multiple `processGene()` and `refilter()` calls can overlap. A generation counter prevents stale results from overwriting fresh ones.

**Mechanism:**
1. The main thread maintains a monotonically increasing `latestRequestId: number` counter.
2. Before each `processGene()` or `refilter()` call, the counter increments and the new value is passed to the worker as `requestId`.
3. The worker includes this `requestId` in all status messages and in the final `WorkerResult`.
4. When the main thread receives a `WorkerResult` or status update, it checks `result.requestId === latestRequestId`. If they don't match, the result is silently discarded.

**Edge cases:**
- Gene change mid-flight: new `processGene()` gets a new `requestId`. The in-flight worker call completes but its result is discarded. The worker's in-memory cached raw variants are replaced by the new gene's data.
- Rapid filter toggles: debouncing (300-500ms) coalesces most rapid changes into a single `refilter()` call. If two refilter calls do overlap, only the latest `requestId` wins.
- Worker does not abort in-flight work (no `AbortController` complexity). Stale results are simply ignored on arrival. This is acceptable because filter/aggregate operations complete in <100ms even for TTN-sized sets.

### Key design decisions

- **`refilter` method:** After initial fetch+process, filter/exclusion changes don't re-fetch. The worker holds raw variants in memory and refilters from them. This makes filter interactions instant.
- **Worker makes the fetch:** The worker calls `fetch()` directly (not villus — workers can't use Vue plugins). The GraphQL query string is imported from `@gnomad-cf/core/queries`.
- **Core package unchanged:** All filter/calculation functions from `@gnomad-cf/core` are pure TypeScript and import directly into the worker.

### ClinVar conflicting submissions path

The current pathogenicity filter depends on asynchronously fetched ClinVar submissions when `clinvarIncludeConflicting` is enabled (`useCarrierFrequency.ts:224-242`). These submissions are fetched per-variant from a separate ClinVar API endpoint.

**Decision: Submissions stay on the main thread, passed into the worker as input.**

Rationale:
- Submissions are fetched incrementally (one per conflicting variant) with progress tracking — this interactive, incremental UX doesn't fit a single worker call.
- `useClinvarSubmissions` manages its own async state, retry logic, and progress reporting that's tightly coupled to UI feedback.
- The submission data is small (only conflicting variants, typically 0-5 per gene).

**Flow:**
1. Worker runs initial `processGene()` with `submissions: Map<string, ClinVarSubmission[]>` (empty on first call if conflicting filter is off).
2. Main thread detects conflicting variant IDs from worker result's `clinvarVariants`.
3. Main thread fetches submissions via existing `useClinvarSubmissions` (unchanged).
4. When submissions arrive, main thread calls `worker.refilter({ ..., submissions })` with the updated submissions map.
5. Worker re-runs pathogenicity filter with the new submissions data and returns updated results.

Both `processGene` and `refilter` accept a `submissions` parameter:

```typescript
processGene(params: {
  // ... existing params ...
  submissions: [string, ClinVarSubmission[]][];  // serializable Map entries
}): Promise<WorkerResult>;

refilter(params: {
  // ... existing params ...
  submissions: [string, ClinVarSubmission[]][];
}): Promise<WorkerResult>;
```

## Layer 2: IndexedDB Cache

### Storage design

- **Database:** `gnomad-cf-cache`
- **Object store:** `variant-responses`
- **Key format:** `{geneSymbol}:{dataset}:{referenceGenome}` (e.g., `TTN:gnomad_r4:GRCh38`)

### Cached value

```typescript
interface CachedResponse {
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

### Invalidation strategy

- **Version-keyed:** Cache key includes dataset and reference genome. Switching gnomAD version automatically uses a different key — old data is not matched.
- **No TTL:** gnomAD data changes only with major releases (~annually). No time-based expiration.
- **Per-gene refresh:** `processGene({ ..., forceRefresh: true })` skips cache read and overwrites the existing entry for that key after fetching.
- **Per-gene clear:** `clearCache(geneSymbol)` deletes all entries matching that gene symbol across all dataset/version combinations (iterates the store, deletes keys starting with `{geneSymbol}:`).
- **Global clear:** `clearCache()` (no argument) drops the entire `variant-responses` object store contents.

### Graceful degradation

If IndexedDB is unavailable (private browsing, quota exceeded), the worker silently skips caching. The app works identically, just without cache benefits. `cacheStatus` reports `'unavailable'`.

### Dependency

`idb` (~1.5KB gzipped) — used inside the worker only.

## Layer 3: Reactivity Optimization

### `shallowRef` for large arrays

```typescript
const filteredByPathogenicity = shallowRef<GnomadVariant[]>([]);
const qualifyingVariants = shallowRef<GnomadVariant[]>([]);
const clinvarVariants = shallowRef<ClinVarVariant[]>([]);
const qualityFlagsMap = shallowRef<Map<string, QualityFlag[]>>(new Map());
const qualityExcludedIds = shallowRef<Set<string>>(new Set());
const sourceCategoryMap = shallowRef<Map<string, SourceCategory>>(new Map());
```

Vue tracks only reference changes, not deep object properties. When the worker posts new results, the entire ref is replaced.

### Debounced config changes

All config changes debounced before sending to worker:

- Filter config → 300ms → `worker.refilter()`
- Quality exclusion config → 300ms → `worker.refilter()`
- Manual exclusions → 500ms (existing) → `worker.refilter()`

### Eliminated computed chain

**Before (current):** 6+ chained computeds, each iterating the full variant array on the main thread.

**After:** Worker returns pre-computed results. Main thread computeds derive from worker output:

| Computation | Location |
|-------------|----------|
| `normalizedVariants` | Worker (at parse time) |
| `filteredByPathogenicity` | Worker (`refilter`) |
| `qualityFlagsMap` | Worker (during filter) |
| `qualityExcludedIds` | Worker (applied during filter) |
| `pathogenicVariants` / `qualifyingVariants` | Worker (final output, post-exclusion) |
| `sourceCategoryMap` | Worker (during filter, per `filteredByPathogenicity` variant) |
| `aggregatedPops` | Worker (during aggregate, from `qualifyingVariants`) |
| `globalStats` | Main thread (lightweight math on worker-provided values) |
| `populations` | Main thread (lightweight formatting) |
| `result` | Main thread (assembles final object) |

## Rendering

The `VariantTable.vue` component keeps `v-data-table` with pagination (no change to virtual scrolling). Rationale: the worker ensures the table only receives the filtered variant set (typically <100 even for TTN after pathogenicity filters), so the paginated table performs fine. This preserves expandable rows and avoids UI regression.

## Loading UX

### Progress phases

1. **Fetching:** "Fetching variants for TTN..."
2. **Processing (cache miss):** "Processing 17,432 variants..."
3. **Processing (cache hit):** "Loading cached data for TTN..."

### Cache status badge

After results load, a subtle "Cached" chip appears next to the gene name when results came from IndexedDB.

## UI: Cache Management

### Settings dialog

New "Cache" section in `SettingsDialog.vue`:
- "Clear variant cache" button
- Display number of cached genes

### Per-gene refresh

Small refresh icon button next to gene name in `StepResults.vue`. Triggers `processGene({ forceRefresh: true })`.

## Error Handling

| Failure | User message | Recovery |
|---------|-------------|----------|
| Network error | "Failed to fetch variant data. Check your connection and try again." | Retry button |
| API rate limit (429) | "gnomAD API rate limit reached. Please wait a moment and try again." | Auto-retry after 5s, once |
| JSON parse error | "Received invalid data from gnomAD. Try refreshing." | Per-gene refresh |
| IndexedDB unavailable | Silent — skip caching | No action needed |
| IndexedDB write failure | Silent — data works, not cached | Console log |
| Worker crash | "Something went wrong processing variant data." | Terminate + recreate worker, retry once |

## File Changes

### New files

| File | Purpose |
|------|---------|
| `apps/web/src/workers/variant-worker.ts` | Web Worker implementation |
| `apps/web/src/workers/variant-worker-api.ts` | Comlink wrapper |
| `apps/web/src/workers/types.ts` | Shared types |
| `apps/web/src/workers/cache.ts` | IndexedDB operations via `idb` |
| `apps/web/src/workers/__tests__/variant-worker.test.ts` | Worker unit tests |
| `apps/web/src/workers/__tests__/cache.test.ts` | Cache logic tests |

### Modified files

| File | Change |
|------|--------|
| `apps/web/src/composables/useCarrierFrequency.ts` | Major refactor — thin orchestrator calling worker API, `shallowRef`, debounced config |
| `apps/web/src/composables/useGeneVariants.ts` | Retained as a thin wrapper that delegates to the worker API instead of villus. Keeps the same public interface (`UseGeneVariantsReturn`) so other components don't break. The villus `useQuery` call is replaced by a call to the worker's `processGene`. |
| `apps/web/src/components/SettingsDialog.vue` | Add "Cache" section |
| `apps/web/src/components/wizard/StepResults.vue` | Per-gene refresh icon, cache badge, processing status |
| `apps/web/src/components/VariantTable.vue` | Remove `sourceCategoryMap` computed; read pre-computed source categories from worker result via `useCarrierFrequency` ref |
| `apps/web/package.json` | Add `idb` and `comlink` dependencies |

### Unchanged

| Area | Why |
|------|-----|
| `packages/core/*` | Pure functions — imported by worker as-is |
| All other components | Consume same reactive interface |
| Pinia stores | Same stores, same persistence |

## Testing

### Worker unit tests
- Cache key generation, hit/miss, version invalidation, `forceRefresh`, `clearCache`
- Filter pipeline integration (known inputs, expected outputs)
- Status message ordering
- Error paths (fetch failures)

### Integration tests
- Full round-trip with mocked gnomAD API
- `refilter` without re-fetch verification

### Existing tests
- `@gnomad-cf/core` tests unchanged
- `VariantTable.vue` tests — minimal changes
- `useCarrierFrequency` tests — updated to mock worker API
- E2E/screenshot tests — same UI output, should pass unchanged

## Dependencies

| Package | Version | Size | Used in |
|---------|---------|------|---------|
| `idb` | ^8.x | ~1.5KB gzip | Worker (cache) |
| `comlink` | ^4.x | ~3KB gzip | Worker API wrapper |
