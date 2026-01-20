---
phase: 14-mobile-optimization
plan: 02
name: "Mobile Table Scrolling"
subsystem: UI/Tables
tags: [mobile, responsive, tables, scrolling, CSS, sticky]

dependency-graph:
  requires:
    - 14-01 # Responsive dialogs provides mobile-friendly modal for viewing tables
  provides:
    - Horizontal scroll wrapper for data tables
    - Frozen columns with CSS sticky positioning
    - Shadow indicators for scrollable content
    - Row styling preserved with frozen backgrounds
  affects:
    - Future table components should follow same pattern
    - Mobile UI consistency established

tech-stack:
  added: []
  patterns:
    - CSS sticky for frozen columns
    - overflow-x scroll wrapper pattern
    - CSS pseudo-elements for scroll indicators
    - Theme-aware background colors with CSS variables

key-files:
  created: []
  modified:
    - src/components/VariantTable.vue
    - src/components/wizard/StepResults.vue

decisions:
  - decision: "Always apply scroll wrapper"
    rationale: "Simplifies code - horizontal scroll only activates when needed"
    date: 2026-01-20
  - decision: "Freeze two columns in VariantTable (checkbox + variant ID)"
    rationale: "Essential for knowing which variant is being viewed/excluded"
    date: 2026-01-20
  - decision: "Freeze one column in StepResults (Population)"
    rationale: "Population name is primary identifier for each row"
    date: 2026-01-20
  - decision: "Use CSS pseudo-elements for shadow indicator"
    rationale: "Pure CSS, no JS required, indicates scrollable content"
    date: 2026-01-20

metrics:
  duration: "3m 29s"
  completed: "2026-01-20"
---

# Phase 14 Plan 02: Mobile Table Scrolling Summary

Horizontal scroll with frozen columns for mobile-friendly data tables.

## One-liner

Data tables now horizontally scroll on mobile with frozen identifier columns and visual scroll indicators via CSS sticky positioning.

## Accomplishments

### Task 1: VariantTable horizontal scroll

**Commit:** 94ddb54

- Wrapped v-data-table in `table-scroll-wrapper` div with `overflow-x: auto`
- Froze first column (checkbox) at `left: 0`
- Froze second column (variant ID) at `left: 48px` (width of checkbox)
- Added shadow pseudo-element on frozen column edge
- Froze expand column on right side for symmetry
- Handled excluded-row background colors for frozen cells
- Handled expanded-row (grey-lighten-5) background for frozen cells

### Task 2: StepResults population table scroll

**Commit:** d9ef1ee

- Wrapped v-data-table in `table-scroll-wrapper`
- Froze Population column (first column)
- Added shadow indicator for scrollable content
- Extended scroll wrapper to card edges on mobile (`margin: 0 -16px`)
- Reset margin on desktop (`@media (min-width: 960px)`)
- Handled global row (grey-lighten-4) background for frozen cell
- Handled founder effect row (blue-lighten-5) background for frozen cell
- Preserved row hover interactions with frozen cell background

### Style fix: Template indentation

**Commit:** fb34a0f

- Corrected v-data-table template content indentation
- Both files now pass lint cleanly with zero warnings

## CSS Pattern Established

```css
/* Scroll wrapper */
.table-scroll-wrapper {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  position: relative;
}

/* Frozen column */
:deep(.data-table) th:first-child,
:deep(.data-table) td:first-child {
  position: sticky;
  left: 0;
  z-index: 2;
  background: rgb(var(--v-theme-surface));
}

/* Shadow indicator */
:deep(.data-table) th:first-child::after,
:deep(.data-table) td:first-child::after {
  content: '';
  position: absolute;
  top: 0;
  right: -8px;
  bottom: 0;
  width: 8px;
  background: linear-gradient(to right, rgba(0,0,0,0.1), transparent);
  pointer-events: none;
}
```

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

- [x] VariantTable horizontal scroll works
- [x] VariantTable frozen columns (checkbox + variant ID) stay visible
- [x] StepResults table horizontal scroll works
- [x] StepResults frozen column (Population) stays visible
- [x] Shadow indicators appear on frozen column edges
- [x] Row interactions still work (click, expand, checkbox)
- [x] Row styling preserved (excluded dimming, global bold, founder highlight)
- [x] `npm run build` succeeds
- [x] `npm run lint` passes (0 warnings, 0 errors)

## Files Modified

| File | Changes |
|------|---------|
| src/components/VariantTable.vue | +76/-14 lines (scroll wrapper, frozen columns CSS) |
| src/components/wizard/StepResults.vue | +63/-9 lines (scroll wrapper, frozen column CSS) |

## Next Phase Readiness

**Status:** Ready for 14-03 (Touch-friendly interactions)

**Blockers:** None

**Notes:**
- Tables now usable on mobile with horizontal scrolling
- Frozen columns ensure essential data always visible
- Pattern can be applied to any future data tables
