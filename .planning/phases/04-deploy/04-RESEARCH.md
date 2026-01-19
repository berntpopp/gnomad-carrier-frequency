# Phase 4: Deploy - Research

**Researched:** 2026-01-19
**Domain:** Vite/Vue 3 GitHub Pages deployment, GitHub Actions CI/CD, carrier frequency validation
**Confidence:** HIGH

## Summary

Phase 4 involves two main activities: (1) validating the carrier frequency calculations against published reference values for CFTR and HEXA, and (2) deploying the Vue 3/Vite application to GitHub Pages with CI/CD via GitHub Actions.

The deployment follows the official Vite documentation using the modern GitHub Pages workflow with `actions/deploy-pages`. The key configuration requirement is setting `base` in `vite.config.ts` to match the repository name for correct asset linking.

For validation, CFTR should show a carrier frequency of approximately 1:25-1:35 (3-4%) in the NFE population, while HEXA should demonstrate a clear founder effect in the ASJ population with carrier frequency approximately 10x higher than other populations (around 1:25-1:30 in ASJ vs 1:250-1:300 in non-Jewish populations).

**Primary recommendation:** Use the official Vite GitHub Pages workflow with `actions/deploy-pages@v4`, configure `base: '/gnomad-carrier-frequency/'` in vite.config.ts, and add ESLint for CI checks since no linting is currently configured.

## Standard Stack

The established libraries/tools for this domain:

### Core Deployment
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| actions/checkout | v5 | Clone repository | Official GitHub action |
| actions/setup-node | v6 | Install Node.js | Official GitHub action |
| actions/configure-pages | v5 | Configure Pages environment | Official GitHub Pages action |
| actions/upload-pages-artifact | v4 | Upload build artifacts | Official GitHub Pages action |
| actions/deploy-pages | v4 | Deploy to GitHub Pages | Official GitHub Pages action |

### CI/Quality (to be added)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| eslint | ^9.x | Linting | CI checks on every push |
| eslint-plugin-vue | ^9.x | Vue-specific linting | Required for .vue files |
| @vue/eslint-config-typescript | ^14.x | TypeScript + Vue config | Flat config for Vue 3 + TS |
| typescript-eslint | ^8.x | TypeScript ESLint parser | TypeScript support |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| actions/deploy-pages | peaceiris/actions-gh-pages | peaceiris is older approach, official action preferred |
| npm ci | npm install | npm ci is faster and ensures lock file consistency |
| ESLint 9 flat config | ESLint 8 with .eslintrc | ESLint 10 will drop .eslintrc support |

**Installation (for ESLint):**
```bash
npm install --save-dev eslint eslint-plugin-vue @vue/eslint-config-typescript typescript-eslint
```

## Architecture Patterns

### Recommended GitHub Actions Structure
```
.github/
└── workflows/
    ├── ci.yml           # Runs on all pushes: lint + typecheck
    └── deploy.yml       # Runs on main: build + deploy to Pages
```

### Pattern 1: Official Vite GitHub Pages Workflow
**What:** Use GitHub's official Pages actions with Vite build
**When to use:** Any Vite SPA deployed to GitHub Pages
**Example:**
```yaml
# Source: https://vite.dev/guide/static-deploy
name: Deploy static content to Pages

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
      - uses: actions/setup-node@v6
        with:
          node-version: lts/*
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v4
        with:
          path: './dist'
      - uses: actions/deploy-pages@v4
        id: deployment
```

### Pattern 2: Separate CI Workflow
**What:** Lint and typecheck on every push, separate from deploy
**When to use:** To catch errors early on feature branches
**Example:**
```yaml
# Source: https://dev.to/juniordevforlife/how-i-automatically-lint-and-test-my-vue-project-on-push-in-github-4nnh
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
      - uses: actions/setup-node@v6
        with:
          node-version: lts/*
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
```

