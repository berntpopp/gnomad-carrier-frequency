# Phase 35: Population Bar Chart - Research

**Researched:** 2026-02-26
**Domain:** Inline SVG data visualization, colorblind-safe palettes, SVG/PNG export, Vue 3 tabs
**Confidence:** HIGH (core approach); MEDIUM (color values); HIGH (code patterns from codebase)

## Summary

Phase 35 adds a horizontal bar chart of carrier frequencies per population to the results step. The chart replaces the current standalone population table with a tabbed "Chart | Table" view. The implementation is zero-dependency: pure inline SVG computed from reactive data, no charting library. This is the right approach given the VIZ-02 requirement and the small number of bars (8-10 populations max).

The existing codebase already provides all required building blocks: `PopulationFrequency[]` with `carrierFrequency`, `alleleCount`, `alleleNumber`, `isFounderEffect`, and `code`/`label` fields; the `useDisplayFormat` composable for format-aware value display; and `useTheme`/`isDark` from `useAppTheme` for dark-mode-aware color selection. The `v-tabs` + `v-window` + `v-window-item` pattern is already in use in `TemplateEditor.vue` and is the confirmed working pattern.

For SVG export, the standard browser-native approach (Blob + `URL.createObjectURL` for SVG; canvas + `toDataURL` for PNG at 2x) requires no new dependencies. The publication-mode SVG must substitute Vuetify CSS variables with literal hex values since CSS variables do not render when the SVG is opened standalone.

**Primary recommendation:** Build `PopulationBarChart.vue` as a single self-contained Vue component that renders inline SVG computed from `PopulationFrequency[]` props, using `useDisplayFormat` for value labels and `useAppTheme` for color selection. Tab integration is a one-time edit to `StepResults.vue`.

## Standard Stack

The phase adds zero new runtime dependencies. All tooling is already installed.

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vue 3 | ^3.5.24 | Reactive template + computed props drive SVG | Project framework |
| Vuetify 3 | ^3.8.1 | `v-tabs`/`v-window`, `v-tooltip`, theme CSS variables | Project UI library |
| @vueuse/core | ^12.7.0 | `useClipboard`, `useDark` (already used in codebase) | Already a dep |

### Supporting (no installation needed)
| Capability | Mechanism | Purpose |
|-----------|-----------|---------|
| Inline SVG | Native HTML/SVG in Vue template | Zero-dep chart rendering |
| Theme colors | `useTheme()` from `vuetify` + `rgb(var(--v-theme-*))` CSS variables | Dark/light mode |
| SVG download | `new Blob()` + `URL.createObjectURL()` | Browser-native SVG file export |
| PNG download | `<canvas>` + `drawImage()` + `toDataURL('image/png')` | 2x retina PNG export |

### Alternatives Considered
| Instead of | Could Use | Why Not |
|------------|-----------|---------|
| Inline SVG | Chart.js, ECharts, D3.js | Violates VIZ-02 (zero external deps); overkill for 8-10 static bars |
| Inline SVG | vue3-charts | Another dep; not zero-dependency |
| CSS transitions | GSAP/TweenLite | Requires new dep; CSS `transition` on SVG `width` attribute is sufficient |
| Custom tab | Headless custom component | `v-tabs` + `v-window` is proven, already used in `TemplateEditor.vue` |

**Installation:** No new packages needed.

## Architecture Patterns

### Recommended File Structure
```
apps/web/src/components/
├── PopulationBarChart.vue     # NEW: inline SVG chart + export logic
wizard/
├── StepResults.vue            # EDIT: wrap population card with v-tabs + v-window
```

The chart is entirely self-contained in `PopulationBarChart.vue`. `StepResults.vue` receives the chart as a drop-in that sits alongside the existing `v-data-table`.

### Pattern 1: Inline SVG with Computed ViewBox

**What:** The SVG `viewBox` is computed from the number of non-zero populations. Fixed internal coordinate space (e.g., 600 wide) with dynamic height based on bar count. CSS `width: 100%` on the `<svg>` element makes it responsive.

**When to use:** When you need zero-dependency charts that respond to reactive data.

