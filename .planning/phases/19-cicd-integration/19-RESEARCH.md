# Phase 19: CI/CD Integration - Research

**Researched:** 2026-02-23
**Domain:** GitHub Actions, bun, VitePress, Playwright screenshot automation
**Confidence:** HIGH (most findings verified against official documentation)

## Summary

This phase merges the Vue app and VitePress docs into a single GitHub Pages artifact under a custom domain (`gnomad-carrier-frequency.kidney-genetics.org`), with app at `/` and docs at `/docs/`. The research confirms the existing `deploy.yml` approach is sound — just extend it with a docs build step and a `cp -r docs/.vitepress/dist dist/docs` merge before upload. All four workflows (`ci.yml`, `deploy.yml`, `screenshots.yml` (new), `lighthouse.yml`) need to be standardized on `oven-sh/setup-bun@v2`.

The most critical discovery is a **cascade deploy conflict**: the CONTEXT decision says screenshot auto-commits should trigger a cascade deploy, but GITHUB_TOKEN pushes do NOT trigger subsequent push-based workflows by GitHub design. The existing ClinGen workflow uses `[skip ci]` which prevents ALL push-triggered workflows. The planner must resolve this: either use a PAT (secrets required) for screenshot commits, or accept that screenshots don't cascade-deploy (manual workflow_dispatch instead). The recommended approach is to use a **PAT stored as a repository secret** for screenshot auto-commits when cascade deploy is required.

The second critical finding is base path changes required for the custom domain. VitePress `config.ts` currently has `base: '/gnomad-carrier-frequency/docs/'` — this must change to `base: '/docs/'`. The favicon href and "Open Calculator" nav link also need updating. The app's Vite config `base: '/'` is already correct for the custom domain.

**Primary recommendation:** Use bun 1.3.x (pin `1.3` in `bun-version`), extend deploy.yml with sequential build steps, and use `paths-ignore: ['docs/public/screenshots/**']` in screenshots.yml plus a PAT secret (`SCREENSHOTS_TOKEN`) for cascade deploy triggering.

## Standard Stack

### Core

| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| `oven-sh/setup-bun@v2` | v2.1.2 | Install bun in CI | Official action from Bun authors |
| `actions/checkout@v5` | v5 | Clone repo | Current recommended version (ci.yml already uses v5) |
| `actions/upload-pages-artifact@v4` | v4 | Upload Pages artifact | Current version used in existing deploy.yml |
| `actions/deploy-pages@v4` | v4 | Deploy to GitHub Pages | Current version used in existing deploy.yml |
| `actions/configure-pages@v5` | v5 | Configure Pages settings | Current version used in existing deploy.yml |
| `actions/cache@v4` | v4 | Cache Playwright browsers and bun deps | Current cache action version |

### Bun Version

| Setting | Value | Reason |
|---------|-------|--------|
| `bun-version` | `"1.3"` | Current stable minor series (1.3.9 as of 2026-02-08), pin minor not patch to get security fixes |
| Fallback | `packageManager: "bun@1.3.9"` in package.json | setup-bun@v2 reads this automatically if no `bun-version` specified |

**Recommended approach:** Add `"packageManager": "bun@1.3.9"` to package.json. setup-bun@v2 reads this automatically — no `bun-version` input needed in workflows. This is the cleanest single-source-of-truth for version pinning.

### Supporting

| Tool | Version | Purpose | When to Use |
|------|---------|---------|-------------|
| `gh` CLI | built-in | Create issues on screenshot failure | Available on all GitHub-hosted runners |
| Playwright Chromium | via `playwright` ^1.58.2 | Screenshot capture | Already in devDependencies |

## Architecture Patterns

### Recommended Workflow File Structure

```
.github/workflows/
├── ci.yml              # PR checks: lint + typecheck + build + docs:build (bun)
├── deploy.yml          # Push to main: lint + typecheck + build + docs:build + merge + deploy
├── screenshots.yml     # Push to main (UI path filter): build + screenshots + auto-commit
├── lighthouse.yml      # Unchanged: informational only
└── update-clingen-data.yml  # Unchanged: independent
```

