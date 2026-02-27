# Phase 36: Orphanet Prevalence Integration - Research

**Researched:** 2026-02-27
**Domain:** Orphanet REST API integration, Vue 3 UI patterns, @gnomad-cf/core extension
**Confidence:** HIGH (API verified by live calls; UI patterns verified against existing codebase)

## Summary

This phase integrates Orphanet disease prevalence data into the existing summary card in StepResults.vue. The Orphanet API (`api.orphadata.com`) is a public REST API under CC-BY-4.0 with `access-control-allow-origin: *` — no proxy is required. The API is navigated in two steps: (1) query gene symbol to get ORPHAcodes + disease names; (2) query each ORPHAcode's epidemiology and natural history in parallel to get prevalence class and inheritance type.

The primary complexity is not the API itself but data quality: the gene associations endpoint returns disease subtypes that often have no epidemiology data of their own (only parent diseases do). The `PrevalenceClass` string (e.g., `"1-5 / 10 000"`) is the display-ready value — no arithmetic needed. Inheritance type requires a second API call to `rd-natural_history` per ORPHAcode, which the CONTEXT.md says should be used natively without string parsing.

The implementation pattern follows the existing ClinGen pattern precisely: a platform-neutral client in `@gnomad-cf/core/orphanet`, a Pinia store in `apps/web/src/stores/useOrphanetStore.ts`, and a composable `useOrphanetData` in `apps/web/src/composables/`. The summary card section at the bottom of `StepResults.vue` embeds Orphanet data with a `v-skeleton-loader` and a `+N more` chip for multi-disease cases.

**Primary recommendation:** Build the Orphanet client as a new `@gnomad-cf/core` subpath entry (`orphanet`), using session-level Map caching keyed by gene symbol, and fetch gene associations + epidemiology + natural history in parallel per ORPHAcode. Display `PrevalenceClass` as-is from the API; do not compute numeric values.

## Standard Stack

No new npm dependencies are needed. The implementation uses only existing stack components.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| native fetch | browser built-in | HTTP calls to Orphanet API | Already used in @gnomad-cf/core/client; CORS is wide-open on api.orphadata.com |
| Pinia | existing | Session-level cache store | All other external data (ClinGen, constraints) use Pinia stores |
| Vue 3 Composition API | existing | Composable for reactive state | Project standard |
| Vuetify 3 | existing | v-skeleton-loader, v-chip, v-expand-transition | Already used in GeneConstraintCard and VariantTable |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| AbortController + setTimeout | browser built-in | 5-second fetch timeout | Wrap each fetch call; no library needed |
| tsdown | 0.20.3 | Build new `orphanet` subpath entry | Add `orphanet: 'src/orphanet/index.ts'` to tsdown.config.ts |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native fetch with AbortController | axios | No benefit for this use case; axios adds a dependency |
| Session Map cache in composable | localStorage persistence | Orphanet data refreshes every 6 months; session-level is sufficient per CONTEXT.md decision |

**Installation:**
```bash
# No new packages needed
```

## Architecture Patterns

### Recommended Project Structure

New files to create:

```
packages/core/src/orphanet/
├── index.ts              # Re-exports public API
├── client.ts             # fetch-based Orphanet REST client
└── types.ts              # OrphanetDisease, OrphanetPrevalence, etc.

apps/web/src/
├── stores/
│   └── useOrphanetStore.ts        # Pinia store (session cache, no persist)
├── composables/
│   └── useOrphanetData.ts         # Composable: fetch on gene select, expose to template
└── components/
    └── OrphanetSection.vue        # The section rendered at bottom of summary card
```

Modified files:
```
packages/core/tsdown.config.ts      # Add orphanet entry
packages/core/package.json          # Add "./orphanet": "./dist/orphanet.js" export
packages/core/src/types/index.ts    # Re-export Orphanet types
apps/web/src/components/wizard/StepResults.vue  # Import + render OrphanetSection
apps/web/vite.config.ts             # Add Workbox runtimeCaching for api.orphadata.com
```

### Pattern 1: Two-Step API Fetch (Gene Symbol → ORPHAcodes → Enrichment)

**What:** The Orphanet API has no single endpoint that returns a gene's diseases with both prevalence and inheritance. Two separate fetches are needed.

**When to use:** Always. This is the only supported pattern.

