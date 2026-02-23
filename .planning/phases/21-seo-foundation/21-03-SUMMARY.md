---
phase: 21-seo-foundation
plan: 03
subsystem: seo
tags: [structured-data, json-ld, schema-org, open-graph, twitter-card, faq, bilingual]

# Dependency graph
requires:
  - phase: 21-02
    provides: og-image.png generated at /og-image.png, absolute URL established
provides:
  - Expanded JSON-LD @graph with WebApplication (v1.3.0, dateModified, screenshot) + 2 FAQPage objects (en/de)
  - OG and Twitter meta tags corrected to absolute HTTPS PNG URL
  - 19 structured FAQ questions for featured snippet eligibility in English and German
affects: [22-cta-a11y, 23-onboarding-polish, 24-docs-content]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Bilingual FAQPage: two separate FAQPage objects with inLanguage attribute, not translations but independent search-optimized Q&As"
    - "WebApplication schema versioned: softwareVersion + dateModified kept in sync with package.json on each release"

key-files:
  created: []
  modified:
    - index.html

key-decisions:
  - "German FAQ uses natural German with ASCII-safe characters (no umlauts) to avoid HTML encoding issues in JSON-LD"
  - "German FAQ is not a direct translation but targets distinct German-language clinical search queries"
  - "English FAQ has 10 questions, German FAQ has 9 questions (both satisfy >= 8 minimum)"

patterns-established:
  - "FAQPage structured data: keep inLanguage attribute per FAQ block to signal language to Google"
  - "OG image: always use absolute HTTPS URLs in meta tags, never relative paths"

# Metrics
duration: 12min
completed: 2026-02-23
---

# Phase 21 Plan 03: Structured Data & OG Tags Summary

**Bilingual FAQPage JSON-LD schema (10 en + 9 de Q&As) and absolute-URL PNG OG image meta tags in index.html for featured snippet eligibility**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-02-23T00:00:00Z
- **Completed:** 2026-02-23T00:12:00Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- OG and Twitter meta tags updated from relative SVG (`./og-image.svg`) to absolute HTTPS PNG URL, with added `og:image:type`, `og:image:alt`, `og:site_name`, and `twitter:image:alt`
- JSON-LD `@graph` expanded from 2 to 3 items: WebApplication (updated version 1.3.0, dateModified, screenshot) + English FAQPage (10 Q&As) + German FAQPage (9 Q&As)
- FAQ content covers methodology (Hardy-Weinberg), carrier vs. prevalence, recurrence risk, population selection, variant exclusion, clinical use disclaimers, privacy (browser-only), and limitations -- in both languages

## Task Commits

Each task was committed atomically:

1. **Task 1: Update OG and Twitter meta tags to PNG with absolute URLs** - `dece61f` (feat)
2. **Task 2: Expand JSON-LD structured data with bilingual FAQPage** - `d8115d4` (feat)

**Plan metadata:** _(see final commit below)_

## Files Created/Modified
- `index.html` - OG/Twitter meta tags corrected; JSON-LD @graph expanded with WebApplication fields and two FAQPage objects

## Decisions Made
- German FAQ uses natural German phrasing targeting clinical search queries rather than direct translations of the English FAQ; this better serves German-speaking clinicians who use different terminology (e.g., "Heterozygotenfrequenz" vs "carrier frequency")
- Used ASCII-transliterated German in JSON-LD strings (e.g., "oe" instead of "o-umlaut") to avoid potential encoding issues in the JSON-LD script block embedded in HTML

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- `bun` not available in bash PATH for build verification; used `npm run build` instead. Build succeeded with Node.js 20.16.0 (minor version warning from Vite, not an error).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 21 (SEO Foundation) is now fully complete: all 4 plans delivered
- Phase 22 (CTA Color & Accessibility) is ready to begin
- The structured data and OG tags require no further maintenance until a version bump

---
*Phase: 21-seo-foundation*
*Completed: 2026-02-23*