### Pattern 1: Unified Build and Merge

**What:** Build Vue app to `dist/`, build VitePress to `docs/.vitepress/dist/`, copy VitePress output into `dist/docs/`, upload single artifact from `./dist`.

**When to use:** Always — this is the locked approach from CONTEXT.md.

**Example:**
```yaml
# Source: derived from existing deploy.yml + CONTEXT.md decisions
- name: Build app
  run: bun run build
  # Output: ./dist/

- name: Build docs
  run: bun run docs:build
  # Output: docs/.vitepress/dist/

- name: Merge docs into app artifact
  run: cp -r docs/.vitepress/dist dist/docs

- name: Upload artifact
  uses: actions/upload-pages-artifact@v4
  with:
    path: './dist'
```

### Pattern 2: Path-Filtered Screenshot Trigger

**What:** The `screenshots.yml` workflow uses `on.push.paths` to only trigger when UI files change, and `paths-ignore` to prevent re-triggering when screenshots themselves are auto-committed.

**Critical detail — cascade deploy vs GITHUB_TOKEN:**
- Pushes made with `GITHUB_TOKEN` do NOT trigger subsequent push-based workflows (by GitHub design)
- The ClinGen workflow uses GITHUB_TOKEN for commits tagged `[skip ci]` — those commits never trigger deploy either
- To achieve "screenshot commit triggers cascade deploy": the screenshot auto-commit must use a PAT (Personal Access Token)
- Add `SCREENSHOTS_TOKEN` as a repository secret with `contents: write` scope

**When to use:** This is the locked approach — separate screenshots.yml with path filter.

