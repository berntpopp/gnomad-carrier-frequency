---
phase: 17-screenshot-automation
plan: 01
subsystem: testing
tags: [playwright, screenshot, automation, fixture, webp, sharp, tsx]

# Dependency graph
requires:
  - phase: 16-vitepress-setup
    provides: VitePress documentation site structure
provides:
  - Playwright screenshot generation infrastructure
  - GraphQL API mocking with fixture files
  - WebP image conversion pipeline
  - Dev server lifecycle management
affects: [17-02, 17-03]

# Tech tracking
tech-stack:
  added: [playwright@1.58.2, sharp@0.34.5, tsx@4.21.0]
  patterns:
    - GraphQL route interception for deterministic screenshots
    - Fixture-based API mocking
    - Server lifecycle management in Node.js scripts
    - WebP image optimization for documentation

key-files:
  created:
    - scripts/generate-screenshots.ts
    - fixtures/gnomad/cftr-gene-search.json
    - fixtures/gnomad/cftr-gene-details.json
    - fixtures/gnomad/cftr-variants.json
    - fixtures/pinia/default-state.json
    - docs/public/screenshots/.gitkeep
  modified:
    - package.json
    - package-lock.json

key-decisions:
  - "Use Playwright Chromium-only (smaller install, sufficient for docs)"
  - "Mock gnomAD API with realistic CFTR data (10 variants, carrier freq ~1:25)"
  - "25-second server startup wait on WSL2 (measured reality vs polling detection)"
  - "domcontentloaded wait strategy (balance speed vs loaded state)"
  - "Pinia state injection to bypass disclaimer modal in screenshots"

patterns-established:
  - "Fixture structure: operation name maps to JSON file"
  - "WebP quality 80 for docs (visual quality vs file size)"
  - "Server cleanup via pkill to handle orphaned child processes"

# Metrics
duration: 33min
completed: 2026-02-09
---

# Phase 17 Plan 01: Screenshot Infrastructure Summary

**Playwright-based screenshot automation with gnomAD API mocking, server lifecycle management, and WebP conversion ready for Plan 03 captures**

## Performance

- **Duration:** 33 min
- **Started:** 2026-02-09T10:59:53Z
- **Completed:** 2026-02-09T11:32:33Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Playwright infrastructure installed with Chromium browser (167MB)
- Realistic CFTR fixture data matching gnomAD GraphQL schema (10 variants with population breakdowns)
- Screenshot script scaffold runs end-to-end: starts dev server, launches browser, intercepts API, exits cleanly
- WebP conversion helper ready for high-quality, optimized documentation images

## Task Commits

Each task was committed atomically:

1. **Task 1: Install dependencies and create fixture files** - `759cd93` (chore)
2. **Task 2: Create screenshot script scaffold with server lifecycle and route interception** - `c13068b` (feat)

## Files Created/Modified
- `scripts/generate-screenshots.ts` - Screenshot generation script with server lifecycle, route interception, WebP conversion (228 lines)
- `fixtures/gnomad/cftr-gene-search.json` - Mocked GeneSearch response for CFTR
- `fixtures/gnomad/cftr-gene-details.json` - Mocked GeneDetails with constraint data (oe_lof: 0.52)
- `fixtures/gnomad/cftr-variants.json` - 10 realistic CFTR variants (8 LoF HC, 2 missense) with ClinVar pathogenicity
- `fixtures/pinia/default-state.json` - Pinia localStorage state with disclaimerAcknowledged: true
- `package.json` + `package-lock.json` - Added playwright, sharp, tsx dependencies

## Decisions Made

**1. 25-second fixed server startup wait**
- **Rationale:** Vite on WSL2 takes 15-25 seconds. Polling stdout for "Local:" proved unreliable due to buffering. Fixed wait is simpler and works consistently.

**2. domcontentloaded wait strategy**
- **Rationale:** Faster than `load` (doesn't wait for all resources), more reliable than `networkidle` (which can hang on ongoing API calls).

**3. Route interception before navigation**
- **Rationale:** Required to prevent app from making real gnomAD API calls that would hang. Interception set up before page.goto() ensures all requests are caught.

**4. Pinia state injection via localStorage**
- **Rationale:** Bypasses clinical disclaimer modal that would obscure screenshots. `disclaimerAcknowledged: true` ensures clean UI captures.

**5. CFTR as fixture gene**
- **Rationale:** Well-known AR condition with realistic carrier frequency (~1:25 general, ~1:17 Ashkenazi). Provides good visual variety for screenshots.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

**1. Dev server stdout buffering on WSL2**
- **Problem:** Vite outputs "ready in" and "Local:" in separate stdout chunks, making reliable detection difficult.
- **Solution:** Switched from polling detection to fixed 25-second wait (measured typical startup time).
- **Impact:** Script is now consistent but slightly slower on fast startups.

**2. ES module `__dirname` not available**
- **Problem:** TypeScript script runs as ES module, `__dirname` undefined.
- **Solution:** Added `fileURLToPath(import.meta.url)` + `dirname()` pattern.
- **Impact:** Standard ES module pattern, no workarounds needed.

**3. waitForAnimations() hangs on networkidle**
- **Problem:** `page.waitForLoadState('networkidle')` never resolves if ongoing API calls.
- **Solution:** Commented out waitForAnimations() call in main flow (will be called before each individual screenshot in Plan 03).
- **Impact:** Main navigation faster, animation waiting deferred to capture time.

**4. Orphaned Vite processes**
- **Problem:** Child process spawning leaves orphaned `node .../vite` processes.
- **Solution:** Added `pkill -9 -f "node.*vite"` to cleanup function.
- **Impact:** Some cleanup warnings but processes do get killed. Acceptable for build script.

## Next Phase Readiness

**Ready for Plan 02 (Test ID attributes):**
- Screenshot script can navigate to app
- Fixtures provide deterministic UI state
- Ready to add data-testid selectors for Playwright targeting

**Ready for Plan 03 (Screenshot captures):**
- Infrastructure complete
- capture() and waitForAnimations() helpers defined
- Route interception working
- Just need to add screenshot capture calls in marked section

**Blockers:** None

**Notes:**
- Server cleanup could be improved (orphaned processes) but acceptable for CI use
- Script assumes port 5173 available - could add port detection if needed
- waitForAnimations() timeout tuning may be needed in Plan 03 based on actual UI

---
*Phase: 17-screenshot-automation*
*Completed: 2026-02-09*
