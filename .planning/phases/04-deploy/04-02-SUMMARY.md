---
phase: 04-deploy
plan: 02
subsystem: ci-cd
tags: [github-actions, ci, deployment, github-pages]

dependencies:
  requires: ["04-01"]
  provides: ["ci-workflow", "deploy-workflow"]
  affects: []

tech-stack:
  added: []
  patterns: ["github-actions-workflow", "github-pages-deployment"]

key-files:
  created:
    - .github/workflows/ci.yml
    - .github/workflows/deploy.yml
  modified: []

decisions: []

metrics:
  duration: "2 minutes"
  completed: "2026-01-19"
---

# Phase 04 Plan 02: CI/CD Workflows Summary

GitHub Actions CI workflow runs lint/typecheck on all branches; deploy workflow builds and publishes to GitHub Pages on main push.

## What Was Built

### CI Workflow (`.github/workflows/ci.yml`)
- **Triggers:** All branch pushes, main branch PRs
- **Jobs:** Single `lint-and-typecheck` job
- **Steps:**
  1. Checkout code (actions/checkout@v5)
  2. Setup Node LTS with npm cache (actions/setup-node@v6)
  3. Install dependencies (npm ci)
  4. Run ESLint (npm run lint)
  5. Run TypeScript check (npm run typecheck)

### Deploy Workflow (`.github/workflows/deploy.yml`)
- **Triggers:** Main branch pushes, manual workflow_dispatch
- **Permissions:** contents:read, pages:write, id-token:write
- **Concurrency:** Single deployment at a time (cancel-in-progress)
- **Steps:**
  1. Checkout code (actions/checkout@v5)
  2. Setup Node LTS with npm cache (actions/setup-node@v6)
  3. Install dependencies (npm ci)
  4. Build production bundle (npm run build)
  5. Configure GitHub Pages (actions/configure-pages@v5)
  6. Upload dist/ artifact (actions/upload-pages-artifact@v4)
  7. Deploy to Pages (actions/deploy-pages@v4)

## Implementation Notes

### Key Design Choices
- **npm ci over npm install:** Ensures deterministic builds from lock file
- **Separate lint/typecheck steps:** Clear failure identification in CI logs
- **All branches for CI:** Catch issues early before PR
- **Official actions only:** No third-party actions for security

### Actions Versions
| Action | Version |
|--------|---------|
| actions/checkout | v5 |
| actions/setup-node | v6 |
| actions/configure-pages | v5 |
| actions/upload-pages-artifact | v4 |
| actions/deploy-pages | v4 |

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 65266c2 | feat(04-02): add CI workflow for lint and typecheck |
| 2 | f9cd28d | feat(04-02): add deploy workflow for GitHub Pages |

## Verification Results

- [x] Both workflow files exist in .github/workflows/
- [x] YAML syntax valid for both files
- [x] ci.yml triggers on all branches with lint and typecheck steps
- [x] deploy.yml triggers on main with proper permissions and deploy-pages action
- [x] Both use npm ci and npm cache for efficient builds

## Deviations from Plan

None - plan executed exactly as written.

## Files Created

```
.github/
  workflows/
    ci.yml         # CI workflow for all branches
    deploy.yml     # Deploy workflow for GitHub Pages
```

## Next Steps

1. Push to GitHub to trigger workflows
2. Enable GitHub Pages in repository settings (Settings > Pages > Source: GitHub Actions)
3. First deploy workflow run will publish to https://{username}.github.io/gnomad-carrier-frequency/
