# Phase 5: Foundation (Settings + Theme) - Context

**Gathered:** 2026-01-19
**Status:** Ready for planning

<domain>
## Phase Boundary

User preference infrastructure — theme switching with persistence, version display. This is the foundation that other phases (6-10) build on. Settings store architecture established here.

</domain>

<decisions>
## Implementation Decisions

### Theme Toggle Placement
- Toggle button in app bar (always visible, one-click access)
- Sun/moon icons — sun for light mode, moon for dark mode
- Tooltip on hover: "Switch to dark mode" or "Switch to light mode"
- Position: right side of app bar, near other utility controls (before settings gear)

### Theme Transition Behavior
- Instant switch — no animation between themes
- Detect system preference on first visit (prefers-color-scheme)
- Once user manually toggles, their choice is final (ignore future system changes)
- Two options only: Light / Dark (no "System" third option)

### Version Display Location
- Footer, always visible — small text like "v1.1.0"
- Format: just version number with 'v' prefix (v1.1.0)
- Clickable: links to GitHub releases page (opens in new tab)

### Settings Store Architecture
- Separate Pinia stores per feature: themeStore, filterStore, templateStore
- Phase 5 creates empty stubs for filterStore and templateStore (implemented later)
- Persistence: localStorage with export/import option for settings backup
- Global "Reset to defaults" option to clear all settings at once

### Claude's Discretion
- Exact icon choices within Material Design icon set
- Footer styling and typography
- Store key naming conventions
- Export/import file format

</decisions>

<specifics>
## Specific Ideas

- Theme toggle should feel like standard web app patterns (GitHub, VS Code, etc.)
- Version in footer is a common pattern — unobtrusive but findable
- Export/import settings useful for users switching browsers or devices

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 05-foundation*
*Context gathered: 2026-01-19*
