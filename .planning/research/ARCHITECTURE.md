# Architecture Research

**Domain:** Monorepo extraction for TypeScript genetic carrier frequency calculator
**Researched:** 2026-02-23
**Confidence:** HIGH (based on direct codebase analysis — all findings verified against actual source files)

---

## Standard Architecture

### System Overview

```
gnomad-carrier-frequency/          (monorepo root — workspace)
├── packages/
│   └── core/                      (pure TypeScript, no Vue, no DOM)
│       ├── src/
│       │   ├── api/               # gnomAD GraphQL fetch (plain fetch, not villus)
│       │   ├── calculations/      # Hardy-Weinberg math (from frequency-calc.ts)
│       │   ├── filters/           # Variant filtering logic (from variant-filters.ts)
│       │   ├── text/              # Template renderer (from template-renderer.ts)
│       │   ├── config/            # Config loaders (from config/index.ts + JSON)
│       │   └── types/             # Shared TypeScript types (from src/types/)
│       ├── package.json
│       └── tsconfig.json
├── apps/
│   └── web/                       (current src/ — Vue 3 + Vuetify + Pinia)
│       ├── src/
│       │   ├── api/               # villus client (thin Vue wrapper over core fetch)
│       │   ├── components/        # Vue components (unchanged)
│       │   ├── composables/       # Vue composables (thin wrappers over core)
│       │   ├── stores/            # Pinia stores (unchanged)
│       │   └── ...                # rest unchanged
│       ├── vite.config.ts
│       └── package.json
├── packages/
│   └── cli/                       (new — Node.js CLI consumer of core)
│       ├── src/
│       │   └── index.ts           # CLI entry point
│       ├── package.json
│       └── tsconfig.json
├── package.json                   (workspace root)
└── bun.lock                       (single lockfile for all packages)
```

### Component Responsibilities

| Component | Package | Responsibility | Vue Dependency |
|-----------|---------|----------------|---------------|
| `gnomad-fetch.ts` | core | Raw GraphQL fetch over native `fetch` | None |
| `variant-filters.ts` | core | LoF HC + ClinVar pathogenic filtering logic | None |
| `frequency-calc.ts` | core | Hardy-Weinberg calculation, population aggregation | None |
| `template-renderer.ts` | core | `{{variable}}` substitution in clinical text | None |
| `clinvar-submissions.ts` | core | ClinVar batch query builder + parser + P/LP threshold | None |
| `config/` | core | JSON config loaders + typed helpers | None |
| `types/` | core | All shared TypeScript interfaces | None |
| `useGeneVariants.ts` | web | Wraps core fetch with villus reactive caching | Vue (villus) |
| `useCarrierFrequency.ts` | web | Orchestrates reactive computation pipeline | Vue (computed/ref) |
| `useExclusionState.ts` | web | Reactive singleton for manual exclusion tracking | Vue (reactive) |
| `useTextGenerator.ts` | web | Wires template store + core renderer reactively | Vue (computed) |
| `useTemplateStore.ts` | web | Pinia persisted store for language/gender/sections | Pinia |
| `CLI entry` | cli | Imperative calls to core, outputs text to stdout | None |

---

## Recommended Project Structure

### packages/core

This is the extraction target. All of the following move with zero logic changes — only import paths change.

