# Pitfalls Research: Monorepo Extraction, CLI, and Testing

**Domain:** Monorepo extraction, CLI, testing for genetic carrier frequency calculator
**Researched:** 2026-02-23
**Confidence:** HIGH (codebase verified + multiple authoritative sources cross-referenced)

---

## Summary

**Top pitfalls for this milestone:**

1. **Singleton composables leak Vue reactivity into the shared core package** - `useCarrierFrequency`, `useExclusionState`, `useWizard`, and `useGeneSearch` all use module-level singleton state. Extracting them as-is pulls Vue dependency into the core package, making it unusable from a CLI.
2. **The `@/` alias breaks immediately when code moves to a workspace package** - Every utility in `src/utils/` and `src/config/` uses `@/` path aliases. Aliases are Vite-scoped and do not work in workspace packages without re-configuration in every consuming package.
3. **`villus` `useQuery` composable requires Vue application context** - `useGeneVariants` and `useGeneSearch` call `useQuery()` from `villus`, which requires a mounted Vue app with the villus plugin installed. The CLI has no Vue app.
4. **Bun workspace `--filter` flag installs to root, not workspace** - `bun add pkg --filter workspace` does not work as expected; dependencies land in root `package.json`. Must use `bun add --cwd packages/core pkg`.
5. **Module-level singleton state breaks test isolation completely** - `useCarrierFrequency`, `useExclusionState`, `useWizard`, and `useGeneSearch` all hold state at the module level. Between tests, state leaks unless modules are explicitly re-imported fresh each time.
6. **Hardy-Weinberg carrier frequency formula is already implemented correctly but is subtle** - The current sum-of-AFs approach handles varying AN correctly. Adding "HWE improvement" risks regression if the distinction between the current approach and naive HWE is misunderstood.
7. **GitHub Pages deploy workflow builds from root; monorepo changes break `bun install --frozen-lockfile`** - The deploy workflow runs `bun install --frozen-lockfile` from root. Adding workspace packages changes the lockfile structure. Any mismatch causes CI failure.

---

## Critical Pitfalls

Mistakes that cause rewrites, break the deployed app, or make the CLI non-functional.

---

### Pitfall 1: Singleton Composables Cannot Be Extracted As-Is

**What goes wrong:** The composables that contain the actual calculation logic (`useCarrierFrequency`, `useGeneSearch`, `useExclusionState`, `useWizard`) all use module-level singleton state and import Vue reactivity primitives directly. If extracted into a shared `packages/core` package as-is, the core package takes a hard dependency on Vue. The CLI then requires Vue to run, which is wrong.

**Why it happens:** The codebase deliberately uses module-level singletons for shared state across components:
- `useCarrierFrequency` (line 83): `let instance: UseCarrierFrequencyReturn | null = null;`
- `useExclusionState` (line 6): `const state = reactive<ExclusionState>({...})`
- `useWizard` (line 7): `const state = reactive<WizardState>({...})`
- `useGeneSearch` (lines 19-24): `const searchTerm = ref(''); const selectedGene = ref(...)`

These are clever for the SPA but are fundamentally Vue-coupled patterns.

**Consequences:**
- Core package ships Vue as a dependency instead of devDependency
- CLI requires Vue to be installed just to calculate carrier frequencies
- Tests for the core package need a Vue application context to run
- The shared package is not actually framework-agnostic

**How to avoid:**
1. **Do not extract composables.** Extract only the pure functions from `src/utils/` into the core package.
2. The extractable surface is: `frequency-calc.ts`, `variant-filters.ts`, `formatters.ts`, `template-renderer.ts` - these import from `@/config` and `@/types` but have no Vue imports.
3. Composables stay in the web app. The CLI gets plain TypeScript functions, not composables.
4. If shared state is needed in the CLI, use a plain class or plain object - not Vue reactive state.

**Warning signs:**
- Any `import { ref, computed, reactive, watch } from 'vue'` in the core package
- Any `import { useQuery } from 'villus'` in the core package
- The core package `package.json` listing `vue` as a production dependency

