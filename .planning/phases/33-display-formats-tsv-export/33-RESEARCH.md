# Phase 33: Display Formats & TSV Export - Research

**Researched:** 2026-02-26
**Domain:** Vue 3 / Vuetify 3 UI components, Pinia store patterns, TSV file generation, number formatting
**Confidence:** HIGH (all critical findings verified against codebase or official sources)

---

## Summary

This phase adds a display format selector (%, 1:N, sci, /100k) and two TSV download buttons to the existing results step. The codebase already has mature patterns for all required infrastructure: Pinia stores with `pinia-plugin-persistedstate`, `v-btn-toggle` segmented buttons, blob-based file downloads, and locale-aware number formatting via `Intl.NumberFormat`. No new libraries are needed.

The key architectural challenge is threading the selected display format through to all on-screen frequency values (summary card, population table) while keeping clinical text generation independent (always ratio+percentage, unaffected by format selector). The format store holds the current selection as transient session state that resets on `resetWizard()`, plus a separate persisted default preference.

The TSV export is substantially simpler than the Excel export already in place. Two functions that produce tab-delimited strings with UTF-8 BOM and download as blobs — one for populations, one for variants — are all that is needed. The CLI `tsv-formatter.ts` already exists and will need column additions to match the new EXP-02/EXP-03 column specs, but its architecture (one function, string output) remains correct.

**Primary recommendation:** Create a `useFormatStore` (Pinia, options API, persisted `defaultFormat` only) plus a non-persisted composable `useDisplayFormat` that holds the current session format. Wire the format through computed formatters passed to FrequencyResults and StepResults. Add two new export functions to `useExport`. Extend the CLI TSV formatter columns to match the web TSV spec.

---

## Standard Stack

No new libraries required. All implementation uses what is already installed.

### Core (already in project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vuetify 3 | ^3.8.1 | `v-btn-toggle` for format selector, `v-tooltip` for labels | Already in use throughout app |
| Pinia | ^3.0.4 | `useFormatStore` for persisted default format | All app settings use Pinia |
| pinia-plugin-persistedstate | ^4.7.1 | Persist `defaultFormat` preference | Already wired in `main.ts`; note: GitHub repo archived Aug 2025 but maintained at codeberg.org — current npm package is stable |
| Intl.NumberFormat | Browser built-in | Scientific notation and locale-aware formatting | Already used in `useTextGenerator.ts` |

### No new dependencies needed
The existing `blob + URL.createObjectURL + anchor click` pattern in `useExport.ts` covers TSV download.
UTF-8 BOM is a string prefix `"\uFEFF"` prepended to the TSV content — no library.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Intl.NumberFormat (built-in) | numeral.js / accounting.js | Built-in is sufficient and zero-dependency |
| Custom blob download | FileSaver.js | Already implemented in useExport.ts; no benefit |

---

## Architecture Patterns

### Recommended File Structure for Phase 33

```
apps/web/src/
├── stores/
│   └── useFormatStore.ts         # NEW: defaultFormat (persisted) + active format (session)
├── composables/
│   └── useDisplayFormat.ts       # NEW: reactive format + formatter functions
├── utils/
│   └── export-utils.ts           # EXTEND: TSV builder functions (populations + variants)
├── composables/
│   └── useExport.ts              # EXTEND: exportToTsv functions
└── components/
    └── wizard/
        └── StepResults.vue       # EXTEND: format selector toolbar + TSV export buttons

packages/core/src/calculations/
└── formatters.ts                 # EXTEND: formatScientific, formatPerHundredK
```

### Pattern 1: Format Store — Persisted Default + Session Reset

The CONTEXT.md decision is: format resets to default on new gene analysis, but the user's preferred default persists across browser sessions (set in settings dialog).

Use **options-style Pinia store** (consistent with all other stores in this codebase) with `persist: { pick: ['defaultFormat'] }` so only the default persists, not the transient current selection:

```typescript
// apps/web/src/stores/useFormatStore.ts
import { defineStore } from "pinia";

export type DisplayFormat = "percent" | "ratio" | "scientific" | "per100k";

interface FormatStoreState {
  defaultFormat: DisplayFormat;      // persisted
  currentFormat: DisplayFormat;      // session-only, reset on new analysis
}

export const useFormatStore = defineStore("display-format", {
  state: (): FormatStoreState => ({
    defaultFormat: "percent",
    currentFormat: "percent",
  }),

  actions: {
    setCurrentFormat(format: DisplayFormat) {
      this.currentFormat = format;
    },

    setDefaultFormat(format: DisplayFormat) {
      this.defaultFormat = format;
    },

    /** Called by useWizard.resetWizard() — resets current to default */
    resetToDefault() {
      this.currentFormat = this.defaultFormat;
    },
  },

  persist: {
    key: "carrier-freq-display-format",
    storage: localStorage,
    pick: ["defaultFormat"],   // only persist the preference, not session state
  },
});
```

**Integration point:** Call `formatStore.resetToDefault()` inside `useWizard.resetWizard()` and when `state.gene` changes (gene-change watcher in `useWizard.ts`).

### Pattern 2: Formatter Functions in @gnomad-cf/core/calculations/formatters.ts

Extend `formatters.ts` with the four formatter functions. Scientific notation uses `Intl.NumberFormat.formatToParts()` to extract the exponent for Unicode superscript rendering:

```typescript
// packages/core/src/calculations/formatters.ts (additions)

const SUPERSCRIPT_MAP: Record<string, string> = {
  "0": "\u2070", "1": "\u00B9", "2": "\u00B2", "3": "\u00B3",
  "4": "\u2074", "5": "\u2075", "6": "\u2076", "7": "\u2077",
  "8": "\u2078", "9": "\u2079", "-": "\u207B",
};

/**
 * Format frequency as scientific notation with Unicode superscript exponent.
 * Example: 0.0431 -> "4.31 x 10⁻²"
 * Locale-aware decimal separator (de-DE uses comma, en-US uses period).
 */
export function frequencyToScientific(
  frequency: number | null,
  locale: string = "en-US",
): string {
  if (frequency === null || frequency === 0) return "Not detected";

  const formatter = new Intl.NumberFormat(locale, {
    notation: "scientific",
    minimumSignificantDigits: 3,
    maximumSignificantDigits: 3,
  });

  const parts = formatter.formatToParts(frequency);
  let mantissa = "";
  let exponent = "";
  let inExponent = false;
  let hasExponentMinus = false;

  for (const part of parts) {
    if (part.type === "exponentSeparator") {
      inExponent = true;
      continue;
    }
    if (part.type === "exponentMinusSign") {
      hasExponentMinus = true;
      continue;
    }
    if (part.type === "exponentInteger") {
      exponent = part.value;
      continue;
    }
    if (!inExponent) {
      mantissa += part.value;
    }
  }

  const supExp = (hasExponentMinus ? "\u207B" : "") +
    exponent.split("").map((d) => SUPERSCRIPT_MAP[d] ?? d).join("");

  return `${mantissa} \u00D7 10${supExp}`;
  // Example output: "4.31 × 10⁻²"
}

/**
 * Format frequency as per-100,000 with locale-aware decimal separator.
 * Example: 0.0431 -> "4,310 / 100.000" (de-DE) or "4,310 / 100,000" (en-US)
 */
export function frequencyToPerHundredK(
  frequency: number | null,
  locale: string = "en-US",
): string {
  if (frequency === null || frequency === 0) return "Not detected";
  const value = frequency * 100_000;
  const formatted = value.toLocaleString(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  });
  return `${formatted}\u00A0/\u00A0100\u202F000`;
  // Note: use non-breaking space around "/" and thin non-breaking space in "100 000"
  // Adjust separator in "100,000" to locale: en-US -> "100,000", de-DE -> "100.000"
}
```

**Note on per-100k denominator display:** The denominator "100,000" should also be locale-formatted. Use `(100_000).toLocaleString(locale)` for the denominator string to get locale-correct thousands separator.

### Pattern 3: useDisplayFormat Composable (Web Layer)

Thin composable over `useFormatStore` that provides reactive formatted values:

