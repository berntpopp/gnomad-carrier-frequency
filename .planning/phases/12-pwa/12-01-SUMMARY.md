---
phase: 12-pwa
plan: 01
subsystem: infra
tags: [pwa, vite-plugin-pwa, workbox, service-worker, manifest, caching]

# Dependency graph
requires:
  - phase: 06-app-shell
    provides: Favicon and app branding for PWA icons
provides:
  - VitePWA plugin configuration
  - Web manifest with app metadata
  - Service worker with Workbox caching
  - PWA icons at required sizes
  - TypeScript declarations for PWA APIs
affects: [12-02-PLAN (PWA UI), 12-03-PLAN (install prompt)]

# Tech tracking
tech-stack:
  added: [vite-plugin-pwa, workbox]
  patterns: [NetworkFirst caching for API, prompt-based update strategy]

key-files:
  created:
    - public/icons/pwa-192x192.png
    - public/icons/pwa-512x512.png
    - public/icons/maskable-512x512.png
    - public/icons/apple-touch-icon-180x180.png
  modified:
    - vite.config.ts
    - src/vite-env.d.ts
    - package.json

key-decisions:
  - "NetworkFirst for gnomAD/ClinGen API caching with 24h expiration"
  - "registerType: 'prompt' for user-controlled updates"
  - "Inkscape-generated PNG icons from SVG favicon"
  - "Maskable icon with 10% safe zone and RequiForm background"

patterns-established:
  - "Runtime caching pattern: NetworkFirst with separate cache names per API"
  - "Icon generation: Inkscape CLI for SVG to PNG conversion"

# Metrics
duration: 3min
completed: 2026-01-19
---

# Phase 12 Plan 01: PWA Infrastructure Summary

**vite-plugin-pwa configured with web manifest, Workbox service worker caching gnomAD/ClinGen APIs, and PNG icons generated from SVG favicon**

## Performance

- **Duration:** 3 min
- **Started:** 2026-01-19T22:44:20Z
- **Completed:** 2026-01-19T22:47:21Z
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments
- VitePWA plugin configured with complete web manifest (name, icons, display mode)
- Service worker with Workbox caching: app shell static assets + runtime API caching
- gnomAD and ClinGen APIs cached with NetworkFirst strategy, 24-hour expiration
- PWA icons generated from favicon.svg: 192x192, 512x512, maskable 512x512, apple-touch-icon 180x180
- TypeScript declarations for BeforeInstallPromptEvent and PWA client APIs

## Task Commits

Each task was committed atomically:

1. **Task 1: Install PWA dependencies and generate icons** - `1633116` (feat)
2. **Task 2: Configure vite-plugin-pwa with manifest and caching** - `6c74c4b` (feat)
3. **Task 3: Add TypeScript declarations for PWA APIs** - `529cef0` (feat)

## Files Created/Modified
- `package.json` - Added vite-plugin-pwa dev dependency
- `vite.config.ts` - VitePWA plugin configuration with manifest and Workbox
- `src/vite-env.d.ts` - PWA type declarations (BeforeInstallPromptEvent)
- `public/icons/pwa-192x192.png` - Standard PWA icon 192x192
- `public/icons/pwa-512x512.png` - Standard PWA icon 512x512
- `public/icons/maskable-512x512.png` - Maskable icon with safe zone
- `public/icons/apple-touch-icon-180x180.png` - iOS icon
- `public/icons/maskable-source.svg` - Source SVG for maskable icon generation

## Decisions Made
- **NetworkFirst for API caching** - APIs need fresh data when online, cached data acceptable when offline
- **registerType: 'prompt'** - Per CONTEXT.md, user decides when to update (never auto-update)
- **Inkscape for icon generation** - Available on system, reliable SVG to PNG conversion
- **Maskable icon with RequiForm background (#a09588)** - Consistent branding, white text for contrast
- **Separate cache names per API** - gnomad-api-cache and clingen-api-cache for independent cache management

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- **bun not available** - Plan specified bun but npm was available; used npm install instead (equivalent outcome)
- **Icon generation approach** - Used Inkscape CLI directly instead of sharp/@vite-pwa/assets-generator as Inkscape was available on system

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- PWA infrastructure complete, ready for Plan 02 (update UI, offline indicator)
- Service worker registers and caches assets on production build
- Web manifest validated in build output (dist/manifest.webmanifest)
- TypeScript types ready for composable development in Plan 02

---
*Phase: 12-pwa*
*Completed: 2026-01-19*