**Phase to address:** Monorepo setup phase (before any extraction begins)

**Confidence:** HIGH - Verified by reading every composable file

---

### Pitfall 2: The `@/` Alias Is Vite-Scoped and Breaks in Workspace Packages

**What goes wrong:** The entire codebase uses the `@/` alias to reference `src/`. This is configured in `vite.config.ts` (line 110-113) and in `tsconfig.json`. When you move code to `packages/core/`, the `@/` alias no longer resolves because the alias is relative to the web app's `src/` directory.

**Why it happens:** The current alias configuration is:
```typescript
// vite.config.ts line 110-113
resolve: {
  alias: {
    '@': fileURLToPath(new URL('./src', import.meta.url))
  }
}
```
This only affects the Vite build of the web app. The workspace package `packages/core/` has no Vite config and no alias resolution. Every `import { config } from '@/config'` in extracted code becomes an unresolvable import.

**Consequences:**
- Build fails immediately for the core package with "Cannot resolve '@/config'"
- Every extracted file needs its imports rewritten from `@/config` to `../../config` (or whatever relative path applies)
- TypeScript also needs the `paths` mapping in the core package's `tsconfig.json`
- If `@/` is also used in the core package's own tsconfig, it conflicts with the web app's `@/`

**How to avoid:**
1. Before extracting any file, rewrite all `@/` imports in that file to relative imports
2. In the core package, do NOT use `@/` - use relative imports throughout
3. In the web app, after extraction, import from the core package: `import { calculateCarrierFrequency } from '@gnomad-cf/core'`
4. Never define the same alias (`@/`) in multiple workspace packages - this causes ambiguity

**Warning signs:**
- `@/` import in any file under `packages/core/src/`
- TypeScript "paths" conflict between workspace packages
- Build succeeds locally (where Vite resolves it) but fails in CI (where tsc runs on the package directly)

**Phase to address:** Monorepo setup phase (establish import conventions before extracting anything)

**Confidence:** HIGH - Verified from vite.config.ts and usage throughout utils/

---

### Pitfall 3: `villus` `useQuery` Requires a Mounted Vue App - CLI Gets None

**What goes wrong:** The `useGeneVariants` composable calls `useQuery()` from `villus`, which internally calls Vue's `inject()` to get the villus client from the app context. If called outside a mounted Vue component (as a CLI would do), it throws: `[villus] Could not resolve client, did you forget to call "useClient"?`.

**Why it happens:** `villus` is designed as a Vue plugin. The `useQuery` composable uses Vue's provide/inject mechanism. `useGeneSearch` also directly imports `graphqlClient` (a module-level `createGnomadClient()` call in `src/api/client.ts`) and calls `graphqlClient.executeQuery()` - this avoids the inject problem but still requires the villus client to be initialized. For the CLI, the fetching mechanism must be completely different.

**Consequences:**
- The CLI cannot use any composable that calls `useQuery`
- Any attempt to share the API query layer between SPA and CLI fails
- The CLI must implement its own fetch layer using raw `fetch()` or a non-Vue GraphQL client

**How to avoid:**
1. The CLI's gnomAD fetching must use raw `fetch()` with the gnomAD GraphQL endpoint directly
2. The shared core package should NOT contain any villus imports
3. The GraphQL queries themselves (the string constants from `src/api/queries/`) CAN be shared - they are plain strings with no Vue dependency
4. Pattern: CLI fetches data with `fetch()`, passes the raw response to shared pure functions for calculation

**Warning signs:**
- `import { useQuery } from 'villus'` in `packages/core/`
- `import { createClient } from 'villus'` in the CLI package

**Phase to address:** CLI implementation phase

**Confidence:** HIGH - Verified from `useGeneVariants.ts` (line 36: `useQuery`) and `client.ts` (line 50: module-level `createGnomadClient()`)

---

### Pitfall 4: Bun Workspace `--filter` Installs to Root, Not Workspace

**What goes wrong:** Developers familiar with pnpm expect `bun add zod --filter @gnomad-cf/core` to install `zod` into the `packages/core/package.json`. It does not. Bun's `--filter` flag is not stable for package installation and places the dependency in the root `package.json`, polluting the root dependencies.