**Example:**
```typescript
// Source: CSS-Tricks SVG bar chart guide + project pattern
const SVG_WIDTH = 600        // internal coordinate units
const LABEL_WIDTH = 160      // left margin for population labels
const VALUE_MARGIN = 8       // gap between bar end and value label
const BAR_HEIGHT = 20
const BAR_GAP = 8
const TOP_PADDING = 24       // space above first bar (for title if needed)
const BOTTOM_PADDING = 40    // space below last bar (for reference line label)

// Only populations with non-zero carrier frequency are shown (per decision)
const visiblePops = computed(() =>
  props.populations
    .filter(p => p.carrierFrequency !== null && p.carrierFrequency > 0)
    .sort((a, b) => (b.carrierFrequency ?? 0) - (a.carrierFrequency ?? 0))
)

const svgHeight = computed(() =>
  TOP_PADDING + visiblePops.value.length * (BAR_HEIGHT + BAR_GAP) + BOTTOM_PADDING
)

const viewBox = computed(() => `0 0 ${SVG_WIDTH} ${svgHeight.value}`)

// Proportional bar width: max frequency fills available bar area
const maxFreq = computed(() =>
  Math.max(...visiblePops.value.map(p => p.carrierFrequency ?? 0))
)
const BAR_AREA = SVG_WIDTH - LABEL_WIDTH - 80 // 80 = space for value labels

function barWidth(freq: number | null): number {
  if (!freq || !maxFreq.value) return 0
  return (freq / maxFreq.value) * BAR_AREA
}
```

### Pattern 2: Theme-Aware Colors via CSS Variables

**What:** Vuetify 3 exposes theme colors as CSS variables in the format `rgb(var(--v-theme-surface))`. These can be used directly in SVG `fill` and `stroke` attributes for dark/light mode adaptation.

**When to use:** Inline SVG rendered in-app (not for exported publication SVG).

**Example:**
```vue
<!-- Source: Existing codebase (StepResults.vue uses same CSS var pattern) -->
<svg :viewBox="viewBox" width="100%" role="img" :aria-label="ariaLabel">
  <!-- Background -->
  <rect
    width="100%"
    height="100%"
    fill="rgb(var(--v-theme-surface))"
  />
  <!-- Population bar -->
  <rect
    v-for="(pop, i) in visiblePops"
    :key="pop.code"
    :x="LABEL_WIDTH"
    :y="TOP_PADDING + i * (BAR_HEIGHT + BAR_GAP)"
    :width="barWidth(pop.carrierFrequency)"
    :height="BAR_HEIGHT"
    :fill="pop.isFounderEffect ? ACCENT_COLOR : PRIMARY_COLOR"
    style="transition: width 0.3s ease"
  />
</svg>
```

**Important:** CSS variables (`rgb(var(--v-theme-*))`) work in inline SVG rendered in the browser DOM. They do NOT render in standalone SVG files. The publication export must replace them with literal hex values.

### Pattern 3: Vuetify Tabs with Window (confirmed pattern from TemplateEditor.vue)

**What:** The tab toggle between Chart and Table uses `v-tabs` + `v-window` + `v-window-item` — NOT `v-tabs-window` (which has known compatibility issues in Vuetify 3).

**When to use:** Any tabbed content switch in this project.

**Example:**
```vue
<!-- Source: apps/web/src/components/TemplateEditor.vue lines 105-170 -->
<v-tabs v-model="activeTab" density="compact">
  <v-tab value="chart" size="small">
    <v-icon start size="small">mdi-chart-bar</v-icon>
    Chart
  </v-tab>
  <v-tab value="table" size="small">
    <v-icon start size="small">mdi-table</v-icon>
    Table
  </v-tab>
</v-tabs>

<v-window v-model="activeTab">
  <v-window-item value="chart">
    <PopulationBarChart ... />
  </v-window-item>
  <v-window-item value="table">
    <!-- existing v-data-table content moved here -->
  </v-window-item>
</v-window>
```

### Pattern 4: SVG Export (screen → file)

**What:** SVG export serializes the DOM element's `outerHTML` but substitutes CSS variables with publication-ready literals. PNG export renders the SVG onto a canvas at 2x scale.

**When to use:** Download button handlers.