```typescript
// apps/web/src/composables/useDisplayFormat.ts
import { computed } from "vue";
import { useFormatStore } from "@/stores/useFormatStore";
import { useTemplateStore } from "@/stores/useTemplateStore";
import {
  frequencyToPercent,
  frequencyToRatio,
  frequencyToScientific,
  frequencyToPerHundredK,
} from "@gnomad-cf/core/calculations";

export function useDisplayFormat() {
  const formatStore = useFormatStore();
  const templateStore = useTemplateStore();

  // Derive locale from language setting
  const locale = computed(() =>
    templateStore.language === "de" ? "de-DE" : "en-US",
  );

  function formatFrequency(freq: number | null): string {
    switch (formatStore.currentFormat) {
      case "percent":
        return frequencyToPercent(freq);
      case "ratio":
        return frequencyToRatio(freq);
      case "scientific":
        return frequencyToScientific(freq, locale.value);
      case "per100k":
        return frequencyToPerHundredK(freq, locale.value);
    }
  }

  return {
    currentFormat: computed(() => formatStore.currentFormat),
    setFormat: (f: DisplayFormat) => formatStore.setCurrentFormat(f),
    formatFrequency,
  };
}
```

### Pattern 4: Format Selector v-btn-toggle in StepResults.vue

Place the selector in the existing population table toolbar row (between title and export button). Existing pattern from `TextOutput.vue`:

```vue
<!-- In StepResults.vue, inside the population card toolbar div -->
<v-btn-toggle
  v-model="currentFormat"
  mandatory
  density="compact"
  color="primary"
  variant="outlined"
  aria-label="Frequency display format"
>
  <v-tooltip v-for="option in formatOptions" :key="option.value" location="top">
    <template #activator="{ props: tooltipProps }">
      <v-btn
        v-bind="tooltipProps"
        :value="option.value"
        size="small"
        :aria-label="option.label"
      >
        {{ option.symbol }}
      </v-btn>
    </template>
    {{ option.tooltip }}
  </v-tooltip>
</v-btn-toggle>
```

```typescript
const formatOptions = [
  { value: "percent",    symbol: "%",     label: "Percentage",          tooltip: "Display as percentage (e.g. 4.31%)" },
  { value: "ratio",      symbol: "1:N",   label: "Ratio",               tooltip: "Display as ratio (e.g. 1:23)" },
  { value: "scientific", symbol: "sci",   label: "Scientific notation", tooltip: "Display in scientific notation (e.g. 4.31 × 10⁻²)" },
  { value: "per100k",    symbol: "/100k", label: "Per 100,000",         tooltip: "Display per 100,000 individuals (e.g. 4,310 / 100,000)" },
];
```

### Pattern 5: TSV Download — Two Separate Functions

Follow the existing `exportToJson`/`exportToExcel` pattern in `useExport.ts`:

```typescript
// In useExport.ts — add two new export functions

function exportPopulationsTsv(data: ExportData, gene: string): void {
  const BOM = "\uFEFF";
  const header = "Population\tCarrier Frequency\tRatio\tRecurrence Risk\tAC\tAN\tNotes";
  const rows = data.populations.map((pop) =>
    [
      escapeTsv(pop.label),
      escapeTsv(pop.carrierFrequency),          // raw decimal
      escapeTsv(pop.carrierFrequencyRatio),
      escapeTsv(calculateRecurrenceRisk(pop.carrierFrequency)),
      escapeTsv(pop.alleleCount),
      escapeTsv(pop.alleleNumber),
      escapeTsv(pop.isFounderEffect ? "Founder effect" : ""),
    ].join("\t"),
  );
  const tsv = BOM + [header, ...rows].join("\n");
  const blob = new Blob([tsv], { type: "text/tab-separated-values;charset=utf-8" });
  const filename = `${sanitizeFilename(gene)}_populations_${new Date().toISOString().split("T")[0]}.tsv`;
  downloadBlob(blob, filename);
}

function exportVariantsTsv(data: ExportData, gene: string): void {
  const BOM = "\uFEFF";
  const header = [
    "Variant ID", "Consequence", "AF", "Carrier Frequency",
    "ClinVar Significance", "Stars", "HGVS-c", "HGVS-p",
    "Source Category", "Quality Flags",
  ].join("\t");
  const rows = data.variants.map((v) =>
    [
      escapeTsv(v.variantId),
      escapeTsv(v.consequence),
      escapeTsv(v.alleleFrequency),              // raw decimal
      escapeTsv(v.alleleFrequency !== null ? v.alleleFrequency * 2 : null), // approx carrier freq
      escapeTsv(v.clinvarStatus ?? ""),
      escapeTsv(""),   // Stars — Phase 34 adds goldStars to ExportVariant
      escapeTsv(v.hgvsC ?? ""),
      escapeTsv(v.hgvsP ?? ""),
      escapeTsv(""),   // Source Category — Phase 34 adds sourceCategory
      escapeTsv(""),   // Quality Flags — Phase 34 adds qualityFlags
    ].join("\t"),
  );
  const tsv = BOM + [header, ...rows].join("\n");
  const blob = new Blob([tsv], { type: "text/tab-separated-values;charset=utf-8" });
  const filename = `${sanitizeFilename(gene)}_variants_${new Date().toISOString().split("T")[0]}.tsv`;
  downloadBlob(blob, filename);
}
```

**Important:** EXP-02 columns include "Carrier Frequency" for populations (raw decimal) and "Recurrence Risk". EXP-03 columns include "Source Category" and "Quality Flags" — these columns are added by Phase 34. Phase 33 exports them as empty strings so the TSV schema is stable for pipeline consumers from day one.

### Pattern 6: Settings Dialog — Default Format Setting

Add to the existing "General" tab in `SettingsDialog.vue`, after "History" section. Consistent with other settings cards:

```vue
<!-- New card in v-tabs-window-item value="general" -->
<v-card variant="outlined" class="mb-4">
  <v-card-title class="text-subtitle-1">
    <v-icon start size="small">mdi-format-list-numbered</v-icon>
    Default Frequency Format
  </v-card-title>
  <v-card-text>
    <p class="text-body-2 text-medium-emphasis mb-3">
      Choose the default display format when starting a new analysis.
      You can switch formats at any time in the results view.
    </p>
    <v-btn-toggle
      v-model="formatStore.defaultFormat"
      mandatory
      density="compact"
      color="primary"
      variant="outlined"
    >
      <v-btn value="percent" size="small">%</v-btn>
      <v-btn value="ratio" size="small">1:N</v-btn>
      <v-btn value="scientific" size="small">sci</v-btn>
      <v-btn value="per100k" size="small">/100k</v-btn>
    </v-btn-toggle>
  </v-card-text>
</v-card>
```

### Anti-Patterns to Avoid

- **Persisting `currentFormat` to localStorage:** Only `defaultFormat` should persist. `currentFormat` is session-transient by decision.
- **Formatting frequency values in template strings directly:** Use formatter functions — avoids locale and null-handling bugs scattered across components.
- **Modifying clinical text formatter:** Clinical text always produces ratio+percent via `useTextGenerator.ts`. Do not inject `currentFormat` there.
- **Locale formatting in TSV exports:** TSV always uses raw decimals (e.g., `0.0431`), never locale-formatted strings. Locale-aware formatting is display-only.
- **Adding FMT-07 as format-following in clinical text:** CONTEXT.md explicitly locks clinical text to dual format (ratio+percentage). FMT-07 in requirements is superseded by the CONTEXT.md decision for this project. Clinical text is NOT affected by the display format selector.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Scientific notation formatting | Custom regex/math | `Intl.NumberFormat` with `notation: "scientific"` + `formatToParts()` | Handles locale-specific decimal separator automatically |
| Locale-aware number display | Manual comma/period detection | `Number.prototype.toLocaleString(locale, opts)` | Already used in codebase; handles German vs English |
| File download | XHR/Fetch POST | Blob + `URL.createObjectURL` + anchor click | Already implemented in `useExport.ts`; copy the pattern |
| BOM prefix | Library | String literal `"\uFEFF"` | Three bytes, no library |
| TSV field escaping | Custom parser | `escapeTsv()` function from CLI's `tsv-formatter.ts` | Already written; copy/adapt for web layer |
| Per-100k formatting | Custom math | `(freq * 100_000).toLocaleString(locale)` | Standard locale API handles thousands separator |