**Why it happens:** Bun's workspace filter support for installation is incomplete as of Bun 1.3.x (confirmed from official GitHub issue #18195 and community reports as of August 2025). The `--filter` flag works for running scripts but not for `bun add`.

**Consequences:**
- Root `package.json` accumulates workspace-specific dependencies
- When the web app's Vite build runs, it may inadvertently pick up packages intended only for the CLI
- Phantom dependency problem: the CLI "works" locally but `packages/cli/package.json` is missing the dependency declaration

**How to avoid:**
1. Always install workspace-specific packages using `--cwd`:
   ```bash
   bun add --cwd packages/core zod
   bun add --cwd packages/cli commander
   ```
2. Document this in the repo's contributing guide immediately
3. After any `bun add` without `--cwd`, verify the correct `package.json` was modified before committing

**Warning signs:**
- CLI-specific packages (`commander`, `chalk`) appearing in root `package.json`
- Core package dependencies appearing in the web app's dependency list

**Phase to address:** Monorepo setup phase (document immediately in README)

**Confidence:** HIGH - Verified from fgbyte.com Bun monorepo experience article and GitHub issue #18195

---

### Pitfall 5: Module-Level Singleton State Breaks Test Isolation

**What goes wrong:** The pattern used throughout the codebase - module-level reactive state that persists across function calls - makes unit testing extremely difficult. When the first test runs `useCarrierFrequency()` and sets a gene symbol, the second test starts with that gene symbol already set. Tests pass or fail depending on execution order.

**Why it happens:** The singleton pattern is intentional for the SPA (shared state across components) but is hostile to testing:
- `useExclusionState`: `const state = reactive<ExclusionState>({excluded: new Set(), ...})` - module-level, never reset
- `useWizard`: `const state = reactive<WizardState>({currentStep: 1, ...})` - module-level, never reset
- `useGeneSearch`: `const searchTerm = ref(''), selectedGene = ref(null)` - module-level
- `useCarrierFrequency`: `let instance: UseCarrierFrequencyReturn | null = null` - cached singleton

**Consequences:**
- Tests must use `vi.resetModules()` or `vi.isolateModules()` to get fresh state, which is slow
- Pinia stores require `setActivePinia(createPinia())` before each test
- Tests written without this cleanup pass locally (alphabetical test order) and fail in CI (different order)
- The singleton cache in `useCarrierFrequency` (`let instance`) means the first test's instance is returned to all subsequent tests

**How to avoid:**
1. Pure utility functions (`frequency-calc.ts`, `variant-filters.ts`) are trivially testable - start there
2. For composable tests, use `vi.isolateModules()` to get fresh module state per test
3. Call `setActivePinia(createPinia())` in `beforeEach` for any test touching Pinia stores
4. Write tests for the pure functions first to build confidence; composable tests are secondary
5. The extracted core package functions should have zero singleton state - this is the testable surface

**Warning signs:**
- Tests that fail when run in isolation but pass in the full suite (or vice versa)
- Any `let instance = null` or module-level `reactive({})` in test subjects

**Phase to address:** Testing setup phase (design the test strategy before writing tests)

**Confidence:** HIGH - Verified by reading every composable; pattern is consistent throughout

---

### Pitfall 6: GitHub Pages Deploy Fails When Workspace Lockfile Changes

**What goes wrong:** The deploy workflow runs `bun install --frozen-lockfile`. When workspace packages are added, `bun.lock` (text lockfile) changes. If a developer adds a workspace package locally and runs `bun install` but forgets to commit the updated `bun.lock`, the CI deployment fails with `--frozen-lockfile` error.

**Why it happens:** The current deploy.yml (line 29) runs `bun install --frozen-lockfile`. Adding workspace packages to the root `package.json` (the `workspaces` field) and adding new `package.json` files in `packages/*/` changes the lockfile. Any discrepancy causes the frozen install to fail.

