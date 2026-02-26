# Domain Pitfalls: v1.6 Analysis & Export

**Domain:** Adding data quality flags, source breakdown, display formats, TSV export, Orphanet data, subcontinental populations, and bar chart to existing Vue 3 + Vuetify 3 PWA monorepo
**Researched:** 2026-02-26
**Confidence:** HIGH (codebase verified + external source research)

---

## Summary

**Top pitfalls for this milestone, in order of severity:**

1. **Source breakdown double-counting**: A variant can be BOTH LoF HC AND ClinVar P/LP simultaneously. Naive category-count summation inflates the variant count and misrepresents the composition. The existing filter pipeline (`shouldIncludeVariantConfigurable`) uses short-circuit logic -- if LoF HC is true, it returns without checking ClinVar. Source breakdown must not infer categories from the filter path but from the variant's own properties.

2. **Orphanet API has no documented CORS support**: The Orphadata REST API (`api.orphadata.com`) does not document CORS headers. Direct browser `fetch()` from a GitHub Pages SPA will almost certainly fail with CORS errors. This app has no backend proxy. The ClinGen pattern (bundle a static file and update via GitHub Actions) is the proven fallback.

3. **Subcontinental population data is not available in the gnomAD v4 GraphQL API**: The gnomAD v4.0/v4.1 releases include continental-level ancestry groups only (`afr`, `amr`, `asj`, `eas`, `fin`, `mid`, `nfe`, `sas`). Sub-ancestry data was listed as a "future minor release" in the v4.0 announcement but has not appeared in the GraphQL schema. The current query returns flat `populations` arrays with no nesting.

4. **URL state schema (Zod) must remain backward-compatible**: The `UrlStateSchema` in `packages/core/src/types/url-state.ts` is used for shareable URLs. Adding new parameters (display format, subcontinental selection) must use Zod `.optional().default()` to avoid breaking existing shared links. If the schema rejects old URLs, users lose saved bookmarks.

5. **Chart library CSS conflicts with Vuetify**: Vuetify applies aggressive global CSS resets and theme colors. Chart libraries that use their own CSS (particularly SVG-based ones like D3) frequently conflict. The safest path is Chart.js via vue-chartjs, which renders to Canvas (no CSS conflicts) and supports tree-shaking.

6. **TSV export requires UTF-8 BOM for Excel compatibility**: Without a BOM prefix (`\uFEFF`), Excel on Windows opens TSV files with ANSI encoding, corrupting German characters like umlauts in population labels and clinical text. This is especially critical because the app generates German clinical documentation.

7. **Adding fields to `GnomadVariant` or `DisplayVariant` ripples through the entire pipeline**: These types flow through filters, calculations, URL state, export, and display. Adding a `qualityFlag` or `source` field requires updating normalization in `useCarrierFrequency` (lines 167-191), the filter pipeline, the display transform (`toDisplayVariant`), the export builder (`buildExportVariants`), and tests.

---

## Critical Pitfalls

Mistakes that cause incorrect clinical output, data corruption, or features that cannot ship.

---

### Pitfall 1: Source Breakdown Double-Counting Variants

**What goes wrong:** When implementing a source breakdown (showing how many qualifying variants come from "LoF HC", "ClinVar P/LP", or "Missense + ClinVar"), a naive approach counts each variant once per matching category. But a variant can qualify via MULTIPLE categories simultaneously. For example, a variant can be:
- LoF HC on canonical transcript (LOFTEE says HC)
- AND ClinVar Pathogenic with 2+ stars

The existing `shouldIncludeVariantConfigurable` function in `variant-filters.ts` (line 188) returns `true` on the first match:
```typescript
// Line 188: If LoF HC matches, returns true WITHOUT checking ClinVar
if (config.lofHcEnabled && isLoFHC) {
  return true;
}
```
This short-circuit means the filter does not tell you WHY a variant was included. If you naively infer "this variant was included for LoF" from the filter path, you miss that it also has ClinVar evidence.

**Why it happens:** The filter was designed as a binary include/exclude gate, not a classification system. It optimizes for performance (early return). Source breakdown requires classification, which is a different operation.

**Consequences:**
- If you sum "LoF count" + "ClinVar count" + "Missense+ClinVar count", the total exceeds the actual qualifying variant count
- Users see inconsistent numbers: "8 qualifying variants" but the breakdown sums to 11
- Clinical documentation referencing the breakdown becomes misleading

**Prevention:**
1. Implement source classification as a SEPARATE function from filtering, NOT by modifying the filter return type
2. Use an enum or bitmask: `source: 'lof_only' | 'clinvar_only' | 'lof_and_clinvar' | 'missense_clinvar'`
3. Compute the classification by checking ALL criteria for each variant, not short-circuiting:
   ```typescript
   function classifyVariantSource(variant, clinvarVariants, config): VariantSource {
     const isLoF = config.lofHcEnabled && variant.transcript_consequence
       ? isHighConfidenceLoF(variant.transcript_consequence) : false;
     const hasClinvar = /* check ClinVar status */;
     const isMissense = /* check missense */;

     if (isLoF && hasClinvar) return 'lof_and_clinvar';
     if (isLoF) return 'lof_only';
     if (isMissense && hasClinvar) return 'missense_clinvar';
     if (hasClinvar) return 'clinvar_only';
     return 'unknown'; // should not happen for qualifying variants
   }
   ```