```
packages/core/
├── src/
│   ├── api/
│   │   ├── gnomad-fetch.ts        # NEW: plain fetch wrapper replacing villus dependency
│   │   ├── queries/
│   │   │   ├── gene-search.ts     # MOVED: GENE_SEARCH_QUERY, GENE_DETAILS_QUERY (no change)
│   │   │   ├── gene-variants.ts   # MOVED: GENE_VARIANTS_QUERY (no change)
│   │   │   ├── clinvar-submissions.ts  # MOVED: buildSubmissionsQuery, parseSubmissionsResponse,
│   │   │   │                          #         calculatePathogenicPercentage, meetsConflictingThreshold
│   │   │   └── types.ts           # MOVED: GeneVariant, GeneData, etc. (no change)
│   │   └── index.ts
│   ├── calculations/
│   │   └── frequency-calc.ts      # MOVED: calculateCarrierFrequency, aggregatePopulationFrequencies,
│   │                              #         buildPopulationFrequencies, calculateRecurrenceRisk
│   ├── filters/
│   │   └── variant-filters.ts     # MOVED: filterPathogenicVariantsConfigurable, shouldIncludeVariant,
│   │                              #         isHighConfidenceLoF, isPathogenicClinVar, etc.
│   ├── text/
│   │   ├── template-renderer.ts   # MOVED: renderTemplate (no change — already pure)
│   │   └── template-parser.ts     # MOVED: parseTemplate, segmentsToTemplate (no change)
│   ├── config/
│   │   ├── index.ts               # MOVED: getGnomadVersion, getPopulationCodes, etc. (no change)
│   │   ├── types.ts               # MOVED: GnomadConfig, AppSettings, etc. (no change)
│   │   ├── gnomad.json            # MOVED: version config, population codes
│   │   ├── settings.json          # MOVED: thresholds, debounce, etc.
│   │   ├── exclusion-reasons.ts   # MOVED: EXCLUSION_REASONS constant
│   │   └── templates/
│   │       ├── de.json            # MOVED: German clinical text templates
│   │       └── en.json            # MOVED: English clinical text templates
│   ├── types/
│   │   ├── variant.ts             # MOVED: GnomadVariant, ClinVarVariant, TranscriptConsequence
│   │   ├── frequency.ts           # MOVED: CarrierFrequencyResult, PopulationFrequency, IndexPatientStatus
│   │   ├── filter.ts              # MOVED: FilterConfig, FACTORY_FILTER_DEFAULTS
│   │   ├── text.ts                # MOVED: TemplateContext, Perspective, GenderStyle, PatientSex
│   │   ├── exclusion.ts           # MOVED: ExclusionReason, ExclusionState
│   │   └── index.ts               # Re-exports
│   └── index.ts                   # Public API surface of the package
├── package.json
└── tsconfig.json
```

### apps/web (current repo restructured)

```
apps/web/
├── src/
│   ├── api/
│   │   ├── client.ts              # STAYS: villus client + useGnomadVersion (Vue reactive)
│   │   └── index.ts
│   ├── components/                # STAYS: all .vue files unchanged
│   ├── composables/
│   │   ├── useCarrierFrequency.ts # STAYS but THINNED: delegates to core, keeps Vue reactivity
│   │   ├── useGeneVariants.ts     # STAYS: villus useQuery wrapper (pure Vue concern)
│   │   ├── useGeneSearch.ts       # STAYS: villus useQuery wrapper
│   │   ├── useTextGenerator.ts    # STAYS but THINNED: wires store to core renderTemplate
│   │   ├── useExclusionState.ts   # STAYS: Vue reactive singleton (state management only)
│   │   ├── useClinvarSubmissions.ts # STAYS: Vue ref wrapping (calls core fetch functions)
│   │   └── ... (all others stay)
│   ├── stores/                    # STAYS: all Pinia stores unchanged
│   ├── types/                     # REPLACED: re-exports from @gnomad-cf/core
│   ├── config/                    # REPLACED: re-exports from @gnomad-cf/core
│   └── utils/                     # REPLACED: re-exports from @gnomad-cf/core
├── vite.config.ts                 # STAYS: unchanged
└── package.json                   # UPDATED: adds @gnomad-cf/core workspace dep
```

### packages/cli

```
packages/cli/
├── src/
│   ├── index.ts                   # CLI entry (commander or yargs)
│   ├── commands/
│   │   ├── calculate.ts           # gnomad-cf calculate CFTR --version v4
│   │   └── text.ts                # gnomad-cf text CFTR --lang de --status heterozygous
│   └── output/
│       └── formatters.ts          # CLI-specific output formatting (TSV, JSON, human-readable)
├── package.json
└── tsconfig.json
```

---

## Architectural Patterns

### Pattern 1: Vue Coupling Analysis — What Is Actually Coupled

The key finding from reading the actual code: the Vue coupling in composables is shallow and consistent. Each composable has a clear seam.

**Coupling inventory per composable:**

| Composable | Vue APIs Used | Core Logic Status |
|-----------|---------------|-------------------|
| `useCarrierFrequency` | `ref`, `computed`, `watch`, `watchDebounced` | Logic is in `frequency-calc.ts` (already pure) |
| `useGeneVariants` | `useQuery` (villus), `computed` | Query string + types already pure in `api/queries/` |
| `useTextGenerator` | `computed` | Logic helpers are all pure functions at bottom of file |
| `useExclusionState` | `reactive`, `computed` | State management only — no domain logic |
| `useClinvarSubmissions` | `ref` | HTTP fetch using native `fetch` — already framework-free |