**Consequences:**
- Deploy fails in CI even though local builds succeed (local `bun install` updates the lockfile)
- The error message "lockfile not up to date" is clear but confusing to unfamiliar developers
- If the `packages/` directory is added but the workspace `package.json` files are not initialized with `bun install`, the root install fails

**How to avoid:**
1. When adding workspace packages, always run `bun install` from the root before committing
2. Commit `bun.lock` along with any `package.json` changes (never gitignore it)
3. Bun 1.2+ uses text-based `bun.lock` (not binary `bun.lockb`) which is mergeable and diffable
4. Add a CI check that verifies `bun install --frozen-lockfile` succeeds on every PR, not just on main
5. Initialize workspace `package.json` files with minimum fields before running root `bun install`

**Warning signs:**
- `bun.lock` not committed after adding workspace packages
- Developer committing `packages/core/package.json` but not the updated root `bun.lock`

**Phase to address:** Monorepo setup phase (first thing to verify after workspace configuration)

**Confidence:** HIGH - Verified from deploy.yml line 29 (`--frozen-lockfile`) and bun lockfile documentation

---

## Moderate Pitfalls

Mistakes that cause delays, bugs, or technical debt.

---

### Pitfall 7: Hardy-Weinberg Formula Is Already Correct - "Improvement" Risks Regression

**What goes wrong:** The milestone mentions "improving calculations" with Hardy-Weinberg equilibrium. The current implementation already applies HWE correctly for the carrier frequency calculation (CF = 2q, where q = sum of pathogenic allele frequencies). If a developer interprets "HWE improvement" as switching to a different formula (e.g., CF = 2pq where p = 1 - q), they introduce a small error for common variants.

**Why it happens:** The distinction between the sum-of-AFs approach and naive HWE is subtle. The current code in `frequency-calc.ts` (line 33-35) uses:
```typescript
export function calculateCarrierFrequency(pathogenicAFs: number[]): number {
  const sumAF = pathogenicAFs.reduce((sum, af) => sum + af, 0);
  return 2 * sumAF;
}
```
This is the correct approximation for rare alleles: when q is small, 2pq ≈ 2q because p ≈ 1. Using `2pq` explicitly would be more formally correct but makes negligible difference for pathogenic variants where AF is typically < 0.01. Adding HWE could mean adding `p = 1 - sumAF` and using `2 * p * sumAF` - the difference is tiny for rare variants but is a behavior change.

**Consequences:**
- Subtle numerical change in output that is hard to detect without test coverage
- Different output from the existing deployed app for the same gene breaks user trust
- The distinction needs a comment and decision, not a silent change

**How to avoid:**
1. Treat the carrier frequency formula as a **fixed behavior**: document the existing formula as intentional
2. If HWE refinement is desired for non-rare variants, add it as an explicit option with a flag, not a default change
3. Write golden-value tests FIRST (capture current outputs for known genes like CFTR, HFE) before touching any calculation code
4. Any formula change requires explicit sign-off in the milestone plan, not a casual refactor

**Warning signs:**
- Any change to `calculateCarrierFrequency` in `frequency-calc.ts` without a corresponding golden test update
- Output differences between CLI and web app for the same gene and variant set

**Phase to address:** Testing phase (before any calculation code changes)

**Confidence:** HIGH - Verified by reading `frequency-calc.ts` and the comments in `useCarrierFrequency.ts` explaining the mathematical approach

---

### Pitfall 8: TypeScript Project References Required for Correct Build Order

**What goes wrong:** In a bun workspace monorepo, if the web app imports from `packages/core` and the TypeScript configs are not set up with project references, `vue-tsc` type-checks the web app without first type-checking the core package. This means type errors in the core package are invisible during the web app's type check.

**Why it happens:** TypeScript's `compilerOptions.paths` mapping tells the editor where to find types, but for build-time correctness, `references` in `tsconfig.json` tell `tsc` to build packages in dependency order. Without references, the build is order-dependent and can succeed despite type errors in dependencies.

**Consequences:**
- `bun run typecheck` in the web app passes even when core package has type errors
- The core package's type errors only surface when `tsc` is run on that package directly
- CI can give false confidence about the overall type health

