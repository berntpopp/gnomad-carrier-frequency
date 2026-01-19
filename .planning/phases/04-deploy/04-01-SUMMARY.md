---
phase: 04-deploy
plan: 01
subsystem: build
tags:
  - eslint
  - vite
  - typescript
  - github-pages
dependency_graph:
  requires:
    - 03-04 (complete codebase to lint/build)
  provides:
    - ESLint flat config for Vue 3 + TypeScript
    - lint and typecheck npm scripts
    - GitHub Pages build configuration
  affects:
    - 04-02 (CI/CD can use lint/typecheck/build scripts)
tech_stack:
  added:
    - eslint@9.39.2
    - eslint-plugin-vue@10.7.0
    - "@vue/eslint-config-typescript@14.6.0"
    - typescript-eslint@8.53.0
  patterns:
    - ESLint 9 flat config (not legacy .eslintrc)
key_files:
  created:
    - eslint.config.js
  modified:
    - package.json
    - vite.config.ts
    - src/utils/template-renderer.ts
decisions:
  - id: flat-config
    choice: ESLint 9 flat config over legacy .eslintrc
    rationale: Flat config is the modern standard; .eslintrc is deprecated
  - id: eslint-dot
    choice: "eslint ." over "eslint src --ext .vue,.ts"
    rationale: ESLint 9 flat config handles file extensions automatically
metrics:
  duration: ~18 minutes
  completed: 2026-01-19
---

# Phase 04 Plan 01: ESLint and Build Configuration Summary

**One-liner:** ESLint 9 flat config with Vue+TS rules, lint/typecheck scripts, and GitHub Pages base path configured

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add ESLint with Vue 3 + TypeScript flat config | 01881ee | eslint.config.js, package.json |
| 2 | Update vite.config.ts and package.json scripts | 6ab2e31 | package.json, vite.config.ts, src/utils/template-renderer.ts |

## What Was Built

### ESLint Configuration

Created `eslint.config.js` using the official Vue 3 + TypeScript flat config pattern:

```javascript
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

This is the recommended setup from eslint.vuejs.org for ESLint 9.

### NPM Scripts

Added to `package.json`:

```json
{
  "scripts": {
    "lint": "eslint .",
    "typecheck": "vue-tsc --noEmit"
  }
}
```

### GitHub Pages Base Path

Added to `vite.config.ts`:

```typescript
export default defineConfig({
  base: '/gnomad-carrier-frequency/',  // GitHub Pages subdirectory
  // ...
})
```

This ensures all asset paths in the build output are prefixed correctly for deployment to `https://<user>.github.io/gnomad-carrier-frequency/`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed unused variable in template-renderer.ts**

- **Found during:** Task 2 (build verification)
- **Issue:** TypeScript error TS6133 - 'match' is declared but its value is never read
- **Fix:** Renamed `match` to `_match` to indicate intentionally unused parameter
- **Files modified:** src/utils/template-renderer.ts
- **Commit:** 6ab2e31 (included in Task 2 commit)

## Verification Results

| Check | Result |
|-------|--------|
| `npm run lint` executes successfully | PASS (no output = no errors) |
| `npm run typecheck` passes | PASS |
| `npm run build` creates dist/ folder | PASS |
| dist/index.html has correct base path | PASS (`/gnomad-carrier-frequency/assets/`) |

## Key Decisions Made

1. **ESLint 9 flat config** - Used modern flat config pattern instead of legacy `.eslintrc.*` files which are deprecated and will be removed in ESLint 10

2. **Simple lint command** - Used `eslint .` instead of specifying extensions because ESLint 9 flat config handles file detection automatically

## Next Phase Readiness

Ready for 04-02 (GitHub Actions CI/CD):

- `npm run lint` - can be used in CI pipeline
- `npm run typecheck` - can be used in CI pipeline
- `npm run build` - produces deployable dist/ folder
- Build output configured for GitHub Pages subdirectory

## Dependencies for Future Work

- GitHub repository must be named `gnomad-carrier-frequency` or base path needs adjustment
- GitHub Pages must be enabled on the repository
- CI workflow will need to run lint, typecheck, and build commands