4. The breakdown display should show non-overlapping categories with a Venn-diagram approach (overlaps shown separately)
5. Write tests with known CFTR variants that are both LoF HC and ClinVar Pathogenic to verify no double-counting

**Warning signs:**
- Source breakdown sum differs from `qualifyingVariantCount`
- A new `source` field is added to the return value of `shouldIncludeVariantConfigurable` instead of being computed separately
- The filter function is modified to return more than a boolean

**Phase to address:** Source breakdown implementation phase (design the classification type BEFORE building the UI)

**Confidence:** HIGH -- Verified by reading `shouldIncludeVariantConfigurable` in `variant-filters.ts` and confirming the short-circuit pattern

---

### Pitfall 2: Orphanet API CORS Blocks Direct Browser Access

**What goes wrong:** The Orphadata REST API at `api.orphadata.com` provides gene-disease association data, epidemiology, and disease classification. However, the OpenAPI specification does not document CORS headers, and there is no evidence that `Access-Control-Allow-Origin` is set. When the SPA tries to `fetch('https://api.orphadata.com/rd-associated-genes/...')` from `gnomad-carrier-frequency.kidney-genetics.org`, the browser blocks the request with a CORS error.

**Why it happens:** This app runs entirely in the browser with no backend server. The gnomAD API works because Broad Institute explicitly enables CORS for their GraphQL endpoint. The ClinGen API also has CORS issues -- the existing codebase already solves this with a **bundled local CSV** approach (`useClingenValidity.ts` lines 8-13):
```typescript
// ClinGen CSV - use local bundled copy to avoid CORS issues on GitHub Pages
const CLINGEN_CSV_LOCAL = `${import.meta.env.BASE_URL}data/clingen-gene-validity.csv`;
```
There is also a Vite dev proxy for ClinGen (`vite.config.ts` lines 161-166).

**Consequences:**
- Orphanet data fetch fails silently or throws CORS errors in production
- Feature appears to work in development (Vite proxy can work around CORS) but fails on GitHub Pages
- If not caught before deploy, the feature ships broken

**Prevention:**
1. **Follow the ClinGen pattern exactly**: Pre-fetch Orphanet data via GitHub Actions, store as a static JSON file in `public/data/`, load at runtime
2. Create a GitHub Actions workflow that periodically fetches from the Orphanet API (which IS accessible server-side, just not from browsers) and commits the JSON to the repo
3. Add a runtime cache pattern: load from `public/data/orphanet-genes.json` first, fall back gracefully if missing
4. Use the same Pinia store + cache expiry pattern as `useClingenStore` (30-day cache in localStorage)
5. Add a `runtimeCaching` entry in the Vite PWA workbox config for the local Orphanet data file
6. **Do NOT rely on a Vite dev proxy** as a long-term solution -- it only works in development

**Warning signs:**
- Orphanet API calls appear in browser network tab on the production site
- Feature works in `bun run dev` but not in `bun run preview` or production
- No entry in `vite.config.ts` workbox `runtimeCaching` for Orphanet data

**Phase to address:** Orphanet integration phase (FIRST task should be verifying CORS, then immediately switching to the static-file pattern)

**Confidence:** MEDIUM -- Could not definitively confirm CORS is blocked (API was unreachable during testing), but the absence of CORS documentation in the OpenAPI spec and the precedent set by ClinGen strongly suggest it. Treat as blocked until proven otherwise.

---

### Pitfall 3: gnomAD v4 Subcontinental Populations Are Not Available via GraphQL

**What goes wrong:** The milestone includes adding subcontinental population breakdown. However, gnomAD v4.0's announcement explicitly stated that "sub-genetic ancestry groups" would be released in subsequent minor releases. As of v4.1 (April 2024), the GraphQL API still only returns continental-level population codes in the `populations` array. The current query (`GENE_VARIANTS_QUERY` in `gene-variants.ts`) requests:
```graphql
joint {
  populations {
    id    # Returns: "afr", "amr", "asj", "eas", "fin", "mid", "nfe", "sas"
    ac
    an
    homozygote_count
  }
}
```
There is no `subpopulations` or nested population field in the schema.

**Why it happens:** The gnomAD team is working on local ancestry inference (LAI) at the subcontinental level, but the resolution is currently limited to continental level. The data exists in gnomAD's internal Hail tables but is not exposed through the public GraphQL API.

**Consequences:**
- Implementing subcontinental population breakdown is blocked by an upstream API limitation
- Attempting to query a non-existent field causes GraphQL errors
- Time invested in building subcontinental UI is wasted if the data source cannot provide it

**Prevention:**
1. **Verify the current gnomAD GraphQL schema BEFORE building any subcontinental UI**: Use the interactive API explorer at `https://gnomad.broadinstitute.org/api` to check available fields on `VariantPopulation` / `JointPopulation`
2. If subcontinental data is not available, **defer this feature** or scope it to gnomAD v2/v3 only (v2 had some subcontinental breakdowns like `eas_kor`, `eas_jpn`, etc.)
3. Design the `PopulationConfig` type to support nesting WITHOUT requiring the data to exist:
   ```typescript
   interface PopulationConfig {
     code: string;
     label: string;
     children?: PopulationConfig[]; // subcontinental if available
   }
   ```
