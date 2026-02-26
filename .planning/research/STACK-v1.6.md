# Stack Research: Analysis, Export & Visualization Features (v1.6)

**Domain:** Orphanet prevalence integration, charting, TSV export, scientific notation, gnomAD subpopulations
**Researched:** 2026-02-26
**Confidence:** HIGH (Orphanet API verified live), HIGH (chart recommendation), HIGH (TSV/formatting — zero-dep solutions)

---

## Context: Existing Stack (DO NOT CHANGE)

| Package | Version | Purpose |
|---------|---------|---------|
| Vue 3 | ^3.5.24 | Web app framework |
| Vuetify 3 | ^3.8.1 | UI components |
| Vite 7 | ^7.2.4 | Build tool |
| TypeScript | ~5.9.3 | Type system |
| villus | ^3.3.4 | GraphQL client (web) |
| Pinia | ^3.0.4 | State management |
| @vueuse/core | ^12.7.0 | Composable utilities |
| xlsx | ^0.18.5 | Excel export (already installed) |
| zod | ^4.3.5 | Validation |
| tsdown | 0.20.3 | Core/CLI bundler |
| @gnomad-cf/core | workspace:* | Platform-neutral shared logic |

---

## 1. Orphanet Prevalence Data Integration (#6)

### API Investigation Results (VERIFIED LIVE)

**Orphadata REST API** at `https://api.orphadata.com/` provides free, public access to rare disease epidemiology data. No authentication required. CC-BY-4.0 license.

**CORS: CONFIRMED WORKING.** The API returns `Access-Control-Allow-Origin` headers that echo the requesting origin, meaning browser-side requests from GitHub Pages will work without a proxy.

**Data flow: Gene symbol -> ORPHAcode -> Prevalence data:**

1. `GET /rd-associated-genes/genes/symbols/{symbol}` -- looks up diseases associated with a gene
   - **CRITICAL: Gene symbols must be lowercase** (e.g., `cftr` not `CFTR`). Uppercase returns 404.
   - Returns multiple diseases per gene (CFTR returns 6 diseases including CF, CBAVD, etc.)
   - Each result includes `DisorderGeneAssociation[].DisorderGeneAssociationType` to filter by relationship
   - Filter on `"Disease-causing germline mutation(s) in"` to find the primary causative disorder
   - Each result has `ORPHAcode` (integer)

2. `GET /rd-epidemiology/orphacodes/{orphacode}` -- returns prevalence/incidence data
   - Returns `Prevalence[]` array with entries per geographic region
   - Fields: `PrevalenceType`, `PrevalenceClass`, `PrevalenceGeographic`, `ValMoy` (mean value per 100,000), `Source`, `PrevalenceValidationStatus`
   - PrevalenceType values: "Point prevalence", "Prevalence at birth", "Annual incidence", "Lifetime prevalence"
   - For carrier frequency context, "Prevalence at birth" is the most relevant

**Verified response structure (Cystic Fibrosis, ORPHA:586):**

```json
{
  "data": {
    "__count": 1,
    "__licence": { "identifier": "CC-BY-4.0" },
    "results": {
      "ORPHAcode": 586,
      "Preferred term": "Cystic fibrosis",
      "Prevalence": [
        {
          "PrevalenceType": "Prevalence at birth",
          "PrevalenceClass": "1-5 / 10 000",
          "PrevalenceGeographic": "Europe",
          "ValMoy": "19.3912",
          "Source": "ORPHANET",
          "PrevalenceValidationStatus": "Validated"
        },
        {
          "PrevalenceType": "Point prevalence",
          "PrevalenceClass": "1-5 / 10 000",
          "PrevalenceGeographic": "Europe",
          "ValMoy": "11.1319",
          "Source": "ORPHANET"
        }
      ]
    }
  }
}
```

**`ValMoy` is per 100,000** -- a value of 19.3912 means ~1 in 5,157 births.

### Recommendation: Live API Query (Primary) + Caching

**Use live Orphadata API calls directly from the browser.** Do NOT build a static curated mapping.