**Step 1 — Gene Symbol to ORPHAcodes:**
```typescript
// Source: Verified via live API call 2026-02-27
// GET /rd-associated-genes/genes/symbols/{symbol}
// CRITICAL: symbol must be LOWERCASE — uppercase returns 404
const response = await fetch(
  `https://api.orphadata.com/rd-associated-genes/genes/symbols/${symbol.toLowerCase()}`
);
const data = await response.json();
// data.data.results = Array<{ ORPHAcode: number, "Preferred term": string, DisorderGeneAssociation: Array<...> }>
```

**Step 2 — Parallel enrichment per ORPHAcode:**
```typescript
// For each ORPHAcode, fetch epidemiology + natural history in parallel
const results = await Promise.allSettled(
  orphacodes.map(async (code) => {
    const [epiRes, nhRes] = await Promise.all([
      fetchWithTimeout(`https://api.orphadata.com/rd-epidemiology/orphacodes/${code}`, 5000),
      fetchWithTimeout(`https://api.orphadata.com/rd-natural_history/orphacodes/${code}`, 5000),
    ]);
    // ... merge into OrphanetDisease
  })
);
```

### Pattern 2: Fetch with Timeout via AbortController

**What:** Wrap each fetch with a 5-second timeout using AbortController. On timeout or network error, the entire Orphanet section silently disappears.

```typescript
// Source: Verified pattern from useGeneSearch.ts timeout implementation
async function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}
```

### Pattern 3: Session-Level Map Cache in Pinia Store (No Persistence)

**What:** Cache Orphanet results keyed by lowercase gene symbol for the browser session. Uses Pinia store WITHOUT `persist: true`.

```typescript
// Source: Pinia store pattern from useClingenStore.ts, adapted for session cache
export const useOrphanetStore = defineStore('orphanet', {
  state: () => ({
    cache: new Map<string, OrphanetResult>(),   // gene symbol → result
    pending: new Set<string>(),                   // genes currently fetching
  }),
  actions: {
    getCached(geneSymbol: string): OrphanetResult | undefined {
      return this.cache.get(geneSymbol.toLowerCase());
    },
    setCached(geneSymbol: string, result: OrphanetResult) {
      this.cache.set(geneSymbol.toLowerCase(), result);
      this.pending.delete(geneSymbol.toLowerCase());
    },
  },
  // No persist: true — session-level only per CONTEXT.md decision
});
```

**Important:** Pinia does not serialize Map by default if persistence were added later. Use a plain object `Record<string, OrphanetResult>` instead of Map if future persistence is needed. For now, Map is fine since there's no persistence.

### Pattern 4: Eager Fetch on Gene Selection

**What:** The composable starts fetching Orphanet data as soon as a gene is selected (Step 1 of wizard), not when the user reaches Step 4. Data will be ready by the time the user gets to results.

```typescript
// Source: CONTEXT.md decision — "Eager fetch: start Orphanet lookup on gene selection"
// In the composable, watch for geneSymbol changes and trigger fetch
watch(geneSymbol, (symbol) => {
  if (symbol) {
    fetchOrphanetData(symbol);  // fire and forget — no await
  }
}, { immediate: false });
```

Wire into `StepGene.vue` or the wizard orchestrator at gene selection, not at results render time.

### Pattern 5: v-skeleton-loader While Loading

**What:** Show skeleton while Orphanet data is loading. Hide entirely on error/empty.

```vue
<!-- Source: GeneConstraintCard.vue pattern — v-skeleton-loader type="text, text" -->
<template v-if="orphanetLoading">
  <v-skeleton-loader type="text" width="60%" class="mt-3" />
</template>
<template v-else-if="orphanetDiseases.length > 0">
  <!-- actual content -->