**Example:**
```typescript
// Source: MDN Blob API + spin.atomicobject.com canvas pattern

// SVG download
function downloadSvg(svgEl: SVGSVGElement, filename: string): void {
  // Clone SVG and apply publication colors (substitute CSS vars)
  const clone = svgEl.cloneNode(true) as SVGSVGElement
  applyPublicationColors(clone)
  const serializer = new XMLSerializer()
  const svgStr = serializer.serializeToString(clone)
  const blob = new Blob([svgStr], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// PNG download (2x retina)
function downloadPng(svgEl: SVGSVGElement, filename: string, scale = 2): void {
  const clone = svgEl.cloneNode(true) as SVGSVGElement
  applyPublicationColors(clone)
  const serializer = new XMLSerializer()
  const svgStr = serializer.serializeToString(clone)
  const blob = new Blob([svgStr], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(blob)
  const img = new Image()
  img.onload = () => {
    const canvas = document.createElement('canvas')
    canvas.width = svgEl.clientWidth * scale
    canvas.height = svgEl.clientHeight * scale
    const ctx = canvas.getContext('2d')!
    ctx.scale(scale, scale)
    ctx.drawImage(img, 0, 0)
    URL.revokeObjectURL(url)
    const pngUrl = canvas.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = pngUrl
    a.download = filename
    a.click()
  }
  img.src = url
}
```

### Pattern 5: Tooltip on SVG Elements via Vuetify v-tooltip

**What:** Vuetify `v-tooltip` works on SVG child elements that are wrapped in a `<g>` (group) element when using the `#activator` slot pattern.

**When to use:** Interactive tooltips on bars with population detail.

**Example:**
```vue
<!-- Per-bar tooltip using Vuetify v-tooltip on SVG group element -->
<g
  v-for="(pop, i) in visiblePops"
  :key="pop.code"
  style="cursor: pointer"
  @mouseenter="hoveredPop = pop.code"
  @mouseleave="hoveredPop = null"
>
  <rect :x="LABEL_WIDTH" :y="barY(i)" :width="barWidth(pop.carrierFrequency)" :height="BAR_HEIGHT" :fill="barColor(pop)" style="transition: width 0.3s ease" />
  <!-- Vuetify tooltip requires HTML element — use foreignObject or position tooltip outside SVG -->
</g>
```

**Note on tooltip approach:** Vuetify `v-tooltip` has limitations with SVG child elements because it uses floating-ui/popper positioning which relies on HTML element bounding rects. The recommended approach for this phase is **a custom positioned HTML tooltip div** that tracks mouse position (`@mousemove` on the SVG), placed above the SVG via absolute CSS positioning. This avoids foreignObject complexity and works reliably on mobile via touch events.

```vue
<div style="position: relative">
  <svg @mousemove="onMouseMove" @mouseleave="tooltipVisible = false">
    <!-- bars -->
  </svg>
  <!-- Tooltip rendered as HTML div, absolutely positioned -->
  <div
    v-if="tooltipVisible && tooltipPop"
    class="chart-tooltip"
    :style="{ left: tooltipX + 'px', top: tooltipY + 'px' }"
  >
    <strong>{{ tooltipPop.label }}</strong><br>
    {{ formatFrequency(tooltipPop.carrierFrequency) }}<br>
    AC: {{ tooltipPop.alleleCount }} / AN: {{ tooltipPop.alleleNumber?.toLocaleString() }}<br>
    <em v-if="tooltipPop.isFounderEffect">Founder effect population</em>
  </div>
</div>
```

### Pattern 6: Mobile Abbreviated Labels

**What:** On narrow screens (`smAndDown` from `useDisplay()`), show abbreviated population codes. Codes map to 2-3 character abbreviations.

**Confirmed code-to-abbreviation map (from gnomad.json):**
| Code | Full Label | Mobile Abbreviation |
|------|-----------|-------------------|
| `afr` | African/African-American | AFR |
| `amr` | Admixed American | AMR |
| `asj` | Ashkenazi Jewish | ASJ |
| `eas` | East Asian | EAS |
| `fin` | Finnish | FIN |
| `mid` | Middle Eastern | MID |
| `nfe` | Non-Finnish European | NFE |
| `sas` | South Asian | SAS |
| `ami` | Amish (v3 only) | AMI |
| `oth` | Other (v2 only) | OTH |

These are the population codes already defined in `gnomad.json`, uppercased — no new config needed.

### Anti-Patterns to Avoid

