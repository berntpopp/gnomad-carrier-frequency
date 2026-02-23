# Phase 22: CTA Color System & Accessibility - Context

**Gathered:** 2026-02-23
**Status:** Ready for planning

<domain>
## Phase Boundary

WCAG-compliant CTA color system replacing the current non-accessible warm gray primary, with keyboard accessibility improvements (skip-to-content link), desktop footer label discoverability, and wizard step transition feedback. The warm gray brand identity is preserved as secondary color.

</domain>

<decisions>
## Implementation Decisions

### CTA color choice
- New primary CTA color: `#117A7F` (professional teal, NIAID-inspired)
- Light theme: `#117A7F` with white text (5.10:1 contrast ratio — AA pass)
- Light theme hover: `#0D5F63` (darkened ~15%)
- Dark theme: `#4DB6AC` (Material Teal 300, 6.83:1 on dark surface — AA pass)
- Dark theme hover: `#3D9E94` (darkened ~10%)
- Rationale: teal sits between blue (trust) and green (health), standard in NIH/NCI/NIAID medical research tools; creates strong chromatic contrast against warm gray brand palette

### Warm gray role
- Current `#a09588` becomes the Vuetify `secondary` color
- Used for non-CTA elements: chips, switches, inactive stepper dots, informational indicators
- Preserves brand identity while freeing teal for interactive actions

### Color migration rules
- **Teal (primary):** Buttons, active/selected states, selected stepper steps, links (text links use teal too)
- **Warm gray (secondary):** Passive indicators, inactive toggles, non-CTA decorative elements
- **Semantic colors preserved:** Filter chips keep their success/warning/error colors (LoF green, ClinVar amber, etc.) — teal NOT applied to semantically-colored elements
- Active wizard step uses teal; upcoming/inactive steps use warm gray secondary

### PWA manifest
- `theme_color` changes from `#a09588` to `#117A7F` (teal)
- Browser chrome and mobile status bar will match the new CTA color

### Skip-to-content link
- Hidden until focused (visible only when keyboard user presses Tab)
- Standard wording: "Skip to main content"
- Target: first interactive element in the current wizard step (e.g., Gene Symbol combobox on Step 1)
- Focus rings across the app use teal color for consistency

### Footer labels
- All footer icons get text labels on desktop (sm+ breakpoint)
- Labels hidden on mobile (xs) — icons only, preserving current mobile layout
- Applies to: GitHub, version, disclaimer, data sources, methodology, FAQ, about, logs

### Step transition loading indicator
- Linear progress bar at the top of the step content area
- Uses teal primary color
- Appears during async data loading between wizard steps

</decisions>

<specifics>
## Specific Ideas

- Color palette inspired by NCI Design System and NIAID Design System (US federal medical research standards)
- `#117A7F` specifically chosen for its proximity to NIAID Theme 1 Primary (`#157B8D`)
- Dark theme pair `#4DB6AC` is Material Teal 300 — standard Material Design dark theme convention
- The warm gray `#a09588` to teal `#117A7F` shift creates both hue contrast (cool vs warm) and saturation contrast (vivid vs muted)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 22-cta-color-accessibility*
*Context gathered: 2026-02-23*
