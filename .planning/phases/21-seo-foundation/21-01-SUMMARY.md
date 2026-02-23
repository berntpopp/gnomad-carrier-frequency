---
phase: 21-seo-foundation
plan: 01
subsystem: seo
tags: [seo, html, meta-tags, static-content, structured-data, pwa]

# Dependency graph
requires: []
provides:
  - Static HTML seed content (750 words) inside <div id="app"> for crawler visibility
  - Optimized title tag leading with primary search term "Carrier Frequency Calculator"
  - Meta description under 155 chars with "free" and "gnomAD" differentiators
  - Canonical URL pointing to https://gnomad-carrier-frequency.kidney-genetics.org/
  - Robots meta directive (index, follow)
  - Preconnect + dns-prefetch hints for gnomad.broadinstitute.org
  - Seed CSS styles with seed-* prefixed classes (brand color #a09588)
  - Noscript fallback outside #app with docs link
affects:
  - 21-02 (robots.txt/sitemap may reference canonical)
  - 21-03 (OG/Twitter meta will build on top of head changes)
  - 22-cta-color (seed-cta class in place for CTA color phase reference)
  - 24-docs-content (FAQ content in seed matches docs content strategy)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Static HTML seed pattern: content inside Vue mount target replaced on mount, visible to crawlers"
    - "seed-* CSS class namespace: prevents Vuetify conflicts for pre-mount styling"
    - "Preconnect + dns-prefetch pair for external API domains"

key-files:
  created: []
  modified:
    - index.html

key-decisions:
  - "Title leads with 'Carrier Frequency Calculator' (not 'gnomAD') as primary search term"
  - "Meta description trimmed to 141 chars to stay under 155 limit while keeping 'free' and 'gnomAD'"
  - "seed-* CSS class prefix chosen to avoid Vuetify style conflicts"
  - "Noscript placed outside #app so it persists after Vue mounts"
  - "FAQ content in seed matches JSON-LD FAQPage schema already in head for consistency"

patterns-established:
  - "Seed CSS pattern: seed-* prefixed classes with brand color #a09588 for pre-JS landing page"
  - "Static seed structure: header > main (H1, subtitle, features, how-it-works, faq) > footer"

# Metrics
duration: 7min
completed: 2026-02-23
---

# Phase 21 Plan 01: SEO Head Meta Tags and Static HTML Seed Content Summary

**750-word static HTML seed in index.html with SEO-optimized head tags: canonical URL, robots directive, preconnect hints, and styled landing page visible to crawlers before JavaScript executes**

## Performance

- **Duration:** 7 min
- **Started:** 2026-02-23T18:06:59Z
- **Completed:** 2026-02-23T18:13:46Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- Static HTML seed content (750 words) added inside `<div id="app">` -- visible to Google/social crawlers before JS loads
- Head meta tags updated: title leads with "Carrier Frequency Calculator", meta description includes "free" and "gnomAD" under 155 chars
- Canonical URL, robots directive, preconnect hints, and noscript fallback all in place
- Seed styled as professional landing page matching app brand color #a09588 with seed-* CSS namespace

## Task Commits

Each task was committed atomically:

1. **Task 1: Update index.html head meta tags** - `f8b1e90` (feat)
2. **Task 2: Add static HTML seed content and noscript fallback** - `a05b26e` (feat)

**Plan metadata:** (pending)

## Files Created/Modified
- `index.html` - Updated head meta tags (title, description, canonical, robots, preconnect, seed CSS) and added 750-word static seed body content with noscript fallback

## Decisions Made
- Title changed to lead with "Carrier Frequency Calculator" (not "gnomAD") as that is the primary search term users type
- Meta description trimmed to 141 characters (from 188) to satisfy the 155-char limit while retaining "Free", "gnomAD", and "multiple ancestries" differentiators
- Used `seed-*` CSS class prefix to avoid any Vuetify style conflicts since Vuetify injects global styles at runtime
- Noscript tag placed outside `<div id="app">` so it persists and remains visible even after Vue mounts and replaces app innerHTML
- FAQ content in the seed mirrors the JSON-LD FAQPage schema already present in the head for content consistency

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- `bun` command not available in bash shell PATH; resolved by using `npx vite build` directly (vite available in node_modules/.bin). Build passes with the same output.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- index.html now has canonical, robots, preconnect, title, description, and seed content -- all SEO foundation head requirements satisfied
- Plan 02 (robots.txt + sitemap) can proceed independently
- Plan 03 (OG/Twitter meta update) can build on the existing head structure
- Seed content includes FAQ section that aligns with Plan 04 (FAQ page) content strategy

---
*Phase: 21-seo-foundation*
*Completed: 2026-02-23*