**How to avoid:**
1. Add `composite: true` to `packages/core/tsconfig.json`
2. Add a `references` entry in the web app's `tsconfig.json` pointing to `../../packages/core/tsconfig.json`
3. Run `tsc --build` (or `vue-tsc --build`) instead of `tsc --noEmit` in the root for full correctness
4. Alternatively, add a root `tsconfig.json` with project references to all packages

**Warning signs:**
- The core package has no `composite: true` in its tsconfig
- Type errors in core that are invisible from the web app's type check

**Phase to address:** Monorepo setup phase

**Confidence:** MEDIUM - Standard TypeScript monorepo requirement; verified from current tsconfig usage pattern

---

### Pitfall 9: Bun Dependency Hoisting Gives CLI Phantom Dependencies

**What goes wrong:** When running `bun install` in a monorepo, by default (hoisted mode), all packages from all workspaces land in the root `node_modules`. This means the CLI package can `import` a dependency that is only declared in the web app's `package.json`, not in `packages/cli/package.json`. The CLI "works" in the monorepo but fails when installed standalone or published.

**Why it happens:** Bun's default install mode hoists everything to the root `node_modules`. The CLI code can resolve `vuetify` even though it's not in `packages/cli/package.json` because it's hoisted from the web app. This is a phantom dependency.

**Consequences:**
- CLI tests pass in the monorepo
- CLI published to npm fails to run because `vuetify` is not in its dependencies
- Or: web app's `node_modules` grows unnecessarily because CLI deps get mixed in

**How to avoid:**
1. Use Bun's isolated linker mode in `bunfig.toml`:
   ```toml
   [install]
   linker = "isolated"
   ```
2. Or, after building the CLI, run a standalone install and test the CLI in a separate directory to verify all its dependencies are declared
3. Explicitly declare every import the CLI uses in `packages/cli/package.json`

**Warning signs:**
- CLI `package.json` is minimal but the CLI imports work in the monorepo
- Publishing the CLI and getting "Cannot find module" errors on install

**Phase to address:** CLI implementation phase (verify before any release)

**Confidence:** MEDIUM - Based on bun hoisting documentation and general monorepo experience

---

### Pitfall 10: Pinia Persisted State Plugin Requires localStorage - CLI Has None

**What goes wrong:** The existing Pinia stores use `pinia-plugin-persistedstate` to persist settings to `localStorage`. If any calculation code path touches a Pinia store (e.g., `useFilterStore` for default filter config), the CLI will fail because `localStorage` is not available in Node.js/Bun runtime.

**Why it happens:** `useCarrierFrequency` reads from `useFilterStore` (line 91-105) to initialize filter config. `useFilterStore` is a Pinia store with `persistedstate`. Even if the CLI creates a Pinia instance, the persistence plugin tries to access `localStorage` at store initialization time and throws.

**Consequences:**
- CLI crashes on startup with `localStorage is not defined`
- This error only appears when the calculation code path touches the Pinia store

**How to avoid:**
1. The pure functions in `src/utils/` take explicit parameters - they do not access Pinia stores
2. Keep Pinia stores entirely in the web app; do not import them from the core package
3. The CLI must provide its own configuration (via CLI flags or config file), not via Pinia
4. If sharing config JSON between SPA and CLI, import the JSON directly (not via the Pinia store)

**Warning signs:**
- `import { useFilterStore } from '@/stores/useFilterStore'` in any core package file
- `localStorage is not defined` error in CLI tests

**Phase to address:** CLI implementation phase (before writing any CLI code that touches stores)

**Confidence:** HIGH - Verified by reading `useCarrierFrequency.ts` line 91 (`useFilterStore`) and the Pinia plugin config

---

### Pitfall 11: Community Gene Config Files Need Schema Validation or They Break Calculations

**What goes wrong:** Community-contributed gene configuration files (disease-specific variant lists or custom population weights) will be contributed as JSON. Without a JSON Schema validator enforced in CI, a contributor submits a file with a typo (`"alleleFrequency": "0.001"` as string instead of number). The calculation silently produces wrong output - or throws a runtime error that is hard to trace.