**Key observation:** `useClinvarSubmissions` already uses native `fetch` directly (not villus). Only `useGeneVariants` and `useGeneSearch` use villus. The submission batching, query building, and ClinVar threshold logic are all pure functions.

### Pattern 2: The Extraction Seam

Every composable follows this pattern:

```typescript
// BEFORE (in apps/web composable):
import { computed, ref } from 'vue';
import { filterPathogenicVariantsConfigurable } from '@/utils/variant-filters';
import { aggregatePopulationFrequencies } from '@/utils/frequency-calc';

// AFTER (same composable, updated import):
import { computed, ref } from 'vue';
import {
  filterPathogenicVariantsConfigurable,
  aggregatePopulationFrequencies,
} from '@gnomad-cf/core';
```

No composable logic needs to change — only import paths update from `@/utils/...` to `@gnomad-cf/core`.

### Pattern 3: core/api — Replacing villus with plain fetch

`useGeneVariants` uses villus `useQuery` for reactive caching. The core package needs a non-reactive equivalent for CLI use:

```typescript
// packages/core/src/api/gnomad-fetch.ts

export async function fetchGeneVariants(
  geneSymbol: string,
  version: GnomadVersion,
  config: GnomadVersionConfig
): Promise<GeneData | null> {
  const query = GENE_VARIANTS_QUERY;
  const variables = {
    geneSymbol: geneSymbol.toUpperCase(),
    dataset: config.datasetId,
    referenceGenome: config.referenceGenome,
  };

  const response = await fetch(config.apiEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`gnomAD API error: ${response.status}`);
  }

  const json = await response.json();
  if (json.errors?.length) {
    throw new Error(json.errors[0].message);
  }

  return (json.data as GeneVariantsResponse).gene;
}

export async function fetchGeneSearch(
  query: string,
  referenceGenome: 'GRCh38' | 'GRCh37'
): Promise<GeneSearchResult[]> { ... }
```

This pattern already exists in the codebase: `useClinvarSubmissions.ts` does exactly this using native `fetch`. The CLI path simply calls these functions imperatively instead of reactively.

### Pattern 4: Config Flow — JSON through the system

```
packages/core/src/config/gnomad.json
    ↓ import (JSON module assertion or bundler resolution)
packages/core/src/config/index.ts
    getGnomadVersion(version)    → GnomadVersionConfig
    getDatasetId(version)        → string ('gnomad_r4', etc.)
    getReferenceGenome(version)  → 'GRCh38' | 'GRCh37'
    getPopulationCodes(version)  → string[]
    getPopulationLabel(code)     → string
    ↓ re-exported from
packages/core/src/index.ts
    ↓ imported by
apps/web/src/composables/*.ts   → same helpers, same JSON data
packages/cli/src/commands/*.ts  → same helpers, same JSON data
```

The config is truly shared: one JSON file, one loader, consumed identically by web and CLI. No duplication.

### Pattern 5: Template JSON — Both packages read the same files

The clinical text templates (`de.json`, `en.json`) live in `packages/core/src/config/templates/`. The web app's `useTemplateStore` (Pinia) imports them as JSON modules. The CLI can import them the same way — pure JSON, no DOM dependency.

```typescript
// Both web and CLI do this identically:
import deTemplates from '@gnomad-cf/core/config/templates/de.json';
import enTemplates from '@gnomad-cf/core/config/templates/en.json';
```

The Pinia store wraps these with reactive state (language preference, custom overrides). The CLI uses them directly without the store layer.

### Pattern 6: CLI Imperative Pipeline

```typescript
// packages/cli/src/commands/calculate.ts

import {
  fetchGeneVariants,
  fetchClinvarSubmissions,
  filterPathogenicVariantsConfigurable,
  aggregatePopulationFrequencies,
  buildPopulationFrequencies,
  calculateCarrierFrequency,
  getGnomadVersion,
  FACTORY_FILTER_DEFAULTS,
} from '@gnomad-cf/core';

export async function runCalculate(geneSymbol: string, options: CliOptions) {
  const versionConfig = getGnomadVersion(options.version);

  // 1. Fetch variants
  const gene = await fetchGeneVariants(geneSymbol, options.version, versionConfig);

  // 2. Filter to pathogenic
  const pathogenic = filterPathogenicVariantsConfigurable(
    gene.variants,
    gene.clinvar_variants,
    FACTORY_FILTER_DEFAULTS
  );

  // 3. Aggregate populations
  const aggregated = aggregatePopulationFrequencies(pathogenic, options.version);

  // 4. Build result
  const sumAF = [...aggregated.values()].reduce((s, p) => s + p.sumAF, 0);
  const carrierFreq = 2 * sumAF;

  console.log(`${geneSymbol}: ${(carrierFreq * 100).toFixed(2)}% carrier frequency`);
}
```