**Key insight:** All problems in this phase have one-liner or copy-from-existing solutions. The complexity is integration, not algorithm.

---

## Common Pitfalls

### Pitfall 1: Locale Decimal Separator Mismatch in Per-100k Denominator

**What goes wrong:** Display shows "4.310 / 100,000" in German locale (dot for decimal, comma for thousands separator) but the denominator "100,000" still uses English-style comma — inconsistent.
**Why it happens:** `(100_000).toLocaleString("de-DE")` produces "100.000" (German thousands separator = dot), while hardcoding `"100,000"` breaks German.
**How to avoid:** Always locale-format the denominator too: `(100_000).toLocaleString(locale)`.
**Warning signs:** German locale shows mixed separators in per-100k values.

### Pitfall 2: pinia-plugin-persistedstate `pick` vs `paths`

**What goes wrong:** Using `paths` instead of `pick` for partial persistence.
**Why it happens:** In v3 the option was called `paths`; in v4 it was renamed to `pick`.
**How to avoid:** Use `pick` (v4 API). The project has `^4.7.1` — use `pick`.
**Warning signs:** TypeScript error: `paths` not assignable to persist config.

### Pitfall 3: Format Reset Not Triggered on Gene Change

**What goes wrong:** User switches to scientific notation, searches new gene — format stays on scientific instead of resetting to default.
**Why it happens:** `resetWizard()` is called on "Start Over" button but the gene-change watcher in `useWizard.ts` also resets state. Both code paths must call `formatStore.resetToDefault()`.
**How to avoid:** Call `formatStore.resetToDefault()` in both `resetWizard()` and the gene-change watcher.
**Warning signs:** E2E test: switch format, change gene → format does not reset.

### Pitfall 4: TSV Column Schema Instability for Phase 34

**What goes wrong:** Phase 33 exports variants TSV without "Source Category" and "Quality Flags" columns. Phase 34 then adds columns in the middle of the row, breaking pipeline consumers.
**Why it happens:** Columns added later shift positions that pipelines address by index.
**How to avoid:** Include all Phase 34 columns as empty strings from Phase 33 forward. The column header defines the contract; empty values are safe for pipelines.
**Warning signs:** Phase 34 changelog causes TSV column count change.

### Pitfall 5: `v-btn-toggle` `v-model` Type Mismatch

**What goes wrong:** `v-btn-toggle` returns `undefined` when mandatory is not set, or returns an array when multiple selection is enabled. TypeScript type of `currentFormat` becomes `DisplayFormat | undefined`.
**Why it happens:** Vuetify's `v-btn-toggle` without `mandatory` prop allows deselection.
**How to avoid:** Always include `mandatory` prop. Add a type guard or default fallback in the format store's setter.
**Warning signs:** Clicking the currently active button deselects all options; format reverts to undefined.

### Pitfall 6: Superscript Digit Unicode Code Points

**What goes wrong:** Superscript "1" is `\u00B9`, not `\u00B9` is correct (¹), but "0" is `\u2070`, "2" is `\u00B2`, "3" is `\u00B3`, and 4-9 are `\u2074`-`\u2079`. Using a wrong range produces garbled output.
**Why it happens:** Unicode superscripts are not in a contiguous block.
**How to avoid:** Use the explicit map `{ "0": "\u2070", "1": "\u00B9", "2": "\u00B2", "3": "\u00B3", "4": "\u2074", ... }`. Copy the map from this research.
**Warning signs:** "4.31 × 10^-2" shows unexpected characters instead of ⁻².

### Pitfall 7: FrequencyResults.vue vs StepResults.vue Duplication