</template>
<!-- v-else: nothing — hide section entirely per CONTEXT.md -->
```

### Pattern 6: +N More Chip with v-expand-transition

**What:** Primary disease shown; chip reveals remaining diseases via v-expand-transition.

```vue
<!-- Source: Vuetify 3 v-expand-transition pattern -->
<div class="orphanet-section mt-4">
  <!-- Primary disease (or first AR-matching disease) -->
  <div class="d-flex align-center ga-2 flex-wrap">
    <span class="text-caption text-medium-emphasis">Orphanet Prevalence</span>
    <a :href="primaryDisease.url" target="_blank" rel="noopener" class="text-body-2">
      {{ primaryDisease.name }}
    </a>
    <span class="text-body-2 text-medium-emphasis">
      — {{ primaryDisease.prevalenceClass }} ({{ primaryDisease.geographic }})
    </span>
    <v-chip
      v-if="additionalDiseases.length > 0"
      size="x-small"
      variant="tonal"
      @click="expanded = !expanded"
    >
      +{{ additionalDiseases.length }} more
    </v-chip>
  </div>

  <!-- Expanded list -->
  <v-expand-transition>
    <div v-if="expanded" class="mt-1 ml-4">
      <div v-for="d in additionalDiseases" :key="d.orphacode" class="text-body-2 my-1">
        <a :href="d.url" target="_blank" rel="noopener">{{ d.name }}</a>
        <span class="text-medium-emphasis"> — {{ d.prevalenceClass }} ({{ d.geographic }})</span>
      </div>
    </div>
  </v-expand-transition>

  <!-- Disclaimer -->
  <div class="text-caption text-medium-emphasis mt-1">
    Orphanet reports clinical prevalence (diagnosed cases), not genetic carrier prevalence.
  </div>
