# Phase 6: App Shell (Navigation + Branding) - Context

**Gathered:** 2026-01-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Professional app shell with logo, favicon, and settings access. Single-page application with no navigation menu—all content on one page. Settings accessible via gear icon. Theme toggle in app bar.

</domain>

<decisions>
## Implementation Decisions

### Logo & branding
- Text-based mark: "gCFCalc"
- Color palette inspired by LaborBerlin/RequiForm: warm neutral tones (`#a09588` muted taupe primary, `#424242` secondary)
- Favicon: "gCFC" letterform, designed to read at 16x16 and 32x32

### Navigation structure
- Single-page app—no navigation menu needed
- App bar contains: logo (left), theme toggle, settings gear (right)
- Footer contains: version display, GitHub repo link, gnomAD attribution link (as icons)
- App bar is sticky (fixed at top when scrolling)

### Settings interaction
- Opens as dialog/modal (centered overlay)
- Medium size (600px width)
- Organized with tabs (General, Filters, Templates etc.)
- Explicit save button (changes don't auto-apply, allows cancel/discard)

### App bar layout
- Logo left-aligned
- Right side order: theme toggle, then settings gear
- Subtle shadow (elevation 2-4) to separate from content
- Compact height (48px density)

### Claude's Discretion
- Exact color values derived from RequiForm palette
- Icon choices (mdi icons for settings gear, theme toggle)
- Responsive behavior on mobile
- Footer layout and spacing
- Favicon file formats (ico, png sizes)

</decisions>

<specifics>
## Specific Ideas

- Compare RequiForm (`/mnt/c/development/RequiForm/src/config/defaultBrandingConfig.json`) for LaborBerlin-like branding colors
- RequiForm palette: `#a09588` primary (muted taupe/gray), `#E5AA94` footer (peach), `#424242` secondary

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 06-app-shell*
*Context gathered: 2026-01-19*
