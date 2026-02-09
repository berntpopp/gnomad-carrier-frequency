---
phase: 16
plan: 01
subsystem: documentation-infrastructure
tags: [vitepress, documentation, build-tooling, pwa, makefile]
requires: [vite-7, vue-3, pwa-v1.2]
provides: [vitepress-foundation, docs-build-pipeline, brand-theme, pwa-coexistence]
affects: [phase-17-screenshots, phase-18-content, phase-19-ci-cd]
tech-stack:
  added: [vitepress@next]
  patterns: [vitepress-config, theme-customization, multi-sidebar]
key-files:
  created:
    - docs/.vitepress/config.ts
    - docs/.vitepress/theme/index.ts
    - docs/.vitepress/theme/custom.css
  modified:
    - vite.config.ts
    - .gitignore
    - package.json
    - Makefile
key-decisions:
  - decision: "VitePress alpha for Vite 7 compatibility"
    rationale: "Project uses Vite 7.2.4, VitePress stable doesn't support it yet"
    impact: "Using @next version until stable release"
  - decision: "PWA navigateFallbackDenylist for /docs/ path"
    rationale: "Prevents service worker from intercepting VitePress routes"
    impact: "Docs and app can coexist in merged deployment"
  - decision: "Brand color #a09588 for both light and dark modes"
    rationale: "Matches main app RequiForm palette"
    impact: "Consistent visual identity across app and docs"
duration: 5 minutes
completed: 2026-02-09
---

# Phase 16 Plan 01: VitePress Infrastructure Setup Summary

**One-liner:** VitePress alpha foundation with brand theming, PWA coexistence, and complete build tooling (npm scripts + Makefile).

## Performance

- **Duration:** 5 minutes
- **Tasks completed:** 2/2
- **Commits:** 2 (atomic per task)
- **No blockers encountered**

## Accomplishments

Established complete VitePress documentation infrastructure with:

1. **VitePress Installation & Configuration**
   - Installed vitepress@next (v2.0.0-alpha.16) for Vite 7 compatibility
   - Created comprehensive site config with navigation, multi-sidebar, local search
   - Theme extends default with brand color CSS overrides
   - Base path: `/gnomad-carrier-frequency/docs/` for GitHub Pages deployment

2. **Theme Customization**
   - Light mode: #a09588 brand color (matches main app)
   - Dark mode: #c0b5a8 brand color variant
   - Minimal custom CSS approach (CSS variables only)

3. **PWA Coexistence**
   - Added `navigateFallbackDenylist: [/^\/docs/]` to workbox config
   - Prevents service worker from intercepting docs routes
   - Enables merged deployment (app at root, docs at /docs/)

4. **Build Pipeline Integration**
   - npm scripts: `docs:dev`, `docs:build`, `docs:preview`
   - Updated `ci` script to include `docs:build`
   - Makefile targets: `docs`, `docs-dev`, `docs-preview`, `screenshots` (placeholder)
   - Documentation section added to `make help` output

5. **Development Infrastructure**
   - VitePress cache and dist directories gitignored
   - Build verified working (completes in ~20s)
   - Ready for content pages in Phase 18

## Task Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Install VitePress and create site configuration with theme | 6627f75 | package.json, docs/.vitepress/config.ts, docs/.vitepress/theme/index.ts, docs/.vitepress/theme/custom.css |
| 2 | Add PWA denylist, gitignore entries, package.json scripts, and Makefile targets | 23d35a3 | vite.config.ts, .gitignore, package.json, Makefile |

## Files Created

- `docs/.vitepress/config.ts` — VitePress site configuration with nav, sidebar, search, social links
- `docs/.vitepress/theme/index.ts` — Theme entry extending default with custom CSS
- `docs/.vitepress/theme/custom.css` — Brand color CSS variable overrides

## Files Modified

- `vite.config.ts` — Added `navigateFallbackDenylist: [/^\/docs/]` to workbox config
- `.gitignore` — Added VitePress cache and dist exclusions
- `package.json` — Added docs:dev/build/preview scripts, updated ci script
- `Makefile` — Added Documentation section with docs/docs-dev/docs-preview/screenshots targets

## Decisions Made

### VitePress Alpha Version

**Decision:** Use vitepress@next instead of stable version.

**Context:** Project uses Vite 7.2.4, which VitePress stable (v1.x) doesn't support. VitePress 2.0.0-alpha has Vite 7 compatibility.

**Impact:** Using alpha version until stable 2.0 release. May need version bump in future, but API is stable.

### PWA Service Worker Denylist

**Decision:** Add navigateFallbackDenylist for /docs/ path in workbox config.

**Context:** PWA service worker's navigateFallback intercepts all routes, which would break VitePress routing for docs site.

**Impact:** Service worker now excludes /docs/ paths, allowing VitePress to handle docs routing independently. Enables merged deployment artifact.

### Brand Color Consistency

**Decision:** Use #a09588 (RequiForm palette) for VitePress brand color, with #c0b5a8 dark mode variant.

**Context:** Main app uses #a09588 as primary brand color. Documentation should match for visual consistency.

**Impact:** Consistent identity across app and docs. Dark mode variant tested to ensure good contrast and readability.

### Makefile Documentation Targets

**Decision:** Add dedicated Documentation section to Makefile with docs/docs-dev/docs-preview/screenshots targets.

**Context:** Project follows Makefile-first workflow for all operations. Documentation build tooling should integrate.

**Impact:** Developers can use familiar `make docs` commands. CI pipeline uses `make ci` which now includes docs build.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None. VitePress installation completed successfully, build works without errors.

## Next Phase Readiness

**Phase 17 (Screenshot Automation):**
- VitePress infrastructure ready
- `make screenshots` placeholder target exists
- Playwright will need to navigate docs site for screenshots

**Phase 18 (Documentation Content):**
- VitePress foundation complete
- Sidebar structure defined in config (Guide, Use Cases, Reference, About)
- Content pages can be added directly to docs/ directory

**Phase 19 (CI/CD Integration):**
- `npm run ci` already includes `docs:build`
- Makefile `ci` target delegates to npm script
- GitHub Actions can use existing CI pipeline

**Blockers:** None.

**Concerns:** None. Alpha version is stable enough for development.

## Technical Notes

### VitePress Configuration Structure

```
docs/
├── .vitepress/
│   ├── config.ts          # Site config (nav, sidebar, search)
│   ├── theme/
│   │   ├── index.ts       # Theme entry (extends default)
│   │   └── custom.css     # Brand color overrides
│   ├── cache/             # Build cache (gitignored)
│   └── dist/              # Build output (gitignored)
└── [content pages added in Phase 18]
```

### Multi-Sidebar Structure

VitePress config defines 4 sidebar groups:
- `/guide/` — Introduction, Getting Started
- `/use-cases/` — Overview, Carrier Screening, Family Planning, Clinical Letter
- `/reference/` — Overview, Methodology, Data Sources, Filters, Templates
- `/about/` — Overview, Citation, Changelog

Each section has hierarchical items array for nested navigation.

### Build Performance

- Initial build: ~20 seconds
- No content pages yet (Phase 18 adds them)
- Build includes client + server bundles, page rendering

### Navigation Pattern

- "Open Calculator" nav link points to `/gnomad-carrier-frequency/` (app root)
- Opens in new tab (target: _blank)
- Allows users to access calculator without leaving docs context
