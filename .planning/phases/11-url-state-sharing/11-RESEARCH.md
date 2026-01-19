# Phase 11: URL State Sharing - Research

**Researched:** 2026-01-19
**Domain:** Vue 3 URL State Synchronization, Browser History API, Clipboard API
**Confidence:** HIGH

## Summary

This research investigates URL state sharing patterns for a Vue 3 SPA without Vue Router, deployed to GitHub Pages. The project already uses VueUse (`@vueuse/core` v12.8.2), which provides `useUrlSearchParams` and `useClipboard` composables that are ideal for this use case.

The recommended approach uses VueUse's `useUrlSearchParams` in `history` mode with `writeMode: 'replace'` to avoid polluting browser history. For complex state (gene object, filter config), JSON serialization with optional lz-string compression keeps URLs manageable. State validation with Zod ensures graceful degradation for invalid URLs.

**Primary recommendation:** Create a dedicated `useUrlState` composable that coordinates between `useUrlSearchParams` and existing Pinia stores/composables, using JSON serialization for complex objects and Zod schemas for validation.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @vueuse/core | 12.8.2 | `useUrlSearchParams`, `useClipboard` | Already installed; provides reactive URL params and clipboard access |
| zod | ^3.23 | URL parameter validation | Industry standard for TypeScript-first schema validation |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lz-string | ^1.5 | URL-safe compression | Only if URLs exceed ~1500 characters regularly |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| useUrlSearchParams | history.replaceState directly | VueUse handles edge cases, reactivity automatically |
| lz-string | Base64 encoding only | Base64 increases size 33%, lz-string can compress 50%+ |
| Zod | Manual validation | Zod provides type inference, better DX |

**Installation:**
```bash
bun add zod
# lz-string only if needed after testing URL lengths
# bun add lz-string
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── composables/
│   └── useUrlState.ts         # NEW: URL state synchronization composable
├── types/
│   └── url-state.ts           # NEW: URL state schema and types
└── utils/
    └── url-serialization.ts   # NEW: Serialize/deserialize helpers
```

### Pattern 1: Singleton URL State Composable
**What:** A composable that syncs wizard state and filters to URL params
**When to use:** For coordinating between multiple state sources (wizard, filters)
**Example:**
```typescript
// Source: VueUse useUrlSearchParams docs + project patterns
import { useUrlSearchParams } from '@vueuse/core'
import { watch, onMounted } from 'vue'
import { z } from 'zod'

// Schema for URL state validation
const UrlStateSchema = z.object({
  gene: z.string().optional(),
  step: z.coerce.number().min(1).max(4).optional(),
  status: z.enum(['heterozygous', 'homozygous']).optional(),
  source: z.enum(['gnomad', 'literature', 'default']).optional(),
  litFreq: z.coerce.number().min(0).max(1).optional(),
  litPmid: z.string().optional(),
  // Filter flags as compact string: "lmc" = lof+missense+clinvar enabled
  filters: z.string().optional(),
  clinvarStars: z.coerce.number().min(0).max(4).optional(),
})

export function useUrlState() {
  // Single params object shared across app
  const params = useUrlSearchParams('history', {
    write: true,
    writeMode: 'replace', // Don't create history entries
    removeNullishValues: true,
  })

  // ... sync logic
}
```

### Pattern 2: State to URL Mapping
**What:** Flatten complex state into simple key-value pairs for URL encoding
**When to use:** When state includes objects (gene) or booleans (filters)
**Example:**
```typescript
// Source: Best practices from research
// Map wizard state to URL params
function stateToParams(state: WizardState, filters: FilterConfig) {
  return {
    // Gene: just the symbol (can re-fetch details)
    gene: state.gene?.symbol,
    // Wizard progress
    step: state.currentStep.toString(),
    status: state.indexStatus,
    source: state.frequencySource,
    // Literature source (only if source='literature')
    litFreq: state.literatureFrequency?.toString(),
    litPmid: state.literaturePmid,
    // Filters: compact encoding
    // e.g., "lmc" = lofEnabled, missenseEnabled, clinvarEnabled
    filters: encodeFilterFlags(filters),
    clinvarStars: filters.clinvarStarThreshold.toString(),
    conflicting: filters.clinvarIncludeConflicting ? '1' : undefined,
    conflictThreshold: filters.clinvarConflictingThreshold.toString(),
  }
}

function encodeFilterFlags(f: FilterConfig): string {
  let flags = ''
  if (f.lofHcEnabled) flags += 'l'
  if (f.missenseEnabled) flags += 'm'
  if (f.clinvarEnabled) flags += 'c'
  return flags || 'none'
}
```