**Example:**
```yaml
# Source: CONTEXT.md decisions + official GitHub docs on GITHUB_TOKEN behavior
name: Update Screenshots

on:
  push:
    branches: ['main']
    paths:
      - 'src/**'
      - 'public/**'
      - 'index.html'
      - 'package.json'
      - 'bun.lockb'
    paths-ignore:
      - 'docs/public/screenshots/**'

jobs:
  update-screenshots:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      issues: write

    steps:
      - uses: actions/checkout@v5
        with:
          # Use PAT so screenshot commit triggers deploy workflow
          # Without this, GITHUB_TOKEN pushes don't trigger other workflows
          token: ${{ secrets.SCREENSHOTS_TOKEN || github.token }}

      - uses: oven-sh/setup-bun@v2

      - name: Install dependencies
        run: bun install --frozen-lockfile

      - name: Install Playwright Chromium
        run: bunx playwright install chromium --with-deps

      - name: Build app
        run: bun run build

      - name: Run screenshot script
        run: bunx tsx scripts/generate-screenshots.ts

      - name: Check for screenshot changes
        id: check_changes
        run: |
          git diff --quiet docs/public/screenshots/ && echo "changed=false" >> $GITHUB_OUTPUT || echo "changed=true" >> $GITHUB_OUTPUT

      - name: Commit and push updated screenshots
        if: steps.check_changes.outputs.changed == 'true'
        run: |
          git config --local user.email "github-actions[bot]@users.noreply.github.com"
          git config --local user.name "github-actions[bot]"
          git add docs/public/screenshots/
          git commit -m "chore: update screenshots [skip ci]"
          git push

      - name: Create issue on failure
        if: failure()
        run: |
          gh issue create \
            --title "Screenshot workflow failed" \
            --body "The screenshot update workflow failed. Check the [workflow run](${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}) for details." \
            --label "screenshots" \
            --repo ${{ github.repository }}
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

**Note on `[skip ci]` and cascade deploy:** The CONTEXT says screenshot commit should NOT use `[skip ci]` for deploy. However, `[skip ci]` skips ALL push-triggered workflows including deploy. The actual solution is: if using a PAT for push, omit `[skip ci]` from commit message — the push will trigger deploy.yml but NOT re-trigger screenshots.yml (because screenshots.yml `paths` only watch `src/**` etc., not `docs/public/screenshots/**`). This is the infinite loop prevention.

### Pattern 3: CI Workflow with Bun

**What:** Update `ci.yml` to use bun instead of npm, and add full build (app + docs) as PR checks.

**Example:**
```yaml
# Source: existing ci.yml structure + decisions
name: CI

on:
  push:
    branches: ['*']
  pull_request:
    branches: ['main']

jobs:
  lint-and-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5

      - uses: oven-sh/setup-bun@v2

      - name: Install dependencies
        run: bun install --frozen-lockfile

      - name: Lint
        run: bun run lint

      - name: Type Check
        run: bun run typecheck

      - name: Build app
        run: bun run build

      - name: Build docs
        run: bun run docs:build
```

**Job name matters for branch protection:** The job name `lint-and-typecheck` is what appears in branch protection required status checks. Keep it stable — renaming breaks existing branch protection configuration.

### Pattern 4: VitePress Base Path for Custom Domain

**What:** Custom domain changes base paths. The docs site is at `https://gnomad-carrier-frequency.kidney-genetics.org/docs/` — so VitePress base must be `/docs/`.

**Changes required in `docs/.vitepress/config.ts`:**

```typescript
// Source: VitePress deploy docs + custom domain behavior
export default defineConfig({
  base: '/docs/',  // was '/gnomad-carrier-frequency/docs/'

  head: [
    // favicon href must be absolute from custom domain root
    ['link', { rel: 'icon', href: '/favicon.svg' }]  // was '/gnomad-carrier-frequency/favicon.svg'
  ],

  themeConfig: {
    nav: [
      // ...
      // "Open Calculator" link changes - app is now at custom domain root
      { text: 'Open Calculator', link: 'https://gnomad-carrier-frequency.kidney-genetics.org/', target: '_blank' }
      // OR use relative link if docs base handles it: link: '/'
    ],
  }
})
```

**Also check:** The screenshot script `generate-screenshots.ts` uses `BASE_URL = 'http://localhost:5173/gnomad-carrier-frequency/'`. In CI, the dev server base is `/` (controlled by vite.config.ts `base: '/'`). The screenshots.yml CI runner will need to use `http://localhost:5173/` as BASE_URL, or the script needs a configurable BASE_URL env var.

### Anti-Patterns to Avoid

- **Using npm commands in workflows when bun is the package manager:** Use `bun install`, `bun run build`, not `npm ci`, `npm run build`
- **Not pinning bun version:** `oven-sh/setup-bun@v2` with no version defaults to `latest` — can break with major bun releases
- **Relying on GITHUB_TOKEN push to trigger downstream workflows:** It won't — use PAT for cascade
- **Using `[skip ci]` when you want cascade deploy:** `[skip ci]` skips all push-triggered workflows, including deploy.yml
- **Using `paths` AND `paths-ignore` in the same trigger incorrectly:** `paths` is an allow-list; `paths-ignore` is a block-list. They work independently. For screenshots.yml: use `paths` for the trigger (what triggers it) AND `paths-ignore` to exclude the screenshots path from those paths (prevents auto-commit from re-triggering)
- **Not using `--frozen-lockfile`:** Without this flag, bun may update `bun.lockb` in CI, causing non-deterministic builds

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Playwright browser caching | Custom cache script | `actions/cache@v4` with `~/.cache/ms-playwright` path | Standard approach, known key pattern |
| Screenshot change detection | File hash comparison script | `git diff --quiet` (same as ClinGen pattern) | Already proven in update-clingen-data.yml |
| Issue creation on failure | Custom API call | `gh issue create` CLI (available on all runners) | Simpler, no action dependency |
| Bun dependency caching | Custom cache | `bun install --frozen-lockfile` (bun has fast installs, may not need explicit cache) | Bun install is 10-30x faster than npm; cache may add overhead |

**Key insight:** The `update-clingen-data.yml` workflow already implements the exact auto-commit pattern needed for screenshots — adapt it directly rather than inventing a new approach.

## Common Pitfalls

### Pitfall 1: GITHUB_TOKEN Auto-Commits Don't Trigger Downstream Workflows

**What goes wrong:** Screenshot workflow auto-commits with GITHUB_TOKEN, expecting deploy.yml to trigger. It doesn't. No cascade deploy occurs.

**Why it happens:** GitHub explicitly prevents GITHUB_TOKEN events from triggering workflow runs to avoid infinite loops. The documentation states: "events triggered by the GITHUB_TOKEN, with the exception of workflow_dispatch and repository_dispatch, will not create a new workflow run."

**How to avoid:** Use a PAT stored as `SCREENSHOTS_TOKEN` repository secret. In the `actions/checkout@v5` step, pass `token: ${{ secrets.SCREENSHOTS_TOKEN }}`. The auto-commit then triggers the deploy workflow.

**Warning signs:** Deploy doesn't run after a screenshot commit to main. The commit shows as author `github-actions[bot]` and no workflows are queued.

**Alternative if PAT is unacceptable:** Add a `workflow_dispatch` trigger on `deploy.yml` and trigger it explicitly after the screenshot commit using `gh workflow run deploy.yml`. This avoids needing a PAT for push triggering.

### Pitfall 2: `[skip ci]` vs PAT Cascade Deploy Conflict

**What goes wrong:** CONTEXT says screenshot commit uses `[skip ci]` but allows deploy. This is contradictory — `[skip ci]` skips ALL push-triggered workflows on the GitHub side.

**Why it happens:** The `[skip ci]` tag is applied at the push event level, before routing to specific workflows. There's no way to skip CI but not deploy using `[skip ci]` alone.

**How to avoid:** Do NOT use `[skip ci]` in the screenshot auto-commit message. Instead, rely on the `paths`/`paths-ignore` filter in `screenshots.yml` to prevent re-triggering. The commit message becomes just: `chore: update screenshots`.

**Warning signs:** If `[skip ci]` is in the commit message, deploy.yml never runs for that commit.

### Pitfall 3: Infinite Loop — Screenshots Workflow Triggers Itself

**What goes wrong:** Screenshot auto-commit triggers `screenshots.yml` again because the commit touches `docs/public/screenshots/`.

**Why it happens:** Without `paths-ignore` or the GITHUB_TOKEN protection, push events from auto-commits re-trigger all path-matched workflows.

**How to avoid (two layers):**
1. If using GITHUB_TOKEN: it won't re-trigger (built-in protection)
2. If using PAT (required for cascade): add `paths-ignore: ['docs/public/screenshots/**']` to `screenshots.yml` trigger AND use `if: github.actor != 'github-actions[bot]'` as a job-level condition for extra safety

**Warning signs:** Workflow run chain grows unboundedly; screenshots.yml appears in "triggered by" of another screenshots.yml run.

### Pitfall 4: VitePress Base Path Mismatch

**What goes wrong:** After changing VitePress `base` from `/gnomad-carrier-frequency/docs/` to `/docs/`, some hardcoded paths still reference the old base. Favicon 404s, "Open Calculator" link goes to wrong URL.

**Why it happens:** VitePress `base` changes URL routing but doesn't auto-update hardcoded strings in `head`, `nav.link`, or markdown files.

**How to avoid:** Search all `docs/` for `/gnomad-carrier-frequency/` references:
- `docs/.vitepress/config.ts`: `base`, `head[].href`, nav `link` for "Open Calculator"
- Any markdown files with absolute internal links
- Screenshot script `BASE_URL` (separate concern — this is dev server URL, not deployment URL)

**Current stale references found in config.ts:**
- Line 7: `base: '/gnomad-carrier-frequency/docs/'` → change to `'/docs/'`
- Line 12: `href: '/gnomad-carrier-frequency/favicon.svg'` → change to `'/favicon.svg'`
- Line 22: `link: '/gnomad-carrier-frequency/'` → change to `'https://gnomad-carrier-frequency.kidney-genetics.org/'`

### Pitfall 5: Screenshot Script Uses Hardcoded Dev Server URL with Old Base

**What goes wrong:** `scripts/generate-screenshots.ts` has `BASE_URL = 'http://localhost:5173/gnomad-carrier-frequency/'`. In CI, `vite.config.ts` has `base: '/'` so the dev server serves at `http://localhost:5173/`. Screenshots navigate to the wrong path (404).

**Why it happens:** The script was written when the app base was `/gnomad-carrier-frequency/`. After the base change, the script needs updating.

**How to avoid:** Update `BASE_URL` in the script to `http://localhost:5173/`. Or better: read from `process.env.BASE_URL` with a fallback, so CI can set it via env var.

### Pitfall 6: Docs Build Fails Silently on Alpha VitePress

**What goes wrong:** VitePress `^2.0.0-alpha.16` (an alpha release) may have breaking changes between alpha versions that cause the build to fail in CI without obvious errors.

**Why it happens:** Alpha releases don't follow semver stability guarantees.

**How to avoid:** Pin the exact VitePress alpha version in package.json (remove `^` caret): `"vitepress": "2.0.0-alpha.16"`. The current version works, don't auto-update until stable release.

**Warning signs:** CI passes locally but fails in clean CI install; error messages reference VitePress internals.

### Pitfall 7: Playwright Browser Install Without Chromium-Only Flag

**What goes wrong:** `npx playwright install --with-deps` (or `bunx playwright install --with-deps`) installs all three browsers (Chromium, Firefox, WebKit), inflating CI time by 5-10 minutes.

**Why it happens:** Default Playwright install is all-browser.

**How to avoid:** Use `bunx playwright install chromium --with-deps` — this matches the phase 17 decision to use Chromium-only.

### Pitfall 8: Lighthouse CI Referencing Old Base URL

**What goes wrong:** `lighthouserc.json` has `url: ["http://localhost:4173/gnomad-carrier-frequency/"]`. After custom domain, the preview server serves at `http://localhost:4173/`.

**Current state:** `lighthouserc.json` has `url: ["http://localhost:4173/gnomad-carrier-frequency/"]` — this is for local runs only (uses `lighthouserc.local.json`). The CI `lighthouse.yml` uses `treosh/lighthouse-ci-action@v12` with a separate `lighthouserc.json` (without the url — it uses the action's built-in server). Check if the CI `lighthouserc.json` also has the stale URL.

## Code Examples

### Complete deploy.yml (extended with docs)

```yaml
# Source: Derived from existing deploy.yml + CONTEXT.md decisions
name: Deploy to GitHub Pages

on:
  push:
    branches: ['main']
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: 'pages'
  cancel-in-progress: true

jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5

      - uses: oven-sh/setup-bun@v2

      - name: Install dependencies
        run: bun install --frozen-lockfile

      - name: Lint
        run: bun run lint

      - name: Type Check
        run: bun run typecheck

      - name: Build app
        run: bun run build

      - name: Build docs
        run: bun run docs:build

      - name: Merge docs into artifact
        run: cp -r docs/.vitepress/dist dist/docs

      - name: Configure Pages
        uses: actions/configure-pages@v5

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v4
        with:
          path: './dist'

      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

### Playwright Browser Cache Pattern

```yaml
# Source: community-verified pattern for Playwright in GitHub Actions
# Official Playwright docs note caching may not always be faster due to restore overhead
# Cache is still worth it for Chromium (~150MB) given the alternative is full re-download each run

- name: Cache Playwright browsers
  uses: actions/cache@v4
  id: playwright-cache
  with:
    path: ~/.cache/ms-playwright
    key: playwright-${{ runner.os }}-${{ hashFiles('bun.lockb') }}
    restore-keys: |
      playwright-${{ runner.os }}-

- name: Install Playwright Chromium
  # Only install if cache miss; --with-deps handles system dependencies
  if: steps.playwright-cache.outputs.cache-hit != 'true'
  run: bunx playwright install chromium --with-deps

- name: Install Playwright system deps only (cache hit)
  # On cache hit, still need system deps
  if: steps.playwright-cache.outputs.cache-hit == 'true'
  run: bunx playwright install-deps chromium
```

**Note:** Official Playwright documentation says browser binary caching "is not recommended, since the amount of time it takes to restore the cache is comparable to the time it takes to download the binaries." However, community testing shows ~40 second improvement. For a workflow running on every UI change, it's worth attempting. If cache restore time exceeds install time in practice, remove the cache step.

### GitHub Issue Creation on Failure

```yaml
# Source: GitHub CLI docs — gh is available on all GitHub-hosted runners
- name: Create issue on failure
  if: failure()
  run: |
    gh issue create \
      --title "Screenshot workflow failed on $(date -u +'%Y-%m-%d')" \
      --body "## Screenshot Workflow Failed

The automated screenshot update workflow failed.

**Run:** [${{ github.run_id }}](${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }})
**Triggered by:** ${{ github.sha }}
**Branch:** ${{ github.ref_name }}

Please investigate and re-run manually if needed." \
      --label "screenshots" \
      --repo ${{ github.repository }}
  env:
    GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

**Label prerequisite:** The `screenshots` label must exist in the repository before this runs. Either create it manually or add a step to create it if missing: `gh label create screenshots --color "#0075ca" --description "Screenshot-related issues" --repo ${{ github.repository }} || true`

### Branch Protection Configuration (Manual Steps)

Branch protection rules are configured via GitHub web UI or API — they cannot be set by workflow files. The required status check name must match the exact job name in ci.yml.

Current ci.yml job name: `lint-and-typecheck`

Configuration in GitHub Settings > Branches > main > Edit:
- [x] Require a pull request before merging
- [x] Require status checks to pass before merging
  - Required checks: `lint-and-typecheck`
- [x] Require branches to be up to date before merging

**Important:** Status checks only appear in the dropdown AFTER the workflow has run at least once on the protected branch (push event). Run CI on main first, then configure branch protection.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `actions/setup-node` + npm | `oven-sh/setup-bun@v2` + bun | This phase | Faster installs, consistent with local toolchain |
| Single artifact (app only) | Merged artifact (app + docs in dist/docs) | This phase | Docs available at /docs/ on same domain |
| Base path `/gnomad-carrier-frequency/` | Base path `/` (custom domain) | This phase | All `/gnomad-carrier-frequency/` prefixes become invalid |
| Manual screenshot updates | Auto-commit on UI change | This phase | Screenshots always current in docs |

**Deprecated/outdated:**
- `actions/setup-node@v6` with `cache: 'npm'`: Was in ci.yml and deploy.yml — replace with `oven-sh/setup-bun@v2`
- `npm ci` and `npm run *`: Replace with `bun install --frozen-lockfile` and `bun run *`
- VitePress base `/gnomad-carrier-frequency/docs/`: Must change to `/docs/` for custom domain
- `lighthouserc.json` local URL with old base: May need updating (verify separately)

## Open Questions

1. **PAT for cascade deploy: required or optional?**
   - What we know: GITHUB_TOKEN pushes don't trigger other workflows; PAT pushes do
   - What's unclear: Whether the project owner wants to manage a PAT secret, or would prefer a `workflow_dispatch` trigger on deploy as the cascade mechanism
   - Recommendation: Default to PAT approach (`SCREENSHOTS_TOKEN` secret). Document in plan that if PAT is unavailable, use `workflow_dispatch` trigger instead. The ClinGen workflow doesn't need cascade (it uses `[skip ci]` + the next scheduled run serves the data), but screenshots are part of docs which ARE served.

2. **Screenshot script BASE_URL in CI**
   - What we know: Script has hardcoded `http://localhost:5173/gnomad-carrier-frequency/` — this doesn't match CI environment where `base: '/'`
   - What's unclear: Whether the existing screenshots have been regenerated since the base change, or if the script was last run when base was `/gnomad-carrier-frequency/`
   - Recommendation: Update script to use `process.env.BASE_URL || 'http://localhost:5173/'` and set `BASE_URL=http://localhost:5173/` in the screenshots.yml env

3. **Lighthouse CI URL in lighthouserc.json**
   - What we know: `lighthouserc.json` has `url: ["http://localhost:4173/gnomad-carrier-frequency/"]` but `lighthouse.yml` uses `treosh/lighthouse-ci-action@v12` which may handle the URL differently
   - What's unclear: Whether `lighthouse.yml` passes `url` from the JSON config or uses the action's auto-detection
   - Recommendation: Verify `lighthouserc.json` content is used only for local runs; if the CI Lighthouse action also reads it, update the URL

4. **Screenshots label existence**
   - What we know: `gh issue create --label "screenshots"` fails if the label doesn't exist
   - Recommendation: Create the `screenshots` label in the repository before the workflow runs, or add a `gh label create ... || true` step before the issue creation

## Sources

### Primary (HIGH confidence)
- [GitHub Actions: Triggering a workflow - official docs](https://docs.github.com/actions/using-workflows/triggering-a-workflow) — GITHUB_TOKEN push behavior confirmed: does not trigger downstream workflows
- [GitHub Community Discussion #26970](https://github.com/orgs/community/discussions/26970) — GITHUB_TOKEN vs PAT for workflow triggering, authoritative community discussion with confirmed answer
- [GitHub Community Discussion #151365](https://github.com/orgs/community/discussions/151365) — Auto-commit + PAT pattern for cascade triggering, 2025
- [GitHub Actions: Skipping workflow runs - official docs](https://docs.github.com/en/actions/managing-workflow-runs-and-deployments/managing-workflow-runs/skipping-workflow-runs) — `[skip ci]` behavior: skips ALL push-triggered workflows
- [oven-sh/setup-bun GitHub README](https://github.com/oven-sh/setup-bun) — Version pinning via `bun-version` or `packageManager` field; latest release v2.1.2
- [GitHub Releases: oven-sh/bun](https://github.com/oven-sh/bun/releases/latest) — Bun 1.3.9 is current stable (as of 2026-02-08)
- [VitePress Deploy Guide](https://vitepress.dev/guide/deploy) — Base path configuration for subdirectory deployment; `base: '/docs/'` for subdirectory at /docs/
- [GitHub Actions: Caching dependencies](https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/caching-dependencies-to-speed-up-workflows) — `actions/cache@v4` key strategy confirmed

### Secondary (MEDIUM confidence)
- [Playwright CI documentation](https://playwright.dev/docs/ci-intro) — `bunx playwright install chromium --with-deps` for Chromium-only install; caching may not be beneficial
- [playwrightsolutions.com: Caching Playwright browser binaries](https://playwrightsolutions.com/playwright-github-action-to-cache-the-browser-binaries/) — Cache key `playwright-${{ runner.os }}-${{ hashFiles('bun.lockb') }}`, ~40s improvement confirmed

### Tertiary (LOW confidence)
- [WebSearch: GitHub Actions paths-ignore auto-commit infinite loop prevention] — Multiple sources agree on `paths-ignore` as prevention strategy; not directly from official docs but widely corroborated

## Metadata

**Confidence breakdown:**
- Standard stack (bun 1.3.9, action versions): HIGH — verified against official GitHub releases and action READMEs
- Architecture (unified build, deploy workflow): HIGH — directly extends existing working workflow
- GITHUB_TOKEN cascade behavior: HIGH — official GitHub docs + multiple community confirmations
- VitePress base path changes: HIGH — official VitePress docs + direct inspection of config.ts
- Playwright browser caching: MEDIUM — community-tested, official docs say it may not be worth it
- Branch protection setup: MEDIUM — official docs for settings, manual UI steps required

**Research date:** 2026-02-23
**Valid until:** 2026-03-25 (stable GitHub Actions ecosystem, but bun version may update)