### Pattern 3: Vite Base Path Configuration
**What:** Configure base URL for subdirectory deployment
**When to use:** GitHub Pages project sites (username.github.io/repo-name/)
**Example:**
```typescript
// Source: https://vite.dev/guide/static-deploy
// vite.config.ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  base: '/gnomad-carrier-frequency/',  // Must match repo name
  // ... other config
})
```

### Anti-Patterns to Avoid
- **Caching node_modules:** Cache ~/.npm instead; node_modules breaks with npm ci
- **Using npm install in CI:** Use npm ci for deterministic builds from lock file
- **Hardcoding deploy URL:** Use `${{ steps.deployment.outputs.page_url }}` for dynamic URL
- **Skipping concurrency control:** Multiple deploys can conflict without `concurrency` block

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| GitHub Pages deployment | Custom push to gh-pages branch | actions/deploy-pages | Handles artifacts, permissions, environment setup |
| npm caching | Manual cache configuration | setup-node with cache: 'npm' | Built-in, handles key generation |
| TypeScript checking | Custom tsc wrapper | vue-tsc (already in project) | Vue SFC awareness |
| ESLint Vue config | Manual parser configuration | @vue/eslint-config-typescript | Handles parser setup for .vue files |

**Key insight:** GitHub's official Pages actions handle complex interactions between permissions, environments, and artifacts that would be error-prone to replicate manually.

## Common Pitfalls

### Pitfall 1: Missing Base Path
**What goes wrong:** Assets (JS, CSS, images) fail to load with 404 errors
**Why it happens:** Vite builds with base: '/' but GitHub Pages serves from /repo-name/
**How to avoid:** Set `base: '/gnomad-carrier-frequency/'` in vite.config.ts
**Warning signs:** Site loads but is blank, or CSS/JS missing in browser network tab

### Pitfall 2: GitHub Pages Not Enabled
**What goes wrong:** Workflow runs but site doesn't appear
**Why it happens:** Pages must be enabled in Settings before workflow can create environment
**How to avoid:** Enable Pages and select "GitHub Actions" as source BEFORE pushing workflow
**Warning signs:** Workflow succeeds but "github-pages environment doesn't exist" message

### Pitfall 3: Permissions Not Set
**What goes wrong:** Workflow fails with "Resource not accessible by integration"
**Why it happens:** GITHUB_TOKEN needs explicit pages:write and id-token:write permissions
**How to avoid:** Include permissions block in workflow YAML
**Warning signs:** 403 errors in deploy step

### Pitfall 4: Cache Key Mismatch
**What goes wrong:** Old dependencies used, build fails with version errors
**Why it happens:** Cache restored but package-lock.json changed
**How to avoid:** Use `hashFiles('**/package-lock.json')` in cache key
**Warning signs:** "Module not found" errors for recently added packages

### Pitfall 5: ESLint Not Configured
**What goes wrong:** CI "lint" step fails because npm run lint script doesn't exist
**Why it happens:** Project was created without ESLint (common with basic Vite scaffolds)
**How to avoid:** Add ESLint configuration before adding lint CI step
**Warning signs:** `npm run lint` returns "missing script: lint"

## Validation Reference Values

### CFTR (Cystic Fibrosis)
| Population | Expected Carrier Frequency | Source |
|------------|---------------------------|--------|
| NFE (Non-Finnish European) | ~1:25 to 1:35 (~3-4%) | ACMG guidelines, gnomAD studies |
| Global | ~1:40 to 1:50 | Aggregated across populations |

**F508del variant alone:** ~1.3-1.5% allele frequency in NFE (gnomAD v4.1)
**Calculation note:** Carrier frequency = 2 x allele frequency

### HEXA (Tay-Sachs)
| Population | Expected Carrier Frequency | Source |
|------------|---------------------------|--------|
| ASJ (Ashkenazi Jewish) | ~1:25 to 1:30 (~3.3-4%) | GeneReviews, population studies |
| General population | ~1:250 to 1:300 (~0.3-0.4%) | CDC, ACMG |

**Founder effect indicator:** ASJ frequency should be ~10x higher than NFE/general
**founderEffectMultiplier in config:** Currently set to 5x, ASJ should trigger this flag