**Why it happens:** JSON has no type enforcement. The current config pattern uses TypeScript type assertions (`const gnomad = gnomadConfig as GnomadConfig`) which perform no runtime validation. A community contributor does not run the TypeScript compiler on their JSON file.

**Consequences:**
- Wrong carrier frequencies silently returned for genes with malformed community configs
- Genetic counselors use incorrect data in clinical letters
- Runtime errors that only surface when a specific gene is loaded

**How to avoid:**
1. Define a JSON Schema for community config files
2. Validate all community configs in CI using `ajv` or `zod` before merging
3. Use Zod for runtime validation when loading any community config (not just TypeScript types)
4. Consider a `bun run validate-configs` script that runs on every PR touching `packages/gene-configs/`

**Warning signs:**
- Community config files accepted without CI validation
- String values where numbers are expected (JSON does not distinguish)
- Missing required fields silently defaulting to `undefined`

**Phase to address:** Community configs phase

**Confidence:** HIGH - Pattern is well-known; the current config system uses type assertions not runtime validation

---

## Minor Pitfalls

Mistakes that cause inconvenience but are fixable without rewriting.

---

### Pitfall 12: The `useUrlState` Composable Uses `window` and `onMounted` - CLI Incompatible

**What goes wrong:** `useUrlState.ts` calls `onMounted` (Vue lifecycle hook) and `window.location.href`. This is an obvious CLI blocker. However, `useUrlState` also imports from `useWizard`, `useGeneSearch`, and `useExclusionState`. If any extraction plan inadvertently includes `useUrlState`, it drags in all of Vue's reactivity system.

**How to avoid:** `useUrlState` stays in the web app. It is not extractable. The URL encoding/decoding utilities (`encodeFilterFlags`, `decodeFilterFlags`, `parseUrlState`) in `src/types/` could be extracted if needed, but only if they have no Vue imports.

**Phase to address:** Monorepo setup phase (exclusion list)

**Confidence:** HIGH - Verified by reading `useUrlState.ts` line 5 (`onMounted`) and line 333 (`window.location.href`)

---

### Pitfall 13: The Vite Path Alias `@/` and the Package Alias `@gnomad-cf/core` Must Not Conflict

**What goes wrong:** The web app uses `@/` for internal paths. The workspace package will likely be named `@gnomad-cf/core`. When Vite resolves `@gnomad-cf/core`, it must not match the `@/` alias. If the alias is defined as `'@': './src'` (without trailing slash), the resolve may partially match `@gnomad-cf` and fail.

**How to avoid:**
1. Define the alias with a trailing slash: `'@/': fileURLToPath(new URL('./src/', import.meta.url))` to prevent partial matches
2. Verify workspace package imports resolve correctly in both dev server and production build
3. Test by importing from `@gnomad-cf/core` in the web app and checking the Vite resolve trace

**Phase to address:** Monorepo setup phase

**Confidence:** MEDIUM - Known Vite/TypeScript issue with `@` prefix ambiguity

---

### Pitfall 14: `bun.lockb` vs `bun.lock` - Binary Lockfile Causes Unresolvable Merge Conflicts

**What goes wrong:** The current project uses Bun 1.3.9 (per `package.json` `packageManager` field). Bun 1.2 introduced the text-based `bun.lock`. If the project is still using `bun.lockb` (binary), merge conflicts in the lockfile are unresolvable without deleting and regenerating. Two developers adding packages simultaneously creates an unresolvable binary conflict.

**How to avoid:**
1. Confirm which lockfile format is in use (`bun.lock` = text, `bun.lockb` = binary)
2. If still on `bun.lockb`, migrate: `bun install --save-text-lockfile --frozen-lockfile --lockfile-only && rm bun.lockb`
3. Add `bun.lockb` to `.gitignore` and commit `bun.lock` going forward
4. With multiple developers adding workspace packages simultaneously, text lockfile conflicts are still possible but resolvable

**Phase to address:** Monorepo setup phase (day one)