**What goes wrong:** `FrequencyResults.vue` has its own `formatPercent` and `formatRatio` local functions. `StepResults.vue` also has local formatter functions. Creating a third set for the format selector leads to three independent implementations.
**Why it happens:** Format logic is currently duplicated between these two components.
**How to avoid:** Phase 33 should consolidate: `StepResults.vue` uses `useDisplayFormat()` composable for all on-screen value formatting. `FrequencyResults.vue` is less central (may not need update if not shown in the results step). Verify which component renders the population table that must update.
**Warning signs:** Switching format updates table but not summary card (or vice versa).

---

## Code Examples

### Verified: TSV BOM Pattern (from CLI tsv-formatter.ts and web export-utils.ts patterns)

```typescript
// Source: apps/web/src/composables/useExport.ts (existing downloadBlob pattern)
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// TSV download with BOM (new)
const BOM = "\uFEFF";
const tsv = BOM + headers + "\n" + rows.join("\n");
const blob = new Blob([tsv], { type: "text/tab-separated-values;charset=utf-8" });
downloadBlob(blob, filename);
```

### Verified: TSV Field Escaping (from packages/cli/src/output/tsv-formatter.ts)

```typescript
// Source: packages/cli/src/output/tsv-formatter.ts
function escapeTsv(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return '""';
  const str = String(value)
    .replace(/\n/g, " ")
    .replace(/\t/g, " ")
    .replace(/"/g, '""');
  return `"${str}"`;
}
```

### Verified: v-btn-toggle Pattern (from apps/web/src/components/wizard/TextOutput.vue)

```vue
<!-- Source: apps/web/src/components/wizard/TextOutput.vue -->
<v-btn-toggle
  v-model="languageModel"
  mandatory
  density="compact"
  variant="outlined"
>
  <v-btn value="de" size="small"> DE </v-btn>
  <v-btn value="en" size="small"> EN </v-btn>
</v-btn-toggle>
```

### Verified: Intl.NumberFormat Scientific with formatToParts (MDN)

```typescript
// Source: MDN Web Docs - Intl.NumberFormat.prototype.formatToParts()
const formatter = new Intl.NumberFormat("en-US", {
  notation: "scientific",
  minimumSignificantDigits: 3,
  maximumSignificantDigits: 3,
});
// formatter.format(0.0431) -> "4.31E-2"
// formatter.formatToParts(0.0431) ->
// [
//   { type: "integer", value: "4" },
//   { type: "decimal", value: "." },
//   { type: "fraction", value: "31" },
//   { type: "exponentSeparator", value: "E" },
//   { type: "exponentMinusSign", value: "-" },
//   { type: "exponentInteger", value: "2" }
// ]
```

### Verified: Locale-Aware Formatting (from apps/web/src/composables/useTextGenerator.ts)

```typescript
// Source: apps/web/src/composables/useTextGenerator.ts
function formatFrequencyForLocale(freq: number, lang: "de" | "en"): string {
  const percent = freq * 100;
  return (
    percent.toLocaleString(lang === "de" ? "de-DE" : "en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + "%"
  );
}
```

### Verified: Pinia Store with Partial Persist (from pinia-plugin-persistedstate v4 docs)

