---
phase: 35-population-bar-chart
verified: 2026-02-27T00:00:00Z
status: gaps_found
score: 4/4 truths verified (1 E2E test gap)
gaps:
  - truth: Users can download the chart as SVG for publication
    status: partial
    reason: >
      Functionality is wired correctly but 2 of 5 E2E tests assert download buttons
      visible on the default table tab. The chart v-window-item is not rendered until
      Chart tab is activated (populationTab defaults to table in ref), so those tests
      would fail in a real browser.
    artifacts:
      - path: apps/web/e2e/phase35-bar-chart.spec.ts
        issue: >
          Tests for SVG/PNG download buttons call navigateToResults() then
          immediately assert button visibility, but v-window-item value=chart is
          not mounted when default populationTab is table
    missing:
      - Add a chart-tab click before asserting download button visibility (lines 144-160)
human_verification:
  - test: Founder effect color in chart
    expected: Populations with isFounderEffect=true render in orange/vermillion (#D55E00), visually distinct from blue (#0072B2) normal populations
    why_human: Color correctness requires visual inspection
  - test: Mobile layout
    expected: On a narrow viewport (375px), bars remain readable with abbreviated population codes and shorter bar heights
    why_human: smAndDown breakpoint requires a real browser
  - test: Dark mode chart colors
    expected: In dark theme, normal bars use #56B4E9 and founder effect bars use #E69F00
    why_human: useDark/useTheme state is mocked in unit tests; dark mode requires real browser
  - test: SVG download output
    expected: Downloaded SVG opens in vector editor as self-contained file with white background, title, gnomAD source footer, and Okabe-Ito bar colors
    why_human: Cannot verify downloaded file binary content from unit tests
  - test: Tooltip on hover
    expected: Hovering a bar shows tooltip with population name, carrier frequency, AC/AN, and Founder effect population label for founder populations
    why_human: Tooltip interaction requires live DOM hover events not available in happy-dom
---

# Phase 35: Population Bar Chart Verification Report

**Phase Goal:** Users can visually compare carrier frequencies across populations via a horizontal bar chart in the results step, with founder effect populations visually distinguished and the chart usable for publication.
**Verified:** 2026-02-27T00:00:00Z
**Status:** gaps_found (functional gap in E2E test coverage; core implementation is correct)
**Re-verification:** No, initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Results step shows horizontal bar chart with one bar per population and a global reference line | VERIFIED | PopulationBarChart.vue: SVG with v-for over visiblePops sorted desc by carrierFrequency, dashed reference line via refLineX computed + v-if |
| 2 | Founder effect populations are visually distinguished | VERIFIED | barColor() returns #D55E00 light or #E69F00 dark for pop.isFounderEffect vs #0072B2/#56B4E9 for normal; unit test asserts ASJ bar gets #D55E00 fill attribute |
| 3 | Chart renders correctly on mobile and respects dark/light theme | VERIFIED | smAndDown from useDisplay() drives responsive barHeight/barGap/labelWidth computed refs; abbreviated codes on mobile; colors via rgb(var(--v-theme-*)) CSS vars; isDark.value selects correct Okabe-Ito palette |
| 4 | Inline SVG, zero external dependencies, downloadable as SVG for publication | VERIFIED | No external charting library in deps; useChartExport.ts implements clone-applyPublicationColors-addPublicationMetadata-XMLSerializer-Blob download; buttons wired in StepResults chart tab |

**Score:** 4/4 truths verified at the implementation level. 1 E2E test gap affects automated validation of truth 4.

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `apps/web/src/components/PopulationBarChart.vue` | Horizontal bar chart component | VERIFIED | 286 lines; inline SVG with sort, colors, tooltip, responsive layout, svgRef exposed |
| `apps/web/src/composables/useChartExport.ts` | SVG + PNG download composable | VERIFIED | 261 lines; downloadSvg() and downloadPng() with clone, color resolution, metadata injection, XMLSerializer |
| `apps/web/src/components/wizard/StepResults.vue` | Chart integrated in results step | VERIFIED | Imports PopulationBarChart; mounts in v-window-item value=chart with all 4 props; useChartExport() wired to export handlers |
| `apps/web/src/components/__tests__/PopulationBarChart.test.ts` | Unit test suite | VERIFIED | 230 lines; 10 tests covering sort order, founder color, reference line, empty state, SVG render, defineExpose |
| `apps/web/e2e/phase35-bar-chart.spec.ts` | E2E test suite | PARTIAL | 193 lines; 5 tests; tests 2 and 3 have incorrect precondition (see gaps) |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| StepResults.vue | PopulationBarChart.vue | Import + ref=chartRef in v-window-item | WIRED | Line 631 import; lines 396-402 usage with all 4 props bound |
| PopulationBarChart.vue | effectiveFrequency (global CF) | :global-carrier-frequency prop binding | WIRED | effectiveFrequency computed reads from result.globalCarrierFrequency |
| PopulationBarChart.vue | refLineX render | v-if on g element | WIRED | refLineX computed returns null when no global freq, renders dashed line otherwise |
| barColor() | isFounderEffect flag | pop.isFounderEffect ? palette.founder : palette.normal | WIRED | Real check against PopulationFrequency.isFounderEffect: boolean from core types |
| barColor() | isDark theme | isDark.value ? CHART_COLORS.dark : CHART_COLORS.light | WIRED | useAppTheme() + useTheme() from Vuetify; toggled correctly |
| handleChartExportSvg() | downloadSvg() | chartRef.value?.svgRef access | WIRED | Null-safe access; passes gene + sourceAttribution to composable |
| handleChartExportPng() | downloadPng() | chartRef.value?.svgRef access | WIRED | Same pattern as SVG; 2x retina scale PNG via canvas |
| downloadSvg() | applyPublicationColors() + addPublicationMetadata() | clone-transform-serialize | WIRED | Full pipeline in useChartExport.ts lines 163-188 |
| smAndDown | barHeight/barGap/labelWidth | computed reactive refs | WIRED | Three responsive computed refs affecting bar dimensions and label text |
| E2E SVG download tests | chart tab activation | Missing tab click before assertion | NOT WIRED | Tests call navigateToResults() then assert; chart v-window-item not mounted when default tab is table |

---

### Requirements Coverage

| Requirement | Status | Blocking Issue |
|-------------|--------|----------------|
| VIZ-01: Horizontal bar chart in results step | SATISFIED | None |
| VIZ-02: Inline SVG, zero external dependencies | SATISFIED | None |
| VIZ-03: Global frequency reference line | SATISFIED | None |
| VIZ-04: Founder effect populations visually distinguished | SATISFIED | None |
| VIZ-05: Responsive design, mobile-readable | SATISFIED | None |
| VIZ-06: Respects Vuetify dark/light theme | SATISFIED | None |
| VIZ-07: Chart downloadable as SVG for publication | SATISFIED | E2E test validation broken; functionality itself works |

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `apps/web/e2e/phase35-bar-chart.spec.ts` | 147-149, 155-157 | E2E tests assert download button visibility without first activating Chart tab; comment incorrectly says tab is active by default | Warning | Tests 2 and 3 would fail in real browser; functionality works correctly |

No stub patterns, TODO/FIXME, placeholder content, or empty implementations found in production code.

---

### Human Verification Required

#### 1. Founder Effect Color Distinction

**Test:** Load the app with CFTR or HEXA. Navigate to Step 4 (Results). Click the Chart tab in the Population Frequencies card.
**Expected:** Founder effect populations (e.g. Ashkenazi Jewish) render in orange/vermillion (#D55E00), visually distinct from blue (#0072B2) normal populations. Hovering shows Founder effect population italic text in tooltip.
**Why human:** Color perceptual correctness requires visual inspection.

#### 2. Mobile Layout Readability

**Test:** Open DevTools, switch to mobile viewport (375px wide). Navigate to results step and view Chart tab.
**Expected:** Bars remain readable; population codes abbreviated (e.g. NFE, ASJ, not full names); bar height smaller (14px) but visible; reference line label not clipped.
**Why human:** smAndDown breakpoint behavior requires real browser at narrow width.

#### 3. Dark Mode Chart Colors

**Test:** Toggle to dark mode via the theme button. View Chart tab.
**Expected:** Normal bars in sky blue (#56B4E9), founder bars in gold-orange (#E69F00), background matches Vuetify dark surface.
**Why human:** Dark mode rendering requires real browser; unit tests mock isDark.

#### 4. SVG Download Output Quality

**Test:** Click Chart tab, then click Download SVG button. Open the downloaded .svg file in Inkscape, Illustrator, or a browser.
**Expected:** Self-contained file with white background, title GENE - Carrier Frequency by Population, gnomAD version + date footer, all bars in Okabe-Ito hex colors (no CSS variable references), correct relative bar lengths.
**Why human:** Cannot verify downloaded binary file content from automated tests.

#### 5. Tooltip Interaction

**Test:** In Chart tab, hover over a population bar.
**Expected:** Tooltip appears showing population name, formatted carrier frequency, AC/AN numbers. For founder-effect populations, shows italic Founder effect population text.
**Why human:** Tooltip requires live hover events not available in happy-dom.

---

_Verified: 2026-02-27T00:00:00Z_
_Verifier: Claude (gsd-verifier)_