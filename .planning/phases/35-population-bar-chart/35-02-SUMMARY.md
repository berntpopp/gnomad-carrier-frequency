---
phase: 35
plan: "02"
subsystem: visualization
tags: [svg, chart, export, png, tabs, vuetify, v-tabs, v-window, chart-export, publication-ready]

dependency-graph:
  requires:
    - "35-01"  # PopulationBarChart.vue with exposed svgRef
    - "33-02"  # export-utils.ts for generateFilename
  provides:
    - useChartExport composable (SVG + PNG download with publication metadata)
    - StepResults tabbed Chart|Table view
    - Chart export buttons (Download SVG, Download PNG)
  affects:
    - "35-03"  # SVG/PNG export plan (already integrated - no separate plan needed)

tech-stack:
  added: []
  patterns:
    - "Clone SVG before mutation (never touch live DOM)"
    - "XMLSerializer for SVG export with publication metadata injection"
    - "Canvas 2x scale for retina PNG via img.onload + canvas.drawImage"
    - "v-tabs + v-window pattern for Chart|Table toggle (not v-tabs-window)"
    - "chartRef + defineExpose pattern for parent access to child SVG element"

key-files:
  created:
    - apps/web/src/composables/useChartExport.ts
    - .planning/phases/35-population-bar-chart/35-02-SUMMARY.md
  modified:
    - apps/web/src/components/wizard/StepResults.vue
    - apps/web/src/composables/index.ts
    - apps/web/src/components/PopulationBarChart.vue
    - apps/web/src/components/SettingsDialog.vue

key-decisions:
  - "Optional chaining on event.touches[0] (?.clientX) — touch array may be empty on touchend events"
  - "v-tabs + v-window (not v-tabs-window) — consistent with Vuetify best practices per plan"
  - "result?.populations ?? [] and result?.gene ?? '' — null guards in chart tab (v-if on tableItems doesn't narrow TS type)"
  - "Clone SVG before applyPublicationColors and addPublicationMetadata — live DOM never mutated"
  - "img.onload attached before img.src — prevents race condition in PNG rasterization (Pitfall 5)"

patterns-established:
  - "Chart export: clone → applyPublicationColors → addPublicationMetadata → serialize → Blob download"
  - "Publication metadata: 30px title space at top + 20px footer space at bottom, viewBox expanded"
  - "Tabs above divider: v-tabs row between toolbar and v-divider so tabs are visible in both views"

metrics:
  duration: "7m 17s"
  completed: "2026-02-26"
---

# Phase 35 Plan 02: StepResults Integration and Chart Export Summary

**Tabbed Chart|Table view in StepResults with publication-ready SVG/PNG chart export via useChartExport composable.**

## Performance

- **Duration:** 7m 17s
- **Started:** 2026-02-26T23:10:18Z
- **Completed:** 2026-02-26T23:17:35Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- `useChartExport.ts` composable provides `downloadSvg` and `downloadPng` functions for publication-ready chart export
- SVG export clones the chart, resolves CSS variables to hex colors, injects title/footer metadata, serializes with XML declaration
- PNG export rasterizes the SVG at 2x retina resolution via canvas, using `img.onload` before `img.src` to avoid race conditions
- `StepResults.vue` Population Frequencies card replaced standalone table with `v-tabs` (Chart|Table) + `v-window`
- Chart tab shows `PopulationBarChart` with bar-click drill-down and SVG/PNG download buttons
- Table tab contains the entire existing `v-data-table` with source breakdown expansion, unchanged
- Toolbar (format selector, export dropdown, variants button, link button) stays above tabs, visible in both views

## Task Commits

1. **Task 1: Chart export composable (SVG + PNG download)** - `4bda072` (feat)
2. **Task 2: StepResults tabbed Chart|Table view with export buttons** - `926b214` (feat)

**Plan metadata:** (see docs commit below)

## Files Created/Modified