4. The GraphQL query and `gnomad.json` config already have the right structure to add populations -- just don't assume the API will return data for subcontinental codes
5. Consider offering subcontinental data from gnomAD v2.1.1 only, where it exists in the `exome` and `genome` population arrays with codes like `nfe_est`, `nfe_bgr`, `nfe_nwe`, etc.

**Warning signs:**
- Building subcontinental UI components before confirming the API returns the data
- GraphQL query including `subpopulations` or `subgroups` field names that don't exist
- Hard-coding subcontinental population codes in `gnomad.json` for v4 without API verification

**Phase to address:** Subcontinental populations phase (first task is API schema verification; if blocked, rescope to v2-only or defer)

**Confidence:** MEDIUM -- Based on gnomAD v4.0 announcement and community forum discussions. The GraphQL schema may have been updated after my research; verify at implementation time.

---

### Pitfall 4: URL State Schema Changes Break Existing Shared Links

**What goes wrong:** The URL state system (`useUrlState.ts` + `UrlStateSchema` in `url-state.ts`) uses Zod for validation. Shared URLs like `?gene=CFTR&step=3&filters=lmc` are used by genetic counselors to share results with colleagues. If new parameters are added incorrectly (e.g., a required field without a default), existing URLs fail `UrlStateSchema.safeParse()` and fall back to defaults, losing the user's saved state.

The current schema uses `.optional().default()` consistently (verified in `url-state.ts`). The danger is that a new developer adding display format or subcontinental population parameters might:
- Add a required field (no `.optional()`)
- Add a field with `.refine()` that rejects old valid states
- Change an existing field's type (e.g., `filters` regex pattern)

**Why it happens:** Zod's `safeParse` is already used (line 81-91), which returns defaults on failure. But if the ENTIRE schema parse fails (not just one field), ALL state falls back to defaults. Zod does not partially parse -- it is all-or-nothing at the schema level.

**Consequences:**
- Genetic counselors click a shared link and see a blank state instead of the expected gene
- Bookmarked URLs in clinical workflows stop working
- Loss of user trust -- the tool is used in clinical contexts where reproducibility matters

**Prevention:**
1. **Every new URL parameter MUST use `.optional().default()`** -- never add a required field
2. New parameters should NOT change the regex pattern of existing fields (e.g., `filters`)
3. Add backward-compatibility tests:
   ```typescript
   test('v1.5 URL still parses correctly', () => {
     const oldUrl = { gene: 'CFTR', step: '3', filters: 'lmc', clinvarStars: '2' };
     const result = parseUrlState(oldUrl);
     expect(result.gene).toBe('CFTR');
   });
   ```
4. If adding a new display format parameter (e.g., `fmt=ratio`), use a new parameter name that does not collide with existing ones
5. Consider adding a version prefix to the URL state if breaking changes become necessary in the future

**Warning signs:**
- New URL parameter without `.optional()`
- Changes to the `filters` regex pattern
- `parseUrlState` returning defaults for previously valid URLs

**Phase to address:** Any phase that adds new URL state parameters (display format, subcontinental selection, export preferences)

**Confidence:** HIGH -- Verified by reading `UrlStateSchema` definition and `parseUrlState` implementation

---

## Moderate Pitfalls

Mistakes that cause delays, UI bugs, or technical debt.

---

### Pitfall 5: Chart Library CSS Conflicts with Vuetify Theme

**What goes wrong:** Vuetify 3 applies global CSS via its theme system, including font styles, color variables, and layout resets. Chart libraries that render SVG (D3, ECharts, Highcharts) inject their own CSS which can conflict with Vuetify's styles. Common symptoms:
- Chart tooltips appear behind Vuetify dialogs (z-index conflicts)
- Chart text uses Vuetify's font instead of the chart library's default
- Dark mode toggle breaks chart colors because Vuetify theme CSS variables override chart colors
- Chart container sizing fights with Vuetify's grid system

**Why it happens:** SVG-based chart libraries style elements with CSS classes that can be overridden by Vuetify's global selectors. Canvas-based libraries (Chart.js) are immune because they render pixels, not DOM elements.

**Consequences:**
- Hours debugging styling issues that only appear in certain Vuetify themes
- Bar chart looks correct in isolation but wrong inside a Vuetify card or dialog
- Dark mode regression: chart becomes unreadable when theme switches

**Prevention:**
1. **Use Chart.js via vue-chartjs** -- Canvas rendering avoids all CSS conflicts
2. If using Chart.js, import ONLY the needed components for tree-shaking:
   ```typescript
   import { Bar } from 'vue-chartjs';
   import { Chart, BarElement, CategoryScale, LinearScale, Tooltip } from 'chart.js';
   Chart.register(BarElement, CategoryScale, LinearScale, Tooltip);
   ```
3. Full Chart.js is ~60KB gzipped; with tree-shaking (bar chart only), expect ~25KB
4. Lazy-load the chart component with `defineAsyncComponent` to avoid adding it to the initial bundle:
   ```typescript
   const PopulationChart = defineAsyncComponent(() => import('./PopulationChart.vue'));
   ```