- **Using `v-tabs-window` / `v-tabs-window-item`:** These components have known issues in Vuetify 3. Use `v-window` + `v-window-item` instead (confirmed by codebase usage in TemplateEditor.vue).
- **CSS variables in exported SVG:** `rgb(var(--v-theme-surface))` renders as a grey void in standalone SVG files. Always clone and substitute literal colors for export.
- **Positioning SVG text with `x="100%"`:** This places text off-screen. Use computed numeric coordinates based on the viewBox width.
- **Using `text-anchor` without explicit anchoring on labels:** Left-edge population labels need `text-anchor="end"` with `x = LABEL_WIDTH - padding`. Bar value labels need `text-anchor="start"`.
- **No `URL.revokeObjectURL` cleanup:** Memory leak. Always revoke after the download anchor click.
- **Drawing PNG from in-DOM SVG without cloning:** Will include live CSS variable values which may not render correctly in canvas context. Always clone and resolve colors first.
- **Animating SVG via JS setInterval instead of CSS transition:** Use `style="transition: width 0.3s ease"` on `<rect>` elements — Vue's reactivity + CSS handles it natively.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Dark/light mode detection | Custom `document.querySelector('[data-bs-theme]')` | `useAppTheme()` composable (already exists) | Already wired to Vuetify and localStorage persistence |
| Format-aware value labels | Custom switch on format type | `useDisplayFormat().formatFrequency()` | Already handles all 4 formats with locale awareness |
| Population labels | Hardcoded lookup table | `getPopulationLabel(code)` from `@gnomad-cf/core/config` | Already handles multi-version label resolution |
| Tab toggle | Custom CSS show/hide | `v-tabs` + `v-window` | Vuetify accessibility (keyboard nav, ARIA) built in |
| File download trigger | Custom iframe or form | `URL.createObjectURL` + anchor click | Standard, clean, works in all modern browsers |

**Key insight:** This phase's value is in the SVG rendering and color logic. All plumbing (data format, themes, population labels, file download) is solved infrastructure — use it.

## Common Pitfalls

### Pitfall 1: Reference Line Extends Beyond Chart Width
**What goes wrong:** The global frequency dashed reference line is drawn at `x = LABEL_WIDTH + barWidth(globalFreq)`. If the global frequency is larger than the max population frequency (edge case), the line goes beyond the bar area.
**Why it happens:** Max scale is based on `Math.max(...visiblePops)`, not on global frequency.
**How to avoid:** Compute max scale as `Math.max(globalCarrierFrequency ?? 0, ...visiblePops.map(p => p.carrierFrequency ?? 0))`.
**Warning signs:** Reference line clipping at the right edge of the SVG.

### Pitfall 2: Value Labels Overflowing SVG Width
**What goes wrong:** Short bars with long formatted values (e.g., "4,310 / 100,000" in per-100k format) overflow the SVG right edge.
**Why it happens:** SVG text doesn't wrap; `overflow: visible` on SVG can clip at container boundary.
**How to avoid:** Reserve a fixed right margin (e.g., 90px) for value labels regardless of bar width. Truncate with ellipsis if the value string exceeds the reserved area (unlikely with current formats but safe).
**Warning signs:** Text visually clipped in per-100k display format.

### Pitfall 3: Dark Mode Color Bleeding in Publication Export
**What goes wrong:** User exports SVG while in dark mode; the exported SVG has dark background and light text because the live CSS variables were serialized as-is.
**Why it happens:** `XMLSerializer.serializeToString()` captures the DOM's computed style references, not resolved values.
**How to avoid:** The `applyPublicationColors()` function must explicitly set `fill="#FFFFFF"` for background and `fill="#1A1A1A"` for text on the cloned SVG, regardless of the current app theme.
**Warning signs:** Exported SVG looks like a dark-mode screenshot instead of a clean publication figure.

### Pitfall 4: Zero-Frequency Populations Causing NaN Bar Widths
**What goes wrong:** Division by `maxFreq` throws NaN when all visible populations have frequency 0 (edge case when all variants are excluded).
**Why it happens:** `barWidth(freq) = (freq / maxFreq) * BAR_AREA` → `0 / 0 = NaN`.
**How to avoid:** Guard: `if (!maxFreq.value || visiblePops.value.length === 0) return null` — render an empty-state message instead of the SVG.
**Warning signs:** SVG renders with invisible or NaN-width bars.

