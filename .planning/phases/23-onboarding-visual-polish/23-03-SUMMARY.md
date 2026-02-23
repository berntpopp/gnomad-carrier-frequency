---
phase: 23-onboarding-visual-polish
plan: 03
subsystem: ui
tags: [vue3, vuetify, composables, dialogs, ux, accessibility]

# Dependency graph
requires:
  - phase: 22-cta-color-accessibility
    provides: Vuetify theme system with primary/error colors used in confirm buttons
provides:
  - useConfirmDialog composable with singleton ask/confirm/cancel API returning Promise<boolean>
  - ConfirmDialog.vue singleton Vuetify dialog mounted once in App.vue
  - All native alert()/confirm() calls migrated to themed Vuetify dialogs
  - Template import success path with summary confirmation dialog
affects:
  - Any future feature that needs confirmation dialogs (use useConfirmDialog)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Singleton composable pattern: module-level refs shared across all instances via module scope"
    - "Promise-based dialog API: ask() returns Promise<boolean> for async/await usage in event handlers"
    - "Reader.onload async pattern: FileReader callback made async to support await ask()"

key-files:
  created:
    - src/composables/useConfirmDialog.ts
    - src/components/ConfirmDialog.vue
  modified:
    - src/composables/index.ts
    - src/App.vue
    - src/components/SettingsDialog.vue
    - src/components/LogViewer.vue

key-decisions:
  - "Module-level singleton refs (outside function) prevent state duplication across multiple useConfirmDialog() calls"
  - "resolvePromise nulled immediately after call to prevent stale closure on subsequent invocations"
  - "import success path validates structure locally before calling templateStore.importTemplates() to enable preview summary"
  - "Template import error dialogs hide cancel button (cancelText: '') -- no choice to make, just acknowledge"
  - "Destructive actions (reset, clear) use confirmColor: 'error' for red confirm button"

patterns-established:
  - "Confirm dialog pattern: import useConfirmDialog, destructure ask, await ask({...}) in async handler"
  - "Alert pattern (no cancel): use cancelText: '' to hide cancel button"
  - "Destructive action pattern: confirmColor: 'error' for red/danger confirm button"

# Metrics
duration: 3min
completed: 2026-02-23
---

# Phase 23 Plan 03: useConfirmDialog -- Native Dialog Migration Summary

**Singleton useConfirmDialog composable with Promise-based ask() API replacing all 4 native alert()/confirm() calls with themed Vuetify dialogs, including a template import summary confirmation dialog**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-02-23T19:58:38Z
- **Completed:** 2026-02-23T20:01:57Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Created useConfirmDialog composable with module-level singleton state and ask/confirm/cancel API returning Promise<boolean>
- Created ConfirmDialog.vue singleton Vuetify dialog mounted once in App.vue with backdrop-click cancel support
- Migrated all 4 native browser dialog calls to themed ask() calls: 2 alert() in SettingsDialog import handler, 1 confirm() in SettingsDialog reset, 1 confirm() in LogViewer clear
- Template import success path now validates structure locally, shows summary (language + enabled section count) and requires user confirmation before applying

## Task Commits

Each task was committed atomically:

1. **Task 1: Create useConfirmDialog composable and ConfirmDialog component** - `c0aa59d` (feat)
2. **Task 2: Migrate all 4 native dialog calls in SettingsDialog and LogViewer** - `a5dc207` (feat)

**Plan metadata:** (see final commit)

## Files Created/Modified

- `src/composables/useConfirmDialog.ts` - Singleton composable: module-level refs, ask/confirm/cancel returning Promise<boolean>
- `src/components/ConfirmDialog.vue` - Vuetify v-dialog singleton; reads from composable, no props needed
- `src/composables/index.ts` - Re-exports useConfirmDialog and ConfirmDialogOptions type
- `src/App.vue` - Mounts `<ConfirmDialog />` singleton after HistoryDrawer
- `src/components/SettingsDialog.vue` - Import errors use ask() with hidden cancel; import success shows summary dialog; reset uses ask() with error color
- `src/components/LogViewer.vue` - Clear logs uses ask() with error color

## Decisions Made

- **Module-level singleton**: Refs defined at module scope (outside the function) so all consumers share the same dialog state. The composable function just returns references to the same reactive objects.
- **resolvePromise null guard**: After calling resolve, immediately set `resolvePromise = null` to prevent stale closures on rapid re-invocations.
- **Import validation before summary**: The success path validates `data.version`, `data.language`, `data.customSections`, `data.enabledSections` locally (mirroring templateStore validation logic) to build the summary message before calling importTemplates().
- **FileReader.onload made async**: To await ask() inside the callback, the onload function was made async. This is safe -- FileReader callbacks don't require synchronous return values.
- **input.value reset before reading**: Moved `input.value = ''` before the try/catch to prevent the file input from remaining open while the user sees a dialog. This is the correct UX pattern.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- useConfirmDialog is available via `@/composables` for any future component needing confirm dialogs
- ConfirmDialog singleton is already mounted in App.vue -- no additional setup needed for consumers
- Pattern established: `const { ask } = useConfirmDialog()` in script setup, then `await ask({...})` in async handler

---
*Phase: 23-onboarding-visual-polish*
*Completed: 2026-02-23*