5. Wrap the chart in a `<div>` with explicit width/height, NOT relying on Vuetify's flex sizing
6. For PWA: add chart.js to the service worker's precache list if you want offline chart rendering

**Warning signs:**
- Chart tooltip renders behind a Vuetify `v-dialog`
- Chart labels change font when Vuetify theme loads
- Chart container collapses to 0 height inside a Vuetify `v-card`

**Phase to address:** Bar chart implementation phase

**Confidence:** HIGH -- Based on Chart.js documentation confirming Canvas rendering and community reports of SVG library conflicts with Material Design frameworks

---

### Pitfall 6: TSV Export Without BOM Corrupts German Characters in Excel

**What goes wrong:** The app generates clinical text in German, including characters like umlauts (a, o, u), Eszett, and gender-inclusive characters (:, *). When exporting TSV data, if the file is created as a `Blob` with `type: 'text/tab-separated-values; charset=utf-8'` but WITHOUT a BOM (Byte Order Mark), Excel on Windows defaults to ANSI encoding and displays German characters as mojibake (e.g., "Anlagetrager" instead of "Anlagetrager*innen").

The existing export utilities in `export-utils.ts` use `formatPercent` and `formatRatio` which call `toLocaleString()` -- locale-aware formatting that may produce characters like the thousands separator dot in German locales (1.234 vs 1,234).

**Why it happens:** Excel does not auto-detect UTF-8 in TSV files. It uses the system's default encoding (Windows-1252 on most Western European Windows installations). The UTF-8 BOM (`\uFEFF` or bytes `0xEF 0xBB 0xBF`) is the signal that tells Excel "this file is UTF-8."

**Consequences:**
- Population labels like "Non-Finnish European" render correctly, but "Anlagetrager*innen" in template text becomes garbled
- Genetic counselors copy-paste corrupted text into patient letters
- Users on macOS may not notice (Numbers and LibreOffice handle UTF-8 better), but Windows Excel users see corruption

**Prevention:**
1. **Prepend `\uFEFF` to all TSV content** before creating the Blob:
   ```typescript
   const BOM = '\uFEFF';
   const blob = new Blob([BOM + tsvContent], { type: 'text/tab-separated-values; charset=utf-8' });
   ```
2. Escape tab and newline characters within cell values (HGVS notations can contain special characters)
3. Quote fields that contain tabs, newlines, or the delimiter
4. Test with a gene like CFTR on Windows Excel to verify umlaut rendering
5. Use `\t` as delimiter, NOT comma (CSV has different quoting rules)
6. Add `\r\n` line endings (Windows line endings) for best Excel compatibility
7. For the filename, use `.tsv` extension, NOT `.txt` (Excel associates TSV with tab-delimited import)

**Warning signs:**
- TSV file created without BOM
- German text characters display incorrectly when opened in Excel
- Unix line endings (`\n` only) causing all data to appear in one row in Excel

**Phase to address:** TSV export implementation phase

**Confidence:** HIGH -- Well-documented issue confirmed by multiple sources including GitHub issues from Open Targets and DataBiosphere projects

---

### Pitfall 7: Extending Variant Types Ripples Through Entire Pipeline

**What goes wrong:** Adding a new field to `GnomadVariant` (e.g., `qualityFlags`) or `DisplayVariant` (e.g., `source: VariantSource`) requires changes in every file that transforms, filters, or exports these types. The pipeline is:

```
GnomadVariant (API response)
  -> normalizedVariants (useCarrierFrequency.ts lines 167-178)
  -> filterPathogenicVariantsConfigurable (variant-filters.ts)
  -> pathogenicVariants (used for calculations)
  -> toDisplayVariant (variant-display.ts)
  -> DisplayVariant (used for UI tables)
  -> buildExportVariants (export-utils.ts)
  -> ExportVariant (used for JSON/TSV export)
```

If you add `qualityFlags` to `GnomadVariant` in `types/variant.ts`, you must also:
1. Map it in the normalization step (`useCarrierFrequency.ts` line 167)
2. Decide if filters should use it (`variant-filters.ts`)
3. Pass it through to `toDisplayVariant` (`variant-display.ts`)
4. Add it to `DisplayVariant` type (`types/display.ts`)
5. Add it to `ExportVariant` type (`types/export.ts`)
6. Format it in `buildExportVariants` (`export-utils.ts`)
7. Update any tests that construct these types

**Why it happens:** The types flow through a deep pipeline with manual mapping at each stage. There is no generic transform -- each stage explicitly maps fields. This is correct (each stage has different needs) but means additions are laborious.

**Consequences:**
- Missing the normalization step: the new field is `undefined` in the computed variant, silently dropped
- Missing the export step: TSV export omits the new column
- Missing the display step: UI shows stale/incomplete data
- TypeScript catches some of these (if the field is required), but optional fields (`qualityFlags?: ...`) can be silently omitted

**Prevention:**
1. Before adding any new field, trace the complete type pipeline above and list every file that needs updating
2. Make new fields REQUIRED in the types that use them (forces TypeScript to flag every missing mapping)
3. Add the field to the TYPES FIRST, then fix all TypeScript errors -- the compiler is your checklist
4. Write a test that asserts the new field appears in the export output
5. Consider adding the field to the GraphQL query at the same time as the types (if the field comes from gnomAD)