- `apps/web/src/composables/useChartExport.ts` - New composable with downloadSvg/downloadPng, applyPublicationColors, addPublicationMetadata
- `apps/web/src/composables/index.ts` - Added useChartExport and UseChartExportReturn exports
- `apps/web/src/components/wizard/StepResults.vue` - Tabbed Chart|Table view, chart export handlers, PopulationBarChart integration
- `apps/web/src/components/PopulationBarChart.vue` - Auto-fix: optional chaining on touches[0]
- `apps/web/src/components/SettingsDialog.vue` - Auto-fix: null guards on array[0] access, removed unused templateEditorRef

## Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Template null guards | `result?.populations ?? []` | TS type is `CarrierFrequencyResult | null`; v-if on tableItems.length doesn't narrow the type in vue-tsc |
| Tabs pattern | v-tabs + v-window | Plan explicitly prohibits v-tabs-window (known Vuetify issues) |
| Chart ref access | `chartRef.value?.svgRef` | defineExpose pattern from Plan 01; safe optional chaining for null check |
| Color resolution | Walk querySelectorAll('*') | SVG CSS vars not resolved in canvas; must replace before serialization |
| viewBox expansion | 30px top + 20px bottom | Title at y=20, footer at y=(newHeight-6); prevents clipping |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed touches[0] possibly undefined in PopulationBarChart.vue**

- **Found during:** Task 2 (build verification)
- **Issue:** `event.touches[0].clientX` fails TypeScript strict check — touches array could be empty on touchend events
- **Fix:** Changed to `event.touches[0]?.clientX ?? 0` (optional chaining with fallback)
- **Files modified:** `apps/web/src/components/PopulationBarChart.vue`
- **Verification:** `bun run build` passes (0 TS errors from PopulationBarChart)
- **Committed in:** 926b214 (Task 2 commit)

**2. [Rule 1 - Bug] Fixed array[0] possibly undefined in SettingsDialog.vue**

- **Found during:** Task 2 (build verification)
- **Issue:** Two locations accessed `array[0]` without undefined guard: `val[0]` in navSelection setter and `filtered[0].id` in filteredSections watcher
- **Fix:** Added explicit undefined checks (`const first = arr[0]; if (first !== undefined) ...`)
- **Files modified:** `apps/web/src/components/SettingsDialog.vue`
- **Verification:** `bun run build` passes (0 TS errors from SettingsDialog)
- **Committed in:** 926b214 (Task 2 commit)

**3. [Rule 1 - Bug] Removed unused templateEditorRef declaration in SettingsDialog.vue**

- **Found during:** Task 2 (build verification)
- **Issue:** `templateEditorRef` was declared as a ref but never read in script (`TS6133: declared but never read`). The template `ref="templateEditorRef"` attribute was also cleaned up.
- **Fix:** Removed `const templateEditorRef = ref<...>(null)` and the `ref="templateEditorRef"` attribute from the TemplateEditor component usage
- **Files modified:** `apps/web/src/components/SettingsDialog.vue`
- **Verification:** `bun run build` passes (0 TS errors from SettingsDialog)
- **Committed in:** 926b214 (Task 2 commit)

---

**Total deviations:** 3 auto-fixed (all Rule 1 - Bug; pre-existing build errors in other files)
**Impact on plan:** All auto-fixes restored the build to zero errors. These were pre-existing errors introduced in Plan 35-01 (PopulationBarChart) and prior phases (SettingsDialog). No scope creep.

## Issues Encountered

- Build errors (TS2532, TS2322, TS6133) in PopulationBarChart.vue and SettingsDialog.vue pre-dated this plan but were exposed during Task 2 build verification. Fixed inline per Rule 1.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Plan 03 (SVG/PNG Export):** Plan 35-02 has already integrated the chart export functionality that was originally scoped for Plan 35-03. The `useChartExport` composable and the SVG/PNG download buttons in StepResults.vue are fully implemented. Plan 35-03 may have reduced or no remaining work depending on its scope.

No blockers.

---
*Phase: 35-population-bar-chart*
*Completed: 2026-02-26*
