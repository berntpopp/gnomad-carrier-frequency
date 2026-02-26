---
phase: 35
plan: "01"
subsystem: visualization
tags: [svg, chart, bar-chart, colorblind-safe, okabe-ito, responsive, tooltip, dark-mode]

dependency-graph:
  requires:
    - "33-01"  # useDisplayFormat composable (formatFrequency)
    - "34-01"  # PopulationFrequency.isFounderEffect (quality flags infrastructure)
  provides:
    - PopulationBarChart component (self-contained SVG bar chart)
    - svgRef exposed for Plan 02 SVG/PNG export
  affects:
    - "35-02"  # StepResults integration (consumes PopulationBarChart)
    - "35-03"  # SVG/PNG export (uses svgRef from PopulationBarChart)

tech-stack:
  added: []
  patterns:
    - "Inline SVG computed from reactive Vue props (zero external charting library)"
    - "Okabe-Ito colorblind-safe palette with dark/light variants"
    - "CSS transition on SVG rect width attribute for animated data changes"
    - "HTML tooltip div positioned absolutely over SVG (not Vuetify v-tooltip)"
    - "useDisplay smAndDown for mobile compact layout"
    - "defineExpose(svgRef) for parent export access"

key-files:
  created:
    - apps/web/src/components/PopulationBarChart.vue
  modified:
    - apps/web/src/components/wizard/StepResults.vue

decisions:
  - id: D1
    choice: "HTML div tooltip positioned absolutely over SVG"
    rationale: "Vuetify v-tooltip has limitations with SVG child elements per RESEARCH.md"
    alternatives: ["Vuetify v-tooltip", "SVG foreignObject tooltip"]
  - id: D2
    choice: "Responsive constants (barHeight, barGap, labelWidth) as computed refs from smAndDown"
    rationale: "Avoids conditional logic in template; single reactive source"
    alternatives: ["Static constants with v-if branches"]
  - id: D3
    choice: "Touch tooltip auto-dismiss: 3-second setTimeout"
    rationale: "Simpler than document-level tap detection; matches RESEARCH.md recommendation"
    alternatives: ["Document-level tap listener", "Persistent on touch"]
  - id: D4
    choice: "BAR_AREA computed from labelWidth (also responsive)"
    rationale: "Mobile labelWidth=80 means more bar area available proportionally"
    alternatives: ["Fixed BAR_AREA constant"]

metrics:
  duration: "3m 6s"
  completed: "2026-02-26"
  tasks-completed: 2
  tasks-total: 2
---

# Phase 35 Plan 01: Population Bar Chart Component Summary

**One-liner:** Self-contained inline SVG horizontal bar chart with Okabe-Ito colorblind-safe palette, dark/light mode, touch tooltips, and exposed svgRef for Plan 02 export.

## What Was Built

`PopulationBarChart.vue` — a complete Vue 3 SFC rendering a horizontal bar chart of carrier frequencies per population using pure inline SVG (zero external charting library dependency per VIZ-02).

Key implementation details:
- SVG internal coordinate system: 600px wide, dynamic height from population count
- Non-zero populations only, sorted by carrier frequency descending
- Global carrier frequency shown as vertical dashed reference line with formatted label
- Founder-effect populations rendered in Okabe-Ito Vermillion (#D55E00 light / #E69F00 dark)
- Normal populations in Okabe-Ito Blue (#0072B2 light / #56B4E9 dark)
- CSS `transition: width 0.3s ease` on bar rects for animated data changes (quality exclusion toggle)
- Mobile (smAndDown): BAR_HEIGHT=14, BAR_GAP=4, LABEL_WIDTH=80, abbreviated codes
- Custom HTML tooltip div (not Vuetify v-tooltip) with touch auto-dismiss after 3 seconds
- `defineExpose({ svgRef })` for Plan 02 SVG/PNG export access
- `role="img"` + `aria-label` + `<title>` for screen reader accessibility
- Empty state when all populations have zero or null carrier frequency

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed unused `filteredByPathogenicity` in StepResults.vue**

- **Found during:** Task 1 (lint verification)
- **Issue:** `filteredByPathogenicity` was destructured from `useCarrierFrequency()` in StepResults.vue line 654 but never referenced in the component body, causing `@typescript-eslint/no-unused-vars` lint error. This pre-existed before Phase 35.
- **Fix:** Removed `filteredByPathogenicity` from the destructured return of `useCarrierFrequency()`. `qualifyingVariants` (the only used sibling) is unchanged.
- **Files modified:** `apps/web/src/components/wizard/StepResults.vue`
- **Commit:** 45f2296

## Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Tooltip approach | HTML div positioned absolute | Vuetify v-tooltip limited with SVG child elements |
| Responsive constants | computed refs from smAndDown | Single reactive source, cleaner than v-if branches |
| Touch dismiss | 3-second setTimeout | Simpler than document-level tap detection |
| BAR_AREA | computed from labelWidth | Mobile labelWidth smaller = more bar area available |

## Verification

- `bun run typecheck`: PASS (0 errors)
- `bun run lint`: PASS (0 errors, 0 warnings) — pre-existing StepResults lint error also fixed
- Line count: 286 lines (minimum 200 required: PASS)
- Key patterns verified: useDisplayFormat, useAppTheme, PopulationFrequency props, svgRef exposed

## Next Phase Readiness

**Plan 02 (StepResults Integration):** Ready. `PopulationBarChart.vue` is at `apps/web/src/components/PopulationBarChart.vue` with props `populations`, `globalCarrierFrequency`, `gene`, `gnomadVersion`. The `svgRef` is exposed for export.

**Plan 03 (SVG/PNG Export):** Ready. `svgRef` is a `ref<SVGSVGElement | null>` exposed via `defineExpose`. `gene` and `gnomadVersion` props are available for publication metadata.

No blockers or concerns for remaining plans.