**Confidence:** HIGH - Bun lockfile format documented; Bun 1.2+ defaults to text lockfile

---

## Technical Debt Patterns

| Pattern | Debt Created | When It Bites |
|---------|-------------|---------------|
| Singleton composables with module-level state | Test isolation impossible, module loading order dependent | First time unit tests are written |
| `@/` alias in extracted files | Build fails in workspace packages | First workspace package build |
| Pinia store in calculation path | CLI cannot run; localStorage crash | First CLI integration test |
| No runtime config validation | Silent wrong output from bad community configs | First community config PR |
| `villus` `useQuery` in shared fetching | CLI cannot use shared fetch layer | CLI data fetching implementation |
| TypeScript `as Type` assertions on JSON imports | No runtime safety for config files | Malformed config in production |

---

## Integration Gotchas

| Integration Point | Gotcha | Prevention |
|------------------|--------|------------|
| Web app imports core package | `@/` alias breaks; relative imports needed in core | Rewrite all `@/` in extracted files before extraction |
| CLI imports core package | Any Vue/Pinia import causes crash | Core package must have zero Vue dependencies |
| Tests for core package | Singleton state from composables leaks between tests | Test only pure functions from utils/; use `vi.isolateModules()` for composables |
| Community configs loaded at runtime | TypeScript types are compile-time only; malformed JSON crashes | Add Zod validation at load time |
| CLI fetching gnomAD data | `useQuery` from villus requires Vue app | CLI uses raw `fetch()` directly; shared only the GraphQL query strings |
| Deploy CI with workspace packages | `--frozen-lockfile` fails if `bun.lock` is stale | Always commit `bun.lock` after any `bun install` |

---

## Performance Traps

| Trap | What Happens | Mitigation |
|------|-------------|------------|
| CLI fetches all variants for a gene then filters in memory | gnomAD returns thousands of variants; filtering happens client-side | Acceptable for CLI but add progress indicator; do not attempt server-side filtering (gnomAD GraphQL does not support it) |
| CLI loads all community gene configs at startup | If community configs grow to hundreds of files, startup becomes slow | Load configs lazily per gene; only parse the relevant config when a gene is requested |
| Running tests without `--reporter=verbose` on slow test suites | Hidden failures in async test batches | Use `bun test --timeout=10000` and verbose reporting |

---

## "Looks Done But Isn't" Checklist

After monorepo extraction, verify each of these before calling the phase complete:

- [ ] Core package builds successfully with `bun run build --cwd packages/core` (not just from web app context)
- [ ] Web app builds successfully and imports from `@gnomad-cf/core` (not from the old `@/utils` path)
- [ ] CLI runs `bun run start --cwd packages/cli -- CFTR` and produces correct output matching the web app
- [ ] CLI output for CFTR matches the web app's displayed carrier frequency (regression check)
- [ ] `bun install --frozen-lockfile` passes in CI (lockfile is committed and up to date)
- [ ] Core package `package.json` lists NO Vue, NO villus, NO Pinia in production dependencies
- [ ] Unit tests run with `bun test` from the root (not just per-package)
- [ ] Tests pass in random order (set a random seed to catch order-dependent failures)
- [ ] `bun run typecheck` passes for BOTH the web app AND the core package independently
- [ ] Community gene config schema is enforced in CI (not just TypeScript types)
- [ ] The existing GitHub Pages deploy still works (deploy.yml unchanged or updated correctly)

---

## Recovery Strategies

| If this breaks | How to recover |
|---------------|----------------|
| Deployed web app breaks after monorepo migration | The web app's build must be identical to pre-migration. Keep the web app buildable as a standalone (no workspace-only dependencies). Rollback by reverting workspace changes; web app source is unchanged. |
| `bun install --frozen-lockfile` fails in CI | Run `bun install` locally (no frozen flag), commit the updated `bun.lock` |
| Core package has Vue dependency via transitive import | Audit with `bunx depcruise packages/core/src --include-only '^packages/core'`; trace the import chain |
| CLI crashes with `localStorage is not defined` | The CLI code path reached a Pinia store; trace which composable was imported and remove it |
| Tests fail due to singleton state leaks | Add `vi.resetModules()` in `beforeEach` for affected test files; or refactor to test pure functions only |
| Community config breaks calculation silently | Add golden-value tests for known genes; validate configs with Zod at load time |

