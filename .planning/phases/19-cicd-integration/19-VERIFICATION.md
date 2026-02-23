---
phase: 19-cicd-integration
verified: 2026-02-23T16:00:00Z
status: passed
score: 5/5 must-haves verified
gaps: []
human_verification:
  - test: Confirm app loads at https://gnomad-carrier-frequency.kidney-genetics.org/
    expected: Vue app renders fully no 404s no broken assets
    why_human: Cannot verify live URL from static code analysis - confirmed by deploy author PR 13 run 22311800736
  - test: Confirm docs load at https://gnomad-carrier-frequency.kidney-genetics.org/docs/
    expected: VitePress site renders with 4 nav sections Open Calculator link opens app favicon loads
    why_human: Cannot verify live URL from static code analysis - confirmed by deploy author PR 13 run 22311800736
  - test: Confirm SCREENSHOTS_TOKEN PAT is configured in repository secrets
    expected: Secret exists in repo Settings Secrets Actions; cascade deploy enabled
    why_human: Repository secrets cannot be read via static code analysis; confirmed by deploy author in 19-03-SUMMARY.md
---

# Phase 19: CI/CD Integration Verification Report

**Phase Goal:** Unified deployment pipeline merging the Vue app and VitePress docs into a single GitHub Pages artifact with automated screenshot refresh when UI changes
**Verified:** 2026-02-23T16:00:00Z
**Status:** passed
**Re-verification:** No - initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | Push to main triggers deploy workflow that builds both app and docs into a single artifact | VERIFIED | deploy.yml triggers on push to main + workflow_dispatch; has bun run build bun run docs:build cp -r docs/.vitepress/dist dist/docs; artifact from ./dist |
| 2 | App accessible at custom domain root docs at /docs/ | VERIFIED (human-confirmed) | VitePress base /docs/ in config.ts line 7; deploy.yml merges docs into dist/docs; PR 13 triggered run 22311800736 per 19-03-SUMMARY |
| 3 | Screenshot workflow triggers on UI component changes and auto-commits | VERIFIED | screenshots.yml has paths allowlist (src/** public/** index.html package.json bun.lockb); auto-commit to docs/public/screenshots/ with bot author |
| 4 | Screenshot workflow does not re-trigger itself | VERIFIED | Two-layer prevention: (1) paths allowlist excludes docs/public/screenshots/; (2) job-level if: github.actor != github-actions[bot] safety net |
| 5 | Both sites render correctly post-deployment with no 404s or broken assets | VERIFIED (human-confirmed) | No stale /gnomad-carrier-frequency/ path refs; favicon /favicon.svg absolute; deploy author confirmed both URLs in 19-03-SUMMARY |

**Score:** 5/5 truths verified
### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| .github/workflows/deploy.yml | Unified deploy workflow building app + docs | VERIFIED | 57 lines; 7 bun references; bun run build + bun run docs:build + cp merge step; no npm; correct permissions/concurrency/actions versions |
| .github/workflows/ci.yml | CI validation with bun and full build | VERIFIED | 31 lines; job name lint-and-typecheck preserved for branch protection; oven-sh/setup-bun@v2; bun run build + bun run docs:build; no npm no setup-node |
| .github/workflows/screenshots.yml | Screenshot automation workflow | VERIFIED | 93 lines; path-filtered trigger on 5 UI path patterns; Playwright caching via actions/cache@v4; auto-commit with bot author; SCREENSHOTS_TOKEN PAT + GITHUB_TOKEN fallback; gh issue create on failure |
| docs/.vitepress/config.ts | VitePress config with correct base path | VERIFIED | base: /docs/ (line 7); favicon href: /favicon.svg (line 12); Open Calculator uses absolute URL https://gnomad-carrier-frequency.kidney-genetics.org/ (line 22); zero stale /gnomad-carrier-frequency/ path refs |
| docs/index.md | Landing page with correct hero link | VERIFIED | Hero action link: https://gnomad-carrier-frequency.kidney-genetics.org/ (line 11); no stale base path references |
| scripts/generate-screenshots.ts | Configurable BASE_URL for CI | VERIFIED | Line 28: process.env.BASE_URL OR http://localhost:5173/; env var explicitly set in screenshots.yml (line 53) |
| package.json | Bun version pinning via packageManager field | VERIFIED | Line 6: packageManager: bun@1.3.9; docs:build script present (line 15) |
| lighthouserc.json | Correct localhost URL (no old base path) | VERIFIED | URL: http://localhost:4173/; bun run preview as startServerCommand |
| lighthouserc.local.json | Correct localhost URL with bun | VERIFIED | URL: http://localhost:4173/; bun run preview as startServerCommand |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| .github/workflows/deploy.yml | dist/docs (merged artifact) | cp -r docs/.vitepress/dist dist/docs | WIRED | Line 44 - merge step runs after both builds succeed; artifact uploaded from ./dist |
| docs/.vitepress/config.ts | /docs/ URL namespace | base: /docs/ | WIRED | Line 7; Open Calculator uses absolute URL to correctly exit VitePress context |
| .github/workflows/screenshots.yml | scripts/generate-screenshots.ts | bunx tsx scripts/generate-screenshots.ts | WIRED | Line 51 - script invoked with BASE_URL env var (line 53); script reads process.env.BASE_URL (script line 28) |
| .github/workflows/screenshots.yml | docs/public/screenshots/ | git add docs/public/screenshots/ | WIRED | Line 65 - only this directory staged; diff-checked (line 58); NOT in trigger paths allowlist (loop prevention) |
| .github/workflows/ci.yml | bun run build + bun run docs:build | job steps | WIRED | Lines 27 30 - both builds run as required PR check under preserved job name lint-and-typecheck |
| .github/workflows/deploy.yml | oven-sh/setup-bun@v2 | packageManager in package.json | WIRED | setup-bun@v2 reads packageManager: bun@1.3.9 automatically; no explicit bun-version input needed |
### Requirements Coverage

| Requirement | Status | Notes |
|-------------|--------|-------|
| CICD-01: Deploy workflow builds both app and docs | SATISFIED | deploy.yml has bun run build + bun run docs:build with lint/typecheck quality gates before building |
| CICD-02: Merged artifact with app at root docs at /docs/ | SATISFIED | cp merge step + VitePress base /docs/ + artifact uploaded from ./dist |
| CICD-03: Screenshot workflow with path-filtered trigger | SATISFIED | screenshots.yml triggers on src/** public/** index.html package.json bun.lockb push to main only |
| CICD-04: Screenshot auto-commit with cascade deploy | SATISFIED | Auto-commit uses github-actions[bot] author; SCREENSHOTS_TOKEN PAT for cascade deploy; GITHUB_TOKEN fallback for graceful degradation |
| CICD-05: Both sites verified working post-deployment | SATISFIED (human) | Deploy run 22311800736 succeeded; deploy author confirmed both URLs working in 19-03-SUMMARY.md |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| scripts/generate-screenshots.ts | 52 | spawn(npm run dev) - uses npm instead of bun internally | INFO | npm pre-installed on ubuntu-latest runners; documented as acceptable in 19-02-PLAN.md; not a blocker |

No blocker or warning-level anti-patterns found in any workflow file.

### Human Verification Required

#### 1. App URL Accessibility

**Test:** Visit https://gnomad-carrier-frequency.kidney-genetics.org/
**Expected:** Vue SPA loads fully, gene search works, no 404s in browser network tab, no broken assets
**Why human:** Cannot verify live URL from static code analysis. Deploy author confirmed in 19-03-SUMMARY.md (run #22311800736). A fresh spot-check is recommended.

#### 2. Docs URL Accessibility

**Test:** Visit https://gnomad-carrier-frequency.kidney-genetics.org/docs/
**Expected:** VitePress site loads with Guide/Use Cases/Reference/About navigation, favicon visible, Open Calculator nav link opens app in new tab, screenshots render on docs pages
**Why human:** Cannot verify live URL from static code analysis. Deploy author confirmed in 19-03-SUMMARY.md (run #22311800736). A fresh spot-check is recommended.

#### 3. SCREENSHOTS_TOKEN Secret

**Test:** Check GitHub repo Settings -> Secrets and variables -> Actions for SCREENSHOTS_TOKEN
**Expected:** Secret SCREENSHOTS_TOKEN exists (PAT screenshots-cascade-deploy with Contents read/write on this repo)
**Why human:** Repository secrets cannot be read via static code analysis. Confirmed configured in 19-03-SUMMARY.md Task 1.

### Gaps Summary

No gaps. All 5 observable truths are verified. All required artifacts exist and are correctly wired. All 5 requirements (CICD-01 through CICD-05) are satisfied.

Three items require human confirmation for complete assurance (live URL accessibility and PAT secret existence), but these were all confirmed by the deploy author in 19-03-SUMMARY.md during actual deployment and cannot be confirmed further through static analysis.

The only notable finding is that scripts/generate-screenshots.ts spawns npm run dev internally rather than bun run dev. This is INFO-level: it works on ubuntu-latest CI runners where npm is pre-installed, and it was explicitly documented as acceptable in 19-02-PLAN.md.

Two additional artifacts confirmed present beyond the original must_haves:

- public/robots.txt - Added during pre-PR Lighthouse validation (User-agent: * / Allow: /). Correct and complete.
- ESLint config updated to ignore VitePress cache/dist directories - prevents lint errors on generated files.

---

_Verified: 2026-02-23T16:00:00Z_
_Verifier: Claude (gsd-verifier)_