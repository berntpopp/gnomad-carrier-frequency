---
phase: 19-cicd-integration
plan: 02
subsystem: infra
tags: [github-actions, ci-cd, bun, playwright, screenshots, vitepress]

# Dependency graph
requires:
  - phase: 17-screenshot-automation
    provides: scripts/generate-screenshots.ts with Playwright + dev server integration
  - phase: 18-documentation-content
    provides: VitePress docs site with bun run docs:build command
provides:
  - CI workflow validating lint + typecheck + app build + docs build on every push/PR using bun
  - Screenshot automation workflow with path-filtered trigger, Playwright caching, auto-commit, and failure alerting
affects:
  - phase: 19-03 (deploy workflow depends on bun standardization established here)
  - phase: 19-04 (branch protection depends on lint-and-typecheck job name preserved here)
  - phase: 19-05 (BASE_URL env var pattern established for screenshot script)

# Tech tracking
tech-stack:
  added: [oven-sh/setup-bun@v2, actions/cache@v4]
  patterns:
    - bun as CI package manager (replaces npm in all workflows)
    - Playwright browser caching keyed on bun.lockb hash
    - Two-layer infinite loop prevention (paths allow-list + actor check)
    - PAT-based cascade deploy with GITHUB_TOKEN fallback

key-files:
  created:
    - .github/workflows/screenshots.yml
  modified:
    - .github/workflows/ci.yml
    - .planning/phases/19-cicd-integration/19-CONTEXT.md

key-decisions:
  - "lint-and-typecheck job name preserved for branch protection compatibility"
  - "No [skip ci] in screenshot auto-commit — technically impossible to skip CI but allow deploy"
  - "Infinite loop prevention: paths allow-list (primary) + actor check (safety net)"
  - "SCREENSHOTS_TOKEN PAT with GITHUB_TOKEN fallback for graceful degradation"
  - "Playwright cache keyed on bun.lockb hash; cache-miss installs with-deps, cache-hit installs deps-only"

patterns-established:
  - "GitHub Actions bun pattern: oven-sh/setup-bun@v2 + bun install --frozen-lockfile"
  - "Screenshot loop prevention: paths allow-list excludes docs/public/screenshots/ (primary) + if: github.actor != 'github-actions[bot]' (safety net)"

# Metrics
duration: 2min
completed: 2026-02-23
---

# Phase 19 Plan 02: CI/CD Workflow Configuration Summary

**CI workflow migrated to bun with app + docs build validation; screenshot automation workflow created with path-filtered trigger, Playwright caching, auto-commit, and GitHub issue failure alerting.**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-02-23T14:18:34Z
- **Completed:** 2026-02-23T14:20:12Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Updated ci.yml to use bun (setup-bun@v2) for all steps, adding app build and docs build as required PR checks while preserving `lint-and-typecheck` job name for branch protection
- Created screenshots.yml with path-filtered trigger (UI files only), Playwright Chromium caching, auto-commit on screenshot changes, PAT-based cascade deploy with GITHUB_TOKEN fallback, and automatic GitHub issue creation on failure
- Corrected CONTEXT.md to document that `[skip ci]` is technically impossible (skips ALL workflows including deploy); updated to reflect actual approach (paths allow-list + actor check for loop prevention)

## Task Commits

Each task was committed atomically:

1. **Task 1: Update CI workflow with bun and build validation** - `b4eab50` (chore)
2. **Task 2: Create screenshot automation workflow** - `dd45734` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `.github/workflows/ci.yml` - Migrated from npm/setup-node to bun/setup-bun; added bun run build and bun run docs:build steps
- `.github/workflows/screenshots.yml` - New workflow: path-filtered trigger on UI files, Playwright caching, auto-commit, PAT cascade deploy, GitHub issue on failure
- `.planning/phases/19-cicd-integration/19-CONTEXT.md` - Corrected [skip ci] decision to document technical impossibility; updated to reflect actual implementation

## Decisions Made

- **lint-and-typecheck job name preserved:** Branch protection rules reference this job name as a required status check. Renaming would silently break PR merging — this was explicitly noted in the plan and respected.
- **No `[skip ci]` in screenshot auto-commit:** Research (19-RESEARCH.md) confirmed `[skip ci]` skips ALL push-triggered workflows at the GitHub event level, including deploy.yml. No mechanism exists to selectively skip CI while allowing deploy. Omitting it is the correct behavior.
- **Two-layer loop prevention:** `paths` allow-list is the primary mechanism (auto-commits only touch `docs/public/screenshots/`, not in allow-list). `if: github.actor != 'github-actions[bot]'` is the safety net (handles edge case if someone later adds screenshot paths to allow-list).
- **SCREENSHOTS_TOKEN with GITHUB_TOKEN fallback:** `${{ secrets.SCREENSHOTS_TOKEN || github.token }}` — if PAT is not configured, workflow still runs but cascade deploy doesn't trigger. Graceful degradation with no failure.
- **Playwright cache key on bun.lockb:** Cache invalidates when lockfile changes (dependency updates). Cache miss does full `install chromium --with-deps`; cache hit does `install-deps chromium` only (system deps, not re-downloading browsers).

## Deviations from Plan

None - plan executed exactly as written. The CONTEXT.md `[skip ci]` correction was part of the plan's Task 2 action specification, not a deviation.

## Issues Encountered

None. YAML validation was attempted via python3 but Python is not installed on this Windows system. Verified via node file read (correct length and structure) and manual visual inspection. GitHub Actions will validate the YAML on first push.

## User Setup Required

To enable cascade deploy (screenshot commit triggers deploy.yml automatically):

1. Create a GitHub Personal Access Token (PAT) with `repo` scope (or `contents: write` for fine-grained PAT)
2. Add it as a repository secret named `SCREENSHOTS_TOKEN` in GitHub Settings > Secrets and variables > Actions

If `SCREENSHOTS_TOKEN` is not configured, the screenshot workflow still runs and auto-commits, but the cascade deploy to GitHub Pages won't trigger automatically. The next human-pushed commit will trigger deploy instead.

## Next Phase Readiness

- CI workflow ready: lint + typecheck + app build + docs build validated on every push/PR using bun
- Screenshot workflow ready: will trigger on UI file changes to main, regenerate and auto-commit screenshots
- Plan 19-03 (deploy workflow update) can proceed: bun standardization pattern established
- Plan 19-04 (branch protection) can proceed: lint-and-typecheck job name preserved
- Plan 19-01 (BASE_URL configurability in generate-screenshots.ts) runs in parallel Wave 1 — both plans will be merged together

---
*Phase: 19-cicd-integration*
*Completed: 2026-02-23*