### Pattern 3: URL to State Restoration
**What:** Parse and validate URL params, restore application state
**When to use:** On app initialization and when handling shared URLs
**Example:**
```typescript
// Source: Vue 3 initialization patterns + Zod validation
async function restoreFromUrl(params: Record<string, string | string[]>) {
  // Validate with Zod (graceful fallback on failure)
  const result = UrlStateSchema.safeParse({
    gene: params.gene,
    step: params.step,
    status: params.status,
    source: params.source,
    litFreq: params.litFreq,
    litPmid: params.litPmid,
    filters: params.filters,
    clinvarStars: params.clinvarStars,
  })

  if (!result.success) {
    console.warn('Invalid URL params, using defaults:', result.error)
    return false // Signal to use defaults
  }

  const { data } = result

  // Restore gene if present (requires API call to get full object)
  if (data.gene) {
    // Fetch gene details using existing useGeneSearch
    await searchAndSelectGene(data.gene)
  }

  // Restore wizard state
  if (data.step) wizardState.currentStep = data.step
  if (data.status) wizardState.indexStatus = data.status
  if (data.source) wizardState.frequencySource = data.source
  if (data.litFreq) wizardState.literatureFrequency = data.litFreq
  if (data.litPmid) wizardState.literaturePmid = data.litPmid

  // Restore filter state
  if (data.filters) {
    decodeAndApplyFilters(data.filters, data.clinvarStars)
  }

  return true
}
```

### Anti-Patterns to Avoid
- **Storing full gene object in URL:** Only store gene symbol; re-fetch full data on restore
- **Creating history entries for every change:** Use `writeMode: 'replace'` to avoid back button issues
- **Multiple useUrlSearchParams instances:** VueUse warns this causes reactivity issues; use singleton
- **Encoding sensitive data:** Never put user data, tokens, or PII in URLs
- **Encoding filter defaults:** Only encode non-default values to keep URLs clean

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| URL param reactivity | Manual URLSearchParams | VueUse `useUrlSearchParams` | Handles edge cases, browser compat, reactivity |
| Clipboard access | `document.execCommand` | VueUse `useClipboard` | Modern API, fallback support, promise-based |
| Parameter validation | Manual type checks | Zod schemas | Type inference, detailed errors, coercion |
| URL encoding | Manual encodeURIComponent | URLSearchParams or lz-string | Handles special characters automatically |
| History management | Direct pushState/replaceState | VueUse wrapper | Consistent behavior, SSR safety |

**Key insight:** VueUse already handles the complex parts of URL state management. The main work is designing the state-to-URL mapping and validation schema.

## Common Pitfalls

### Pitfall 1: Multiple useUrlSearchParams Instances
**What goes wrong:** Creating separate instances in different components causes one to overwrite the other
**Why it happens:** Each instance manages its own copy of params
**How to avoid:** Create a single composable (`useUrlState`) that all components use
**Warning signs:** URL params disappearing or reverting unexpectedly

### Pitfall 2: History Pollution
**What goes wrong:** Every state change creates a browser history entry, breaking back button
**Why it happens:** Using `pushState` or default `writeMode: 'push'`
**How to avoid:** Always use `writeMode: 'replace'` for automatic updates
**Warning signs:** Users complain about back button not working as expected

### Pitfall 3: Race Condition on Initialization
**What goes wrong:** URL state restored before stores are ready, or stores overwrite URL state
**Why it happens:** Async initialization order not controlled
**How to avoid:**
1. Read URL params first (synchronously)
2. Initialize stores with URL values or defaults
3. Only then start watching for changes
**Warning signs:** Shared URLs don't restore correctly, state "resets"

### Pitfall 4: GitHub Pages Base Path Issues
**What goes wrong:** URLs work in dev but break in production
**Why it happens:** GitHub Pages serves from `/gnomad-carrier-frequency/` base path
**How to avoid:** Use `window.location.search` directly (not pathname); `useUrlSearchParams` handles this correctly
**Warning signs:** 404 errors when navigating to shared URLs on production

### Pitfall 5: Invalid URL Parameter Crashes
**What goes wrong:** Malformed or malicious URL params cause JavaScript errors
**Why it happens:** No validation before using params
**How to avoid:** Use Zod `safeParse` with fallback to defaults
**Warning signs:** Console errors on page load with certain URLs

### Pitfall 6: Stale Gene Data
**What goes wrong:** URL contains gene symbol but stored gene object is different
**Why it happens:** Gene object fetched independently from URL state
**How to avoid:** When URL has gene, always trigger re-fetch before using existing state
**Warning signs:** Results showing wrong gene data for shared URLs

## Code Examples

Verified patterns from official sources:

### useUrlSearchParams Basic Usage
```typescript
// Source: https://vueuse.org/core/useurlsearchparams/
import { useUrlSearchParams } from '@vueuse/core'

// History mode: ?foo=bar&vueuse=awesome
const params = useUrlSearchParams('history', {
  write: true,
  writeMode: 'replace',
  removeNullishValues: true,
  removeFalsyValues: false,
})

// Reactive assignment updates URL
params.foo = 'bar'
params.vueuse = 'awesome'
// URL: ?foo=bar&vueuse=awesome

// Delete by setting to null/undefined
params.foo = null // Removed from URL if removeNullishValues: true
```

### useClipboard with Feedback
```typescript
// Source: https://vueuse.org/core/useclipboard/
import { useClipboard } from '@vueuse/core'
import { computed } from 'vue'

export function useCopyLink() {
  const { copy, copied, isSupported } = useClipboard({
    copiedDuring: 2000, // Show "copied" state for 2 seconds
    legacy: true, // Fallback to execCommand for older browsers
  })

  async function copyCurrentUrl() {
    await copy(window.location.href)
  }

  return {
    copyCurrentUrl,
    copied, // Ref<boolean> - true for 2 seconds after copy
    isSupported,
  }
}
```

### Zod URL Validation Schema
```typescript
// Source: Zod documentation + URL state patterns
import { z } from 'zod'

export const UrlStateSchema = z.object({
  // Gene symbol (string, optional)
  gene: z.string().min(1).max(50).optional(),

  // Wizard step (coerce string to number, validate range)
  step: z.coerce.number().int().min(1).max(4).optional().default(1),

  // Index status (enum)
  status: z.enum(['heterozygous', 'homozygous']).optional().default('heterozygous'),

  // Frequency source (enum)
  source: z.enum(['gnomad', 'literature', 'default']).optional().default('gnomad'),

  // Literature frequency (coerce to number, validate range)
  litFreq: z.coerce.number().min(0).max(1).optional(),

  // Literature PMID (string, optional)
  litPmid: z.string().optional(),

  // Filter flags: compact string encoding
  filters: z.string().regex(/^(l?m?c?|none)$/).optional().default('lmc'),

  // ClinVar star threshold
  clinvarStars: z.coerce.number().int().min(0).max(4).optional().default(1),

  // Conflicting classifications toggle
  conflicting: z.enum(['0', '1']).optional().default('0'),

  // Conflicting threshold percentage
  conflictThreshold: z.coerce.number().int().min(50).max(100).optional().default(80),
})

export type UrlState = z.infer<typeof UrlStateSchema>

// Parse with graceful fallback
export function parseUrlState(params: Record<string, unknown>): UrlState {
  const result = UrlStateSchema.safeParse(params)
  if (result.success) {
    return result.data
  }
  console.warn('URL state validation failed:', result.error.flatten())
  return UrlStateSchema.parse({}) // Returns all defaults
}
```

### Complete useUrlState Composable Structure
```typescript
// Source: Synthesized from research patterns
import { useUrlSearchParams } from '@vueuse/core'
import { watch, onMounted, ref } from 'vue'
import { parseUrlState, type UrlState } from '@/types/url-state'

// Singleton state
const isInitialized = ref(false)
const isRestoringFromUrl = ref(false)

export function useUrlState() {
  const params = useUrlSearchParams('history', {
    write: true,
    writeMode: 'replace',
    removeNullishValues: true,
  })

  // Initialize from URL on first mount
  onMounted(async () => {
    if (isInitialized.value) return

    const hasUrlState = Object.keys(params).some(
      k => ['gene', 'step', 'status', 'source'].includes(k)
    )

    if (hasUrlState) {
      isRestoringFromUrl.value = true
      const urlState = parseUrlState(params)
      await restoreState(urlState)
      isRestoringFromUrl.value = false
    }

    isInitialized.value = true
  })

  // Watch state changes and update URL (skip during restoration)
  watch(
    () => getCurrentState(), // Collect from wizard + filters
    (newState) => {
      if (!isInitialized.value || isRestoringFromUrl.value) return
      updateUrlParams(params, newState)
    },
    { deep: true }
  )

  function getShareableUrl(): string {
    return window.location.href
  }

  return {
    isInitialized,
    getShareableUrl,
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `document.execCommand('copy')` | `navigator.clipboard.writeText()` | 2019+ | Async, more reliable, secure context required |
| Manual URLSearchParams | VueUse `useUrlSearchParams` | VueUse 9+ | Reactive, handles edge cases |
| Query strings in hash mode | History mode with replaceState | Modern browsers | Clean URLs, better SEO (not relevant for SPA) |
| JSON.stringify for all state | Selective key-value mapping | Current best practice | Shorter URLs, easier debugging |

**Deprecated/outdated:**
- `document.execCommand('copy')`: Still works as fallback but deprecated; VueUse provides automatic fallback
- Hash-based routing for state: Unnecessary complexity for this use case; history mode query params work fine

## URL Length Considerations

### Browser Limits
| Browser | Practical Limit | Notes |
|---------|-----------------|-------|
| Chrome | ~32,000 chars | Well above concern |
| Firefox | ~65,000 chars | Well above concern |
| Safari | ~80,000 chars | Well above concern |
| IE11/Edge Legacy | ~2,083 chars | Not a target browser |

**Recommendation:** Keep URLs under 2,000 characters for maximum compatibility and aesthetics. Current state (gene symbol + wizard step + filter flags + literature values) should fit easily in ~200 characters.

### URL Compression (If Needed Later)
```typescript
// Source: lz-string documentation
import LZString from 'lz-string'

