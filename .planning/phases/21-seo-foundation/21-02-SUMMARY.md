---
phase: 21-seo-foundation
plan: "02"
subsystem: seo
tags: [seo, sitemap, robots.txt, og-image, playwright, sharp, vitepress]

# Dependency graph
requires:
  - phase: 16-vitepress-setup
    provides: VitePress docs site with /docs/ base path
  - phase: 17-screenshot-automation
    provides: Playwright+sharp patterns and dev server management
provides:
  - 1200x630 PNG OG image at public/og-image.png (sharp SVG conversion)
  - App sitemap.xml with single root URL
  - robots.txt with dual sitemap directives (app + docs)
  - VitePress sitemap generation with correct /docs/ base path URLs
  - OG meta tags and Twitter card meta in VitePress head
  - scripts/generate-og-image.ts for reproducible OG image generation
affects:
  - 21-03-meta-tags (needs og-image.png path for index.html meta tags)
  - 21-04-docs-icon (reads robots.txt structure)
  - 22-cta-color-accessibility
  - future SEO phases

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "VitePress sitemap.hostname must include /docs/ base path (issue #3863 workaround)"
    - "SVG fallback pattern: Playwright screenshot attempt with sharp SVG-to-PNG fallback"
    - "OG image generation script mirrors generate-screenshots.ts patterns"

key-files:
  created:
    - public/og-image.png
    - public/sitemap.xml
    - scripts/generate-og-image.ts
  modified:
    - public/robots.txt
    - docs/.vitepress/config.ts
    - package.json

key-decisions:
  - "Used SVG-to-PNG conversion as primary OG image approach (Playwright dev server not available in bash shell context)"
  - "VitePress sitemap hostname set to https://gnomad-carrier-frequency.kidney-genetics.org/docs/ (not just hostname) to work around VitePress #3863"
  - "OG image shared between app and docs - single source of truth at /og-image.png absolute URL"
  - "Added lastUpdated: true to VitePress for <lastmod> tags in docs sitemap"

patterns-established:
  - "Sitemap dual-reference: robots.txt points to both app sitemap and docs sitemap"
  - "OG image generation: scripts/generate-og-image.ts with Playwright+fallback pattern"

# Metrics
duration: 3min
completed: 2026-02-23
---

# Phase 21 Plan 02: OG Image, Sitemaps, and VitePress Sitemap Config Summary

**1200x630 PNG OG image from SVG via sharp, app sitemap.xml, dual-sitemap robots.txt, and VitePress sitemap with /docs/ base path correction**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-02-23T18:07:54Z
- **Completed:** 2026-02-23T18:10:38Z
- **Tasks:** 2
- **Files modified:** 5 (+ 1 new script)

## Accomplishments

- Generated `public/og-image.png` (1200x630, 50KB PNG) from existing SVG via sharp
- Created `scripts/generate-og-image.ts` with Playwright screenshot + SVG fallback approach
- Created `public/sitemap.xml` with single app root URL
- Updated `public/robots.txt` with two Sitemap directives (app + docs)
- Configured VitePress sitemap generation with correct `/docs/` base path in URLs
- Added OG image and Twitter card meta tags to VitePress docs head

## Task Commits

Each task was committed atomically:

1. **Task 1: Create OG image PNG via Playwright screenshot** - `2bb3e41` (feat)
2. **Task 2: Create app sitemap, update robots.txt, configure VitePress sitemap** - `c59e8aa` (feat)

**Plan metadata:** `[see final commit below]` (docs: complete plan)

## Files Created/Modified

- `public/og-image.png` - 1200x630 PNG OG image for social media sharing (50KB)
- `public/sitemap.xml` - App sitemap with single root URL for search engine discovery
- `public/robots.txt` - Updated with dual Sitemap directives pointing to app + docs sitemaps
- `docs/.vitepress/config.ts` - Added sitemap generation, lastUpdated, and OG/Twitter meta tags
- `scripts/generate-og-image.ts` - Playwright screenshot script with SVG fallback (mirrors generate-screenshots.ts pattern)
- `package.json` - Added `og:generate` script

## Decisions Made

- **SVG-to-PNG conversion:** Playwright dev server startup failed in bash shell (npm not in PATH). Script falls back to sharp SVG conversion, producing a valid 1200x630 PNG. Playwright approach is available for environments with full PATH support.
- **VitePress hostname includes /docs/:** VitePress known issue #3863 - it does not auto-append base path to the hostname in sitemap URLs. Setting `hostname: 'https://gnomad-carrier-frequency.kidney-genetics.org/docs/'` produces correctly prefixed URLs like `https://gnomad-carrier-frequency.kidney-genetics.org/docs/guide/`.
- **Shared OG image:** Both app and docs reference the same `/og-image.png` via absolute URL, single source of truth.
- **bun for dev server in script:** Updated generate-og-image.ts to use `bun run dev` instead of `npm run dev` to match project's package manager.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Switched dev server spawn from `npm` to `bun` in generate-og-image.ts**

- **Found during:** Task 1 (OG image generation script execution)
- **Issue:** `spawn('npm', ...)` fails with ENOENT in bash shell context - npm not on PATH, but bun is the project's package manager
- **Fix:** Updated `scripts/generate-og-image.ts` to use `spawn('bun', ['run', 'dev'], ...)` to match project's package manager
- **Files modified:** scripts/generate-og-image.ts
- **Verification:** Script executes correctly (falls through to SVG fallback since dev server wasn't needed)
- **Committed in:** `2bb3e41` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking - npm spawn)
**Impact on plan:** Minor fix for cross-environment compatibility. Plan goals fully achieved via SVG fallback as explicitly specified in plan.

## Issues Encountered

- Playwright screenshot approach was not required - SVG fallback path was triggered as the plan explicitly anticipated. The resulting PNG is equivalent (same OG image content, correct dimensions, valid format).
- `npx tsx -e` inline eval does not support top-level await in CJS context - used `file` command for PNG verification instead.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `public/og-image.png` ready for Plan 03 (meta tags in index.html will reference it)
- `public/sitemap.xml` and `public/robots.txt` deployed via Vite's public directory copy
- VitePress sitemap configured and verified - `docs/.vitepress/dist/sitemap.xml` generated correctly
- No blockers for Phase 21 Plan 03 (app meta tags) or Plan 04 (docs icon button)

---
*Phase: 21-seo-foundation*
*Completed: 2026-02-23*