**Warning signs:**
- New field on `GnomadVariant` but not on `DisplayVariant`
- New field on `DisplayVariant` but not on `ExportVariant`
- `normalizedVariants` computed in `useCarrierFrequency.ts` not including the new field

**Phase to address:** Any phase that adds data to variants (quality flags, source classification, Orphanet annotations)

**Confidence:** HIGH -- Verified by tracing the type flow through the codebase

---

### Pitfall 8: Service Worker Cache Must Include New External Data Sources

**What goes wrong:** The PWA's service worker (configured in `vite.config.ts` lines 72-117) caches gnomAD API responses and ClinGen API responses. When adding Orphanet data (as a local JSON file in `public/data/`), the service worker must also cache this file. If the Orphanet JSON is NOT in the workbox config, the PWA works online but fails offline for any feature that depends on Orphanet data.

Similarly, if a bar chart library loads external fonts or resources, those also need caching rules.

**Why it happens:** The current workbox config has three explicit `runtimeCaching` entries:
1. `gnomad-api-cache` -- gnomAD GraphQL responses
2. `clingen-api-cache` -- ClinGen API responses
3. `gene-config-cache` -- Gene config JSON from GitHub

The `globPatterns` (`['**/*.{js,css,html,ico,png,svg,woff2}']`) catches static assets in the build output but does NOT catch `.json` files in `public/data/`. The Orphanet JSON needs either a glob pattern update or a dedicated runtime cache entry.

**Consequences:**
- Orphanet disease names display as "Loading..." or error state when offline
- PWA install prompt appears but the installed app is degraded
- Inconsistent behavior: some data works offline (gnomAD from cache) but Orphanet does not

**Prevention:**
1. Add `.json` to the globPatterns: `['**/*.{js,css,html,ico,png,svg,woff2,json}']` -- but be careful, this caches ALL JSON files including the Vite manifest
2. Better: add a specific runtime cache entry for local data files:
   ```typescript
   {
     urlPattern: /\/data\/.*\.json$/,
     handler: 'StaleWhileRevalidate',
     options: {
       cacheName: 'local-data-cache',
       expiration: { maxEntries: 20, maxAgeSeconds: 604800 }, // 7 days
     },
   }
   ```
3. Test offline behavior by running `bun run build && bun run preview`, then toggling "Offline" in DevTools
4. Verify that the service worker update prompt (registerType: 'prompt') still works correctly after adding new cache entries

**Warning signs:**
- New data files in `public/data/` without corresponding cache entries
- Feature works in dev but not in PWA offline mode
- Service worker cache grows unbounded (no `maxEntries` limit)

**Phase to address:** Orphanet integration phase (immediately after creating the local JSON file)

**Confidence:** HIGH -- Verified from `vite.config.ts` PWA configuration

---

### Pitfall 9: Display Format Changes Affect Clinical Text Templates

**What goes wrong:** Adding new display formats (e.g., showing frequency as "1 in 25" instead of "1:25", or using scientific notation for rare frequencies) can break the clinical text template system. The templates in `packages/core/src/config/templates/de.json` and `en.json` contain placeholders like `{{carrierFrequencyRatio}}` that expect a specific format. If the display format changes, the generated clinical text may:
- Contain mismatched formats (the summary card shows "1 in 25" but the letter text shows "1:25")
- Break German sentence structure (some formats require different grammatical constructions)
- Produce clinically confusing output (mixing percentage and ratio in the same sentence)

**Why it happens:** The template variables are defined in `template-variables.ts` and rendered by substituting values. The `formatCarrierFrequency` function in `formatters.ts` returns `{ percent, ratio }`. These two strings flow into template context. If a new "1 in X" format is added, it must be a NEW template variable (e.g., `{{carrierFrequencyNatural}}`), not a replacement for the existing ratio format.

**Consequences:**
- Clinical letters generated with inconsistent formatting
- German grammar breaks if a new format doesn't work with the existing template sentence structure
- Template customizations saved in user's localStorage (via `useTemplateStore`) may reference variables that no longer exist