The CLI calls the same pure functions the web composables call. No code duplication.

---

## Data Flow

### Web App Data Flow (current, preserved)

```
User types gene name
    → useGeneSearch (villus reactive query)
    → gnomAD GraphQL /api (GENE_SEARCH_QUERY)
    → GeneSearchResult[]
    → user selects gene
    → useGeneVariants (villus useQuery, cache-first)
    → gnomAD GraphQL /api (GENE_VARIANTS_QUERY)
    → GeneVariant[] + GeneClinvarVariant[]
    → useCarrierFrequency.normalizedVariants (computed)
    → filterPathogenicVariantsConfigurable [core]
    → aggregatePopulationFrequencies [core]
    → buildPopulationFrequencies [core]
    → CarrierFrequencyResult (reactive)
    → useTextGenerator
    → renderTemplate [core] (with TemplateContext)
    → clinical text string displayed in TextOutput.vue
```

### CLI Data Flow (new)

```
$ gnomad-cf calculate CFTR --version v4 --lang de

fetchGeneVariants('CFTR', 'v4', versionConfig) [core]
    → gnomAD GraphQL /api (same GENE_VARIANTS_QUERY)
    → GeneVariant[] + GeneClinvarVariant[]
filterPathogenicVariantsConfigurable(variants, clinvar, FACTORY_DEFAULTS) [core]
    → GnomadVariant[] (pathogenic only)
aggregatePopulationFrequencies(pathogenic, 'v4') [core]
    → Map<populationCode, {sumAF, totalAC, maxAN}>
buildPopulationFrequencies(aggregated, globalFreq, 'v4') [core]
    → PopulationFrequency[]
renderTemplate(template, context) [core]
    → clinical text string
stdout.write(text)
```

### Config Data Flow

```
gnomad.json + settings.json (in packages/core/src/config/)
    → imported via TypeScript JSON module imports
    → typed via GnomadConfig / AppSettings interfaces
    → accessed via helper functions (getDatasetId, getPopulationCodes, etc.)
    → consumed by:
        - core calculation functions (lowSampleSizeThreshold, founderEffectMultiplier)
        - web composables (via @gnomad-cf/core re-exports)
        - CLI commands (via @gnomad-cf/core re-exports)
```

---

## Integration Points

### New Components Required

| Component | Location | Purpose | Dependencies |
|-----------|----------|---------|--------------|
| `packages/core/src/api/gnomad-fetch.ts` | NEW | Plain `fetch` wrapper for gene variants + search | Native fetch, core types |
| `packages/core/src/index.ts` | NEW | Public API barrel — explicit exports only | All core modules |
| `packages/core/package.json` | NEW | Package manifest with exports map | TypeScript, bun/tsc |
| `packages/cli/src/index.ts` | NEW | CLI entry point + command registration | commander/yargs, core |
| `packages/cli/package.json` | NEW | CLI manifest, bin field | core workspace dep |
| `package.json` (root) | NEW | Workspace root with `workspaces` field | bun workspaces |

### Modified Components (web app)

| Component | Change Required | Risk |
|-----------|----------------|------|
| `apps/web/src/utils/*.ts` | Replace with re-exports from `@gnomad-cf/core` | Low — just re-exports |
| `apps/web/src/types/index.ts` | Replace with re-exports from `@gnomad-cf/core` | Low — just re-exports |
| `apps/web/src/config/index.ts` | Replace with re-exports from `@gnomad-cf/core` | Low — just re-exports |
| `apps/web/src/composables/useCarrierFrequency.ts` | Update: `@/utils/variant-filters` → `@gnomad-cf/core` | Low — mechanical change |
| `apps/web/src/composables/useCarrierFrequency.ts` | Update: `@/utils/frequency-calc` → `@gnomad-cf/core` | Low — mechanical change |
| `apps/web/src/composables/useClinvarSubmissions.ts` | Update: `@/api/queries` → `@gnomad-cf/core` | Low — mechanical change |
| `apps/web/vite.config.ts` | Add path alias for `@gnomad-cf/core` workspace | Low |
| `apps/web/package.json` | Add `"@gnomad-cf/core": "workspace:*"` dependency | Low |
| `.github/workflows/deploy.yml` | Update working directory for monorepo layout | Low |

