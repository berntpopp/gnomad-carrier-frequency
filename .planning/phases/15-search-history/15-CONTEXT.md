# Phase 15: Search History - Context

**Gathered:** 2026-01-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Browse, restore, and manage previous calculation results without re-querying. Users can view their calculation history, click to restore full state, and delete entries. History persists across sessions via localStorage.

</domain>

<decisions>
## Implementation Decisions

### History Display
- Timeline layout with visual date grouping
- Group by calendar date (e.g., "January 20, 2026")
- Minimal info per entry: gene name, carrier frequency result, timestamp
- All entries shown (no deduplication by gene) — each search is separate

### Entry Management
- Instant restore: clicking entry immediately loads that calculation's full state
- Instant delete: no confirmation dialog, entry removed immediately
- No bulk selection — individual delete only
- Clear all history option in settings (not in history drawer)
- Auto-save current work before restoring history entry (no data loss)

### Storage Behavior
- Auto-save triggered when user reaches results step with valid calculation
- Default maximum: 50 entries
- Automatic cleanup: oldest entry removed when limit exceeded
- Configurable limit: user can adjust max entries in settings

### Access Pattern
- Dedicated history icon in app bar (always visible)
- Side drawer slides in from right (same pattern as log viewer)
- No badge on icon — count visible when drawer opens
- Full-width drawer on mobile (consistent with other dialogs)

### Claude's Discretion
- Drawer width on desktop (likely 400-500px)
- Timeline visual styling (lines, dots, spacing)
- Icon choice (mdi-history or similar)
- Exact data structure for history entries
- Settings UI placement for max entries control

</decisions>

<specifics>
## Specific Ideas

- Follow same drawer pattern established by LogViewerPanel (right-side, temporary)
- Auto-save before restore prevents accidental data loss — user doesn't need to think about it
- Timeline with date headers provides quick visual scanning for "when did I look this up?"

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 15-search-history*
*Context gathered: 2026-01-20*