### Pitfall 5: PNG Canvas Renders Blank
**What goes wrong:** `canvas.toDataURL()` returns a blank PNG.
**Why it happens:** The `img.onload` fires before the SVG is fully parsed, or `canvas.getContext('2d')` returns null in a test environment.
**How to avoid:** Ensure `img.src` is set after the `onload` handler is attached. Null-check `ctx` before drawing. Use `img.decode()` if available for more reliable async loading.
**Warning signs:** Downloaded PNG is 2x the expected pixel size but completely white.

### Pitfall 6: Mobile Touch Tooltip Never Dismisses
**What goes wrong:** On touch devices, the tooltip appears on tap but has no way to dismiss.
**Why it happens:** `mouseleave` doesn't fire on touch; the tooltip state sticks.
**How to avoid:** Add a `@click.stop` handler on bars (which fires on touch) that both shows the tooltip AND sets a `touchMode` flag; hide the tooltip on the next document click/touchstart outside the chart.
**Warning signs:** QA testing on mobile shows stuck tooltip overlaying other content.

## Code Examples

### Color Scheme: Okabe-Ito Mapped to This Phase

The Okabe-Ito palette is the scientific standard for colorblind-safe categorical visualization (deuteranopia, protanopia, tritanopia safe). Nature Methods endorses it (also known as "Wong palette").

```typescript
// Source: https://siegal.bio.nyu.edu/color-palette/ (verified)
// Okabe-Ito hex values — confirmed colorblind-safe, grayscale-distinguishable by luminance

// For screen (in-app) display:
// Normal population bars: Okabe-Ito Blue (#0072B2) — high luminance, distinguishable in grayscale
// Founder effect bars: Okabe-Ito Vermillion (#D55E00) — lower luminance, distinct in grayscale
// These two are also distinguishable for deuteranopia and protanopia

// Vuetify primary in light mode is #117A7F (teal) — close to Okabe-Ito Blue-Green (#009E73)
// To harmonize with app theme while remaining colorblind-safe:

export const CHART_COLORS = {
  // Screen colors (used in DOM SVG — Vuetify CSS var compatible)
  normalBar: '#0072B2',       // Okabe-Ito Blue — high contrast, grayscale ~38% luminance
  founderBar: '#D55E00',      // Okabe-Ito Vermillion — grayscale ~40% luminance (different pattern)
  referenceLineScreen: 'rgba(0, 0, 0, 0.5)',  // adapts to theme via opacity
  textScreen: 'rgb(var(--v-theme-on-surface))',

  // Publication colors (used in standalone exported SVG — CSS vars NOT supported)
  normalBarPub: '#0072B2',    // same Okabe-Ito Blue
  founderBarPub: '#D55E00',   // same Okabe-Ito Vermillion
  backgroundPub: '#FFFFFF',
  textPub: '#1A1A1A',
  refLinePub: '#666666',
}
```

**Grayscale safety:** #0072B2 converts to ~38% gray; #D55E00 converts to ~40% gray — these are close in grayscale luminance. To maximize grayscale distinguishability for publication, consider adding a **fill pattern** (e.g., diagonal hatching) on the founder-effect bars in the exported SVG. This is a LOW confidence recommendation — the decision to add patterns is at Claude's discretion and was not explicitly discussed.

### Global Frequency Reference Line

```typescript
// Vertical dashed reference line at the global carrier frequency position
// Source: SVG spec + project data types (PopulationFrequency)

// In the SVG template:
// <line> drawn at x = LABEL_WIDTH + barWidth(globalCarrierFrequency)
// spans full chart height (top to bottom of bar area)
// label: "Global: [formatted value]" placed above the line

const refLineX = computed(() => {
  if (!props.globalCarrierFrequency || !maxFreq.value) return null
  return LABEL_WIDTH + (props.globalCarrierFrequency / maxFreq.value) * BAR_AREA
})
```