```typescript
// Source: prazdevs.github.io/pinia-plugin-persistedstate/guide/config.html
persist: {
  key: "carrier-freq-display-format",
  storage: localStorage,
  pick: ["defaultFormat"],   // v4 API: only persist defaultFormat, not currentFormat
},
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `paths` option in pinia-plugin-persistedstate | `pick` option | v4 release | Use `pick` not `paths` |
| GitHub repo for pinia-plugin-persistedstate | Codeberg repo (maintained) | Aug 2025 | Package on npm is unaffected; v4.7.1 is stable |
| Hardcoded "%" and "1:N" in StepResults.vue | Format-selector-driven computed formatter | Phase 33 | All frequency cells become reactive to format choice |

**Deprecated/outdated in this codebase (to consolidate):**
- Local `formatPercent` / `formatRatio` functions in `StepResults.vue` (lines 866-874): replace with `useDisplayFormat().formatFrequency()` after Phase 33
- Local `formatPercent` / `formatRatio` in `FrequencyResults.vue` (lines 130-138): same consolidation candidate (low priority if FrequencyResults.vue is not shown in results step path)
- `frequencyToPercent` / `frequencyToRatio` in `packages/core/src/calculations/formatters.ts`: keep but extend with new format functions

---

## Open Questions

1. **FMT-07 vs CONTEXT.md conflict — resolved in context**
   - What we know: REQUIREMENTS.md says "Clinical text templates adapt to selected display format" but CONTEXT.md (locked decision) says clinical text always uses dual ratio+percentage format regardless of format selector.
   - Resolution: CONTEXT.md wins. FMT-07 as written in REQUIREMENTS.md is overridden by the user decision. Clinical text does NOT follow the display format selector. No implementation of FMT-07 needed beyond what already exists.

2. **`FrequencyResults.vue` usage in production flow**
   - What we know: `StepResults.vue` is the results step component. `FrequencyResults.vue` also exists with its own formatters.
   - What's unclear: Is `FrequencyResults.vue` rendered in the current app flow, or is it a legacy/unused component? If used, its local formatters must also use `useDisplayFormat()`.
   - Recommendation: Check component tree — grep for `FrequencyResults` usage in `StepResults.vue` or parent. If unused, skip; if used, wire in.

3. **Per-100k denominator with non-breaking space**
   - What we know: "4,310 / 100,000" is the target. The slash should be visually clear.
   - What's unclear: Whether `\u00A0/\u00A0` (non-breaking space around slash) or just regular spaces is better for copy-paste friendliness.
   - Recommendation: Use regular ASCII spaces for the slash separator in per-100k (simpler, clipboard-friendly). Reserve non-breaking spaces only if layout wrapping becomes an issue.

4. **TSV MIME type**
   - What we know: `text/tab-separated-values` is the standard MIME type for TSV.
   - What's unclear: Whether Excel on Windows opens `.tsv` files directly without prompting.
   - Recommendation: Use `.tsv` extension and `text/tab-separated-values;charset=utf-8` MIME type. The UTF-8 BOM is the critical Excel compatibility factor, not the MIME type.

---

## Sources

### Primary (HIGH confidence)
- Codebase audit — `apps/web/src/composables/useExport.ts` — existing blob download pattern
- Codebase audit — `apps/web/src/stores/useTemplateStore.ts` — options-style Pinia store with persist
- Codebase audit — `apps/web/src/components/wizard/TextOutput.vue` — v-btn-toggle pattern
- Codebase audit — `apps/web/src/components/wizard/StepResults.vue` — population table structure
- Codebase audit — `apps/web/src/composables/useTextGenerator.ts` — locale-aware formatting
- Codebase audit — `apps/web/src/composables/useWizard.ts` — reset pattern
- Codebase audit — `packages/cli/src/output/tsv-formatter.ts` — TSV escaping + format
- Codebase audit — `packages/core/src/calculations/formatters.ts` — existing formatter functions
- Codebase audit — `packages/core/src/types/export.ts` — ExportData type structure
- MDN Web Docs — `Intl.NumberFormat` `notation: "scientific"` and `formatToParts()` parts
- pinia-plugin-persistedstate docs (prazdevs.github.io) — `pick` option for partial persistence

### Secondary (MEDIUM confidence)
- WebSearch verified: pinia-plugin-persistedstate GitHub archived → maintained at Codeberg; npm package v4.7.1 stable
- WebSearch verified: UTF-8 BOM (`"\uFEFF"`) as string prefix works with Blob for Excel Windows compatibility

### Tertiary (LOW confidence)
- WebSearch: `v-btn-toggle` accessibility bug in Vuetify 3.8.1 (aria-label on buttons may need manual addition) — flagged for validation during implementation

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in project; verified in package.json
- Architecture patterns: HIGH — all patterns derived from existing codebase code
- Formatter implementations: HIGH — Intl.NumberFormat verified against MDN; Unicode superscript map verified
- Pitfalls: HIGH — derived from actual code + known Vuetify/pinia version issues
- TSV export: HIGH — CLI formatter already exists; web pattern follows existing useExport.ts

**Research date:** 2026-02-26
**Valid until:** 2026-03-28 (30 days; stack is stable)