</div>
```

### Pattern 7: New tsdown Entry + Package.json Export

**What:** Add `orphanet` as a new subpath to the core package, matching existing pattern.

```typescript
// packages/core/tsdown.config.ts — add orphanet entry
entry: {
  // ... existing entries ...
  orphanet: 'src/orphanet/index.ts',
}
```

```json
// packages/core/package.json — add orphanet export
"exports": {
  "./orphanet": "./dist/orphanet.js"
}
```

The `exports: true` in tsdown config auto-maintains package.json exports — but verify this works correctly or update manually.

### Anti-Patterns to Avoid

- **Uppercase gene symbols in API calls:** The endpoint `GET /rd-associated-genes/genes/symbols/CFTR` returns 404. Use `.toLowerCase()` always.
- **Computing prevalence from ValMoy:** `ValMoy` is a float (e.g., `19.3912`) representing "per 100,000" but is not consistently useful. Use `PrevalenceClass` string (`"1-5 / 10 000"`) as the display value.
- **Assuming subtypes have epidemiology:** HEXA returns sub-diseases (309178, 309185, 309192) which have NO epidemiology data. Fetching epi for these returns 404. Handle 404 on epidemiology fetch gracefully (treat as "no prevalence data for this orphacode").
- **Blocking results on Orphanet:** Orphanet fetch must never block the main carrier frequency results display.
- **Persisting Pinia store:** The session-level cache must NOT have `persist: true` — Orphanet data changes twice a year and the cache is intentionally session-scoped.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Fetch timeout | Custom retry loop | AbortController + setTimeout | Standard Web API; no library needed |
| Skeleton placeholder | Custom CSS spinner | `v-skeleton-loader` (Vuetify) | Already in project; consistent with GeneConstraintCard |
| Expand animation | CSS transitions | `v-expand-transition` (Vuetify) | Built-in, accessible, consistent |
| Prevalence display value | Parse ValMoy arithmetic | `PrevalenceClass` string from API | API provides ready-made display string |

**Key insight:** The Orphanet API already provides the display-ready `PrevalenceClass` string (e.g., `"1-5 / 10 000"`). Do not attempt to parse or reformat `ValMoy` — it's a float per 100,000 that varies by prevalence type and requires context to interpret correctly.

## Common Pitfalls

### Pitfall 1: Gene Symbol Case Sensitivity
**What goes wrong:** `GET /rd-associated-genes/genes/symbols/CFTR` → 404. Works with lowercase.
**Why it happens:** The Orphanet API does case-sensitive string matching internally; gene symbols are stored lowercase in the genes-by-symbol index.
**How to avoid:** Always call `.toLowerCase()` on gene symbol before building the URL.
**Warning signs:** Every single gene returns 404 in testing.

### Pitfall 2: Disease Subtypes Lack Epidemiology Data
**What goes wrong:** HEXA maps to orphacodes 309178, 309185, 309192 (subtypes). Calling `/rd-epidemiology/orphacodes/309178` returns 404. Only the parent disease (845, Tay-Sachs) has epidemiology data, but 845 is NOT in HEXA's gene associations.
**Why it happens:** Orphanet's gene associations endpoint returns the specific disease subtypes, not the parent umbrella disease. Epidemiology is often only available at the parent level.
**How to avoid:** Treat 404 on the epidemiology endpoint as "no prevalence data for this disease" — not as an error. If ALL diseases for a gene lack prevalence data, hide the section entirely per CONTEXT.md decision.
**Warning signs:** Testing with HEXA returns no prevalence for any subtype.

### Pitfall 3: Prevalence Type Multiplicity
**What goes wrong:** A single disease (e.g., CF orphacode 586) has 30+ prevalence records — different `PrevalenceType` values (`"Point prevalence"`, `"Prevalence at birth"`, `"Annual incidence"`) across many geographies.
**Why it happens:** Orphanet tracks multiple measurement types and geographic regions.
**How to avoid:** Filter to `PrevalenceType: "Point prevalence"` first, then `"Prevalence at birth"` as fallback. Prefer `PrevalenceGeographic: "Europe"` over country-specific or "Specific population" entries. Prefer `PrevalenceValidationStatus: "Validated"`.
**Warning signs:** Showing conflicting prevalence numbers or "Specific population" prevalences.

### Pitfall 4: Inheritance Detection Requires Separate API Call
**What goes wrong:** The gene associations endpoint (`rd-associated-genes`) does NOT include inheritance type. `TypeOfInheritance` lives only in `rd-natural_history`.
**Why it happens:** Orphanet separates gene-disease associations from natural history data.
**How to avoid:** For each ORPHAcode, call `rd-natural_history/orphacodes/{code}` to get `TypeOfInheritance` array. Check if `"Autosomal recessive"` is in the array.
**Warning signs:** Trying to extract inheritance from `DisorderGeneAssociationType` strings (these describe the relationship type, not inheritance pattern).

### Pitfall 5: Pinia Map Not Serializable
**What goes wrong:** If `persist: true` is ever added to the Orphanet store, Pinia-plugin-persistedstate cannot serialize `Map` to JSON correctly.
**Why it happens:** JSON.stringify ignores Map entries.
**How to avoid:** Use a plain object `Record<string, OrphanetResult>` as the cache type from the start, even though persistence is not required now.
**Warning signs:** Store data is empty after page reload if persistence is ever added.

### Pitfall 6: PWA Workbox Cache Not Configured for Orphanet
**What goes wrong:** In a PWA offline scenario, Orphanet API calls fail with network errors and no cached response is available.
**Why it happens:** vite.config.ts Workbox `runtimeCaching` only covers gnomAD, ClinGen, and gene-config URLs.
**How to avoid:** Add a `NetworkFirst` Workbox entry for `api.orphadata.com` in vite.config.ts, matching the pattern for other external APIs. The CONTEXT.md says graceful degradation: if API is unavailable, hide section.
**Warning signs:** PWA offline mode causes Orphanet errors even for recently viewed genes.

### Pitfall 7: CBAVD (orphacode 48) Has "Multigenic/multifactorial" Inheritance
**What goes wrong:** CFTR is linked to CBAVD (orphacode 48) which has `TypeOfInheritance: ["Multigenic/multifactorial"]` — not autosomal recessive. If using AR-only filter strictly, CBAVD is excluded.
**Why it happens:** CBAVD is genuinely complex — CFTR mutations contribute but it's not purely AR.
**How to avoid:** Per CONTEXT.md, prefer AR-matching diseases. CBAVD would be shown in "+N more" when CFTR is queried, while the primary display would be cystic fibrosis (orphacode 586, confirmed AR). This is correct behavior.

## Code Examples

### Complete Orphanet Client (packages/core/src/orphanet/client.ts)
```typescript
// Source: Verified API behavior 2026-02-27, CORS: access-control-allow-origin: *

const ORPHANET_BASE = 'https://api.orphadata.com';
const FETCH_TIMEOUT_MS = 5000;

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

/** Returns diseases associated with gene symbol. Symbol is lowercased internally. */
export async function fetchDiseasesByGeneSymbol(
  geneSymbol: string,
): Promise<OrphanetGeneResult[]> {
  const url = `${ORPHANET_BASE}/rd-associated-genes/genes/symbols/${geneSymbol.toLowerCase()}`;
  const res = await fetchWithTimeout(url);
  const data = await res.json();
  return data.data.results as OrphanetGeneResult[];
}

