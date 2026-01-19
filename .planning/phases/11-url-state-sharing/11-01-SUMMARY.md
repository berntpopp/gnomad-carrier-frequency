---
phase: 11-url-state-sharing
plan: 01
subsystem: url-state
tags: [zod, vueuse, url-params, state-sync, shareable-urls]
dependency-graph:
  requires:
    - Phase 4 (wizard state)
    - Phase 8 (filter store)
  provides:
    - URL state types with Zod validation
    - useUrlState composable for bidirectional sync
    - Shareable URL infrastructure
  affects:
    - 11-02 (share UI)
tech-stack:
  added:
    - zod (runtime schema validation)
  patterns:
    - Zod schema validation for URL params
    - VueUse useUrlSearchParams with replaceState
    - Singleton composable pattern for global state
key-files:
  created:
    - src/types/url-state.ts
    - src/composables/useUrlState.ts
  modified:
    - package.json
    - package-lock.json
    - src/types/index.ts
    - src/composables/index.ts
    - src/App.vue
decisions:
  - id: url-zod-validation
    choice: Zod for URL param validation
    rationale: Type-safe runtime validation with graceful fallbacks
  - id: url-compact-filters
    choice: Single-letter filter flags (l/m/c)
    rationale: Compact URLs while maintaining readability
  - id: url-replace-state
    choice: replaceState over pushState
    rationale: Avoid browser history pollution with wizard steps
  - id: url-singleton
    choice: Module-level singleton for init state
    rationale: Prevent multiple initializations across components
metrics:
  duration: ~15min
  completed: 2026-01-19
---

# Phase 11 Plan 01: URL State Infrastructure Summary

**One-liner:** Zod-validated URL state sync with bidirectional wizard-to-URL binding using VueUse

## What Was Built

### 1. URL State Types (`src/types/url-state.ts`)

Comprehensive Zod schema for URL parameters:

```typescript
export const UrlStateSchema = z.object({
  gene: z.string().min(1).max(50).optional(),
  step: z.coerce.number().int().min(1).max(4).optional().default(1),
  status: z.enum(['heterozygous', 'homozygous']).optional().default('heterozygous'),
  source: z.enum(['gnomad', 'literature', 'default']).optional().default('gnomad'),
  litFreq: z.coerce.number().min(0).max(1).optional(),
  litPmid: z.string().optional(),
  filters: z.string().regex(/^(l?m?c?|none)$/).optional(),
  clinvarStars: z.coerce.number().int().min(0).max(4).optional(),
  conflicting: z.enum(['0', '1']).optional(),
  conflictThreshold: z.coerce.number().int().min(50).max(100).optional(),
});
```

Helper functions:
- `parseUrlState()` - Safe parsing with fallback to defaults
- `encodeFilterFlags()` - Compact filter encoding (e.g., "lmc" for all enabled)
- `decodeFilterFlags()` - Decode flags back to FilterConfig
- `filtersMatchDefaults()` - Check if filters differ from factory defaults

### 2. URL State Composable (`src/composables/useUrlState.ts`)

Bidirectional synchronization between wizard state and URL:

**Restoration Flow:**
1. Parse URL params with Zod validation
2. If gene param exists, trigger search and wait for results
3. Select matching gene from results
4. Restore wizard state (status, source, literature values)
5. Restore filter settings (flags, stars, conflicting)
6. Navigate to restored step

**URL Update Flow:**
1. Watch wizard state changes (deep)
2. Watch filter store changes (deep)
3. Build URL params from current state
4. Only include non-default values (minimal URLs)
5. Use replaceState to avoid history entries

### 3. App Integration (`src/App.vue`)

Simple initialization call:
```typescript
import { useUrlState } from '@/composables';

// Initialize URL state synchronization
useUrlState();
```

## URL Parameter Reference

| Parameter | Type | Example | Purpose |
|-----------|------|---------|---------|
| gene | string | CFTR | Gene symbol |
| step | 1-4 | 2 | Wizard step |
| status | heterozygous/homozygous | homozygous | Index patient status |
| source | gnomad/literature/default | literature | Frequency source |
| litFreq | 0-1 | 0.02 | Literature frequency |
| litPmid | string | 12345678 | Literature PMID |
| filters | l/m/c/none | lc | Filter flags |
| clinvarStars | 0-4 | 2 | Star threshold |
| conflicting | 0/1 | 1 | Include conflicting |
| conflictThreshold | 50-100 | 75 | Conflicting % threshold |

## Example URLs

**Basic gene lookup:**
```
/gnomad-carrier-frequency/?gene=CFTR
```

**Step 3 with literature frequency:**
```
/gnomad-carrier-frequency/?gene=BRCA1&step=3&source=literature&litFreq=0.005&litPmid=12345678
```

**Custom filters:**
```
/gnomad-carrier-frequency/?gene=PKD1&step=2&filters=lc&clinvarStars=2
```

## Requirements Addressed

| ID | Requirement | Status |
|----|-------------|--------|
| URL-01 | URL contains gene/step/filters when set | Done |
| URL-02 | Opening URL restores complete state | Done |
| URL-03 | URL updates as user progresses | Done |
| URL-05 | URLs work in new browser sessions | Done |
| URL-06 | Invalid params use defaults without crash | Done |

## Deviations from Plan

None - plan executed exactly as written.

## Technical Notes

1. **Gene Search Wait Loop:** Uses polling with max 50 attempts (5s) to wait for gene search results since the search is debounced and async.

2. **Singleton Pattern:** Module-level `isInitialized` and `isRestoringFromUrl` refs prevent multiple initializations and avoid URL updates during restoration.

3. **Compact Filter Encoding:** Single letters (l=lof, m=missense, c=clinvar) keep URLs short while being human-readable.

4. **Default Omission:** Only non-default values appear in URL, keeping shareable links minimal.

## Files Changed

| File | Changes |
|------|---------|
| package.json | +zod dependency |
| src/types/url-state.ts | New - Zod schema and helpers |
| src/types/index.ts | Export URL state types |
| src/composables/useUrlState.ts | New - URL sync composable |
| src/composables/index.ts | Export useUrlState |
| src/App.vue | Initialize useUrlState |

## Next Phase Readiness

Phase 11-02 (Share UI) can proceed:
- URL state infrastructure is operational
- `getShareableUrl()` available for copy-to-clipboard
- Foundation ready for share button and QR code generation