---

## Pitfall-to-Phase Mapping

| Phase | Pitfall to Address | Prevention Task |
|-------|------------------|-----------------|
| Monorepo setup | P1: Singleton composables | Define extraction boundary: only pure utils, no composables |
| Monorepo setup | P2: `@/` alias | Rewrite all `@/` in extracted files to relative imports |
| Monorepo setup | P4: Bun filter flag | Document `--cwd` pattern; add to contributing guide |
| Monorepo setup | P6: Lockfile CI failure | Commit `bun.lock` immediately; verify CI passes |
| Monorepo setup | P8: TypeScript project references | Add `composite: true` and `references` in tsconfigs |
| Monorepo setup | P13: `@` alias conflict | Use trailing slash in alias; test workspace imports |
| Monorepo setup | P14: Binary lockfile | Migrate to text `bun.lock` if on `bun.lockb` |
| CLI implementation | P3: `villus` context requirement | CLI uses raw `fetch()`; shares only query string constants |
| CLI implementation | P9: Phantom dependencies | Use isolated linker or verify CLI runs standalone |
| CLI implementation | P10: localStorage crash | No Pinia store imports in CLI or core package |
| Testing phase | P5: Singleton state leaks | Use `vi.isolateModules()` and `setActivePinia(createPinia())` |
| Testing phase | P7: HWE formula regression | Write golden-value tests BEFORE any calculation changes |
| Community configs | P11: Config validation | JSON Schema + Zod validation enforced in CI |

---

## Sources

- [Dealing with Monorepo's Hell with Bun - fgbyte.com](https://www.fgbyte.com/blog/02-bun-turborepo-hell/) - Bun `--filter` flag installs to root issue
- [Bun Workspaces Documentation](https://bun.com/docs/pm/workspaces) - Official workspace configuration
- [Bun Issue #18195: --filter installs to root](https://github.com/oven-sh/bun/issues/18195) - Confirmed bug report
- [Bun Issue #7547: bun add always hoists in workspace](https://github.com/oven-sh/bun/issues/7547) - Hoisting behavior
- [Bun Text Lockfile Announcement](https://bun.com/blog/bun-lock-text-lockfile) - `bun.lock` format
- [Bun Isolated Installs Documentation](https://bun.com/docs/pm/isolated-installs) - Phantom dependency prevention
- [Managing TypeScript Packages in Monorepos - Nx Blog](https://nx.dev/blog/managing-ts-packages-in-monorepos) - TypeScript project references pattern
- [Vue.js Composables Guide](https://vuejs.org/guide/reusability/composables.html) - Composable reactivity rules
- [Common Mistakes Creating Composition Functions in Vue - Telerik](https://www.telerik.com/blogs/common-mistakes-creating-composition-functions-vue) - Reactivity loss patterns
- [Pinia Testing Documentation](https://pinia.vuejs.org/cookbook/testing.html) - `setActivePinia` and `createTestingPinia`
- [Pinia - How to use createTestingPinia outside component - Discussion #975](https://github.com/vuejs/pinia/discussions/975) - Singleton state in tests
- [Villus GraphQL Client Documentation](https://villus.dev/guide/overview/) - Requires Vue app context
- [Retrofitting Tests - Medium](https://modelephant.medium.com/software-engineering-why-retrofitting-tests-is-hard-9ea4e7af3e48) - Test isolation strategies
- [Best way to start testing untested code - understandlegacycode.com](https://understandlegacycode.com/blog/best-way-to-start-testing-untested-code/) - Outside-in approach
- [Hardy-Weinberg in Large Scale Genomic Sequencing Era - PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC7083100/) - HWE correctness for large datasets
- [GitHub Pages Monorepo Deployment - This Dot Labs](https://www.thisdot.co/blog/deploying-multiple-apps-from-a-monorepo-to-github-pages) - Base path configuration