**Rationale:**
- CORS is confirmed working -- no proxy needed
- API is free, no auth, no API key
- Data updates monthly -- a static mapping would quickly become stale
- The two-request chain (gene -> diseases -> prevalence) is fast and deterministic
- Test mockability is trivial -- mock the two HTTP endpoints

**Implementation approach:**

1. Add `@gnomad-cf/core/orphanet` subpath with:
   - `OrphanetClient` class using native `fetch` (same pattern as existing `@gnomad-cf/core/client`)
   - Type definitions for Orphanet API responses (Zod schemas for runtime validation)
   - `lookupPrevalence(geneSymbol: string)` function that chains the two API calls
   - Filtering logic: select disease with `DisorderGeneAssociationType === "Disease-causing germline mutation(s) in"`
   - Extract "Prevalence at birth" for the "Europe" geographic region as primary display value

2. Add `useOrphanetPrevalence` composable in `apps/web` that wraps the core client with Vue reactivity

3. Cache responses in Pinia store (session-level) to avoid redundant API calls during the same session

**What NOT to do:**
- Do NOT add an npm package for Orphanet -- none exist that are maintained
- Do NOT pre-download the full Orphanet dataset (6,000+ diseases, large payload, unnecessary)
- Do NOT use the ORPHAcode API (api.orphacode.org) -- that is for code lookups only, no prevalence data
- Do NOT store Orphanet data in localStorage/IndexedDB beyond session cache -- data changes monthly

**Rate limits:** Not documented, but the API is backed by Elasticsearch. Be conservative: debounce requests, cache results, do not batch-query hundreds of genes. For our single-gene-at-a-time use case, this is not a concern.

**New dependencies: NONE.** The Orphadata API is plain REST returning JSON. Native `fetch` + Zod validation is all that is needed. Zod is already installed.

**Confidence:** HIGH -- API tested live, CORS confirmed, response format documented from actual responses.