// Compress complex state to URL-safe string
function compressState(state: ComplexState): string {
  const json = JSON.stringify(state)
  return LZString.compressToEncodedURIComponent(json)
}

// Decompress
function decompressState(compressed: string): ComplexState | null {
  try {
    const json = LZString.decompressFromEncodedURIComponent(compressed)
    return json ? JSON.parse(json) : null
  } catch {
    return null
  }
}
```

**Note:** Only add lz-string if URLs regularly exceed 1,500 characters. Start without it.

## GitHub Pages Considerations

### Base Path
The app is deployed to `https://username.github.io/gnomad-carrier-frequency/`. The Vite config already handles this:
```typescript
// vite.config.ts (existing)
base: '/gnomad-carrier-frequency/',
```

### URL Structure for Sharing
Shared URLs will look like:
```
https://username.github.io/gnomad-carrier-frequency/?gene=CFTR&step=3&source=gnomad
```

### No SPA Routing Issues
Since we're not using Vue Router and only using query parameters (not path segments), GitHub Pages' lack of SPA support is not a problem. The index.html is always served, and query params are preserved.

### Hash Mode Alternative (Not Recommended)
If query params caused issues, hash mode would work:
```
https://.../#gene=CFTR&step=3
```
But this is unnecessary since standard query params work fine.

## Open Questions

Things that couldn't be fully resolved:

1. **Gene symbol vs Ensembl ID in URL**
   - What we know: Gene symbol is more readable, Ensembl ID is more stable
   - What's unclear: Are there genes with ambiguous symbols in gnomAD?
   - Recommendation: Use symbol for readability; if lookup fails, show error with "gene not found" message

2. **Filter state verbosity**
   - What we know: Could use compact flags ("lmc") or explicit keys ("lof=1&missense=1")
   - What's unclear: Which is more debuggable vs cleaner URLs
   - Recommendation: Start with compact flags; expand if debugging becomes difficult

3. **URL update debouncing**
   - What we know: Rapid filter changes could cause many URL updates
   - What's unclear: Performance impact of frequent replaceState calls
   - Recommendation: Start without debouncing; add if performance issues arise

## Sources

### Primary (HIGH confidence)
- [VueUse useUrlSearchParams](https://vueuse.org/core/useurlsearchparams/) - API documentation, usage patterns
- [VueUse useClipboard](https://vueuse.org/core/useclipboard/) - Clipboard API wrapper documentation
- [MDN Clipboard API](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard_API) - Browser support, security context requirements
- [MDN History API](https://developer.mozilla.org/en-US/docs/Web/API/History_API/Working_with_the_History_API) - pushState/replaceState best practices

### Secondary (MEDIUM confidence)
- [Zod URL Parameter Parsing](https://dev.to/rgolawski/parsing-url-search-parameters-with-zod-4kef) - Pattern for URL validation
- [Vue School URL State Article](https://dev.to/jacobandrewsky/using-url-to-store-state-in-vue-275c) - Vue-specific patterns
- [lz-string Documentation](https://pieroxy.net/blog/pages/lz-string/index.html) - URL-safe compression methods
- [GitHub Pages SPA Discussion](https://github.com/orgs/community/discussions/64096) - Routing limitations

### Tertiary (LOW confidence)
- Stack Overflow discussions on URL length limits (varied sources, cross-verified)
- Medium articles on Vue URL state patterns (verified against official docs)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - VueUse already in project, well-documented
- Architecture: HIGH - Follows established VueUse patterns
- Pitfalls: MEDIUM - Based on multiple sources + project-specific analysis
- Copy/clipboard: HIGH - VueUse provides robust solution

**Research date:** 2026-01-19
**Valid until:** 2026-04-19 (90 days - stable technology, mature patterns)