/** Returns prevalence entries for an orphacode. Returns [] on 404 (many subtypes lack data). */
export async function fetchEpidemiology(orphacode: number): Promise<OrphanetPrevalenceEntry[]> {
  try {
    const url = `${ORPHANET_BASE}/rd-epidemiology/orphacodes/${orphacode}`;
    const res = await fetchWithTimeout(url);
    const data = await res.json();
    return data.data.results.Prevalence ?? [];
  } catch {
    return []; // 404 or network error → no prevalence data
  }
}

/** Returns TypeOfInheritance array for an orphacode. Returns [] on failure. */
export async function fetchNaturalHistory(orphacode: number): Promise<string[]> {
  try {
    const url = `${ORPHANET_BASE}/rd-natural_history/orphacodes/${orphacode}`;
    const res = await fetchWithTimeout(url);
    const data = await res.json();
    return data.data.results.TypeOfInheritance ?? [];
  } catch {
    return [];
  }
}
```

### Selecting Best Prevalence Entry
```typescript
// Source: Verified data structure from API 2026-02-27
// PrevalenceType priority: "Point prevalence" > "Prevalence at birth" > any
// Geographic priority: "Europe" > any non-"Specific population" > "Specific population"
// ValidationStatus priority: "Validated" > "Not yet validated"

function selectBestPrevalence(entries: OrphanetPrevalenceEntry[]): OrphanetPrevalenceEntry | null {
  if (entries.length === 0) return null;

  const typeOrder = ['Point prevalence', 'Prevalence at birth'];
  const geoPrefer = 'Europe';

  // Sort by: validated first, then preferred type, then Europe geographic
  const sorted = [...entries].sort((a, b) => {
    // Validated first
    const aVal = a.PrevalenceValidationStatus === 'Validated' ? 0 : 1;
    const bVal = b.PrevalenceValidationStatus === 'Validated' ? 0 : 1;
    if (aVal !== bVal) return aVal - bVal;

    // Preferred type
    const aType = typeOrder.indexOf(a.PrevalenceType);
    const bType = typeOrder.indexOf(b.PrevalenceType);
    const aTypeScore = aType === -1 ? 99 : aType;
    const bTypeScore = bType === -1 ? 99 : bType;
    if (aTypeScore !== bTypeScore) return aTypeScore - bTypeScore;

    // Europe preferred
    const aGeo = a.PrevalenceGeographic === geoPrefer ? 0 : 1;
    const bGeo = b.PrevalenceGeographic === geoPrefer ? 0 : 1;
    return aGeo - bGeo;
  });

  return sorted[0] ?? null;
}
```

### Primary Disease Selection (AR + Highest Prevalence)
```typescript
// Source: CONTEXT.md decision — "prefer diseases matching AR inheritance;
// among matches, sort by highest prevalence"

function selectPrimaryDisease(diseases: EnrichedOrphanetDisease[]): EnrichedOrphanetDisease {
  const arDiseases = diseases.filter(d => d.isAutosomalRecessive);
  const candidates = arDiseases.length > 0 ? arDiseases : diseases;

  // Sort by ValMoy descending (higher = more prevalent = more clinical relevance)
  return candidates.sort((a, b) => (b.bestPrevalence?.valMoy ?? 0) - (a.bestPrevalence?.valMoy ?? 0))[0];
}
```

### OrphanetSection.vue (summary card section)
```vue
<!-- Source: GeneConstraintCard.vue pattern + CONTEXT.md design decisions -->
<template>
  <div v-if="showSection" class="mt-4 pt-3" style="border-top: 1px solid rgba(0,0,0,0.12)">

    <!-- Loading skeleton -->
    <template v-if="loading">
      <v-skeleton-loader type="text" width="55%" />
    </template>

    <!-- Content -->
    <template v-else-if="diseases.length > 0">
      <!-- Primary disease row -->
      <div class="d-flex align-center flex-wrap ga-1">
        <span class="text-caption text-medium-emphasis mr-1">Orphanet Prevalence</span>
        <a
          :href="primary.orphanetUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="text-body-2"
        >{{ primary.name }}</a>
        <span class="text-body-2 text-medium-emphasis">
          — {{ primary.bestPrevalence?.prevalenceClass ?? 'Unknown' }}
          ({{ primary.bestPrevalence?.geographic ?? '' }})
        </span>
        <v-chip
          v-if="additional.length > 0"
          size="x-small"
          variant="tonal"
          class="ml-1"
          @click="expanded = !expanded"
        >
          +{{ additional.length }} more
        </v-chip>
      </div>

      <!-- Expanded additional diseases -->
      <v-expand-transition>
        <div v-if="expanded" class="ml-2 mt-1">
          <div
            v-for="d in additional"
            :key="d.orphacode"
            class="d-flex align-center flex-wrap ga-1 my-1"
          >
            <a :href="d.orphanetUrl" target="_blank" rel="noopener noreferrer" class="text-body-2">
              {{ d.name }}
            </a>
            <span class="text-body-2 text-medium-emphasis">
              — {{ d.bestPrevalence?.prevalenceClass ?? 'Unknown' }}
              ({{ d.bestPrevalence?.geographic ?? '' }})
            </span>
          </div>
        </div>
      </v-expand-transition>

      <!-- Disclaimer -->
      <div class="text-caption text-medium-emphasis mt-1">
        Orphanet reports clinical prevalence (diagnosed cases), not genetic carrier prevalence.
      </div>
    </template>

  </div>
