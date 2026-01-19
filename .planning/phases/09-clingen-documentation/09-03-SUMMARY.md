---
phase: 09-clingen-documentation
plan: 03
subsystem: ui-components
tags: [clingen, validation, alerts, vue-components]

dependency-graph:
  requires: [09-01]
  provides: [clingen-warning-component, clingen-ui-integration]
  affects: []

tech-stack:
  added: []
  patterns:
    - validation-feedback-alerts
    - cached-composable-consumption

file-tracking:
  key-files:
    created:
      - src/components/ClingenWarning.vue
    modified:
      - src/components/wizard/StepGene.vue
      - src/components/wizard/StepResults.vue

decisions:
  - id: alert-positioning
    choice: ClinGen warning appears between gene search and constraint card in StepGene
    reason: Logical flow - validation info before detailed constraint metrics

metrics:
  duration: ~2 minutes
  completed: 2026-01-19
---

# Phase 09 Plan 03: ClinGen Warning UI Summary

**One-liner:** ClingenWarning component displays validation status (AR confirmed/warning/not found) in both gene selection and results steps.

## What Was Built

### ClingenWarning Component (`src/components/ClingenWarning.vue`)

A Vue component that displays ClinGen gene-disease validity status with four distinct states:

1. **Loading state**: Shows spinner while fetching ClinGen data
2. **Error state**: Amber warning when ClinGen data unavailable
3. **AR Validated (success)**: Green alert when gene has confirmed autosomal recessive associations, listing diseases and classifications
4. **No AR Association (warning)**: Amber alert when gene is in ClinGen but lacks AR associations, showing found associations with MOI
5. **Not in ClinGen (info)**: Blue info alert when gene not found in database

Features:
- Uses `useClingenValidity` composable for data access
- Displays classification badges (Definitive, Strong, Moderate, etc.)
- Shows disease names from ClinGen curations
- Non-blocking - user can continue regardless of status
- Uses cached data after initial fetch

### StepGene Integration

Added ClingenWarning between gene search and constraint card:
- Positioned with `class="mt-4"` for spacing
- Triggered when `modelValue` (selected gene) exists
- Passes `modelValue.symbol` as gene-symbol prop

### StepResults Integration

Added ClingenWarning at top of results page:
- Positioned before summary card with `class="mb-4"`
- Triggered when `result` exists
- Passes `result.gene` as gene-symbol prop
- Uses cached ClinGen data for instant display

## Technical Details

### Component Logic

```typescript
// Compute validity from cached store data
const validity = computed<ClingenValidityResult>(() => {
  if (!props.geneSymbol || !hasData.value) {
    return { found: false, hasAutosomalRecessive: false, entries: [], arEntries: [] };
  }
  return checkGene(props.geneSymbol);
});
```

The component:
1. Fetches ClinGen data on mount (skips if cache valid)
2. Watches gene symbol changes to re-check validity
3. Computes appropriate alert type based on validity result
4. Renders matching v-alert with appropriate content

### Alert Type Mapping

| Condition | Alert Type | Color |
|-----------|------------|-------|
| Loading | info | blue |
| Error | warning | amber |
| Has AR entries | success | green |
| Found, no AR | warning | amber |
| Not found | info | blue |

## Decisions Made

1. **Alert positioning**: ClingenWarning placed between gene search and constraint card for logical flow
2. **Class-based spacing**: Using Vuetify utility classes (`mt-4`, `mb-4`) for consistent spacing
3. **Cached data in results**: StepResults uses already-fetched ClinGen data from StepGene

## Commits

| Commit | Type | Description |
|--------|------|-------------|
| `fc0c469` | feat | Add ClingenWarning validation component |
| `f5a1ebe` | feat | Integrate ClingenWarning into StepGene |
| `f5da024` | feat | Integrate ClingenWarning into StepResults |

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

**Ready for 09-04:** ClinGen warning UI complete.

The ClingenWarning component is now integrated and displays:
- Positive confirmation for genes like CFTR (validated AR)
- Warnings for genes with non-AR associations
- Info alerts for genes not in ClinGen database

No blockers identified.
