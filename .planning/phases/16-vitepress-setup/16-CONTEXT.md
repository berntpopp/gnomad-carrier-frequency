# Phase 16: VitePress Setup - Context

**Gathered:** 2026-02-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Documentation site infrastructure using VitePress, running locally with professional navigation, theming, and a landing page. Adds docs-related Makefile targets to the existing Makefile. Does NOT include screenshot automation (Phase 17), documentation content writing (Phase 18), or CI/CD deployment (Phase 19).

</domain>

<decisions>
## Implementation Decisions

### Landing page tone & content
- Audience is both genetic counselors AND clinical researchers equally
- Voice is clinical-first, precise, professional — it's a research tool that supports clinical work, not a clinical tool itself
- Tagline style: "Calculate carrier frequencies for autosomal recessive conditions from gnomAD data" — precise and factual
- 3 feature cards (NOT 4): gnomAD Integration, Carrier Frequency Calculation, Clinical Text Generation — drop Privacy-First card
- CTA buttons: "Open Calculator" (primary, links to live app) + "Getting Started" (secondary, links to guide)

### Navigation & section naming
- Four top-level sections: Guide | Use Cases | Reference | About — keep standard labels as-is
- Direct link to the live calculator app in the top navigation bar (persistent, always visible)
- GitHub repo icon in nav bar (no other social links)
- Enable VitePress built-in local search — works offline, no external dependencies

### Theme & branding depth
- Minimal customization: set #a09588 as brand color, use VitePress defaults for fonts, layout, and components
- Dark mode follows system preference (VitePress default behavior)
- Reuse the existing app favicon/logo — no docs-specific variant
- Site title in browser tab: "gnomAD Carrier Frequency Docs"

### Makefile targets
- Existing Makefile already covers app commands — add docs targets alongside them
- Target naming: `docs` (build), `docs-dev` (dev server), `docs-preview` (preview build) — parallel to existing build/dev/preview
- `make screenshots` target deferred to Phase 17 when the Playwright script exists
- Update existing `make ci` target to include docs build — catches docs build errors early
- Add docs section to `make help` output

### Claude's Discretion
- Exact hero section layout and spacing
- Feature card icon choices
- Sidebar page ordering within sections (placeholder pages acceptable)
- VitePress config details (markdown extensions, etc.)

</decisions>

<specifics>
## Specific Ideas

- Landing page should feel like a research tool documentation site (think VueUse docs, Pinia docs) — professional but not flashy
- The app link in nav bar should be prominent enough that users can always get back to the calculator
- Placeholder pages for Guide, Use Cases, Reference, About sections are fine — content comes in Phase 18

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 16-vitepress-setup*
*Context gathered: 2026-02-09*
