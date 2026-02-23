# Phase 19: CI/CD Integration - Context

**Gathered:** 2026-02-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Unified deployment pipeline merging the Vue app and VitePress docs into a single GitHub Pages artifact, plus automated screenshot refresh when UI changes. Custom domain is `gnomad-carrier-frequency.kidney-genetics.org` (app at root, docs at `/docs/`).

</domain>

<decisions>
## Implementation Decisions

### Unified build strategy
- Build app first (`dist/`), then build docs and copy output into `dist/docs/`
- Single artifact upload from `./dist/` — same as current deploy, just with docs added
- Standardize all workflows on **bun** (via `oven-sh/setup-bun@v2` with pinned version)
- Fix all base paths for custom domain: VitePress base from `/gnomad-carrier-frequency/docs/` to `/docs/`, verify app base stays `/`, fix any stale `/gnomad-carrier-frequency/` references in nav links

### Screenshot workflow trigger
- Separate `screenshots.yml` workflow
- Triggers on push to main when files change in: `src/**`, `public/**`, `index.html`, `package.json`, `bun.lockb`
- Auto-commits updated screenshots directly to main using `github-actions[bot]` (same pattern as ClinGen data update)
- Screenshot commit triggers a cascade deploy (does NOT use `[skip ci]` for deploy — only skips CI checks)
- Cache Playwright Chromium browsers between runs using `actions/cache`

### Workflow structure
- **Extend existing `deploy.yml`**: Add docs build + merge step (app build → docs build → copy to `dist/docs/` → upload → deploy)
- **New `screenshots.yml`**: Path-filtered trigger → build app → run Playwright → diff screenshots → auto-commit if changed
- **Update `ci.yml`**: Switch to bun, add full app build + docs build as PR checks (lint + typecheck + app build + docs build)
- **Keep `lighthouse.yml` separate**: Informational, not a deploy gate
- **Keep `update-clingen-data.yml` as-is**: Independent concern
- Deploy workflow is self-contained: includes lint + typecheck before building (doesn't trust CI having passed)
- Require CI to pass before PRs can merge to main (branch protection rules)

### Failure handling & gating
- Docs build failure blocks the entire deploy — app + docs are one artifact, both must succeed
- Screenshot workflow failure auto-creates a GitHub issue tagged 'screenshots'
- Screenshot auto-commit uses `[skip ci]` to prevent redundant CI checks on image-only changes, but allows deploy workflow to trigger (cascade deploy for fresh docs)
- Rely on GitHub's built-in email notifications for workflow failures — no custom notifications

### Claude's Discretion
- Exact bun version to pin
- Branch protection rule configuration details
- Screenshot workflow issue template content
- Cache key strategy for Playwright browsers and bun dependencies
- How to prevent infinite loops between screenshot commit and screenshot workflow re-trigger

</decisions>

<specifics>
## Specific Ideas

- ClinGen data update workflow is a good pattern to follow for screenshot auto-commits (same `github-actions[bot]` author, same commit-and-push approach)
- The `navigateFallbackDenylist: [/^\/docs/]` in PWA config already handles service worker separation — verify this works at deploy
- Current `ci` npm script in package.json already chains lint + typecheck + build + docs:build + lighthouse — align workflow with this

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 19-cicd-integration*
*Context gathered: 2026-02-23*
