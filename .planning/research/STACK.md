# Stack Research: Monorepo Extraction, CLI, Testing, Gene Configs (v1.5)

**Domain:** Monorepo extraction, CLI, testing, gene config schema — TypeScript genetic calculator
**Researched:** 2026-02-23
**Confidence:** HIGH (bun workspaces, Vitest, commander), MEDIUM (tsdown maturity, bunup maturity)

---

## Context: What Already Exists

The v1.4 stack is the baseline. DO NOT re-research or change:

| Package | Version | Purpose |
|---------|---------|---------|
| bun | 1.3.9 (packageManager) | Runtime, package manager |
| Vue 3 | ^3.5.24 | Web app framework |
| Vuetify 3 | ^3.8.1 | UI components |
| Vite 7 | ^7.2.4 | Build tool for web app |
| TypeScript | ~5.9.3 | Type system |
| villus | ^3.3.4 | GraphQL client |
| Pinia | ^3.0.4 | State management |
| zod | ^4.3.5 | Validation (already used) |
| VitePress | ^2.0.0-alpha.16 | Documentation site |
| Playwright | ^1.58.2 | E2E testing (already installed) |
| tsx | ^4.21.0 | TypeScript script runner (already installed) |

---

## Recommended Stack Additions

### 1. Monorepo Structure: Bun Workspaces (Native)

**Recommendation:** Use bun's native workspaces feature. No additional orchestration tool (Nx, Turborepo, moon) needed for a 3-package monorepo.

**Rationale:** Bun 1.3.9 (already in use) has full workspace support including `--filter` for running scripts in specific packages, glob patterns for targeting packages, and `workspace:*` protocol for inter-package dependencies. For a 3-package monorepo (core, cli, web), the native tooling is sufficient. Nx/Turborepo add significant configuration overhead that is only justified at 5+ packages with complex dependency graphs.

**Directory structure:**

```
gnomad-carrier-frequency/          # monorepo root (private)
├── package.json                   # workspace root: "workspaces": ["packages/*", "apps/*"]
├── tsconfig.base.json             # shared compiler options (no paths, no include)
├── bun.lockb                      # single lockfile for all workspaces
├── packages/
│   ├── core/                      # @gnomad-cf/core — calculation engine
│   │   ├── package.json
│   │   ├── tsconfig.json          # extends ../../tsconfig.base.json
│   │   ├── tsdown.config.ts
│   │   └── src/
│   └── cli/                       # @gnomad-cf/cli — CLI tool
│       ├── package.json
│       ├── tsconfig.json
│       ├── tsdown.config.ts
│       └── src/
└── apps/
    └── web/                       # @gnomad-cf/web — current Vue app (moved from src/)
        ├── package.json
        ├── tsconfig.json
        ├── vite.config.ts
        └── src/
```

**Root package.json pattern:**

```json
{
  "name": "gnomad-carrier-frequency",
  "private": true,
  "version": "1.5.0",
  "packageManager": "bun@1.3.9",
  "workspaces": ["packages/*", "apps/*"],
  "scripts": {
    "dev": "bun run --filter @gnomad-cf/web dev",
    "build": "bun run --filter '*' --parallel build",
    "build:core": "bun run --filter @gnomad-cf/core build",
    "build:cli": "bun run --filter @gnomad-cf/cli build",
    "build:web": "bun run --filter @gnomad-cf/web build",
    "test": "bun run --filter '*' --parallel test",
    "lint": "bun run --filter '*' --parallel lint",
    "typecheck": "bun run --filter '*' --parallel typecheck"
  }
}
```

**Inter-package dependency (workspace protocol):**

```json
{
  "name": "@gnomad-cf/cli",
  "dependencies": {
    "@gnomad-cf/core": "workspace:*"
  }
}
```

```json
{
  "name": "@gnomad-cf/web",
  "dependencies": {
    "@gnomad-cf/core": "workspace:*"
  }
}
```

**Bun workspace behavior (verified against official docs):**
- `bun install` from root installs all workspace dependencies + links workspace packages via symlinks
- `bun run --filter @gnomad-cf/core build` runs the `build` script in that specific package
- `bun run --filter '*' --parallel test` runs test in all packages concurrently
- `bun run --sequential --workspaces build` runs build sequentially across all workspaces
- `workspace:*` resolves to the local package (symlink), not npm

