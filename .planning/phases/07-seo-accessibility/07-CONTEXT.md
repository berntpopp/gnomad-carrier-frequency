# Phase 7: SEO + Accessibility - Context

**Gathered:** 2026-01-19
**Status:** Ready for planning

<domain>
## Phase Boundary

App meets WCAG 2.1 AA standards and achieves Lighthouse scores >= 90/95/95. Includes meta tags, ARIA live regions, focus management, keyboard navigation, and color contrast compliance. No new features — this is polish for accessibility and discoverability.

</domain>

<decisions>
## Implementation Decisions

### ARIA Announcements
- Calculation results: announce full summary ("Carrier frequency calculated: 1 in 25 for European population")
- Errors: announce immediately with descriptive message ("Error: Gene BRCA1 not found in gnomAD")
- Loading states: announce both start and end ("Loading gene data..." then "Gene data loaded")
- Wizard step changes: announce step name ("Step 2: Select Population")

### Keyboard Navigation
- No skip link needed — app header is minimal, content is immediately accessible
- Focus visible styling: use Vuetify defaults (no custom override)
- Dialog focus: move to first focusable element when dialog opens
- Escape key: always closes dialogs/modals without confirmation

### Meta & SEO Content
- Meta description tone: clinical/professional (target genetic counselors)
- Open Graph tags: yes, with custom preview image
- OG preview image: app logo + tagline (gCFCalc branding, clean and recognizable)
- Structured data: WebApplication schema.org markup

### Claude's Discretion
- Exact wording of meta description (within clinical/professional tone)
- Color contrast adjustments if needed for WCAG compliance
- Heading hierarchy structure
- ARIA live region politeness levels (polite vs assertive)

</decisions>

<specifics>
## Specific Ideas

- Announcements should provide enough context that a screen reader user understands what happened without needing to navigate
- Preview image should be simple branding, not a busy screenshot

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 07-seo-accessibility*
*Context gathered: 2026-01-19*