**Prevention:**
1. **Never change the output of existing format functions** (`frequencyToPercent`, `frequencyToRatio`) -- add new functions alongside them
2. Add new template variables (e.g., `carrierFrequencyNatural`) rather than changing `carrierFrequencyRatio`
3. Update both `de.json` and `en.json` templates simultaneously
4. Update `TEMPLATE_VARIABLES` in `template-variables.ts` to document the new variable with examples
5. Test by generating clinical text for a known gene and comparing to the current output
6. For locale-aware number formatting, use explicit `toLocaleString('de-DE')` or `toLocaleString('en-US')`, never default locale (which depends on the user's browser)

**Warning signs:**
- Changes to `frequencyToPercent` or `frequencyToRatio` function signatures or output format
- New display format without a corresponding template variable
- Templates updated in one language but not the other

**Phase to address:** Display format phase

**Confidence:** HIGH -- Verified by reading template system and formatter functions

---

### Pitfall 10: `toLocaleString()` Output Varies by Browser and OS

**What goes wrong:** The existing code uses `toLocaleString()` in `formatters.ts` line 25:
```typescript
return `1:${ratio.toLocaleString()}`;
```
And in `prevalence.ts` line 63:
```typescript
const ratio = `1:${Math.round(1 / prevalence).toLocaleString("en-US")}`;
```

The inconsistency is already present: `formatters.ts` uses the DEFAULT locale (browser-dependent) while `prevalence.ts` explicitly uses `en-US`. When adding new display formats, if `toLocaleString()` is used without an explicit locale:
- On a German-locale browser: `1,234` (dot = decimal, comma = thousands)
- On a US-locale browser: `1,234` (comma = thousands)
- On some mobile browsers: locale detection is unreliable

For carrier frequency ratios, this means "1:1,234" could mean either "1 in 1234" or "1 in 1.234" depending on the user's locale.

**Why it happens:** JavaScript's `toLocaleString()` without arguments uses the runtime's default locale. The app's target audience is German-speaking genetic counselors, but the code does not consistently enforce a locale.

**Consequences:**
- Inconsistent number formatting between different parts of the output
- A genetic counselor in Germany sees "1:1.234" (German thousands separator) while a colleague in the US sees "1:1,234"
- TSV export has different formatting than the on-screen display
- Clinical text contains locale-dependent formatting that may confuse recipients

**Prevention:**
1. Establish a formatting convention: ALL user-facing numbers should use an explicit locale
2. Use `en-US` for technical/scientific output (ratios, allele counts) -- this is the standard in genetics
3. Use the user's locale only for prose text if needed
4. Create a centralized number formatting utility in `@gnomad-cf/core/calculations`:
   ```typescript
   export function formatCount(n: number): string {
     return n.toLocaleString('en-US');
   }
   ```
5. Fix the inconsistency in `formatters.ts` line 25 to use an explicit locale
6. For TSV export, use raw numbers (no formatting) in data columns; only format in display columns

**Warning signs:**
- `toLocaleString()` called without locale argument in new code
- Different number formats appearing in different parts of the app
- TSV export numbers have thousands separators (they should not -- Excel treats them as text)

**Phase to address:** Display format phase (establish the convention before implementing new formats)

**Confidence:** HIGH -- Verified the inconsistency between `formatters.ts` and `prevalence.ts`

---

### Pitfall 11: Large Gene TSV Export Can Exceed Browser Memory

**What goes wrong:** Some genes have thousands of variants. For example, a gene like TTN has ~28,000 variants in gnomAD. The existing filter reduces this to qualifying variants only, but even CFTR has 20-50 qualifying variants with full population breakdowns. If the TSV export includes per-population per-variant frequency data (a variant x population matrix), the string construction in memory can be large.

Additionally, `Blob` URL creation (`URL.createObjectURL`) holds the data in memory until revoked. If the user exports multiple times without page navigation, memory accumulates.

**Why it happens:** The TSV export concatenates all data into a single string, creates a Blob, creates an object URL, triggers download, but may not revoke the URL. The current JSON export (`buildExportData` in `export-utils.ts`) builds the complete data structure in memory.

**Consequences:**
- For very large genes, the browser tab may become sluggish during export
- Multiple exports without URL revocation cause memory leaks
- Mobile browsers with limited memory may crash

**Prevention:**
1. Always call `URL.revokeObjectURL(url)` after the download is triggered (use `setTimeout` to allow the download to start):
   ```typescript
   const url = URL.createObjectURL(blob);
   const a = document.createElement('a');
   a.href = url;
   a.download = filename;
   a.click();
   setTimeout(() => URL.revokeObjectURL(url), 1000);
   ```
2. For very large exports, consider streaming to a `WritableStream` if the browser supports it
3. Limit the population breakdown in TSV to top-level populations only (not subcontinental)
4. Add a row count estimate before export and warn users if > 1000 rows
5. Do NOT include per-population per-variant breakdowns in the default TSV -- make it an opt-in "detailed" export

**Warning signs:**
- `URL.createObjectURL` called without corresponding `revokeObjectURL`
- Building the complete export data structure before checking if the user confirmed the export
- No export size limit or warning

**Phase to address:** TSV export phase

**Confidence:** MEDIUM -- Based on general browser memory management; the specific gene sizes are estimates

---

## Minor Pitfalls

Mistakes that are annoying but recoverable.

---

### Pitfall 12: Chart Responsiveness Inside Vuetify Layout

**What goes wrong:** Chart.js charts default to fitting their container's size. Inside a Vuetify `v-card` or `v-col`, the container size may be zero at render time (before Vuetify layout completes) or may change on window resize. The chart either renders at 0x0 pixels or does not respond to container resize.

**Prevention:**
1. Set `maintainAspectRatio: false` and `responsive: true` in Chart.js options
2. Wrap in a `<div>` with explicit `min-height: 200px` (not zero)
3. Use `v-if` to only render the chart when data is available (avoid rendering with empty data)
4. If inside a `v-dialog` or `v-expansion-panel`, re-trigger chart resize on open:
   ```typescript
   watch(isOpen, () => nextTick(() => chartRef.value?.chart?.resize()));
   ```

**Phase to address:** Bar chart phase

**Confidence:** MEDIUM -- Common Chart.js + CSS framework pattern

---

### Pitfall 13: Quality Flag Data Source Is Unclear in gnomAD

**What goes wrong:** "Data quality flags" for variants could mean several things:
- gnomAD's internal QC flags (in `filters` field returned by the API)
- LOFTEE flags (`lof_flags` field, already in the query)
- LOFTEE filter reasons (`lof_filter` field, already in the query)
- Manual curation quality annotations

The GraphQL query already fetches `lof_filter` and `lof_flags` (line 54-55 of `gene-variants.ts`), and the `TranscriptConsequence` type already includes them. But these fields are currently NOT displayed or used in filtering (only `lof === "HC"` is checked).

**Prevention:**
1. Define exactly which "quality flags" the milestone means before implementation
2. The existing data (`lof_flags`, `lof_filter`) is already fetched -- just needs display
3. If new fields from gnomAD are needed, verify they exist in the GraphQL schema
4. Add quality flag interpretation to the UI (e.g., "LOFTEE flag: END_TRUNC means truncation at end of transcript, lower confidence")

**Phase to address:** Quality flags phase (requirements clarification before implementation)

**Confidence:** HIGH -- Verified that `lof_flags` and `lof_filter` are already in the query and types

---

### Pitfall 14: Pinia Store Migration When Adding New Persisted State

**What goes wrong:** Several Pinia stores persist to localStorage (`useFilterStore`, `useCalcStore`, `useTemplateStore`, etc.). When adding new persisted state (e.g., display format preferences, Orphanet cache), the new store's initial state must handle the case where localStorage has no data for it. More critically, if an EXISTING store is modified (e.g., adding a `displayFormat` field to `CalcConfig`), users with the old schema in localStorage will have a store that is missing the new field.

**Why it happens:** `pinia-plugin-persistedstate` deserializes the stored JSON and merges it with the store's initial state. If the stored JSON has `{ useHWEFormula: true, useHomExclusion: true, penetrance: 1.0 }` and the new store state adds `displayFormat: 'ratio'`, the persisted state plugin may or may not pick up the new default -- behavior depends on the merge strategy.

**Consequences:**
- Returning users see `undefined` for new settings
- UI renders with wrong defaults (e.g., no display format selected)
- In worst case, a type error from accessing `undefined.something`

**Prevention:**
1. When adding new fields to persisted stores, always provide a default in the store definition
2. Add a migration/versioning strategy: check for the presence of new fields and initialize them if missing
3. Test by manually clearing localStorage, verifying fresh state, then testing with pre-existing localStorage data
4. For new stores (e.g., Orphanet cache), follow the `useClingenStore` pattern exactly

**Warning signs:**
- New field added to a persisted store without default value
- `undefined` appearing in UI for new settings
- localStorage data from previous versions causing type errors

**Phase to address:** Any phase that adds to or creates Pinia stores

**Confidence:** HIGH -- Standard persistence migration issue; verified by reading store configurations

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Source breakdown | P1: Double-counting variants that are both LoF and ClinVar | Implement classification as separate function from filtering; use non-overlapping categories |
| Orphanet integration | P2: CORS blocking browser requests | Use static JSON file pattern (like ClinGen); GitHub Actions for updates |
| Orphanet integration | P8: Service worker not caching new data | Add runtimeCaching entry for `/data/*.json` |
| Subcontinental populations | P3: Data not available in gnomAD v4 API | Verify schema first; consider v2-only or defer |
| Subcontinental populations | P7: Type changes ripple through pipeline | Add types first, fix all TS errors systematically |
| Display formats | P9: Breaking clinical text templates | Add new format functions, don't change existing ones |
| Display formats | P10: Locale-dependent number formatting | Establish explicit locale convention before adding formats |
| TSV export | P6: German characters corrupted in Excel | Prepend UTF-8 BOM; use Windows line endings |
| TSV export | P11: Memory issues for large genes | Revoke object URLs; consider export size limits |
| Bar chart | P5: CSS conflicts with Vuetify | Use Chart.js (Canvas-based); lazy-load component |
| Bar chart | P12: Chart sizing in Vuetify layout | Set explicit min-height; handle dialog/panel resize |
| Quality flags | P13: Unclear data source | Define requirements before implementation; data already in query |
| URL state changes | P4: Breaking existing shared links | Use `.optional().default()` for all new parameters |
| Store changes | P14: Missing migration for persisted state | Provide defaults; test with old localStorage data |

---

## Integration Gotchas

| Integration Point | Gotcha | Prevention |
|-------------------|--------|------------|
| Source breakdown + filter pipeline | Filter short-circuits; cannot determine source from filter result | Implement classification separately from filtering |
| Orphanet + PWA offline | Local JSON not cached by service worker | Add explicit cache rule in workbox config |
| Orphanet + ClinGen | Both use similar patterns but different data formats | Standardize the store/composable pattern across both |
| Subcontinental + population config | `gnomad.json` populations array is flat, not nested | Design nested `PopulationConfig` type but keep backward compat |
| Display format + template text | Template variables are hard-coded strings | Add new variables, never rename/remove existing ones |
| Display format + TSV export | Export formatting may differ from screen formatting | Use raw numbers in TSV data columns; format only in display |
| TSV export + existing JSON export | Two export paths to maintain | Share the `ExportData` builder; only differ in serialization |
| Bar chart + population data | Chart data must match population table ordering | Use same data source (populations computed ref) for both |
| Quality flags + variant types | New fields must propagate through normalization chain | Add to types first; let TypeScript errors guide changes |
| New URL params + existing bookmarks | New params without defaults break old URLs | Always `.optional().default()` in Zod schema |

---

## Performance Traps

| Trap | What Happens | Mitigation |
|------|-------------|------------|
| Loading full Orphanet dataset into memory | Orphanet has ~6,500+ rare diseases; full JSON could be several MB | Filter to gene-relevant data in the GitHub Actions pre-processing step; only store gene-disease mappings |
| Chart re-rendering on every filter change | Changing a filter triggers population recalculation, which triggers chart redraw | Debounce chart updates (reuse existing `watchDebounced` pattern from `useCarrierFrequency`) |
| TSV string concatenation for large variant sets | Building strings in a loop is O(n^2) in some JS engines | Use `Array.join('\t')` and `lines.join('\r\n')` instead of concatenation |
| Chart.js full bundle | Importing all of Chart.js adds ~200KB to initial bundle | Tree-shake: import only Bar, CategoryScale, LinearScale, BarElement, Tooltip |
| Multiple `toLocaleString` calls in tight loops | `toLocaleString` is expensive; avoid in per-variant formatting | Cache locale formatter: `const fmt = new Intl.NumberFormat('en-US')` then `fmt.format(n)` |

---

## "Looks Done But Isn't" Checklist

Before calling any v1.6 feature complete:

- [ ] Source breakdown categories sum to exactly `qualifyingVariantCount` (no double-counting)
- [ ] Orphanet data loads from local JSON file, NOT from API endpoint in production
- [ ] Orphanet data is cached in service worker for offline PWA use
- [ ] TSV export opens correctly in Excel on Windows with German characters intact (BOM present)
- [ ] TSV export includes Windows line endings (`\r\n`)
- [ ] Object URLs are revoked after download (`URL.revokeObjectURL`)
- [ ] All new URL state parameters use `.optional().default()`
- [ ] Existing shared URLs (from v1.5) still parse correctly
- [ ] Chart renders correctly inside Vuetify card component
- [ ] Chart resizes on window resize
- [ ] Chart lazy-loaded (not in initial bundle)
- [ ] `toLocaleString` calls use explicit locale
- [ ] New variant type fields propagated through entire normalization chain
- [ ] Clinical text templates updated in BOTH de.json and en.json
- [ ] TEMPLATE_VARIABLES array updated with any new variables
- [ ] Pinia store changes include defaults for new fields
- [ ] Existing localStorage data (from v1.5) doesn't break new stores
- [ ] Test coverage maintained above existing thresholds (426 tests baseline)

---

## Recovery Strategies

| If this breaks | How to recover |
|----------------|----------------|
| Source breakdown shows wrong counts | The actual carrier frequency calculation is unaffected (breakdown is display-only). Fix the classification function; no data integrity risk. |
| Orphanet data fetch fails in production | Feature degrades gracefully (show "Orphanet data unavailable" instead of disease names). The carrier frequency calculation works without Orphanet. |
| Excel TSV corruption | Re-export with BOM fix. Add BOM in a patch release. Users can work around by importing TSV with "UTF-8" encoding selected in Excel. |
| Chart CSS conflicts | Remove chart temporarily; population data is still shown in the table. Chart is supplementary, not critical. |
| URL state breaks old bookmarks | Revert the Zod schema change. Old URLs must always be parseable. |
| Subcontinental data unavailable | Fall back to continental-only populations (the current behavior). No regression. |
| localStorage migration fails | Clear localStorage and reset to defaults. Add a "Reset to defaults" button if not already present. |

---

## Sources

- [gnomAD v4.0 Announcement](https://gnomad.broadinstitute.org/news/2023-11-gnomad-v4-0/) -- Sub-ancestry groups listed as future release
- [gnomAD v4.1 Release Notes](https://gnomad.broadinstitute.org/news/2024-04-gnomad-v4-1/) -- No subcontinental population fields added
- [gnomAD API Rate Limiting Discussion](https://discuss.gnomad.broadinstitute.org/t/blocked-when-using-api-to-get-af/149) -- 10 queries/minute limit, 6s delay recommended
- [Orphanet API GitHub Repository](https://github.com/Orphanet/API_Orphadata) -- Flask API with Swagger docs, no CORS documentation
- [Orphadata API Documentation](https://api.orphadata.com/) -- OpenAPI v3 spec, endpoints for gene-disease associations and epidemiology
- [Chart.js Tree-Shaking Documentation](https://www.chartjs.org/docs/latest/getting-started/integration.html) -- Component-based imports reduce bundle ~25%
- [Chart.js Tree-Shaking Issue #10163](https://github.com/chartjs/Chart.js/issues/10163) -- Documented tree-shaking effectiveness varies
- [TSV Excel Encoding Issue - Open Targets](https://github.com/opentargets/genetics/issues/322) -- UTF-8 BOM requirement for Excel
- [Excel UTF-8 Multi-byte Issue - DataBiosphere](https://github.com/DataBiosphere/azul/issues/3129) -- BOM solution documented
- [vue-chartjs Documentation](https://vue-chartjs.org/) -- Vue 3 wrapper for Chart.js
- [MDN CORS Documentation](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS) -- Cross-origin resource sharing mechanics