**Confidence:** HIGH — Verified against [bun.com/docs/pm/workspaces](https://bun.com/docs/pm/workspaces)

**Known limitation:** Bun 1.3+ uses isolated installs by default for workspaces (each package only sees its declared dependencies). This is correct behavior but means each package.json must be complete — no implicit hoisting leakage.

---

### 2. Library Bundler for `packages/core` and `packages/cli`

**Recommendation:** `tsdown` v0.20.x

**Rationale:**
- `tsup` (the previous standard) is no longer actively maintained. The author recommends migrating to `tsdown`. Last tsup release: 8.5.1, but described as abandoned.
- `tsdown` is the successor, built on Rolldown (Rust-based, faster). Same config API as tsup, smoother migration path.
- `bunup` (bun-native bundler) is an option but is at v0.16.x and explicitly pre-1.0 — not recommended for production tooling in a real project yet.
- `tsdown` is from the void(0) team (same people who built Vite, Vitest, Rolldown) — strong ecosystem alignment.

**Install:**

```bash
bun add -D tsdown --cwd packages/core
bun add -D tsdown --cwd packages/cli
```

**`packages/core/tsdown.config.ts`:**

```typescript
import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['./src/index.ts'],
  format: ['esm'],
  dts: true,                   // generate .d.ts files
  clean: true,
  sourcemap: true,
  target: 'node20',
})
```

**`packages/core/package.json` exports field:**

```json
{
  "name": "@gnomad-cf/core",
  "version": "1.5.0",
  "type": "module",
  "main": "./dist/index.js",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsdown",
    "dev": "tsdown --watch"
  }
}
```

**Why ESM-only for `core`:**
The web app (Vite) and CLI (bun) both consume ESM natively. CJS is only needed for Node.js <18 or legacy tooling — not a constraint here. ESM-only simplifies the build and avoids dual-format complexity.

**Confidence:** MEDIUM-HIGH — tsdown is actively maintained and ecosystem-aligned, but at v0.20.x (not 1.0). The risk is API changes before stable release. However, the tsup-to-tsdown migration guide confirms the config is stable enough for production use.

**Sources:** [tsdown.dev/guide/getting-started](https://tsdown.dev/guide/getting-started), [Switching from tsup to tsdown](https://alan.norbauer.com/articles/tsdown-bundler/), [npm tsdown](https://www.npmjs.com/package/tsdown)

---

### 3. CLI Framework: Commander.js

**Recommendation:** `commander` v14.0.x with `@clack/prompts` v1.0.x for interactive UX

**Rationale:**

| Framework | Version | Weekly DLs | TypeScript | Verdict |
|-----------|---------|-----------|------------|---------|
| commander | 14.0.3 | Very high | Built-in types | **Recommended** |
| citty | ~0.1.6 | Medium | Built-in | Lightweight but fewer features |
| yargs | ~17 | High | @types/yargs | Verbose config, older API |
| bunli | 0.x | Very low | Unknown | Too immature |

**Why commander:**
- Most widely adopted Node.js CLI library (~6.2M weekly downloads)
- v14 includes TypeScript definitions in the package itself (no `@types/commander` needed)
- Supports subcommands, options, arguments, required/optional flags cleanly
- Works identically under bun runtime (bun is Node.js-compatible for CLI usage)
- The `@commander-js/extra-typings` optional package provides enhanced type inference for action handlers

**Why `@clack/prompts` for interactive mode:**
- When running without arguments (interactive batch mode), `@clack/prompts` provides beautiful, minimal terminal prompts
- v1.0.1 (fresh release, actively maintained, 4000+ dependent packages)
- ESM-first, full TypeScript support
- Much lighter than `inquirer` for simple select/text prompts

**Install:**

```bash
bun add commander --cwd packages/cli
bun add @clack/prompts --cwd packages/cli
```

**`packages/cli/src/index.ts` pattern:**

```typescript
#!/usr/bin/env node
import { Command } from 'commander'
import { version } from '../package.json'

const program = new Command()

program
  .name('gnomad-cf')
  .description('Calculate carrier frequency from gnomAD data')
  .version(version)

program
  .command('calculate <gene>')
  .description('Calculate carrier frequency for a gene')
  .option('-p, --population <pop>', 'Population', 'gnomad')
  .option('-v, --gnomad-version <ver>', 'gnomAD version', 'v4')
  .option('-o, --output <format>', 'Output format: json|text', 'text')
  .action(async (gene, options) => {
    // import from @gnomad-cf/core
  })

program
  .command('batch <file>')
  .description('Process multiple genes from CSV/JSON file')
  .action(async (file, options) => { ... })

program.parse()
```

**`packages/cli/package.json` bin field:**

```json
{
  "name": "@gnomad-cf/cli",
  "bin": {
    "gnomad-cf": "./dist/index.js"
  },
  "scripts": {
    "build": "tsdown",
    "start": "bun src/index.ts"
  }
}
```

**Note on shebang:** `#!/usr/bin/env node` works when published to npm for `npx` usage. For bun-first execution during development, `bun run src/index.ts` works without a build step.

**Confidence:** HIGH — commander 14.0.3 is the current version, TypeScript types included, widely used with bun runtime.

**Sources:** [commander npm](https://www.npmjs.com/package/commander), [@clack/prompts npm](https://www.npmjs.com/package/@clack/prompts), [Building TypeScript CLI](https://pmbanugo.me/blog/build-cli-typescript-bun)

---

### 4. Testing Framework: Vitest 4

**Recommendation:** `vitest` v4.0.x as the unified test runner for all packages

**Rationale:**
- Vitest 4.0 (latest: 4.0.18) is a major stable release with browser mode graduating to stable
- Already used in the Vite/Vue ecosystem — no context-switching between Jest and Vitest
- Native bun support: `bun run test` (NOT `bun test` which uses bun's own test runner)
- The `projects` configuration (replacing deprecated `workspace`) allows a single root vitest config to discover and run all packages

**Monorepo vitest configuration strategy:**

Create a single root `vitest.config.ts`:

```typescript
// vitest.config.ts (root)
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      'packages/core',   // discovers packages/core/vitest.config.ts
      'packages/cli',    // discovers packages/cli/vitest.config.ts
      'apps/web',        // discovers apps/web/vitest.config.ts
    ],
  },
})
```

Each package has its own config that extends a shared base:

```typescript
// vitest.shared.ts (root)
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
})
```

```typescript
// packages/core/vitest.config.ts
import { mergeConfig, defineConfig } from 'vitest/config'
import shared from '../../vitest.shared'

export default mergeConfig(shared, defineConfig({
  test: {
    name: 'core',
    environment: 'node',   // pure computation, no DOM needed
    include: ['src/**/*.test.ts'],
  },
}))
```

```typescript
// packages/cli/vitest.config.ts
import { mergeConfig, defineConfig } from 'vitest/config'
import shared from '../../vitest.shared'

export default mergeConfig(shared, defineConfig({
  test: {
    name: 'cli',
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
}))
```

```typescript
// apps/web/vitest.config.ts (Vue components need DOM)
import { mergeConfig, defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import shared from '../../vitest.shared'

export default mergeConfig(shared, defineConfig({
  plugins: [vue()],
  test: {
    name: 'web',
    environment: 'jsdom',   // see jsdom vs happy-dom below
    include: ['src/**/*.test.ts'],
    setupFiles: ['src/test-setup.ts'],
  },
}))
```

**jsdom vs happy-dom for Vue component tests:**

Use `jsdom` for the web package. Reasons:
- happy-dom is faster but has incomplete browser API coverage; Vue Test Utils sometimes hits these gaps
- jsdom is more mature (used by Vue's own test suite)
- For a medical tool where test accuracy matters, correctness > speed
- The performance difference is negligible for a project this size

**Install:**

```bash
bun add -D vitest @vitest/coverage-v8 --cwd packages/core
bun add -D vitest @vitest/coverage-v8 --cwd packages/cli
bun add -D vitest @vitest/coverage-v8 jsdom --cwd apps/web
```

**Important bun note:** Always use `bun run test` (not `bun test`) to invoke vitest. `bun test` uses bun's native test runner which ignores vitest configuration.

**Confidence:** HIGH — Vitest 4.0.18 is the current stable release. `projects` configuration is the current recommended approach (workspace config deprecated in 3.2).

**Sources:** [vitest.dev/guide/projects](https://vitest.dev/guide/projects), [Vitest 3 Monorepo Setup](https://www.thecandidstartup.org/2025/09/08/vitest-3-monorepo-setup.html), [Vitest 4.0 Release](https://vitest.dev/blog/vitest-4)

---

### 5. Vue Component Testing: @vue/test-utils 2

**Recommendation:** `@vue/test-utils` v2.4.6 (current stable)

**Rationale:**
- Official Vue testing library, maintained by Vue core team
- v2.4.6 is the current release (May 2024), still actively maintained with ongoing dependency updates
- Works seamlessly with Vitest — the official Vue docs recommend this combination
- Required for mounting Vue components in unit tests

**Install:**

```bash
bun add -D @vue/test-utils --cwd apps/web
```

**Test-setup file pattern:**

```typescript
// apps/web/src/test-setup.ts
import { config } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

// Global Vuetify instance for component tests
const vuetify = createVuetify({ components, directives })

config.global.plugins = [vuetify]
```

**Confidence:** HIGH — Official Vue tooling, actively maintained, well-documented.

**Sources:** [test-utils.vuejs.org](https://test-utils.vuejs.org/), [github.com/vuejs/test-utils](https://github.com/vuejs/test-utils)

---

### 6. E2E Testing: Playwright (Already Installed)

**Status:** No new installation needed. `playwright` v1.58.2 is already a devDependency.

**What changes in monorepo context:**

In the monorepo, Playwright E2E tests belong in `apps/web/` alongside the web app. The playwright configuration needs to be moved from root to `apps/web/playwright.config.ts` and updated to point to the web app's dev server.

**`apps/web/playwright.config.ts`:**

```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  webServer: {
    command: 'bun run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    cwd: '.',   // relative to apps/web/
  },
  use: {
    baseURL: 'http://localhost:5173',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
})
```

**Running E2E from monorepo root:**

```bash
bun run --filter @gnomad-cf/web e2e
```

**Confidence:** HIGH — Playwright 1.58.2 already installed and working. Configuration adjustment only.

---

### 7. Gene Config Schema: Zod (Already Installed) + YAML Loading

**Recommendation:** Use `zod` v4.x (already installed at ^4.3.5) for schema validation. Add `js-yaml` for YAML config parsing.

**Rationale:**

The gene config files should support both JSON and YAML format (YAML is more human-readable for community contributors making PRs). Loading:
- JSON: built into Node.js / bun (`JSON.parse`) — no library needed
- YAML: `js-yaml` is the standard, lightweight library

**Why Zod over JSON Schema + AJV:**
- Zod is already installed in the project — zero new concepts
- Zod schema can be the single source of truth for both TypeScript types AND runtime validation
- AJV is faster for large-scale validation but has poor TypeScript integration; not needed here
- The gene config files will be <100KB total — performance is irrelevant

**Install:**

```bash
bun add js-yaml --cwd packages/core
bun add -D @types/js-yaml --cwd packages/core
```

**Gene config schema pattern:**

```typescript
// packages/core/src/schemas/gene-config.ts
import { z } from 'zod'

export const GeneConfigSchema = z.object({
  gene: z.string(),               // HGNC gene symbol
  gnomadVersion: z.enum(['v4', 'v3', 'v2']).optional(),
  defaultPopulation: z.string().optional(),
  excludeHomozygotes: z.boolean().optional().default(false),
  customVariants: z.array(z.object({
    id: z.string(),
    frequency: z.number().min(0).max(1),
    description: z.string().optional(),
    include: z.boolean().default(true),
  })).optional(),
  clinicalNotes: z.string().optional(),
  // Hardy-Weinberg correction factors
  founderEffect: z.object({
    population: z.string(),
    adjustedFrequency: z.number(),
    source: z.string().optional(),
  }).optional(),
})

export type GeneConfig = z.infer<typeof GeneConfigSchema>
```

**Loading pattern:**

```typescript
// packages/core/src/config/gene-config-loader.ts
import { readFileSync } from 'fs'
import yaml from 'js-yaml'
import { GeneConfigSchema } from '../schemas/gene-config'

export function loadGeneConfig(filePath: string): GeneConfig {
  const content = readFileSync(filePath, 'utf-8')
  const raw = filePath.endsWith('.yaml') || filePath.endsWith('.yml')
    ? yaml.load(content)
    : JSON.parse(content)
  return GeneConfigSchema.parse(raw)  // throws on invalid config with clear errors
}
```

**Confidence:** HIGH — Zod is already project-validated, js-yaml is the standard YAML library.

---

### 8. TypeScript Configuration for Monorepo

**Recommendation:** Shared base tsconfig + per-package extension. Use `moduleResolution: "bundler"` for packages consumed by Vite; `"node"` or `"node16"` for Node/CLI packages.

**`tsconfig.base.json` (root):**

```json
{
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "skipLibCheck": true,
    "declaration": true,
    "composite": true,
    "incremental": true,
    "erasableSyntaxOnly": true
  }
}
```

**`packages/core/tsconfig.json`:**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "outDir": "./dist",
    "rootDir": "./src",
    "resolveJsonModule": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

**`packages/cli/tsconfig.json`:**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "node",
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "references": [
    { "path": "../core" }
  ],
  "include": ["src/**/*.ts"]
}
```

**`apps/web/tsconfig.json`:**

```json
{
  "extends": "@vue/tsconfig/tsconfig.dom.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    },
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true
  },
  "references": [
    { "path": "../../packages/core" }
  ],
  "include": ["src/**/*.ts", "src/**/*.tsx", "src/**/*.vue"]
}
```

**Key constraint:** Do NOT put path aliases (`paths`) in `tsconfig.base.json`. Each package resolves its own paths. The `workspace:*` protocol handles cross-package imports; TypeScript project references handle type resolution.

**Confidence:** HIGH — Verified against TypeScript documentation and bun workspace examples.

---

### 9. GitHub Actions: Updated for Monorepo

**No new Action versions needed.** The existing `oven-sh/setup-bun@v2` (official, now verified) handles everything. The workflow file needs updating to build core first, then web.

**Updated deploy workflow pattern:**

```yaml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  build-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: "1.3.9"

      - name: Install all workspace dependencies
        run: bun install

      - name: Build core package
        run: bun run --filter @gnomad-cf/core build

      - name: Type check all packages
        run: bun run --filter '*' typecheck

      - name: Run unit tests (core + cli)
        run: bun run --filter @gnomad-cf/core test && bun run --filter @gnomad-cf/cli test

      - name: Build web app
        run: bun run --filter @gnomad-cf/web build

      - name: Build docs
        run: bun run --filter @gnomad-cf/web docs:build

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: apps/web/dist

  deploy:
    needs: build-deploy
    permissions:
      pages: write
      id-token: write
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

**Critical:** The web app build (`apps/web/dist`) is what gets deployed to GitHub Pages. The core package does NOT need to be in the artifact — it is bundled into the web app by Vite at build time. The `workspace:*` reference causes Vite to resolve the local package source directly during development and build.

**Confidence:** HIGH — `oven-sh/setup-bun@v2` verified as the official GitHub Action (became verified May 2025). Bun handles `workspace:*` resolution during build.

**Sources:** [bun.com/docs/guides/runtime/cicd](https://bun.com/docs/guides/runtime/cicd), [oven-sh/setup-bun](https://github.com/oven-sh/setup-bun)

---

## Complete New Dependencies

### New Production Dependencies

| Package | Version | Location | Purpose |
|---------|---------|----------|---------|
| `commander` | ^14.0.3 | packages/cli | CLI framework — subcommands, options, help text |
| `@clack/prompts` | ^1.0.1 | packages/cli | Interactive terminal prompts for batch mode |
| `js-yaml` | ^4.1.0 | packages/core | YAML gene config file parsing |

### New Dev Dependencies

| Package | Version | Location | Purpose |
|---------|---------|----------|---------|
| `tsdown` | ^0.20.3 | packages/core, packages/cli | Library bundler (replaces no previous tool) |
| `vitest` | ^4.0.18 | packages/core, packages/cli, apps/web | Unit test runner |
| `@vitest/coverage-v8` | ^4.0.18 | packages/core, packages/cli, apps/web | Coverage reporting |
| `jsdom` | ^26.x | apps/web | DOM environment for Vue component tests |
| `@vue/test-utils` | ^2.4.6 | apps/web | Vue component mounting for unit tests |
| `@types/js-yaml` | ^4.0.9 | packages/core | TypeScript types for js-yaml |

### No Changes Required

| Package | Reason |
|---------|--------|
| `playwright` | Already installed at ^1.58.2, just needs config relocation |
| `tsx` | Already installed at ^4.21.0, used for scripts |
| `zod` | Already installed at ^4.3.5, used for gene config schemas |
| `vite` / `@vitejs/plugin-vue` | Stays in apps/web, no version changes needed |

---

## Installation Commands

```bash
# 1. From root: restructure into monorepo (manual file moves first)

# 2. Install commander + clack in CLI package
bun add commander @clack/prompts --cwd packages/cli

# 3. Install core deps
bun add js-yaml --cwd packages/core
bun add -D @types/js-yaml tsdown --cwd packages/core

# 4. Install CLI dev deps
bun add -D tsdown --cwd packages/cli

# 5. Install testing everywhere
bun add -D vitest @vitest/coverage-v8 --cwd packages/core
bun add -D vitest @vitest/coverage-v8 --cwd packages/cli
bun add -D vitest @vitest/coverage-v8 jsdom @vue/test-utils --cwd apps/web

# 6. Reinstall all from root (resolves workspace links)
bun install
```

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Monorepo orchestration | Bun native workspaces | Turborepo, Nx | Overkill for 3 packages. Native bun `--filter` covers all use cases. Turborepo adds remote caching which is not needed at this scale. |
| Monorepo orchestration | Bun native workspaces | moon | Excellent tool but significant config overhead. |
| Library bundler | tsdown | tsup | tsup is abandoned by its author. Migration to tsdown is recommended. |
| Library bundler | tsdown | bunup | bunup is at v0.16.x and pre-1.0. Promises great speed but stability risk for tooling. tsdown is more ecosystem-aligned. |
| Library bundler | tsdown | unbuild | Older, less actively maintained. |
| CLI framework | commander | citty | citty is lighter but has smaller community and fewer features. commander's stability and adoption are unmatched. |
| CLI framework | commander | yargs | yargs has a more verbose configuration API and older design philosophy. commander is cleaner for TypeScript. |
| CLI UX | @clack/prompts | inquirer | inquirer is heavier and older. @clack/prompts is minimal, modern, ESM-first. |
| Test runner | vitest | jest | Jest requires more configuration for ESM modules. Vitest integrates with Vite and is already the standard in this ecosystem. |
| Test runner | vitest | bun test | bun test is the built-in runner but bypasses vitest config. Using vitest ensures consistent behavior across packages and CI. |
| DOM environment | jsdom | happy-dom | happy-dom is faster but has incomplete browser API coverage. For Vue component tests, jsdom is more reliable. |
| YAML parsing | js-yaml | yaml | Both are viable. js-yaml is slightly more established in the Node.js ecosystem. Either works. |
| Gene config validation | zod (existing) | ajv + json-schema | AJV is faster but TypeScript integration is poor. Zod is already installed and provides type inference. |

---

## What NOT to Add

| Package | Why Not |
|---------|---------|
| Nx / Turborepo | A 3-package monorepo does not need build orchestration. Bun's `--filter` covers script execution. Add if packages grow to 5+. |
| `@commander-js/extra-typings` | Optional enhanced typing package for commander. Only worth it if complex option/action types become an issue. Start without it. |
| `lerna` | Superseded by native workspace tooling in all major package managers. Do not use. |
| `tsup` | Abandoned by author. Use tsdown instead. |
| `bunup` | Pre-1.0, promising but not yet production-stable for tooling. |
| `jest` | No reason to use jest when vitest is the ecosystem standard with Vite. |
| `jest-environment-jsdom` | Jest-specific, not needed. |
| `happy-dom` | Slightly faster than jsdom but has coverage gaps that cause Vue Test Utils failures. Use jsdom. |
| `inquirer` | Replaced by @clack/prompts which is lighter and more modern. |
| `chalk` | `@clack/prompts` and commander handle terminal output with color. chalk is only needed for custom formatting; defer until actually needed. |

---

## Stack Patterns by Feature

### Pattern A: Core Package (Pure Computation)

The core package has NO Vue, NO browser APIs, NO DOM. It is pure TypeScript.

```
packages/core/src/
├── index.ts                    # public API barrel export
├── calculations/
│   ├── carrier-frequency.ts    # Hardy-Weinberg 2pq
│   ├── recurrence-risk.ts      # Autosomal recessive risk
│   ├── genetic-prevalence.ts   # q² + Bayesian
│   └── homozygote-exclusion.ts # Adjusted allele frequency
├── gnomad/
│   ├── client.ts               # fetch-based GraphQL (no villus — no Vue)
│   └── queries.ts
├── schemas/
│   └── gene-config.ts          # Zod schemas
├── config/
│   └── gene-config-loader.ts   # YAML/JSON loading
└── text/
    └── template-renderer.ts    # Clinical text generation (no Pinia)
```

**Key:** The core package uses native `fetch` (available in bun and modern Node.js) NOT villus. villus is a Vue-specific reactive library. The core's GraphQL client is a plain async function.

### Pattern B: CLI Package (Node/Bun runtime)

```
packages/cli/src/
├── index.ts              # commander program, bin entry point
├── commands/
│   ├── calculate.ts      # single gene calculation
│   └── batch.ts          # batch processing from file
├── formatters/
│   ├── json.ts           # JSON output formatting
│   └── text.ts           # human-readable text output
└── prompts/
    └── interactive.ts    # @clack/prompts interactive mode
```

### Pattern C: Web App (Vue 3 + Vite)

The web app imports from `@gnomad-cf/core` for calculations. Vite resolves `workspace:*` to the local package at build time. villus and Pinia remain in the web app only.

```
apps/web/src/
├── api/                  # villus GraphQL client (Vue-specific)
├── components/           # Vue components
├── composables/          # use* composables (call core functions reactively)
├── stores/               # Pinia stores
└── ...                   # rest of current src/ structure
```

---

## Version Compatibility Matrix

| Package | Required Version | Reason |
|---------|-----------------|--------|
| bun | >=1.3.0 | Isolated installs default, `--filter` for scripts |
| TypeScript | ~5.9.x | `erasableSyntaxOnly` flag (5.5+), existing project requirement |
| Node.js (for CI) | >=20.19 | tsdown requires Node 20.19+ |
| vitest | ^4.0.18 | `projects` config (3.2+ for projects, 4.x for stability) |
| @vue/test-utils | ^2.4.6 | Vue 3 compatible; v1 is for Vue 2 |
| commander | ^14.0.3 | Built-in TypeScript types |
| tsdown | ^0.20.3 | Latest stable; API stabilizing but pre-1.0 |

---

## Sources

### Official Documentation (HIGH confidence)
- [Bun Workspaces](https://bun.com/docs/pm/workspaces) — workspace configuration, `--filter`, `workspace:*` protocol
- [Bun CI/CD Guide](https://bun.com/docs/guides/runtime/cicd) — GitHub Actions `oven-sh/setup-bun@v2`
- [Bun Workspace Config Guide](https://bun.com/docs/guides/install/workspaces) — monorepo setup walkthrough
- [Vitest Projects Guide](https://vitest.dev/guide/projects) — `projects` configuration replacing workspace
- [Vitest 4.0 Release](https://vitest.dev/blog/vitest-4) — stable browser mode, migration notes
- [tsdown Getting Started](https://tsdown.dev/guide/getting-started) — configuration reference
- [Vue Test Utils](https://test-utils.vuejs.org/) — `@vue/test-utils` v2 documentation
- [commander npm](https://www.npmjs.com/package/commander) — v14.0.3 TypeScript support

### Web Research (MEDIUM confidence — verified with official sources)
- [Vitest 3 Monorepo Setup (Sep 2025)](https://www.thecandidstartup.org/2025/09/08/vitest-3-monorepo-setup.html) — monorepo `projects` pattern
- [Switching from tsup to tsdown](https://alan.norbauer.com/articles/tsdown-bundler/) — tsup abandonment, tsdown migration
- [Monorepo with Bun (DEV Community)](https://dev.to/vikkio88/monorepo-with-bun-474n) — complete workspace example
- [Building TypeScript CLI with Bun](https://pmbanugo.me/blog/build-cli-typescript-bun) — commander + bun pattern
- [Bun 1.3 Release Notes](https://bun.com/blog/bun-v1.3) — isolated installs as workspace default
- [@clack/prompts npm](https://www.npmjs.com/package/@clack/prompts) — v1.0.1 release Feb 2026

### Version Verification (npm registry — current as of 2026-02-23)
- commander: 14.0.3 (latest, includes TypeScript types)
- @clack/prompts: 1.0.1 (latest, 8 days old at research date)
- tsdown: 0.20.3 (latest, 18 days old at research date)
- vitest: 4.0.18 (latest, 1 month old at research date)
- @vue/test-utils: 2.4.6 (latest, May 2024 — still actively maintained)
- playwright: 1.58.2 (already in project, current)
