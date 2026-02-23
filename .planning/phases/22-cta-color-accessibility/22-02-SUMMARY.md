---
phase: 22-cta-color-accessibility
plan: "02"
subsystem: ui
tags: [vue3, vuetify, color-system, accessibility, visual-hierarchy]

# Dependency graph
requires:
  - phase: 22-01
    provides: Vuetify theme with teal primary (#117A7F/#4DB6AC) and warm gray secondary (#a09588)
provides:
  - 8 non-CTA color bindings migrated from primary (teal) to secondary (warm gray)
  - Clear visual hierarchy: teal = interactive CTA, warm gray = passive/informational
affects: [22-03, future UI component work]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "color='primary' reserved for interactive CTAs (buttons, toggles, progress)"
    - "color='secondary' for passive/informational elements (chips, decorative icons, filter switches)"
    - "Semantic colors (success/warning/error) unchanged for filter state chips"

key-files:
  created: []
  modified:
    - src/components/FilterChips.vue
    - src/components/FilterPanel.vue
    - src/components/HistoryPanel.vue
    - src/components/TemplateEditor.vue
    - src/components/VariablePicker.vue
    - src/components/DataSourcesDialog.vue
    - src/components/AboutDialog.vue
    - src/components/SettingsDialog.vue

key-decisions:
  - "LoF HC filter chip and switch use secondary - they indicate state, not trigger actions"
  - "Variable chips (TemplateEditor, VariablePicker) use secondary - they are labels not clickable CTAs"
  - "DNA decorative icons (HistoryPanel, AboutDialog) use secondary - purely visual"
  - "gnomAD version chip in DataSourcesDialog uses secondary - informational badge"
  - "Install/Save/language toggle in SettingsDialog retain primary - they are CTAs"

patterns-established:
  - "CTA color rule: if it submits, navigates, or triggers primary action → primary (teal)"
  - "Non-CTA color rule: if it displays info, indicates state, or decorates → secondary (warm gray)"

# Metrics
duration: 3min
completed: 2026-02-23
---

# Phase 22 Plan 02: Non-CTA Color Migration Summary

**8 passive/informational elements migrated from primary (teal) to secondary (warm gray), establishing clear CTA vs. decorative visual hierarchy across 8 component files**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-23T19:14:35Z
- **Completed:** 2026-02-23T19:17:55Z
- **Tasks:** 1
- **Files modified:** 8

## Accomplishments

- All non-CTA `color="primary"` bindings audited and migrated to `color="secondary"` (warm gray #a09588)
- 16 `color="primary"` bindings remain across src/ (all confirmed CTAs: buttons, progress spinners, active toggles)
- Semantic colors (success/warning/error on filter chips) left completely untouched
- Build passes, typecheck clean

## Task Commits

1. **Task 1: Migrate non-CTA color="primary" to color="secondary"** - `11253c2` (feat)

## Files Created/Modified

- `src/components/FilterChips.vue` - LoF HC chip: primary → secondary
- `src/components/FilterPanel.vue` - LoF HC switch: primary → secondary
- `src/components/HistoryPanel.vue` - DNA list icon: primary → secondary
- `src/components/TemplateEditor.vue` - variable highlight chips: primary → secondary
- `src/components/VariablePicker.vue` - variable label chips: primary → secondary
- `src/components/DataSourcesDialog.vue` - gnomAD version chip: primary → secondary
- `src/components/AboutDialog.vue` - DNA decorative icon (64px): primary → secondary
- `src/components/SettingsDialog.vue` - LoF HC switch: primary → secondary (Install/Save/language toggle kept primary)

## Decisions Made

- LoF HC filter chip and switch use `secondary` — they show a selected state (informational), not a call to action
- Variable chips in TemplateEditor and VariablePicker use `secondary` — they are code-style labels, not clickable primary actions
- DNA icons in HistoryPanel and AboutDialog use `secondary` — purely decorative, carry no interactive meaning
- gnomAD version chip in DataSourcesDialog uses `secondary` — badge showing current selection, not a CTA
- SettingsDialog Install button, language btn-toggle, and Save button retain `primary` — they all trigger primary actions

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- 22-01 COMPLETE: Teal primary theme set in Vuetify
- 22-02 COMPLETE: Non-CTA elements migrated to secondary (warm gray)
- 22-03 NEXT: WCAG contrast audit and verification pass

All color decisions are now consistent: teal = interactive, warm gray = passive. The 22-03 plan can proceed to audit and verify contrast ratios meet WCAG AA.

---
*Phase: 22-cta-color-accessibility*
*Completed: 2026-02-23*
