# Phase 17: Screenshot Automation - Context

**Gathered:** 2026-02-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Playwright script generates all required screenshots of the running app (14 PNGs per SHOT-02 through SHOT-15), producing assets ready for documentation pages. Includes adding `data-testid` attributes to key UI elements (SHOT-16), auto-dismissing the clinical disclaimer (SHOT-17), and the `make screenshots` Makefile target (MAKE-02). Screenshots are saved to `docs/public/screenshots/`.

</domain>

<decisions>
## Implementation Decisions

### Screenshot Composition
- Full page viewport captures for all screenshots (1200x800 desktop, 375x812 mobile) — no element-level cropping
- Raw browser captures with no borders, shadows, or window chrome — VitePress/docs CSS can add styling if needed
- WebP format (lossy, smaller files) instead of PNG — good browser support, better page speed
- Descriptive kebab-case naming: `step-1-gene-search.webp`, `dark-mode-results.webp`, `mobile-results.webp`

### Data Seeding Strategy
- Mocked/intercepted API responses via Playwright `route()` — no live gnomAD calls during screenshot generation
- Fixtures captured from real gnomAD responses and committed to repo — realistic data, easy to refresh periodically
- localStorage injection for Pinia persisted state (settings, search history, preferences) — full control over app state before capture
- All screenshots use CFTR consistently — one gene, one workflow, one set of fixtures

### Script Execution Model
- Dev server (`npm run dev`) rather than preview server — faster startup, good enough for screenshots
- Sequential capture — one screenshot at a time, simpler and more predictable
- Standalone TypeScript file using Playwright API directly, run with `npx tsx scripts/generate-screenshots.ts` — no test framework overhead
- Fail fast on errors — first failure stops the entire script with clear error message about which screenshot failed

### Visual Polish
- No annotations (arrows, callouts, highlights) — raw screenshots only, documentation text guides the reader
- Dark mode screenshot mirrors the same page state as a light mode screenshot (results page) for direct visual comparison
- Wait for all animations/transitions to complete before capturing — use `waitForLoadState('networkidle')` and explicit waits for cleaner captures
- Mobile screenshot uses narrow viewport (375x812) only — no full device emulation, no device pixel ratio scaling

### Claude's Discretion
- Exact wait durations and timeout values
- Order of screenshot capture within the script
- Internal script structure (helper functions, config objects)
- How fixtures are organized in the repo
- Specific `data-testid` attribute names and placement strategy

</decisions>

<specifics>
## Specific Ideas

- DOCUMENTATION-PLAN.md Section 3.4 has the full screenshot table (14 shots) with state, theme, viewport, and purpose for each
- Production app observation: filter section is inline chips on results page, not a separate panel — `filter-panel.png` should capture the chips area
- Clinical disclaimer modal appears on first load and must be dismissed before any captures
- Section chips in clinical text are toggleable (Geneinleitung, Vererbungsmuster, etc.) — should show some enabled
- Settings dialog has 3 tabs (General, Filters, Templates) — screenshot should show General tab
- Population rows are clickable for drill-down — Ashkenazi Jewish variant table for population drill-down shot

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 17-screenshot-automation*
*Context gathered: 2026-02-09*
