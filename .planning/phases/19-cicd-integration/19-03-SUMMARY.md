---
phase: 19-cicd-integration
plan: 03
subsystem: infra
tags: [github-actions, github-pages, deployment, pat, verification]

# Dependency graph
requires:
  - plan: 19-01
    provides: Base path fixes and unified deploy workflow
  - plan: 19-02
    provides: CI workflow and screenshot automation workflow
---

# Summary: PAT Secret Setup + E2E Deployment Verification

## What was done

### Task 1: SCREENSHOTS_TOKEN repository secret
- Created fine-grained PAT (`screenshots-cascade-deploy`) scoped to `berntpopp/gnomad-carrier-frequency` with Contents read/write permission
- Added as repository secret `SCREENSHOTS_TOKEN` in repo Settings -> Secrets -> Actions
- This enables cascade deploys: screenshot auto-commits push with PAT, triggering deploy.yml

### Task 2: E2E Deployment Verification
- PR #13 merged `feature/v1.3-documentation` -> `main`
- Deploy workflow (run #22311800736) completed successfully in 45s
- All deploy steps verified: Build app, Build docs, Merge docs into artifact, Deploy to GitHub Pages
- **App URL**: https://gnomad-carrier-frequency.kidney-genetics.org/ — loads correctly
- **Docs URL**: https://gnomad-carrier-frequency.kidney-genetics.org/docs/ — VitePress site with all 4 sections, 16 indexed pages
- CI workflow includes Build app + Build docs steps
- Screenshots workflow registered in Actions tab

## Decisions
- PAT expiration set to 90 days (standard fine-grained token policy)
- robots.txt added to fix Lighthouse SEO score (was 0.91, now passes >=0.95 threshold)
- ESLint config updated to ignore VitePress cache/dist directories

## Deviations
- Added `public/robots.txt` during pre-PR validation (not in original plan scope but required for Lighthouse SEO pass)
- Added VitePress cache/dist to ESLint ignores (generated files were causing lint failures)
- Removed unused `context` parameter from `captureFeatureScreenshots` function (lint error)

## Artifacts
- Repository secret: `SCREENSHOTS_TOKEN` (fine-grained PAT)
- Deployed app: https://gnomad-carrier-frequency.kidney-genetics.org/
- Deployed docs: https://gnomad-carrier-frequency.kidney-genetics.org/docs/

## Task log
| # | Task | Status | Commit |
|---|------|--------|--------|
| 1 | Create SCREENSHOTS_TOKEN repository secret | ✓ | (manual GitHub UI action) |
| 2 | E2E deployment verification | ✓ | (verified via deploy run #22311800736) |