**Sources:**
- [Orphadata API OpenAPI spec](https://api.orphadata.com/openapi.json) -- full endpoint list
- [Orphadata API Swagger UI](https://api.orphadata.com/) -- interactive docs
- [Orphanet/API_Orphadata GitHub](https://github.com/Orphanet/API_Orphadata) -- source code (Flask + Elasticsearch)
- [Orphadata epidemiology page](https://www.orphadata.com/_epidemiology/) -- dataset description

---

## 2. Chart/Visualization Library (#2)

### Comparison Matrix

| Library | Min+Gzip | Tree-shakeable | Vue 3 Wrapper | Chart Types | Accessibility | Vuetify Theme |
|---------|----------|----------------|---------------|-------------|---------------|---------------|
| Inline SVG (zero deps) | 0 KB | N/A | Native | Custom only | Full control | Full control |
| Chart.js 4 + vue-chartjs | ~60-70 KB total | Yes (manual registration) | vue-chartjs 5.x | Bar, Line, Doughnut, Radar, etc. | Plugin available | Via config |
| uPlot + uplot-vue | ~50 KB (min) | No (monolithic) | uplot-vue 1.2.4 | Time series, Line, Bar | Limited | Manual |
| Apache ECharts + vue-echarts | ~270 KB (gzip) | Partial (import specific charts) | vue-echarts 7.x | Everything | Built-in ARIA | Via theme |
| D3.js | ~90 KB (gzip) | Yes (import specific modules) | No wrapper needed | Everything (low-level) | Manual | Manual |

### Recommendation: Inline SVG Components (Zero Dependencies)

**Use hand-crafted Vue 3 SVG components for the carrier frequency visualization.** Do NOT add a charting library.

**Rationale:**

1. **The chart requirements are minimal.** The v1.6 visualization needs are:
   - A horizontal bar chart comparing carrier frequencies across populations (8-9 bars)
   - Possibly a simple comparison between calculated carrier frequency and Orphanet prevalence
   - These are static, non-interactive, print-friendly displays

2. **Bundle size matters for a medical tool deployed on GitHub Pages.** Every KB impacts load time for users in clinical settings (hospital networks are often slow). Adding 60-270 KB for a charting library to draw 8 bars is disproportionate.

3. **Vuetify theme integration is trivial with inline SVG.** SVG elements can use CSS variables from Vuetify's theme system directly. No adapter layer needed.

4. **Accessibility is better with custom SVG.** You control ARIA labels, role attributes, and screen reader text directly. Chart libraries often have poor or inconsistent a11y.

5. **The user is a senior data scientist.** They will appreciate a lean, fast implementation over a heavy abstraction.

**Implementation pattern:**

```vue
<!-- PopulationBarChart.vue -->
<template>
  <svg
    :viewBox="`0 0 ${width} ${height}`"
    role="img"
    :aria-label="`Carrier frequency by population for ${gene}`"
    class="population-chart"
  >
    <g v-for="(pop, i) in sortedPopulations" :key="pop.code">
      <rect
        :x="labelWidth"
        :y="i * barHeight + padding"
        :width="scale(pop.carrierFrequency)"
        :height="barHeight - 2"
        :fill="pop.isFounderEffect ? founderColor : barColor"
      />
      <text :x="0" :y="i * barHeight + barHeight / 2 + padding" dominant-baseline="middle">
        {{ pop.label }}
      </text>
      <text
        :x="labelWidth + scale(pop.carrierFrequency) + 4"
        :y="i * barHeight + barHeight / 2 + padding"
        dominant-baseline="middle"
        class="text-caption"
      >
        {{ formatFrequency(pop.carrierFrequency) }}
      </text>
    </g>
  </svg>
</template>
```

This is ~50 lines of Vue template + ~30 lines of computed properties. No library needed.

**When to reconsider:**
- If v1.7+ adds complex interactive visualizations (zoom, tooltips, multiple overlapping series)
- If users request exportable chart images (Canvas-based libraries handle this better)
- At that point, add Chart.js 4 + vue-chartjs -- it is the best balance of features/size

**Fallback recommendation (if charting library IS needed):**

If the requirements expand beyond simple bars, add:

```bash
bun add chart.js vue-chartjs --cwd apps/web
```

- `chart.js` v4.4.x -- tree-shakeable with manual component registration
- `vue-chartjs` v5.x -- thin Vue 3 wrapper (~3 KB itself, Chart.js is the bulk)
- Use selective imports to minimize bundle:

```typescript
import { Chart, BarController, BarElement, CategoryScale, LinearScale } from 'chart.js'
Chart.register(BarController, BarElement, CategoryScale, LinearScale)
```

This approach keeps Chart.js to ~30-40 KB gzipped (vs ~65 KB for full auto-registration).

**What NOT to add:**
- Apache ECharts / vue-echarts -- 270 KB gzipped is absurd for this use case
- D3.js -- low-level, requires significant wrapper code; overhead not justified for bar charts
- uPlot -- optimized for time series with thousands of points; not a good fit for categorical population data
- Lightweight Charts (TradingView) -- financial charting library, wrong domain entirely

**Confidence:** HIGH -- requirements are well-understood, inline SVG is proven pattern for simple charts in Vue.

**Sources:**
- [vue-bar-graph](https://github.com/lafriks/vue-bar-graph) -- example of zero-dep SVG bar chart in Vue 3
- [Chart.js tree-shaking docs](https://www.chartjs.org/docs/latest/getting-started/integration.html)
- [vue-chartjs](https://vue-chartjs.org/) -- Vue 3 wrapper
- [uPlot GitHub](https://github.com/leeoniya/uPlot) -- ~50 KB, time series focused

---

## 3. TSV Export Utilities (#9)

### Recommendation: Zero Dependencies -- Native String Concatenation + UTF-8 BOM

**No library needed.** TSV is the simplest tabular format: tab-separated values with newlines.

**Rationale:**
- The project already has `xlsx` for Excel export and native Blob/URL.createObjectURL for JSON export
- TSV generation is 15-20 lines of code
- The only "gotcha" is UTF-8 BOM for Excel compatibility, which is a single character prefix

**Implementation pattern (add to `@gnomad-cf/core` or `apps/web`):**

```typescript
// tsv-export.ts

const UTF8_BOM = '\uFEFF';
const TAB = '\t';
const NEWLINE = '\n';

/**
 * Convert array of objects to TSV string with UTF-8 BOM for Excel compatibility.
 * Handles tab and newline characters in values by replacing with spaces.
 */
export function toTSV(rows: Record<string, unknown>[], columns?: string[]): string {
  if (rows.length === 0) return '';

  const headers = columns ?? Object.keys(rows[0]);
  const headerLine = headers.join(TAB);

  const dataLines = rows.map(row =>
    headers.map(h => {
      const val = row[h];
      if (val === null || val === undefined) return '';
      return String(val).replace(/[\t\n\r]/g, ' '); // sanitize
    }).join(TAB)
  );

  return UTF8_BOM + headerLine + NEWLINE + dataLines.join(NEWLINE) + NEWLINE;
}
```

**Download using existing `downloadBlob` pattern:**

```typescript
function exportToTsv(data: ExportData, gene: string, population?: string): void {
  // Reuse existing buildExportVariants/buildExportPopulations from export-utils
  const tsvContent = toTSV(data.variants);
  const blob = new Blob([tsvContent], { type: 'text/tab-separated-values;charset=utf-8' });
  const filename = generateFilename(gene, population) + '.tsv';
  downloadBlob(blob, filename);
}
```

**Why UTF-8 BOM matters:**
- Excel on Windows defaults to the system locale encoding when opening .tsv/.csv files
- Without BOM, German characters (umlauts in gene descriptions) display as mojibake
- The BOM (`\uFEFF`) is invisible but signals to Excel: "this file is UTF-8"
- LibreOffice, Google Sheets, and macOS Numbers handle UTF-8 correctly regardless

**What NOT to add:**
- `papaparse` -- CSV/TSV parsing library; we are generating, not parsing
- `file-saver` -- the existing `downloadBlob` helper using Blob + createObjectURL is equivalent
- `csv-stringify` -- overkill for tab-separated output

**New dependencies: NONE.**

**Confidence:** HIGH -- trivial implementation, well-understood pattern, matches existing export architecture.

---

## 4. Scientific Notation Display (#10)

### Recommendation: `Intl.NumberFormat.formatToParts()` + Unicode Superscripts

**Use the browser's built-in `Intl.NumberFormat` with `notation: 'scientific'` and `formatToParts()` to generate publication-quality scientific notation like `2.56 x 10^-3` rendered as `2.56 x 10<sup>-3</sup>`.**

**No library needed.** This is a built-in browser API with full support in all modern browsers.

**Implementation pattern (add to `@gnomad-cf/core/calculations`):**

```typescript
// scientific-notation.ts

const SUPERSCRIPT_DIGITS = ['0','1','2','3','4','5','6','7','8','9'];
const SUPERSCRIPT_MINUS = '\u207B'; // Unicode superscript minus

/**
 * Format a number in scientific notation with Unicode superscript exponent.
 * e.g., 0.00256 -> "2.56 x 10^-3" (rendered with Unicode superscripts)
 *
 * Returns both plain text (for TSV/clipboard) and HTML (for display).
 */
export function formatScientific(
  value: number,
  significantDigits: number = 3,
  locale: string = 'en-US'
): { text: string; html: string; unicode: string } {
  if (value === 0) return { text: '0', html: '0', unicode: '0' };

  const formatter = new Intl.NumberFormat(locale, {
    notation: 'scientific',
    maximumSignificantDigits: significantDigits,
  });

  const parts = formatter.formatToParts(value);

  let coefficient = '';
  let exponent = '';
  let exponentSign = '';

  for (const { type, value: partValue } of parts) {
    switch (type) {
      case 'integer':
      case 'decimal':
      case 'fraction':
        coefficient += partValue;
        break;
      case 'exponentMinusSign':
        exponentSign = '-';
        break;
      case 'exponentInteger':
        exponent = partValue;
        break;
    }
  }

  const expStr = exponentSign + exponent;

  // Unicode superscript version (for inline text display)
  const superscriptExp = expStr.split('').map(c => {
    if (c === '-') return SUPERSCRIPT_MINUS;
    return SUPERSCRIPT_DIGITS[parseInt(c)];
  }).join('');

  return {
    text: `${coefficient} x 10^${expStr}`,           // Plain text: 2.56 x 10^-3
    html: `${coefficient} &times; 10<sup>${expStr}</sup>`, // HTML: 2.56 x 10<sup>-3</sup>
    unicode: `${coefficient} \u00D7 10${superscriptExp}`,  // Unicode: 2.56 x 10^-3 (superscript)
  };
}
```

**Usage in Vue template:**

```vue
<span v-html="formatScientific(frequency).html" />
<!-- or for plain text contexts: -->
<span>{{ formatScientific(frequency).unicode }}</span>
```

**Locale awareness:**
- `Intl.NumberFormat` handles locale-specific decimal separators automatically
- German locale: `2,56 x 10^-3` (comma as decimal separator)
- This is important for the German clinical text output

**What NOT to add:**
- No formatting libraries -- `Intl.NumberFormat` is native and sufficient
- No Unicode conversion libraries -- the superscript mapping is 12 characters total

**New dependencies: NONE.**

**Confidence:** HIGH -- `Intl.NumberFormat.formatToParts()` with scientific notation is a stable browser API. Verified via [MDN documentation](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat/formatToParts).

---

## 5. gnomAD v2.1.1 Subcontinental Populations (#5)

### Investigation Results (VERIFIED LIVE AGAINST gnomAD API)

**The subcontinental population data IS available in gnomAD v2.1.1, but only through single-variant queries, NOT gene-level queries.**

**Key finding from live API testing:**

| Query Type | Endpoint | Populations Returned |
|------------|----------|---------------------|
| Gene-level variants | `gene(gene_symbol:...) { variants { exome { populations } } }` | 8 continental only: `afr, amr, asj, eas, fin, nfe, oth, sas` |
| Single variant | `variant(variantId:...) { exome { populations } }` | 35 total: 8 continental + 9 subcontinental + 16 sex-stratified + 2 global sex |

**v2.1.1 subcontinental population IDs (verified):**

| Parent | Sub-ID | Label |
|--------|--------|-------|
| eas | eas_jpn | Japanese |
| eas | eas_kor | Korean |
| eas | eas_oea | Other East Asian |
| nfe | nfe_bgr | Bulgarian |
| nfe | nfe_est | Estonian |
| nfe | nfe_nwe | North-Western European |
| nfe | nfe_onf | Other Non-Finnish European |
| nfe | nfe_seu | Southern European |
| nfe | nfe_swe | Swedish |

**Sex-stratified IDs (also available):**
- Each population has `_XX` (female) and `_XY` (male) variants
- Global sex totals: `XX`, `XY`

**v4 comparison:** v4 does NOT have subcontinental breakdowns. Single-variant queries return only sex-stratified data (29 populations: 8 continental + `remaining` + sex splits).

### Recommendation: Two-Phase Query Strategy

**Phase 1 (current gene-level query):** Keep the existing `GENE_VARIANTS_QUERY` unchanged. It returns variants with continental-level population data. This is sufficient for the primary carrier frequency calculation.

**Phase 2 (subcontinental detail, on-demand):** For the selected qualifying variants, issue individual variant queries to fetch subcontinental breakdowns. This is an N+1 query pattern, but N is small (typically 5-50 qualifying variants for a gene).

**Implementation approach:**

1. Add a new query to `@gnomad-cf/core/queries`:

```typescript
export const VARIANT_DETAIL_QUERY = `
  query VariantDetail($variantId: String!, $dataset: DatasetId!) {
    variant(variantId: $variantId, dataset: $dataset) {
      variant_id
      exome {
        populations { id ac an ac_hom }
      }
      genome {
        populations { id ac an ac_hom }
      }
    }
  }
`;
```

2. Update `PopulationConfig` in `@gnomad-cf/core/config/types.ts` to support subcontinental populations:

```typescript
export interface PopulationConfig {
  code: string;
  label: string;
  description?: string;
  subpopulations?: PopulationConfig[];  // NEW: nested subpops
}
```

3. Update `gnomad.json` to include v2 subcontinental populations in config.

4. Implement subcontinental aggregation in `@gnomad-cf/core/calculations`:
   - Sum ac/an across qualifying variants for each subcontinental population
   - Calculate carrier frequency per subpopulation
   - Flag founder effects at the subcontinental level (e.g., nfe_nwe vs nfe_seu)

**Caveats:**
- This is v2.1.1 only. v3 and v4 do not expose subcontinental data via the API.
- The individual variant queries add latency. Implement with a progress indicator and parallel requests (batch of 5-10 at a time to avoid rate limiting).
- Some subcontinental populations have very small sample sizes (e.g., `nfe_est` with AN=238 for some variants). Must show low-sample-size warnings using the existing `lowSampleSizeThreshold` config.

**Existing query types need updating:**

The current `GeneVariantPopulation` type uses `ac_hom` but the single-variant `VariantPopulation` schema returns `homozygote_count` as well as `ac_hom` (both are available). Standardize on `ac_hom` which is present in both query types.

**New dependencies: NONE.** This is a query and calculation change only.

**Confidence:** HIGH -- verified live against gnomAD GraphQL API with actual CFTR variant queries.

**Sources:**
- [gnomAD v2.1 release](https://gnomad.broadinstitute.org/news/2018-10-gnomad-v2-1/) -- subcontinental population descriptions
- [gnomAD GraphQL API](https://gnomad.broadinstitute.org/api) -- live schema introspection
- [gnomAD discussion forum](https://discuss.gnomad.broadinstitute.org/) -- community API usage patterns

---

## Complete New Dependencies Summary

### Production Dependencies: NONE

No new npm packages are required for v1.6 features. Everything is implemented with:
- Native `fetch` (Orphanet API calls)
- Native `Intl.NumberFormat` (scientific notation)
- Native `Blob` + `URL.createObjectURL` (TSV export)
- Inline SVG Vue components (charts)
- Existing gnomAD GraphQL client (subcontinental queries)
- Existing `zod` (Orphanet response validation)

### Dev Dependencies: NONE

No new dev dependencies either.

### Impact on Bundle Size: MINIMAL

| Feature | Bundle Impact | Approach |
|---------|--------------|----------|
| Orphanet integration | ~2-3 KB (types, client, Zod schemas) | fetch + Zod (already installed) |
| Chart visualization | ~1-2 KB (SVG component template) | Inline SVG |
| TSV export | ~0.5 KB (string concatenation) | Native |
| Scientific notation | ~0.5 KB (Intl.NumberFormat wrapper) | Native browser API |
| Subcontinental pops | ~1-2 KB (query + config changes) | Existing GraphQL client |

**Total estimated bundle increase: ~5-8 KB.** This is exceptional for the feature set being added.

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Orphanet data | Live API query | Static curated JSON mapping | Data changes monthly; static mapping becomes stale. CORS confirmed working so no proxy needed. |
| Orphanet data | Live API query | Bulk XML/JSON download | 6,000+ diseases, ~50MB+. Only need 1 disease at a time. Wasteful. |
| Orphanet data | Native fetch + Zod | npm orphanet package | No maintained npm package exists for Orphanet API access. |
| Charts | Inline SVG | Chart.js + vue-chartjs | 60-70 KB for 8 bars is disproportionate. Revisit if interactive features needed. |
| Charts | Inline SVG | Apache ECharts | 270 KB gzipped. Absolutely not for simple bar charts. |
| Charts | Inline SVG | D3.js | 90 KB, low-level API requiring significant wrapper code. |
| Charts | Inline SVG | uPlot | 50 KB, optimized for time series not categorical data. No pie/doughnut support. |
| TSV export | String concat + BOM | papaparse | Parsing library; we are generating not parsing. |
| TSV export | Native Blob | file-saver | Existing downloadBlob helper is equivalent; file-saver adds nothing. |
| Sci notation | Intl.NumberFormat | numbro / numeral.js | These libraries are heavier and less capable than the native API for scientific notation. |
| Subpop queries | Per-variant query | Pre-fetch all variants | Gene-level query does not include subpop data. Must use variant-level query. |

---

## What NOT to Add

| Package | Why Not |
|---------|---------|
| Any Orphanet npm package | None exist that are maintained |
| chart.js / vue-chartjs | Overkill for current requirements (simple bar chart). Add later if interactive charts needed. |
| echarts / vue-echarts | 270 KB is unacceptable for this app size |
| d3 | Low-level; requires writing SVG bindings anyway |
| uplot / uplot-vue | Time-series focused; poor fit for categorical population data |
| papaparse | Parsing library; we generate TSV, not parse it |
| file-saver | Equivalent to existing downloadBlob pattern |
| numbro / numeral.js | Intl.NumberFormat is built-in and better for scientific notation |
| any GraphQL codegen tool | The gnomAD schema is not published as a downloadable schema; introspection works fine with hand-written types |

---

## Integration Points with Existing Architecture

### Core Package (`@gnomad-cf/core`)

New subpaths to add:

| Subpath | Contents | Used By |
|---------|----------|---------|
| `@gnomad-cf/core/orphanet` | OrphanetClient, types, prevalence lookup | web composable, CLI |
| (extend) `@gnomad-cf/core/calculations` | `formatScientific()` | web display, exports |
| (extend) `@gnomad-cf/core/queries` | `VARIANT_DETAIL_QUERY` | web composable for subpops |

### Web App (`apps/web`)

New composables:

| Composable | Wraps | Purpose |
|------------|-------|---------|
| `useOrphanetPrevalence` | `@gnomad-cf/core/orphanet` | Reactive Orphanet data with loading/error states |
| (extend) `useExport` | Add `exportToTsv()` | TSV export alongside existing JSON/Excel |

New components:

| Component | Type | Purpose |
|-----------|------|---------|
| `PopulationBarChart.vue` | SVG component | Horizontal bar chart of carrier frequencies |
| `SubpopulationDetail.vue` | Data display | Expandable subcontinental population breakdown |

### Config Changes

Update `gnomad.json` v2 entry to include `subpopulations` for NFE and EAS:

```json
{
  "code": "nfe",
  "label": "Non-Finnish European",
  "subpopulations": [
    { "code": "nfe_bgr", "label": "Bulgarian" },
    { "code": "nfe_est", "label": "Estonian" },
    { "code": "nfe_nwe", "label": "North-Western European" },
    { "code": "nfe_onf", "label": "Other NFE" },
    { "code": "nfe_seu", "label": "Southern European" },
    { "code": "nfe_swe", "label": "Swedish" }
  ]
}
```

---

## Version Compatibility Matrix

| Technology | Required | Reason |
|------------|----------|--------|
| Orphadata API | Current (no versioning) | Monthly data updates, CC-BY-4.0 |
| gnomAD API | v2.1.1 dataset (`gnomad_r2_1`) | Only version with subcontinental data |
| Intl.NumberFormat | ES2020+ (all modern browsers) | `notation: 'scientific'` and `formatToParts()` |
| Blob API | All modern browsers | TSV file generation |
| SVG | All modern browsers | Chart rendering |

No minimum browser version changes. The existing app already targets modern browsers.

---

## Sources

### Verified Live (HIGH confidence)
- Orphadata REST API -- tested endpoints live with `curl`, confirmed CORS, response format, and data structure
- gnomAD GraphQL API -- tested gene-level and single-variant queries, confirmed subcontinental population IDs
- `Intl.NumberFormat.formatToParts()` -- [MDN docs](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat/formatToParts)

### Official Documentation (HIGH confidence)
- [Orphadata API OpenAPI spec](https://api.orphadata.com/openapi.json)
- [Orphadata GitHub](https://github.com/Orphanet/API_Orphadata)
- [gnomAD v2.1 release notes](https://gnomad.broadinstitute.org/news/2018-10-gnomad-v2-1/)
- [Chart.js Integration docs](https://www.chartjs.org/docs/latest/getting-started/integration.html)
- [vue-chartjs](https://vue-chartjs.org/)

### Web Research (MEDIUM confidence)
- [Chart library comparison guide (Luzmo, 2025)](https://www.luzmo.com/blog/vue-chart-libraries)
- [uPlot GitHub](https://github.com/leeoniya/uPlot)
- [UTF-8 BOM for Excel](https://hyunbinseo.medium.com/save-csv-file-in-utf-8-with-bom-29abf608e86e)