### Unchanged Components

Everything in `apps/web/src/components/` stays untouched. Every `.vue` file is unchanged. All Pinia stores are unchanged. The villus client is unchanged. Vite config logic is unchanged.

---

## Build Pipeline

### Workspace Root

```json
{
  "name": "gnomad-cf-monorepo",
  "private": true,
  "workspaces": ["packages/*", "apps/*"],
  "scripts": {
    "build": "bun run --filter '@gnomad-cf/core' build && bun run --filter '*' build",
    "build:web": "bun run --filter '@gnomad-cf/web' build",
    "build:cli": "bun run --filter '@gnomad-cf/cli' build",
    "dev": "bun run --filter '@gnomad-cf/web' dev"
  }
}
```

### packages/core Build

Core uses `tsc` directly — no bundler needed for a library package.

```json
{
  "name": "@gnomad-cf/core",
  "version": "1.0.0",
  "type": "module",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./config/templates/*": "./src/config/templates/*"
  },
  "scripts": {
    "build": "tsc --project tsconfig.json",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "typescript": "~5.9.3"
  }
}
```

```json
// packages/core/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "declaration": true,
    "declarationMap": true,
    "strict": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"]
}
```

### apps/web Build

Unchanged from current. Vite handles everything. Only addition is path alias resolution for the workspace package:

```typescript
// apps/web/vite.config.ts (addition only)
resolve: {
  alias: {
    '@': fileURLToPath(new URL('./src', import.meta.url)),
    // During dev, resolve workspace package to source directly
    '@gnomad-cf/core': fileURLToPath(new URL('../../packages/core/src', import.meta.url)),
  }
}
```

In production builds, bun workspaces resolve `@gnomad-cf/core` to `packages/core/dist/` automatically after `core` is built.

### packages/cli Build

```json
{
  "name": "@gnomad-cf/cli",
  "version": "1.0.0",
  "type": "module",
  "bin": {
    "gnomad-cf": "./dist/index.js"
  },
  "scripts": {
    "build": "tsc --project tsconfig.json",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "@gnomad-cf/core": "workspace:*",
    "commander": "^12.0.0"
  }
}
```

### Build Order Dependency

```
1. packages/core (no workspace deps)
        ↓
2. apps/web (depends on @gnomad-cf/core)
   packages/cli (depends on @gnomad-cf/core)
        ↓
3. Deploy artifact from apps/web/dist/
```

Bun workspaces respects this automatically via the dependency graph.

---

## GitHub Actions Deployment

### Current deploy.yml — Minimal Changes Required

The current workflow (`bun install → lint → typecheck → build → docs:build → deploy`) continues to work with monorepo. The `apps/web` build is still `bun run build` — just invoked from the workspace root with filter, or from within `apps/web/`:

```yaml
# .github/workflows/deploy.yml — updated for monorepo

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: oven-sh/setup-bun@v2

      - name: Install dependencies
        run: bun install --frozen-lockfile
        # Bun workspaces: installs all packages in one command

      - name: Build core package
        run: bun run --filter '@gnomad-cf/core' build
        # Must run before web build

      - name: Lint web app
        run: bun run --filter '@gnomad-cf/web' lint

      - name: Type check web app
        run: bun run --filter '@gnomad-cf/web' typecheck

      - name: Build web app
        run: bun run --filter '@gnomad-cf/web' build

      - name: Build docs
        run: bun run --filter '@gnomad-cf/web' docs:build

      - name: Merge docs into artifact
        run: cp -r apps/web/docs/.vitepress/dist apps/web/dist/docs

      - name: Configure Pages
        uses: actions/configure-pages@v5

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v4
        with:
          path: './apps/web/dist'   # Changed: now in apps/web/

      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

The CLI is never built in the deploy workflow — it is not deployed. Only `apps/web` produces the GitHub Pages artifact.

---

## File-Level Migration Plan

### Phase 1: Extract packages/core (pure moves, no logic changes)

All moves preserve file content exactly — only import paths inside each file change from `@/...` to relative `../` paths within core.

| Source (current) | Destination (monorepo) | Import path changes |
|-----------------|----------------------|-------------------|
| `src/types/variant.ts` | `packages/core/src/types/variant.ts` | None (no internal imports) |
| `src/types/frequency.ts` | `packages/core/src/types/frequency.ts` | `@/config` → `../config` |
| `src/types/filter.ts` | `packages/core/src/types/filter.ts` | None |
| `src/types/text.ts` | `packages/core/src/types/text.ts` | None |
| `src/types/exclusion.ts` | `packages/core/src/types/exclusion.ts` | None |
| `src/types/history.ts` | `packages/core/src/types/history.ts` | None |
| `src/config/types.ts` | `packages/core/src/config/types.ts` | None |
| `src/config/gnomad.json` | `packages/core/src/config/gnomad.json` | None |
| `src/config/settings.json` | `packages/core/src/config/settings.json` | None |
| `src/config/index.ts` | `packages/core/src/config/index.ts` | Relative JSON imports |
| `src/config/exclusion-reasons.ts` | `packages/core/src/config/exclusion-reasons.ts` | None |
| `src/config/templates/de.json` | `packages/core/src/config/templates/de.json` | None |
| `src/config/templates/en.json` | `packages/core/src/config/templates/en.json` | None |
| `src/utils/variant-filters.ts` | `packages/core/src/filters/variant-filters.ts` | `@/types` → `../types`, `@/api/queries` → `../api/queries` |
| `src/utils/frequency-calc.ts` | `packages/core/src/calculations/frequency-calc.ts` | `@/config` → `../config`, `@/types` → `../types` |
| `src/utils/template-renderer.ts` | `packages/core/src/text/template-renderer.ts` | `@/types` → `../types` |
| `src/utils/template-parser.ts` | `packages/core/src/text/template-parser.ts` | `@/config/template-variables` → `../config/template-variables` |
| `src/api/queries/types.ts` | `packages/core/src/api/queries/types.ts` | None |
| `src/api/queries/gene-search.ts` | `packages/core/src/api/queries/gene-search.ts` | None |
| `src/api/queries/gene-variants.ts` | `packages/core/src/api/queries/gene-variants.ts` | None |
| `src/api/queries/clinvar-submissions.ts` | `packages/core/src/api/queries/clinvar-submissions.ts` | None |

### Phase 2: Create new files

| File | Content |
|------|---------|
| `packages/core/src/api/gnomad-fetch.ts` | Plain `fetch` implementation (see Pattern 3 above) |
| `packages/core/src/index.ts` | Barrel: explicit re-exports of all public API |
| `packages/core/package.json` | Package manifest with exports map |
| `packages/core/tsconfig.json` | TypeScript config for library build |
| `packages/cli/src/index.ts` | CLI entry point |
| `packages/cli/package.json` | CLI package manifest |

### Phase 3: Update apps/web (mechanical import path updates)

| File | Change |
|------|--------|
| `apps/web/src/utils/*.ts` | Replace content with `export * from '@gnomad-cf/core'` |
| `apps/web/src/types/index.ts` | Replace with `export * from '@gnomad-cf/core'` |
| `apps/web/src/config/index.ts` | Replace with `export * from '@gnomad-cf/core'` |
| `apps/web/src/composables/useCarrierFrequency.ts` | Update: `@/utils/variant-filters` → `@gnomad-cf/core` |
| `apps/web/src/composables/useCarrierFrequency.ts` | Update: `@/utils/frequency-calc` → `@gnomad-cf/core` |
| `apps/web/src/composables/useClinvarSubmissions.ts` | Update: `@/api/queries` → `@gnomad-cf/core` |
| `apps/web/vite.config.ts` | Add `@gnomad-cf/core` alias for dev mode |
| `apps/web/package.json` | Add `"@gnomad-cf/core": "workspace:*"` dependency |

### Phase 4: Root workspace setup

| File | Change |
|------|--------|
| `package.json` (root) | Add `"workspaces": ["packages/*", "apps/*"]` |
| `.github/workflows/deploy.yml` | Update paths as shown above |

---

## Suggested Build Order for Implementation

This ordering respects the dependency graph and minimizes risk:

1. **Set up monorepo root** — Add workspace config to root `package.json`, verify bun workspaces resolves correctly. No code changes yet.

2. **Create packages/core skeleton** — Empty package with `package.json`, `tsconfig.json`, `src/index.ts`. Verify it compiles.

3. **Move types first** — `src/types/*.ts` to `packages/core/src/types/`. No internal imports to fix. This is zero-risk.

4. **Move config second** — `src/config/` to `packages/core/src/config/`. Depends on types. Fix relative import paths.

5. **Move pure utils third** — `variant-filters.ts`, `frequency-calc.ts`, `template-renderer.ts`, `template-parser.ts`. Depends on types and config. Fix import paths.

6. **Move API queries fourth** — `src/api/queries/` to core. The query strings and types are already pure.

7. **Write gnomad-fetch.ts** — New file. Uses Pattern 3 (plain fetch). Model it on the existing `useClinvarSubmissions` fetch logic.

8. **Export from packages/core/src/index.ts** — Explicit barrel exports. Verify TypeScript builds with `tsc`.

9. **Update apps/web imports** — Change `@/utils/...`, `@/types/...`, `@/config/...` in composables to `@gnomad-cf/core`. The `@/` alias routes in `apps/web/` still work for web-only files (components, stores, composables).

10. **Update deploy.yml** — Adjust paths to monorepo layout.

11. **Create packages/cli** — After core is stable. CLI is the final consumer, can be built independently.

---

## Critical Constraints Identified

### Constraint 1: formatters.ts stays in apps/web

`src/utils/formatters.ts` uses `config.settings.frequencyDecimalPlaces` from the config, but is display-only. The web composables use it. The CLI would likely want its own output formatting. Keep `formatters.ts` in `apps/web` unless CLI needs the exact same formatted strings.

### Constraint 2: useExclusionState is Vue-only by design

`useExclusionState.ts` uses `reactive` and `computed` from Vue. Its state management role is inherently Vue — it is module-level singleton state that components share through reactivity. The CLI has no need for this because exclusions would be CLI flags (`--exclude 1-12345-A-G`), not interactive toggles.

Do not move to core. It stays in `apps/web`.

### Constraint 3: template-variables.ts boundary decision

`src/config/template-variables.ts` (imported by `template-parser.ts`) contains UI-facing metadata (display names for variables shown in the Template Editor UI). If `template-parser.ts` moves to core, `template-variables.ts` must move too. This is fine — it is pure data with no DOM dependency.

### Constraint 4: villus stays in apps/web only

villus uses Vue's `inject`/`provide` system internally (`useClient()`). It cannot be used outside a Vue component tree. The core package must use plain `fetch` for all HTTP. This is already established by the pattern in `useClinvarSubmissions.ts`.

### Constraint 5: Pinia stores stay in apps/web

`useTemplateStore` uses `defineStore` (Pinia) and `localStorage`. These are web-only. The CLI would accept language/gender style as CLI flags. No store migration needed.

### Constraint 6: JSON import resolution

`packages/core/tsconfig.json` must set `"resolveJsonModule": true`. The config relies on `import gnomadConfig from './gnomad.json'` — this is a direct TypeScript JSON module import, which works in both `tsc` (library) and Vite (web app). For bun CLI runtime, JSON imports work natively.

---

## Sources

All findings are from direct source code analysis. No external sources needed — confidence is HIGH because the entire codebase was read before drawing conclusions.

| File Analyzed | Key Finding |
|--------------|-------------|
| `src/composables/useCarrierFrequency.ts` | Vue coupling is only `ref`, `computed`, `watch` wrappers — all math delegates to utils |
| `src/composables/useGeneVariants.ts` | villus `useQuery` is the only framework coupling — query strings are pure |
| `src/composables/useClinvarSubmissions.ts` | Already uses native `fetch` — zero villus dependency, already the CLI pattern |
| `src/utils/variant-filters.ts` | Zero Vue imports — pure TypeScript functions |
| `src/utils/frequency-calc.ts` | Zero Vue imports — pure TypeScript functions |
| `src/utils/template-renderer.ts` | Zero Vue imports — single regex replace |
| `src/config/index.ts` | Zero Vue imports — JSON loaders and typed helpers |
| `src/types/` | Zero framework imports in any type file (except `frequency.ts` imports `GnomadVersion` from config) |
| `src/api/queries/clinvar-submissions.ts` | Zero framework imports — pure query builders and calculators |
| `.github/workflows/deploy.yml` | Uploads `./dist` — changes to `./apps/web/dist` in monorepo |