```vue
<!-- Reference line SVG element -->
<g v-if="refLineX !== null">
  <line
    :x1="refLineX"
    :x2="refLineX"
    :y1="TOP_PADDING - 4"
    :y2="svgHeight - BOTTOM_PADDING + 4"
    stroke="currentColor"
    stroke-width="1.5"
    stroke-dasharray="4,3"
    opacity="0.6"
  />
  <text
    :x="refLineX + 4"
    :y="TOP_PADDING - 8"
    font-size="10"
    fill="currentColor"
    text-anchor="start"
  >
    Global: {{ formatFrequency(props.globalCarrierFrequency) }}
  </text>
</g>
```

### Publication SVG Metadata (title + footer)

```typescript
// Publication SVG must include title and footer as SVG text elements
// Title: "GENE — Carrier Frequency by Population"
// Footer: "Source: gnomAD vX.X.X   Generated: YYYY-MM-DD"

// These are added to the publication clone only (not shown in screen SVG)
function addPublicationMetadata(svgEl: SVGSVGElement, gene: string, gnomadVersion: string): void {
  const title = document.createElementNS('http://www.w3.org/2000/svg', 'text')
  title.setAttribute('x', '8')
  title.setAttribute('y', '16')
  title.setAttribute('font-size', '14')
  title.setAttribute('font-weight', 'bold')
  title.setAttribute('fill', '#1A1A1A')
  title.setAttribute('font-family', '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif')
  title.textContent = `${gene} — Carrier Frequency by Population`

  const footer = document.createElementNS('http://www.w3.org/2000/svg', 'text')
  footer.setAttribute('x', '8')
  footer.setAttribute('y', String(parseInt(svgEl.getAttribute('height') ?? '400') - 6))
  footer.setAttribute('font-size', '9')
  footer.setAttribute('fill', '#666666')
  footer.setAttribute('font-family', '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif')
  footer.textContent = `Source: gnomAD ${gnomadVersion}   Generated: ${new Date().toISOString().slice(0, 10)}`

  svgEl.insertBefore(title, svgEl.firstChild)
  svgEl.appendChild(footer)
}
```

### Responsive SVG Setup

```vue
<!-- Source: CSS-Tricks SVG chart guide + Responsive SVGs (12daysofweb.dev) -->
<svg
  :viewBox="viewBox"
  :style="{
    width: '100%',
    height: 'auto',
    display: 'block',
    fontFamily: '-apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Helvetica, Arial, sans-serif'
  }"
  role="img"
  :aria-label="`Carrier frequency by population for ${gene}`"
  ref="svgRef"
>
```

The `viewBox` defines the internal coordinate space (e.g., `"0 0 600 280"`). CSS `width: 100%` + `height: auto` makes the SVG fill its container and scale proportionally. On mobile, bars automatically become shorter in pixel terms because the SVG viewport shrinks, but the coordinate system remains stable.

### Vuetify useTheme for Color Switching

```typescript
// Source: apps/web/src/composables/useTheme.ts (existing codebase)
// The app already has useAppTheme() which exposes isDark

import { useAppTheme } from '@/composables'

const { isDark } = useAppTheme()

// In bar color computation:
const barFill = computed(() => isDark.value
  ? {
    normal: '#56B4E9',   // Lighter Okabe-Ito Sky Blue — better contrast on dark bg
    founder: '#E69F00',  // Lighter Okabe-Ito Orange — better contrast on dark bg
  }
  : {
    normal: '#0072B2',   // Darker Okabe-Ito Blue — good on light bg
    founder: '#D55E00',  // Okabe-Ito Vermillion — good on light bg
  }
)
```

