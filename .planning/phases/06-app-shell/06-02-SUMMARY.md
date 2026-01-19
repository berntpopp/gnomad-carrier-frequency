---
phase: 06-app-shell
plan: 02
subsystem: ui-shell
tags: [app-bar, footer, settings-dialog, vuetify, navigation]

dependency_graph:
  requires: [06-01]
  provides: [app-shell-ui, settings-dialog-component]
  affects: [07-01, 08-01, 10-01]

tech_stack:
  added: []
  patterns: [defineModel-v-model, emit-pattern, v-tooltip-activator]

key_files:
  created:
    - src/components/SettingsDialog.vue
  modified:
    - src/components/AppBar.vue
    - src/components/AppFooter.vue
    - src/App.vue

decisions:
  - id: persistent-dialog
    description: "Settings dialog uses persistent prop"
    rationale: "Prevents accidental close when clicking outside, ensuring deliberate user action"
  - id: tooltip-activator-pattern
    description: "Use v-tooltip activator slot with v-bind=props"
    rationale: "Vuetify 3 pattern for tooltip on custom activator elements"
  - id: tabs-placeholder-content
    description: "Tabs have placeholder text for future phases"
    rationale: "Establishes structure for Phase 8 (Filters) and Phase 10 (Templates)"

metrics:
  duration: ~30 minutes
  completed: 2026-01-19
---

# Phase 6 Plan 02: App Shell UI Summary

**One-liner:** Branded app bar with gCFCalc logo, settings gear opening tabbed dialog, and footer with GitHub/gnomAD icon links

## What Was Done

### Task 1: Enhance AppBar with Logo and Settings Gear

Updated `src/components/AppBar.vue`:

1. **Logo branding:**
   - Changed title from "gnomAD Carrier Frequency Calculator" to "gCFCalc"
   - Added `text-body-1 font-weight-bold` class for styling

2. **Compact styling:**
   - Added `density="compact"` for 48px height
   - Added `:elevation="2"` for subtle shadow

3. **Settings button:**
   - Added gear icon button (mdi-cog) with tooltip
   - Emits `openSettings` event on click
   - Added `defineEmits<{ openSettings: [] }>()`

4. **Theme toggle tooltip:**
   - Wrapped existing theme toggle in v-tooltip with activator slot
   - Consistent visual pattern with settings button

**Commit:** bfb947b

### Task 2: Enhance AppFooter with Icon Links

Updated `src/components/AppFooter.vue`:

1. **GitHub icon (left):**
   - `v-btn` icon with mdi-github
   - Links to repository URL
   - Tooltip: "Source code on GitHub"

2. **Version (center):**
   - Preserved existing version link
   - Separated by pipe dividers

3. **gnomAD icon (right):**
   - `v-btn` icon with mdi-database
   - Links to gnomad.broadinstitute.org
   - Tooltip: "gnomAD database"

4. **Layout:**
   - Added `ga-2` gap class for spacing
   - Pipe dividers with `mx-2` class

**Commit:** 645a045

### Task 3: Create SettingsDialog and Integrate

Created `src/components/SettingsDialog.vue`:

1. **Dialog structure:**
   - `v-dialog` with `max-width="600"` and `persistent`
   - Uses `defineModel<boolean>()` for v-model binding
   - Card with title, tabs, content, and actions

2. **Tabbed interface:**
   - General tab (placeholder)
   - Filters tab (placeholder for Phase 8)
   - Templates tab (placeholder for Phase 10)
   - Uses `v-tabs` and `v-tabs-window` components

3. **Actions:**
   - X button in header closes dialog
   - Cancel button closes dialog
   - Save button closes dialog (logic added in later phases)

Updated `src/App.vue`:

4. **Integration:**
   - Import SettingsDialog component
   - Add `showSettings = ref(false)`
   - Wire `@openSettings="showSettings = true"` on AppBar
   - Add `<SettingsDialog v-model="showSettings" />`

**Commit:** e8c5126

## Key Technical Details

### defineModel Pattern (Vue 3.4+)

```typescript
const modelValue = defineModel<boolean>();
```

This macro simplifies v-model bindings:
- Automatically creates `modelValue` prop
- Automatically emits `update:modelValue`
- Directly assigns with `modelValue.value = false`

### Tooltip Activator Pattern (Vuetify 3)

```vue
<v-tooltip text="Settings" location="bottom">
  <template #activator="{ props }">
    <v-btn v-bind="props" icon variant="text">
      <v-icon>mdi-cog</v-icon>
    </v-btn>
  </template>
</v-tooltip>
```

The activator slot with `v-bind="props"` is required for tooltips on custom elements in Vuetify 3.

### Event Flow

```
AppBar (gear click)
    |
    v--> emit('openSettings')
    |
App.vue (@openSettings="showSettings = true")
    |
    v--> showSettings = true
    |
SettingsDialog (v-model="showSettings")
    |
    v--> dialog opens
```

## Deviations from Plan

None - plan executed exactly as written.

## Files Changed

| File | Change | Lines |
|------|--------|-------|
| src/components/AppBar.vue | Enhanced with logo, compact, settings | +35/-10 |
| src/components/AppFooter.vue | Added icon links and tooltips | +37/-1 |
| src/components/SettingsDialog.vue | New file - tabbed dialog | +62 |
| src/App.vue | Integrated SettingsDialog | +7/-1 |

## Verification Results

- `npm run typecheck` - passed
- `npm run lint` - passed
- `npm run build` - succeeded (2m 59s)

**Grep verifications:**
- gCFCalc in AppBar.vue
- mdi-cog in AppBar.vue
- openSettings in AppBar.vue
- density="compact" in AppBar.vue
- mdi-github in AppFooter.vue
- mdi-database in AppFooter.vue
- gnomad.broadinstitute.org in AppFooter.vue
- SettingsDialog in App.vue
- v-tabs-window in SettingsDialog.vue
- persistent in SettingsDialog.vue

## Requirements Coverage

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| SHELL-01 | Done | gCFCalc logo in app bar |
| SHELL-02 | Done | (06-01) Theme toggle with favicon |
| SHELL-03 | Done | Settings gear opens tabbed dialog |
| SHELL-07 | Done | GitHub and gnomAD icons in footer |

## Next Phase Readiness

Phase 6 complete. Ready to proceed:

- App shell provides branded, professional interface
- Settings dialog structure in place for future phases
- Phase 7 (SEO + Accessibility) can build on this shell
- Phase 8 (Filtering) will populate Filters tab
- Phase 10 (Templates) will populate Templates tab

No blockers or concerns identified.
