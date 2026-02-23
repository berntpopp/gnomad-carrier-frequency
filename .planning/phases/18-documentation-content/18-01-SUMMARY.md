---
phase: 18-documentation-content
plan: 01
subsystem: docs
tags: [vitepress, css, markdown, guide, getting-started, documentation]

# Dependency graph
requires:
  - phase: 17-screenshot-automation
    provides: 14 WebP screenshots in public/screenshots/ used by figure elements

provides:
  - Screenshot-frame CSS class for browser-like image presentation in VitePress
  - Contributing sidebar entry in /about/ section
  - Complete Guide Introduction page (guide/index.md)
  - Complete Getting Started 4-step walkthrough page (guide/getting-started.md)

affects:
  - 18-02 and later documentation plans that embed screenshots using .screenshot-frame
  - Any future plan that adds to /guide/ sidebar or /about/ sidebar

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Screenshot embedding via <figure class='screenshot-frame'> with /screenshots/ absolute paths (no /public/ prefix)"
    - "VitePress callout boxes (::: warning, ::: tip, ::: info) for clinical notices and hints"
    - "Absolute path cross-links throughout docs (e.g., /reference/methodology, /use-cases/)"

key-files:
  created: []
  modified:
    - docs/.vitepress/theme/custom.css
    - docs/.vitepress/config.ts
    - docs/guide/index.md
    - docs/guide/getting-started.md

key-decisions:
  - "Screenshot-frame CSS uses box-shadow + border-radius (no explicit border) for browser-like framing"
  - "Contributing sidebar entry added after Changelog in /about/ sidebar only — no other sidebar changes"
  - "Guide intro page explains Hardy-Weinberg equilibrium briefly for broad clinical audience"
  - "Getting Started uses imperative tutorial voice with all 4 patient status options explained with risk divisors"

patterns-established:
  - "Figure embedding pattern: <figure class='screenshot-frame'><img src='/screenshots/name.webp' /><figcaption>Caption</figcaption></figure>"
  - "Research disclaimer: ::: warning For Research Use Only block at top of entry-point guide pages"
  - "Clinical callouts: ::: info blocks for formula explanations that need special attention"

# Metrics
duration: 11min
completed: 2026-02-23
---

# Phase 18 Plan 01: Guide Section and Screenshot CSS Summary

**Screenshot-frame CSS with browser-like box-shadow, Contributing sidebar entry, and complete 2-page Guide section (Introduction + 4-step Getting Started walkthrough with 8 embedded screenshots)**

## Performance

- **Duration:** 11 min
- **Started:** 2026-02-23T13:30:40Z
- **Completed:** 2026-02-23T13:42:37Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- Added `.screenshot-frame` CSS class providing browser-like bordered image presentation via `box-shadow` and `border-radius`, with styled `figcaption` area
- Added Contributing sidebar entry to `/about/` navigation in VitePress config
- Replaced placeholder `docs/guide/index.md` with complete introduction page: research disclaimer, Hardy-Weinberg explanation, key features list, 4-step wizard overview, 2 screenshots, and cross-links
- Replaced placeholder `docs/guide/getting-started.md` with complete 4-step walkthrough: gene search (with gnomAD version explanation and ClinGen advisory notice), patient status (all 4 options with risk divisors and clinical context), frequency source (gnomAD/Literature/Default tabs), results (population table, text generation, sharing, settings) — 6 embedded screenshots total

## Task Commits

Each task was committed atomically:

1. **Task 1: Add screenshot-frame CSS and Contributing sidebar entry** - `39be46a` (feat)
2. **Task 2: Write Guide Introduction page** - `f74221a` (feat)
3. **Task 3: Write Getting Started walkthrough page** - `36f52fb` (feat)

**Plan metadata:** (docs commit to follow)

## Files Created/Modified

- `docs/.vitepress/theme/custom.css` - Added .screenshot-frame, .screenshot-frame img, .screenshot-frame figcaption CSS rules
- `docs/.vitepress/config.ts` - Added Contributing sidebar entry to /about/ items array
- `docs/guide/index.md` - Complete Guide introduction page replacing placeholder (51 lines)
- `docs/guide/getting-started.md` - Complete 4-step Getting Started walkthrough (101 lines, 6 screenshots)

## Decisions Made

- **Hardy-Weinberg explanation included in Guide intro** — the audience is broad clinical (not just genetic counselors), so a brief plain-language explanation was added to make the tool approachable
- **Risk divisors documented in Getting Started** — carrier_frequency / 4 (heterozygous), / 2 (homozygous/compound het) are specified inline rather than linking to methodology only, since this is a tutorial page
- **win32 rollup native binary installed temporarily** — the local node_modules were installed by bun (Linux binaries) so `@rollup/rollup-win32-x64-msvc` was added via `npm install --no-save` to enable VitePress build verification in the Windows shell; this does not affect the committed code

## Deviations from Plan

None - plan executed exactly as written. The rollup binary issue was an environment deviation, not a code deviation; it was resolved via Rule 3 (blocking issue) without affecting any committed files.

## Issues Encountered

- **Local build environment mismatch**: The project's node_modules contain Linux rollup binaries (installed by bun on WSL2), but the Claude Code shell runs as Windows node.exe, which requires `@rollup/rollup-win32-x64-msvc`. The missing binary was installed with `npm install @rollup/rollup-win32-x64-msvc --no-save` to enable build verification. This binary is already listed as an optional dependency in the rollup package so it will be included automatically in CI (ubuntu-latest) and bun-installed environments.

## Next Phase Readiness

- Screenshot-frame CSS pattern is established and ready for use in all subsequent documentation plans (18-02 through 18-05)
- Contributing sidebar link is live — the contributing page content itself will need to be written in a future plan
- Guide section is complete; Use Cases and Reference sections can be authored independently in parallel plans
- No blockers for Phase 18 subsequent plans

---
*Phase: 18-documentation-content*
*Completed: 2026-02-23*