### Validation Procedure
1. Enter "CFTR" in wizard, select gnomAD v4
2. Check NFE population shows carrier frequency in 1:25-1:35 range
3. Enter "HEXA" in wizard, select gnomAD v4
4. Verify ASJ population shows founder effect flag (>5x global)
5. Verify ASJ frequency is approximately 1:25-1:30

## Code Examples

Verified patterns from official sources:

### ESLint Flat Config for Vue 3 + TypeScript
```typescript
// Source: https://eslint.vuejs.org/user-guide/
// eslint.config.js
import pluginVue from 'eslint-plugin-vue'
import {
  defineConfigWithVueTs,
  vueTsConfigs,
} from '@vue/eslint-config-typescript'

export default defineConfigWithVueTs(
  pluginVue.configs['flat/recommended'],
  vueTsConfigs.recommended,
)
```

### Package.json Scripts Addition
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc -b && vite build",
    "preview": "vite preview",
    "lint": "eslint src --ext .vue,.ts,.tsx",
    "typecheck": "vue-tsc --noEmit"
  }
}
```

### Vite Config with Base Path
```typescript
// Source: https://vite.dev/guide/static-deploy
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  base: '/gnomad-carrier-frequency/',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  // ... WSL2 watch config preserved
})
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| peaceiris/actions-gh-pages | actions/deploy-pages | 2023 | Official action with better integration |
| gh-pages npm package | GitHub Actions workflow | 2022-2023 | No need to store deploy key, uses GITHUB_TOKEN |
| ESLint .eslintrc.js | ESLint flat config (eslint.config.js) | ESLint 9 (2024) | Required for ESLint 10+ |
| vue-tsc standalone | vue-tsc in build script | Vue 3.3+ | Type-checking integrated with build |

**Deprecated/outdated:**
- `peaceiris/actions-gh-pages@v3`: Still works but official actions preferred
- `.eslintrc.*` files: Will be removed in ESLint 10
- Pushing to gh-pages branch manually: Workflow approach is cleaner

## Open Questions

Things that couldn't be fully resolved:

1. **Exact CFTR carrier frequency validation threshold**
   - What we know: NFE carrier frequency should be approximately 1:25-1:35
   - What's unclear: gnomAD v4 may give slightly different results than published studies
   - Recommendation: Accept a range of 1:20 to 1:40 as valid during manual validation

2. **ESLint rule customization**
   - What we know: @vue/eslint-config-typescript provides good defaults
   - What's unclear: Whether any rules will conflict with existing code style
   - Recommendation: Start with recommended preset, disable conflicting rules as needed

## Sources

### Primary (HIGH confidence)
- [Vite Static Deploy Guide](https://vite.dev/guide/static-deploy) - Official workflow YAML, base path configuration
- [eslint-plugin-vue User Guide](https://eslint.vuejs.org/user-guide/) - ESLint flat config for Vue
- [GitHub Actions Permissions](https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/controlling-permissions-for-github_token) - Permissions configuration

### Secondary (MEDIUM confidence)
- [sitek94/vite-deploy-demo](https://github.com/sitek94/vite-deploy-demo) - Working example of Vite + GitHub Pages
- [HEXA Disorders GeneReviews](https://www.ncbi.nlm.nih.gov/books/NBK1218/) - Carrier frequency reference for ASJ
- [ACMG CFTR Guidelines](https://www.gimjournal.org/article/S1098-3600(23)00880-8/fulltext) - Carrier screening recommendations

### Tertiary (LOW confidence)
- Various Medium/DEV.to articles on Vue + GitHub Actions CI - Cross-verified with official sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official Vite documentation provides exact workflow
- Architecture: HIGH - GitHub Actions patterns well-established
- Validation values: MEDIUM - Reference values from published studies, may vary slightly with gnomAD version
- ESLint setup: HIGH - Official Vue documentation with flat config examples

**Research date:** 2026-01-19
**Valid until:** 2026-03-19 (60 days - GitHub Actions and Vite deployment are stable)
