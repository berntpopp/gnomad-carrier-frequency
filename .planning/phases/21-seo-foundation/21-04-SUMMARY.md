---
phase: 21-seo-foundation
plan: "04"
subsystem: ui
tags: [seo, cross-linking, footer, docs, cta, vitepress, vuetify]

# Dependency graph
requires:
  - phase: 21-seo-foundation
    provides: "SEO foundation - sitemap, robots.txt, structured data, meta tags, docs site"
provides:
  - "App footer Docs icon button linking to /docs/"
  - "Calculator CTA links in 5 docs pages"
  - "CFTR deep-link from carrier-screening.md"
affects:
  - "22-cta-color-a11y"
  - "23-onboarding-polish"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Cross-linking pattern: app footer links out to docs, docs pages link back to app"
    - "Deep-link pattern: docs pages use ?gene=CFTR query param for pre-filled calculator state"

key-files:
  created: []
  modified:
    - src/components/AppFooter.vue
    - docs/use-cases/carrier-screening.md
    - docs/use-cases/clinical-letter.md
    - docs/guide/getting-started.md
    - docs/guide/index.md
    - docs/reference/methodology.md

key-decisions:
  - "Docs link placed in footer-primary row (always-visible) between Version and Disclaimer for maximum discoverability"
  - "Docs link also added to mobile overflow menu so all screen sizes have access"
  - "href uses /docs/ relative path (not absolute domain) to work across dev/staging/production environments"
  - "CFTR deep link uses ?gene=CFTR query param recognized by useUrlState composable"
  - "VitePress {target='_blank'} attribute syntax used for new-tab behavior on external links"

patterns-established:
  - "App-to-docs cross-linking: footer icon button with mdi-book-open-outline, href=/docs/"
  - "Docs-to-app CTA pattern: 'Try It Yourself' / 'Open Calculator' sections at bottom of docs pages before See Also"

# Metrics
duration: 2min
completed: 2026-02-23
---

# Phase 21 Plan 04: Cross-linking App and Docs Summary

**Bidirectional cross-linking between app and docs: mdi-book-open-outline footer button linking to /docs/ and contextual Open Calculator CTAs in 5 docs pages including CFTR deep-link**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-23T18:08:34Z
- **Completed:** 2026-02-23T18:10:51Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- App footer now has a Documentation icon button (mdi-book-open-outline) in the primary row, visible on all screen sizes, linking to /docs/ in a new tab
- Mobile overflow menu also has Documentation entry so xs-screen users have access
- Five docs pages have contextual "Open Calculator" CTA sections with production URL links
- carrier-screening.md includes a CFTR deep-link (?gene=CFTR) to pre-fill the gene search

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Docs link to AppFooter** - `02fc8b6` (feat)
2. **Task 2: Add calculator CTA links to docs pages** - `a00e8b4` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `src/components/AppFooter.vue` - Added mdi-book-open-outline button in footer-primary row and Documentation item in mobile v-list menu
- `docs/use-cases/carrier-screening.md` - Added "Try It Yourself" section with CFTR deep-link and generic Open Calculator link
- `docs/use-cases/clinical-letter.md` - Added "Try It Yourself" section with Open Calculator link
- `docs/guide/getting-started.md` - Added "Start Calculating" section at bottom
- `docs/guide/index.md` - Added "Get Started" section with calculator link before Next Steps
- `docs/reference/methodology.md` - Added "Calculate Now" section at bottom

## Decisions Made

- Placed Docs button in footer-primary (always-visible row) rather than footer-secondary (hidden on xs) so it's accessible on all screen sizes; also added to mobile overflow menu as belt-and-suspenders
- Used relative path `/docs/` for the href so the link works correctly in dev, staging, and production without hardcoding a domain
- Inserted CTA sections before "See Also" in pages that have it (carrier-screening.md) and at the very bottom of pages without that section
- Used VitePress `{target="_blank" rel="noopener"}` attribute syntax on external markdown links

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Cross-linking infrastructure complete; search engines can now crawl the bidirectional link graph
- Phase 22 (CTA Color & Accessibility) can proceed - no blockers from this plan
- The /docs/ relative link will resolve correctly once the app and docs are deployed to the same domain under /docs/ path

---
*Phase: 21-seo-foundation*
*Completed: 2026-02-23*