</template>
```

### TypeScript Types (packages/core/src/orphanet/types.ts)
```typescript
// Source: Verified API response structure 2026-02-27

/** Raw response item from /rd-associated-genes/genes/symbols/{symbol} */
export interface OrphanetGeneResult {
  ORPHAcode: number;
  'Preferred term': string;
  OrphanetURL: string;
  Date: string;
  DisorderGeneAssociation: OrphanetGeneAssociation[];
}

export interface OrphanetGeneAssociation {
  DisorderGeneAssociationType: string;
  DisorderGeneAssociationStatus: string;
  Gene: {
    Symbol: string;
    name: string;
    GeneType: string;
    ExternalReference: Array<{ Source: string; Reference: string }>;
  };
}

/** Raw prevalence entry from /rd-epidemiology/orphacodes/{code} */
export interface OrphanetPrevalenceEntry {
  PrevalenceClass: string;         // "1-5 / 10 000", "1-9 / 100 000", etc.
  PrevalenceGeographic: string;    // "Europe", "France", "Specific population", etc.
  PrevalenceType: string;          // "Point prevalence", "Prevalence at birth", etc.
  PrevalenceQualification: string; // "Value and class", "Class only"
  PrevalenceValidationStatus: string; // "Validated", "Not yet validated"
  Source: string;
  ValMoy: string;                  // Float as string, per 100,000. Use for sorting only.
}

/** Processed disease record after enrichment */
export interface OrphanetDisease {
  orphacode: number;
  name: string;
  orphanetUrl: string;
  isAutosomalRecessive: boolean;
  bestPrevalence: {
    prevalenceClass: string;
    geographic: string;
    validationStatus: string;
    valMoy: number;               // Numeric for sorting (parsed from ValMoy)
  } | null;
}

/** Final result stored per gene symbol in the Pinia cache */
export interface OrphanetResult {
  geneSymbol: string;
  diseases: OrphanetDisease[];   // empty array = no data found
  fetchedAt: number;             // Unix timestamp ms
  error: string | null;
}
```

### CLI Output Format
```typescript
// Source: text-formatter.ts pattern — add section after global stats
// CLI text format: labeled key-value rows matching existing style