**Rationale:** Swapping to lighter Okabe-Ito colors in dark mode maintains colorblind safety (same hue family) while improving contrast against dark backgrounds. The Okabe-Ito palette contains both versions (#0072B2 dark blue / #56B4E9 sky blue and #D55E00 vermillion / #E69F00 orange).

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| D3.js for SVG charts | Pure computed SVG in Vue template | No dependency, full Vue reactivity |
| External chart library (Chart.js) | Inline SVG with CSS transitions | Zero dependency, publication-ready |
| `v-tabs-window` (Vuetify 3 alpha) | `v-window` + `v-window-item` | Actually works; confirmed in codebase |
| `window.URL.createObjectURL` with no cleanup | `createObjectURL` + `revokeObjectURL` | Memory leak prevention |
| Embedding fonts in SVG via @font-face | System font stack with cross-platform fallbacks | Self-contained, no external font deps |

**No deprecation concerns:** All APIs used (`Blob`, `URL.createObjectURL`, `canvas.toDataURL`, `XMLSerializer`, `SVGSVGElement`) are fully current and supported in all modern browsers.

## Open Questions

1. **Grayscale distinguishability in publication export**
   - What we know: Okabe-Ito Blue (#0072B2, ~38% gray) and Vermillion (#D55E00, ~40% gray) have similar grayscale luminances.
   - What's unclear: Whether the target audience (genetics journals) requires strict B&W distinguishability or whether hue difference is sufficient for their production process.
   - Recommendation: Start with solid colors in both screen and export. Add SVG fill patterns (diagonal hatching on founder-effect bars) as a LOW-effort enhancement in a follow-up if journal editors request it.

2. **Touch tooltip dismiss behavior**
   - What we know: `mouseleave` doesn't fire on mobile touch.
   - What's unclear: Whether the tooltip on touch should dismiss on next tap anywhere (requires document-level event listener) or simply show persistently until another bar is tapped.
   - Recommendation: On `touchstart` on a bar, show tooltip for 3 seconds then auto-dismiss (simpler implementation than document-level tap detection).

3. **Exact bar height for mobile compact mode**
   - What we know: smAndDown breakpoint is available via `useDisplay()`. Population labels need to be abbreviated.
   - What's unclear: Exact pixel reduction needed for a 375px iPhone width.
   - Recommendation: `BAR_HEIGHT = smAndDown ? 14 : 20`, `BAR_GAP = smAndDown ? 4 : 8`. Validate during implementation with browser devtools device emulation.

## Sources

### Primary (HIGH confidence)
- `/c/development/gnomad-carrier-frequency/apps/web/src/components/TemplateEditor.vue` — Confirmed `v-tabs` + `v-window` pattern (lines 105-170)
- `/c/development/gnomad-carrier-frequency/apps/web/src/composables/useTheme.ts` — Confirmed `useTheme()` from vuetify + `isDark` pattern
- `/c/development/gnomad-carrier-frequency/packages/core/src/types/frequency.ts` — `PopulationFrequency` interface (data model for chart)
- `/c/development/gnomad-carrier-frequency/packages/core/src/config/gnomad.json` — Population codes and labels for all gnomAD versions
- `/c/development/gnomad-carrier-frequency/apps/web/src/composables/useDisplayFormat.ts` — `formatFrequency()` for value labels
- `/c/development/gnomad-carrier-frequency/apps/web/src/main.ts` — Confirmed Vuetify theme color configuration
- https://siegal.bio.nyu.edu/color-palette/ — Okabe-Ito hex values verified
- https://css-tricks.com/handmade-svg-bar-chart-featuring-svg-positioning-gotchas/ — SVG positioning patterns
- https://vuejs.org/guide/extras/animation.html — CSS transition on SVG attributes

### Secondary (MEDIUM confidence)
- https://css-tricks.com/system-fonts-svg/ — System font stack for self-contained SVGs (GitHub/WordPress stacks)
- https://spin.atomicobject.com/2014/01/21/convert-svg-to-png/ — Canvas 2x retina PNG pattern
- Okabe-Ito palette: Nature Methods endorsement (multiple sources agree) — colorblind safety confirmed

### Tertiary (LOW confidence)
- Touch tooltip auto-dismiss pattern (3-second auto-dismiss recommendation) — based on UX convention, not verified against specific Vue documentation
- Grayscale luminance values for #0072B2 and #D55E00 — calculated from hex, not cited from a colorimetry source

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero new dependencies confirmed by VIZ-02 requirement; all code patterns verified in codebase
- Color scheme: MEDIUM-HIGH — Okabe-Ito hex values verified from authoritative source; dark-mode variants are deduced from palette family (reasonable but not explicitly cited)
- Architecture patterns: HIGH — all patterns verified against existing working code in the codebase
- SVG export: HIGH — Blob/createObjectURL/canvas patterns are well-established browser APIs, 2x retina pattern verified from authoritative source
- Pitfalls: HIGH — derived from SVG coordinate system documentation + direct inspection of data types for edge cases

**Research date:** 2026-02-26
**Valid until:** 2026-06-26 (stable browser APIs; Vuetify 3 patterns stable; palette values permanent)