function formatOrphanetSection(diseases: OrphanetDisease[]): string {
  if (diseases.length === 0) return '';
  const lines: string[] = ['', '  Orphanet Prevalence:'];
  diseases.forEach(d => {
    const prev = d.bestPrevalence
      ? `${d.bestPrevalence.prevalenceClass} (${d.bestPrevalence.geographic})`
      : 'Unknown';
    const ar = d.isAutosomalRecessive ? ' [AR]' : '';
    lines.push(`    ${d.name}${ar}: ${prev}`);
    lines.push(`    ${d.orphanetUrl}`);
  });
  lines.push('  Note: Orphanet reports clinical prevalence, not genetic carrier prevalence.');
  return lines.join('\n');
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Orphadata XML file downloads | REST API at api.orphadata.com | ~2022 | No longer need to bundle XML files |
| api.orphadata.com v1 with API key | Public REST API (no key required) | Current | CORS wildcard, no auth needed |

**Deprecated/outdated:**
- Orphadata XML bulk downloads: The project historically used downloadable XML files. The REST API is the current preferred approach.
- API key requirement: Older documentation mentions API keys; current public API does not require one.

## Open Questions

1. **Tay-Sachs subtype epi gap**
   - What we know: HEXA's gene associations return subtypes (309178, 309185, 309192) which have no epidemiology data; parent disease Tay-Sachs (845) has epi but is NOT in HEXA's gene associations.
   - What's unclear: Is this consistent across all genes, or just Tay-Sachs? Is there a way to traverse parent-disease hierarchy via the API?
   - Recommendation: Accept this limitation. When all diseases for a gene lack prevalence, hide the section entirely per CONTEXT.md. Do not implement parent-traversal logic — it adds complexity beyond the phase scope.

2. **OrphanetURL field location in gene associations response**
   - What we know: The epidemiology and natural history endpoints return `OrphanetURL` at the result level. The gene associations endpoint returns `OrphanetURL` at... needs verification — the cftr_temp.json showed the field at `results[n]` level.
   - What's unclear: Whether `OrphanetURL` is present in the gene associations `results` items or must be constructed.
   - Recommendation: Construct the URL from orphacode: `https://www.orpha.net/consor/cgi-bin/OC_Exp.php?lng=en&Expert={orphacode}` as a safe fallback. Check at implementation time.

3. **Workbox cache strategy for Orphanet API**
   - What we know: vite.config.ts uses NetworkFirst for gnomAD and ClinGen.
   - What's unclear: Whether `api.orphadata.com` should use NetworkFirst or StaleWhileRevalidate given data updates twice yearly.
   - Recommendation: Use `StaleWhileRevalidate` (data changes slowly; showing slightly stale data is acceptable) with 24-hour TTL.

## Sources

### Primary (HIGH confidence)
- Live API calls to `https://api.orphadata.com` — endpoints verified, response shapes confirmed, CORS confirmed
  - `GET /rd-associated-genes/genes/symbols/cftr` — gene association shape, lowercase requirement
  - `GET /rd-epidemiology/orphacodes/586` — prevalence structure (30+ entries for CF)
  - `GET /rd-natural_history/orphacodes/586` — TypeOfInheritance structure
  - `GET /rd-associated-genes/genes/symbols/hexa` — multi-disease case (3 subtypes)
  - `GET /rd-epidemiology/orphacodes/309178` — 404 for subtype (confirmed gap)
- `api.orphadata.com/openapi.json` — OpenAPI spec confirming endpoint paths
- Existing codebase: `GeneConstraintCard.vue` — v-skeleton-loader pattern
- Existing codebase: `packages/core/tsdown.config.ts` — subpath entry pattern
- Existing codebase: `useClingenStore.ts` — Pinia store cache pattern
- Existing codebase: `vite.config.ts` — Workbox runtimeCaching pattern

### Secondary (MEDIUM confidence)
- `github.com/Orphanet/API_Orphadata` — API architecture overview (Flask/Python, OpenAPI v3)
- WebSearch: Orphadata API best practices 2025

### Tertiary (LOW confidence)
- `ValMoy` interpretation as per-100,000 value — derived from comparing known CF prevalence (~1:2000 = 5/10,000 ≈ ValMoy 19.3 in Europe); not officially documented with this exact explanation.

## Metadata

**Confidence breakdown:**
- Orphanet API endpoints and response shapes: HIGH — verified by live calls on 2026-02-27
- Lowercase gene symbol requirement: HIGH — confirmed empirically (uppercase → 404, lowercase → 200)
- Subtype epi gap (HEXA case): HIGH — confirmed empirically
- PrevalenceClass as display value: HIGH — field verified in real API responses
- Architecture (follows ClinGen pattern): HIGH — ClinGen pattern verified in codebase
- v-skeleton-loader and v-expand-transition: HIGH — both in Vuetify 3, already used in project
- CLI output format: MEDIUM — pattern follows text-formatter.ts but exact integration TBD
- ValMoy semantics: LOW — inferred from data, not officially documented

**Research date:** 2026-02-27
**Valid until:** 2026-03-29 (API is stable; data updates semi-annually; architecture is mature)
