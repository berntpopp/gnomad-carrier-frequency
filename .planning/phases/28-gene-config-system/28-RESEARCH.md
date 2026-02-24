# Phase 28: Gene Config System - Research

**Researched:** 2026-02-24
**Domain:** JSON schema design, Zod v4 validation, multi-platform config loading, Vuetify 3 indicator UI, GitHub Actions CI for contributor workflows
**Confidence:** HIGH (core technical decisions), MEDIUM (disease ID verification approach)

---

## Summary

Phase 28 adds a community-curated gene configuration system to this bun monorepo. The system consists of: (1) a `configs/genes/` directory at the repo root containing one JSON file per gene, (2) a Zod v4 schema in `packages/core` that validates those files, (3) a `loadGeneConfig(symbol)` loader function that works on both web (static import/fetch) and CLI (fs.readFile), (4) auto-apply behaviour in the web app when a gene is selected, (5) a GitHub Actions workflow that validates contributed configs on PR, and (6) a comprehensive contributing guide published to both `configs/CONTRIBUTING.md` and the VitePress docs site.

The project already uses Zod v4.3.5 (confirmed via `node_modules/zod/package.json`). The existing pattern in `url-state.ts` — define schema with `z.object()`, export `z.infer<typeof Schema>` type, parse with `safeParse` — is the template to follow. The existing Pinia stores (`useFilterStore`, `useCalcStore`) and the `selectGene` flow in `useGeneSearch` are the integration hooks for auto-apply.

The primary design challenge is the multi-platform loader: web needs static JSON imports (bundled at build time) for known seed genes, or a fetch-based approach for dynamic configs; CLI needs Node.js `fs` reads. The recommended approach is a **static import map** in core for bundled configs plus a platform-injected loader for arbitrary runtime paths.

**Primary recommendation:** Use Zod v4 discriminated-union-free `z.object()` with optional fields for the gene config schema; store configs as `configs/genes/SYMBOL.json`; load via static import map in web/CLI; validate in CI with a standalone `bun scripts/validate-gene-configs.ts` script; integrate in web via a new `useGeneConfig` composable and Pinia store.

---

## Standard Stack

### Core (already in project)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Zod | 4.3.5 | Schema validation + TypeScript type inference | Already installed in `@gnomad-cf/core`; used for URL state parsing; v4 is stable |
| Vitest | ^3.0.0 | Unit testing | Already used for all core tests; node environment |
| Bun | 1.3.9 | Runtime for scripts and workspace management | Project monorepo runtime |
| TypeScript | ~5.9.3 | Type safety | Project-wide |

### Supporting (already in project)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Pinia | (web dep) | Reactive store for applied gene config state | Auto-apply state in web app |
| Vuetify 3 | (web dep) | `v-chip` component for "Gene config loaded" indicator | Visual indicator in UI |
| GitHub Actions | — | CI validation workflow on gene config PRs | `on: pull_request / paths: configs/genes/**` |

### No New Dependencies Required

The entire Phase 28 implementation uses zero new dependencies. Zod is already in `@gnomad-cf/core`, Vitest is already configured, and Bun scripts can run the validator. This is a significant advantage.

**Installation:** No new `bun install` needed.

---

## Architecture Patterns

### Recommended Project Structure

```
gnomad-carrier-frequency/
├── configs/
│   ├── genes/
│   │   ├── CFTR.json             # Seed gene config
│   │   ├── HEXA.json             # Seed gene config
│   │   └── GJB2.json             # Seed gene config
│   └── CONTRIBUTING.md           # Contributing guide (primary location)
├── packages/
│   └── core/
│       └── src/
│           ├── gene-config/       # New subpath entry point
│           │   ├── schema.ts      # Zod schema + exported types
│           │   ├── loader.ts      # loadGeneConfig(symbol) + platform loader injection
│           │   └── index.ts       # Barrel: schema + loader exports
│           └── config/
│               └── (existing files unchanged)
├── scripts/
│   └── validate-gene-configs.ts   # Standalone CI validation script
├── apps/
│   └── web/
│       ├── src/
│       │   ├── composables/
│       │   │   └── useGeneConfig.ts    # Auto-apply composable
│       │   └── stores/
│       │       └── useGeneConfigStore.ts  # Pinia store for applied config
│       └── docs/
│           └── guide/
│               └── contributing-gene-configs.md  # VitePress page
└── .github/
    └── workflows/
        └── validate-gene-configs.yml   # CI workflow for PRs touching configs/genes/
```

**Why `gene-config/` is a separate subpath in core:** The existing tsdown config defines 9 entry points. Gene config is a new concern (gene-specific metadata vs. app settings) and should be independently importable. Add it to `tsdown.config.ts` and the `exports` map in `package.json`.

### Pattern 1: Zod v4 Gene Config Schema

**What:** Define the gene config shape with Zod v4 `z.object()`. Use `z.optional()` for optional fields. Export the inferred TypeScript type with `z.infer<>`.

**Key Zod v4 facts verified against official changelog:**
- `z.object()` API is unchanged from v3 for basic field definitions
- `.optional()` still works as in v3
- `.safeParse()` returns `{ success: true, data: T } | { success: false, error: ZodError }`
- `z.string().regex()` works the same way
- `ZodError.issues` (not `.errors` — that was removed in v4)
- `z.enum([...])` works the same way
- `z.array(z.string())` works the same way
- `z.number().min(0).max(1)` works the same way
- Defaults in optional fields now apply (e.g., `.default("tuna").optional()` — note this is a v4 behavior change, avoid combining `.default()` and `.optional()` in the schema unless intended)

**Example schema:**

```typescript
// Source: packages/core/src/gene-config/schema.ts
// Pattern based on existing url-state.ts Zod usage in this project
import { z } from 'zod';

// Disease identifier: at least one of OMIM or MONDO required
// OMIM: 6-digit number, e.g. "219700" for Classic CF
// MONDO: "MONDO:XXXXXXX" format, 7 digits
const DiseaseIdentifierSchema = z.object({
  omimId: z.string().regex(/^\d{6}$/).optional(),
  mondoId: z.string().regex(/^MONDO:\d{7}$/).optional(),
  name: z.string().min(1),
}).refine(
  (data) => data.omimId !== undefined || data.mondoId !== undefined,
  { message: 'At least one of omimId or mondoId is required' }
);

const FilterConfigOverrideSchema = z.object({
  lofHcEnabled: z.boolean().optional(),
  missenseEnabled: z.boolean().optional(),
  clinvarEnabled: z.boolean().optional(),
  clinvarStarThreshold: z.number().int().min(0).max(4).optional(),
}).optional();

const ConditionProfileSchema = z.object({
  profileId: z.string().min(1),
  displayName: z.string().min(1),
  isDefault: z.boolean(),
  disease: DiseaseIdentifierSchema,
  penetrance: z.number().min(0).max(1).optional(),
  filterOverrides: FilterConfigOverrideSchema,
  variantExclusions: z.array(z.string()).optional(),
  notes: z.string().optional(),
  references: z.array(z.string().url()).optional(),
});

export const GeneConfigSchema = z.object({
  geneSymbol: z.string().min(1).max(20),
  displayName: z.string().optional(),
  omimGeneId: z.string().regex(/^\d{6}$/).optional(),
  inheritance: z.enum(['AR', 'XL', 'AD']).optional(),
  profiles: z.array(ConditionProfileSchema).min(1),
  schemaVersion: z.literal('1.0'),
}).refine(
  (data) => data.profiles.filter(p => p.isDefault).length === 1,
  { message: 'Exactly one profile must be marked as default' }
);

export type GeneConfig = z.infer<typeof GeneConfigSchema>;
export type ConditionProfile = z.infer<typeof ConditionProfileSchema>;
```

### Pattern 2: loadGeneConfig() — Platform-Neutral Loader

**What:** The loader must work in the browser (cannot use `fs`) and in Node.js/Bun (CLI). The recommended approach is a **registry + platform injector** pattern.

**Why not static JSON imports for everything:** Static imports bundle the JSON at build time. For seed genes this is fine. For dynamically contributed configs added at runtime (future), it won't work. The design decision: seed genes are statically imported and registered; the loader falls back to the injected platform loader for unknowns.

```typescript
// Source: packages/core/src/gene-config/loader.ts
import { GeneConfigSchema } from './schema.js';
import type { GeneConfig } from './schema.js';

// Static registry for bundled seed configs (web and CLI both benefit)
// Populated by each platform's entry point — or by core directly for known seeds
const registry = new Map<string, GeneConfig>();

/**
 * Register a gene config (call at startup for seed configs)
 */
export function registerGeneConfig(config: GeneConfig): void {
  registry.set(config.geneSymbol.toUpperCase(), config);
}

/**
 * Platform-injectable loader for dynamic configs (CLI use)
 * Set this before calling loadGeneConfig in CLI context
 */
let platformLoader: ((symbol: string) => Promise<unknown>) | null = null;

export function setPlatformLoader(
  loader: (symbol: string) => Promise<unknown>
): void {
  platformLoader = loader;
}

/**
 * Load and validate a gene config by symbol.
 * Returns validated config or null if not found.
 */
export async function loadGeneConfig(symbol: string): Promise<GeneConfig | null> {
  const upper = symbol.toUpperCase();

  // 1. Check static registry first (fastest path for seed configs)
  if (registry.has(upper)) {
    return registry.get(upper)!;
  }

  // 2. Fall back to platform loader (CLI: fs.readFile; custom setups)
  if (platformLoader) {
    try {
      const raw = await platformLoader(upper);
      const result = GeneConfigSchema.safeParse(raw);
      if (result.success) return result.data;
      console.warn(`[gene-config] Invalid config for ${upper}:`, result.error.issues);
      return null;
    } catch {
      return null;
    }
  }

  return null;
}
```

**Web app seed loading:** In `apps/web` entry point or a plugin:

```typescript
// apps/web/src/plugins/geneConfigs.ts
import { registerGeneConfig } from '@gnomad-cf/core/gene-config';
import cftrConfig from '../../../../configs/genes/CFTR.json';
import hexaConfig from '../../../../configs/genes/HEXA.json';
import gjb2Config from '../../../../configs/genes/GJB2.json';

export function registerSeedGeneConfigs() {
  // Type assertion safe: CI validates these before merge
  registerGeneConfig(cftrConfig as any);
  registerGeneConfig(hexaConfig as any);
  registerGeneConfig(gjb2Config as any);
}
```

**Note on JSON imports in Vite:** The project already uses `resolveJsonModule: true` and Vite regex aliases for JSON. Static JSON imports from `configs/genes/*.json` will work from within `apps/web` if the path resolves correctly. Add a Vite alias if needed: `'@/gene-configs': path.resolve(__dirname, '../../configs/genes')`.

**CLI loader:** The CLI package (Phase 27) can set the platform loader to read from `configs/genes/`:

```typescript
// packages/cli/src/gene-config-loader.ts
import { setPlatformLoader } from '@gnomad-cf/core/gene-config';
import { readFile } from 'fs/promises';
import { join } from 'path';

export function initGeneConfigLoader(configsDir: string) {
  setPlatformLoader(async (symbol) => {
    const filePath = join(configsDir, `${symbol}.json`);
    const raw = await readFile(filePath, 'utf-8');
    return JSON.parse(raw);
  });
}
```

### Pattern 3: Auto-Apply in Web App — useGeneConfig Composable

**What:** Watch `selectedGene` in `useGeneSearch`. When a gene is selected, look up its config in the registry. If found, silently apply filter overrides and penetrance to the stores.

```typescript
// apps/web/src/composables/useGeneConfig.ts
import { watch, ref } from 'vue';
import { loadGeneConfig } from '@gnomad-cf/core/gene-config';
import type { GeneConfig, ConditionProfile } from '@gnomad-cf/core/gene-config';
import { useGeneSearch } from './useGeneSearch';
import { useFilterStore } from '@/stores/useFilterStore';
import { useCalcStore } from '@/stores/useCalcStore';

// Module-level reactive state (singleton — matches useGeneSearch pattern)
const activeGeneConfig = ref<GeneConfig | null>(null);
const activeProfile = ref<ConditionProfile | null>(null);
const configLoaded = ref(false);

export function useGeneConfig() {
  const { selectedGene } = useGeneSearch();
  const filterStore = useFilterStore();
  const calcStore = useCalcStore();

  watch(selectedGene, async (gene) => {
    if (!gene) {
      activeGeneConfig.value = null;
      activeProfile.value = null;
      configLoaded.value = false;
      return;
    }

    const config = await loadGeneConfig(gene.symbol);
    if (!config) {
      activeGeneConfig.value = null;
      activeProfile.value = null;
      configLoaded.value = false;
      return;
    }

    activeGeneConfig.value = config;
    const defaultProfile = config.profiles.find(p => p.isDefault)!;
    activeProfile.value = defaultProfile;
    configLoaded.value = true;

    // Apply filter overrides silently
    if (defaultProfile.filterOverrides) {
      filterStore.setDefaults({ ...filterStore.defaults, ...defaultProfile.filterOverrides });
    }

    // Apply penetrance silently
    if (defaultProfile.penetrance !== undefined) {
      calcStore.setPenetrance(defaultProfile.penetrance);
    }
  }, { immediate: true });

  function selectProfile(profileId: string) {
    if (!activeGeneConfig.value) return;
    const profile = activeGeneConfig.value.profiles.find(p => p.profileId === profileId);
    if (!profile) return;
    activeProfile.value = profile;

    if (profile.filterOverrides) {
      filterStore.setDefaults({ ...filterStore.defaults, ...profile.filterOverrides });
    }
    if (profile.penetrance !== undefined) {
      calcStore.setPenetrance(profile.penetrance);
    }
  }

  function resetConfig() {
    filterStore.resetToFactoryDefaults();
    calcStore.resetToFactoryDefaults();
    activeGeneConfig.value = null;
    activeProfile.value = null;
    configLoaded.value = false;
  }

  return {
    activeGeneConfig,
    activeProfile,
    configLoaded,
    selectProfile,
    resetConfig,
    availableProfiles: activeGeneConfig.value?.profiles ?? [],
  };
}
```

### Pattern 4: Visual Indicator — "Gene config loaded" Chip

**What:** Use `v-chip` (Vuetify 3) with `size="x-small"` and `prepend-icon="mdi-dna"` in the StepGene component after the gene selection, consistent with `FilterChips.vue` pattern.

```vue
<!-- In StepGene.vue or FilterPanel.vue header area -->
<v-chip
  v-if="configLoaded"
  color="info"
  size="x-small"
  prepend-icon="mdi-dna"
  closable
  @click:close="resetConfig"
>
  Gene config loaded
</v-chip>

<!-- Profile selector if multiple profiles exist -->
<v-select
  v-if="configLoaded && activeGeneConfig.profiles.length > 1"
  :model-value="activeProfile?.profileId"
  :items="activeGeneConfig.profiles.map(p => ({ title: p.displayName, value: p.profileId }))"
  label="Condition profile"
  density="compact"
  hide-details
  @update:model-value="selectProfile($event)"
/>
```

**Placement:** Best placed in the `FilterPanel.vue` expansion panel title area — next to the "Filters" label, consistent with where `FilterChips` already appears. This groups it with filtering context where the effect is visible.

### Pattern 5: GitHub Actions CI Validation Workflow

**What:** A dedicated workflow that runs only on PRs touching `configs/genes/**`. Uses built-in `paths` filter (no third-party action needed). Runs a Bun script that validates all JSON files against the Zod schema.

```yaml
# .github/workflows/validate-gene-configs.yml
name: Validate Gene Configs

on:
  pull_request:
    paths:
      - 'configs/genes/**'
      - 'packages/core/src/gene-config/**'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5

      - uses: oven-sh/setup-bun@v2

      - name: Install dependencies
        run: bun install --frozen-lockfile

      - name: Validate gene configs
        run: bun run scripts/validate-gene-configs.ts
```

**Validation script pattern:**

```typescript
// scripts/validate-gene-configs.ts
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { GeneConfigSchema } from './packages/core/src/gene-config/schema.ts';

const configsDir = join(import.meta.dir, 'configs/genes');
const files = await readdir(configsDir);
const jsonFiles = files.filter(f => f.endsWith('.json'));

let hasErrors = false;

for (const file of jsonFiles) {
  const filePath = join(configsDir, file);
  const raw = JSON.parse(await readFile(filePath, 'utf-8'));
  const result = GeneConfigSchema.safeParse(raw);

  if (!result.success) {
    console.error(`FAIL: ${file}`);
    for (const issue of result.error.issues) {
      console.error(`  [${issue.path.join('.')}] ${issue.message}`);
    }
    hasErrors = true;
  } else {
    console.log(`OK:   ${file} (${result.data.profiles.length} profile(s))`);
  }
}

if (hasErrors) process.exit(1);
```

**Note on Bun script running TypeScript directly:** Bun natively runs `.ts` files without compilation. The script can import from `packages/core/src/gene-config/schema.ts` directly (without the built dist). This avoids needing to build core first in the validation step.

### Pattern 6: Seed Gene Config JSON Format

Based on the locked decisions (JSON format, optional fields, OMIM/MONDO required, profiles with default flag):

```json
{
  "schemaVersion": "1.0",
  "geneSymbol": "CFTR",
  "displayName": "Cystic Fibrosis Transmembrane Conductance Regulator",
  "omimGeneId": "602421",
  "inheritance": "AR",
  "profiles": [
    {
      "profileId": "classic-cf",
      "displayName": "Classic Cystic Fibrosis",
      "isDefault": true,
      "disease": {
        "omimId": "219700",
        "mondoId": "MONDO:0009061",
        "name": "Cystic fibrosis"
      },
      "penetrance": 1.0,
      "filterOverrides": {
        "lofHcEnabled": true,
        "missenseEnabled": true,
        "clinvarEnabled": true,
        "clinvarStarThreshold": 2
      },
      "variantExclusions": [],
      "notes": "Classic CF: full penetrance. Use gnomAD v4 for most current data.",
      "references": [
        "https://pubmed.ncbi.nlm.nih.gov/32484936/",
        "https://www.gimjournal.org/article/S1098-3600(23)00880-8/fulltext"
      ]
    },
    {
      "profileId": "cftr-rd",
      "displayName": "CFTR-Related Disorder",
      "isDefault": false,
      "disease": {
        "omimId": "277180",
        "name": "CFTR-related disorder"
      },
      "penetrance": 0.03,
      "filterOverrides": {
        "lofHcEnabled": true,
        "missenseEnabled": true,
        "clinvarEnabled": true,
        "clinvarStarThreshold": 1
      },
      "notes": "CFTR-RD: highly reduced penetrance (~3% for compound het with F508del). R117H;T7 variant.",
      "references": [
        "https://pubmed.ncbi.nlm.nih.gov/32327388/"
      ]
    }
  ]
}
```

### Anti-Patterns to Avoid

- **Bundling all community configs into `packages/core/src/`**: Configs must live in `configs/genes/` at repo root — separate from compiled library code, visible and approachable.
- **Using `z.record()` for profiles**: User decisions require an array of profiles with an explicit `isDefault` flag; use `z.array()` with `.refine()` to enforce exactly-one-default.
- **Accessing `ZodError.errors`**: Removed in Zod v4. Use `ZodError.issues` instead.
- **Using `.format()` on ZodError**: Deprecated in v4. Use `z.treeifyError(err)` or iterate `.issues`.
- **Calling `fetch()` for seed configs in web**: Static JSON imports bundled by Vite are faster and work offline (PWA). Reserve fetch for truly dynamic/runtime configs.
- **API calls to HGNC/OMIM during CI validation**: OMIM requires an API key and rate-limits. HGNC REST API works unauthenticated but adds network dependency to CI. Use regex-only format validation in the Zod schema; document manual lookup in the contributing guide.
- **Combining `.default()` and `.optional()` in Zod v4**: Behavior changed — defaults now apply even within optional fields. If a field should be optional without a default, use `.optional()` alone.
- **Storing filter store state as "gene config applied" flag in Pinia persist**: The applied gene config should NOT be persisted across sessions — only the user's overrides persist. The `useGeneConfig` composable should use module-level `ref()` (not a persisted store) for the active config.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSON schema validation | Custom JSON validation | Zod v4 (already installed) | Type inference, `.safeParse()`, `.issues`, refinements |
| TypeScript types from schema | Manual interface definitions | `z.infer<typeof Schema>` | Stay in sync with schema automatically |
| CI script runner | Custom shell/Python validator | `bun scripts/validate-gene-configs.ts` | Bun runs TypeScript natively; reuses core schema code |
| Disease ID format validation | API calls to OMIM/HGNC | Regex in Zod schema | OMIM requires API key; format regex is sufficient for CI |
| Profile-switch UI | Custom selector component | `v-select` (Vuetify 3, already used) | Matches existing FilterPanel UI patterns |
| "Config loaded" indicator | Custom badge component | `v-chip` (Vuetify 3, already used in FilterChips) | Consistent with existing chip pattern |
| Git path filtering for CI | Custom webhook/filter logic | `on: pull_request / paths: configs/genes/**` | Native GitHub Actions paths filter, no third-party action needed |

**Key insight:** The entire implementation reuses existing project dependencies (Zod, Vitest, Bun, Vuetify, Pinia). Zero new packages required.

---

## Common Pitfalls

### Pitfall 1: Zod v4 `.errors` vs `.issues`

**What goes wrong:** Code accesses `result.error.errors` (Zod v3 API) and gets `undefined` at runtime.
**Why it happens:** `ZodError.errors` was an alias removed in Zod v4. Only `ZodError.issues` exists.
**How to avoid:** Always use `result.error.issues` in the validation script and any error reporting code.
**Warning signs:** TypeScript won't catch this if types are not current; test with `safeParse` on invalid data.

### Pitfall 2: Exactly-One-Default Profile Not Enforced

**What goes wrong:** A contributed config has two profiles both marked `isDefault: true` (or none), causing ambiguous auto-apply behaviour.
**Why it happens:** Without a `.refine()` check in the schema, individual field validation passes.
**How to avoid:** Add `.refine((data) => data.profiles.filter(p => p.isDefault).length === 1, { message: 'Exactly one profile must be marked as default' })` to the `GeneConfigSchema`.
**Warning signs:** CI validation passes but app loads wrong default profile.

### Pitfall 3: tsdown Entry Point Not Added

**What goes wrong:** `@gnomad-cf/core/gene-config` import fails at runtime with module not found.
**Why it happens:** The `tsdown.config.ts` and `package.json` exports map must be updated to include the new `gene-config` entry point.
**How to avoid:** Add `gene-config: 'src/gene-config/index.ts'` to the entry object in `tsdown.config.ts`, and add `"./gene-config": "./dist/gene-config.js"` to `exports` in `packages/core/package.json`.
**Warning signs:** Vite build error or runtime import error in web app; type errors on import.

### Pitfall 4: Filter Store State Bleed Between Genes

**What goes wrong:** User selects Gene A (config auto-applies penetrance 0.5), then selects Gene B (no config). Gene B calculation uses Gene A's penetrance.
**Why it happens:** The watch in `useGeneConfig` doesn't reset filter/calc stores when switching to a gene without a config.
**How to avoid:** In the `watch(selectedGene, ...)` handler, always reset to factory defaults when `config === null` before returning, so that switching away from a gene with config restores defaults.
**Warning signs:** Penetrance slider shows non-100% value when no gene config is active.

### Pitfall 5: Circular Import Between gene-config and types

**What goes wrong:** `gene-config/schema.ts` imports from `@gnomad-cf/core/types` for `FilterConfig`, creating a circular dependency if `types` re-exports from `gene-config`.
**Why it happens:** tsdown treats each entry as a separate chunk; circular imports break tree-shaking.
**How to avoid:** `gene-config/schema.ts` should define its own `FilterConfigOverrideSchema` without importing `FilterConfig` from types. Alternatively, import the raw Zod type only (not the compiled FilterConfig). Keep `gene-config` schema self-contained.
**Warning signs:** Build errors about circular references; `z.infer` produces `never` type.

### Pitfall 6: OMIM Gene ID vs. OMIM Disease (Phenotype) ID Confusion

**What goes wrong:** Contributor puts the OMIM Gene Entry ID (e.g., CFTR gene entry: 602421) in the `disease.omimId` field instead of the OMIM Phenotype MIM number (e.g., CF disease: 219700).
**Why it happens:** OMIM has separate entries for genes (asterisk prefix) and phenotypes (hash prefix) with the same 6-digit format.
**How to avoid:** In the schema, consider naming the disease identifier field clearly. In the contributing guide, explain the distinction with examples: "disease OMIM ID" for CF is 219700 (phenotype entry), not 602421 (gene entry).
**Warning signs:** OMIM lookup shows a gene entry page, not a disease page.

### Pitfall 7: JSON Static Import Path from Web App

**What goes wrong:** `import cftrConfig from '../../../../configs/genes/CFTR.json'` resolves incorrectly in the Vite build, causing a module not found error.
**Why it happens:** Relative paths from `apps/web/src/plugins/` to the repo-root `configs/` directory require traversing up 4 levels — fragile and easy to miscalculate.
**How to avoid:** Add a Vite alias in `apps/web/vite.config.ts`: `'~gene-configs': path.resolve(__dirname, '../../configs/genes')`. Then import as `import cftrConfig from '~gene-configs/CFTR.json'`. Also add `tsconfig.json` path alias for TypeScript.
**Warning signs:** Vite build error `Cannot find module '../../../configs/genes/CFTR.json'`.

---

## Code Examples

### Complete Zod v4 Schema for GeneConfig

```typescript
// Source: official Zod v4 docs (zod.dev/v4) + existing project url-state.ts pattern
import { z } from 'zod';

const DiseaseIdentifierSchema = z.object({
  omimId: z.string().regex(/^\d{6}$/).optional(),
  mondoId: z.string().regex(/^MONDO:\d{7}$/).optional(),
  name: z.string().min(1),
}).refine(
  (d) => d.omimId !== undefined || d.mondoId !== undefined,
  { message: 'At least one of omimId or mondoId is required' }
);

const FilterConfigOverrideSchema = z.object({
  lofHcEnabled: z.boolean().optional(),
  missenseEnabled: z.boolean().optional(),
  clinvarEnabled: z.boolean().optional(),
  clinvarStarThreshold: z.number().int().min(0).max(4).optional(),
  clinvarIncludeConflicting: z.boolean().optional(),
  clinvarConflictingThreshold: z.number().int().min(50).max(100).optional(),
});

const ConditionProfileSchema = z.object({
  profileId: z.string().min(1),
  displayName: z.string().min(1),
  isDefault: z.boolean(),
  disease: DiseaseIdentifierSchema,
  penetrance: z.number().min(0).max(1).optional(),
  filterOverrides: FilterConfigOverrideSchema.optional(),
  variantExclusions: z.array(z.string()).optional(),
  notes: z.string().optional(),
  references: z.array(z.string().url()).optional(),
});

export const GeneConfigSchema = z.object({
  schemaVersion: z.literal('1.0'),
  geneSymbol: z.string().min(1).max(20),
  displayName: z.string().optional(),
  omimGeneId: z.string().regex(/^\d{6}$/).optional(),
  inheritance: z.enum(['AR', 'XL', 'AD']).optional(),
  profiles: z.array(ConditionProfileSchema).min(1),
}).refine(
  (data) => data.profiles.filter(p => p.isDefault).length === 1,
  { message: 'Exactly one profile must be marked as default' }
);

export type GeneConfig = z.infer<typeof GeneConfigSchema>;
export type ConditionProfile = z.infer<typeof ConditionProfileSchema>;
export type DiseaseIdentifier = z.infer<typeof DiseaseIdentifierSchema>;
```

### Validation Script (CI-Compatible)

```typescript
// scripts/validate-gene-configs.ts
// Run with: bun scripts/validate-gene-configs.ts
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
// Bun runs TS directly — import from source, not dist
import { GeneConfigSchema } from '../packages/core/src/gene-config/schema.ts';

const configsDir = join(import.meta.dir, '../configs/genes');

let files: string[];
try {
  files = await readdir(configsDir);
} catch {
  console.error(`Error: configs/genes/ directory not found at ${configsDir}`);
  process.exit(1);
}

const jsonFiles = files.filter(f => f.endsWith('.json'));
if (jsonFiles.length === 0) {
  console.log('No gene config files found');
  process.exit(0);
}

let hasErrors = false;

for (const file of jsonFiles) {
  const filePath = join(configsDir, file);
  let raw: unknown;
  try {
    raw = JSON.parse(await readFile(filePath, 'utf-8'));
  } catch (e) {
    console.error(`FAIL: ${file} — JSON parse error: ${e}`);
    hasErrors = true;
    continue;
  }

  const result = GeneConfigSchema.safeParse(raw);
  if (!result.success) {
    console.error(`FAIL: ${file}`);
    // Note: Zod v4 uses .issues, not .errors
    for (const issue of result.error.issues) {
      const path = issue.path.join('.') || '(root)';
      console.error(`  [${path}] ${issue.message}`);
    }
    hasErrors = true;
  } else {
    const config = result.data;
    const defaultProfile = config.profiles.find(p => p.isDefault)!;
    console.log(`OK:   ${file} — ${config.profiles.length} profile(s), default: "${defaultProfile.displayName}"`);
  }
}

if (hasErrors) {
  console.error('\nValidation failed. Fix errors above before merging.');
  process.exit(1);
}

console.log('\nAll gene configs valid.');
```

### Unit Test Pattern (Vitest)

```typescript
// packages/core/tests/gene-config.test.ts
import { describe, it, expect } from 'vitest';
import { GeneConfigSchema, loadGeneConfig, registerGeneConfig } from '../src/gene-config/index.js';

describe('GeneConfigSchema', () => {
  it('validates a minimal valid config', () => {
    const minimal = {
      schemaVersion: '1.0',
      geneSymbol: 'TEST',
      profiles: [{
        profileId: 'default',
        displayName: 'Test Disease',
        isDefault: true,
        disease: { omimId: '123456', name: 'Test' },
      }],
    };
    const result = GeneConfigSchema.safeParse(minimal);
    expect(result.success).toBe(true);
  });

  it('rejects config with no default profile', () => {
    const invalid = {
      schemaVersion: '1.0',
      geneSymbol: 'TEST',
      profiles: [{
        profileId: 'p1',
        displayName: 'Profile 1',
        isDefault: false,
        disease: { omimId: '123456', name: 'Test' },
      }],
    };
    const result = GeneConfigSchema.safeParse(invalid);
    expect(result.success).toBe(false);
    // Zod v4: use .issues not .errors
    expect(result.error?.issues.some(i => i.message.includes('default'))).toBe(true);
  });

  it('rejects config with two default profiles', () => {
    // ... similar pattern
  });

  it('rejects disease without OMIM or MONDO ID', () => {
    // ... test refine on DiseaseIdentifierSchema
  });
});

describe('loadGeneConfig', () => {
  it('returns null for unknown gene', async () => {
    const result = await loadGeneConfig('UNKNOWN_GENE_XYZ');
    expect(result).toBeNull();
  });

  it('returns registered config by symbol (case-insensitive)', async () => {
    const config = GeneConfigSchema.parse({
      schemaVersion: '1.0',
      geneSymbol: 'TESTGENE',
      profiles: [{ profileId: 'p1', displayName: 'D', isDefault: true, disease: { omimId: '123456', name: 'D' } }],
    });
    registerGeneConfig(config);
    expect(await loadGeneConfig('testgene')).toEqual(config);
    expect(await loadGeneConfig('TESTGENE')).toEqual(config);
  });
});
```

### GitHub Actions Workflow

```yaml
# .github/workflows/validate-gene-configs.yml
name: Validate Gene Configs

on:
  pull_request:
    paths:
      - 'configs/genes/**'
      - 'packages/core/src/gene-config/**'
      - 'scripts/validate-gene-configs.ts'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5

      - uses: oven-sh/setup-bun@v2

      - name: Install dependencies
        run: bun install --frozen-lockfile

      - name: Validate gene configs
        run: bun scripts/validate-gene-configs.ts
```

---

## Disease ID Verification Approach (Claude's Discretion)

**Recommendation: Regex-only format validation in Zod schema + manual lookup documented in contributing guide.**

Rationale:
- OMIM API requires a personal API key (not shareable in CI) and is rate-limited. Confirmed from official OMIM API docs.
- HGNC REST API (`https://rest.genenames.org/fetch/symbol/SYMBOL`) works without authentication and is rate-limited to 10 req/sec. Suitable for single-gene validation but adds network dependency to CI.
- MONDO IDs (`MONDO:XXXXXXX`) have no free API equivalent for CI-time validation.
- **Format validation is sufficient for correctness:** A 6-digit OMIM number that's wrong will be caught by human maintainer review during PR, not by CI. Regex validates the structural format: `^\d{6}$` for OMIM phenotype IDs, `^MONDO:\d{7}$` for MONDO.
- The contributing guide should link contributors to OMIM.org and Monarch Initiative for lookup.

**Potential future enhancement (not in scope for Phase 28):** Add optional HGNC gene symbol validation step to the CI script — fetch `https://rest.genenames.org/fetch/symbol/{SYMBOL}` and verify the gene exists. This adds a network call but no API key. Flag as out of scope for now.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Zod v3 `.errors` property | Zod v4 `.issues` property | Zod v4.0 (2025) | Use `.issues` in all error handling code |
| Zod v3 `.format()` / `.flatten()` | Zod v4 `z.treeifyError()` | Zod v4.0 (2025) | Update error display code if used |
| Zod v3 `z.string().email()` etc. | Zod v4 `z.email()` top-level | Zod v4.0 (2025) | Method form deprecated but still works |
| GitHub Actions checkout@v4 | checkout@v5 | Late 2024 | Project already uses v5 in ci.yml and deploy.yml |
| setup-bun@v1 | setup-bun@v2 | 2024 | Project already uses v2 |

**Not deprecated in this project's context:**
- `z.object()`, `z.string()`, `z.array()`, `z.enum()`, `z.literal()`, `z.number()`, `z.boolean()` — all work identically in v3 and v4
- `safeParse()` — unchanged
- `z.infer<typeof Schema>` — unchanged

---

## Open Questions

1. **Vite alias for configs/genes/ JSON imports**
   - What we know: Project uses `resolveJsonModule: true` in tsconfig. JSON files can be statically imported.
   - What's unclear: The exact Vite config change needed to resolve `configs/genes/CFTR.json` from within `apps/web/`. Need to verify the Vite alias configuration doesn't conflict with existing aliases.
   - Recommendation: Add `'~gene-configs'` alias in `apps/web/vite.config.ts`. Verify by running `bun run build` after adding one test import.

2. **Platform loader for CLI — configs directory location**
   - What we know: CLI package (Phase 27) is not yet implemented. The CLI will need to know where `configs/genes/` is relative to the project root.
   - What's unclear: Will the CLI be distributed as a standalone binary (where configs would not be adjacent), or always run from within the repo?
   - Recommendation: For now, default the CLI platform loader to `process.cwd() + '/configs/genes/'`, which works correctly when running from the repo root. Add `--configs-dir` flag to override.

3. **VitePress docs sidebar entry for contributing guide**
   - What we know: The VitePress config at `apps/web/docs/.vitepress/config.ts` has a `/guide/` sidebar section and an `/about/` section with "Contributing".
   - What's unclear: Whether the contributing guide belongs under `/guide/` (user-facing) or `/about/` (developer-facing) in the sidebar.
   - Recommendation: Add a `/contribute/` section or place it under `/guide/` as `Contributing Gene Configs`. The context decision says "contributing guide" should be approachable to clinical geneticists, suggesting `/guide/` placement is better.

---

## Sources

### Primary (HIGH confidence)

- Zod v4 release notes (zod.dev/v4) — confirmed `.issues` vs `.errors`, `z.object()` unchanged API, `safeParse()` unchanged
- Zod v4 changelog (zod.dev/v4/changelog) — verified breaking changes: `.errors` removed, `.format()`/`.flatten()` deprecated, defaults-in-optionals behavior change
- Project codebase inspection (`packages/core/src/types/url-state.ts`) — verified existing Zod v4 patterns used in this project
- Project codebase inspection (`packages/core/package.json`) — confirmed `zod@4.3.5` installed
- Project codebase inspection (`.github/workflows/ci.yml`, `deploy.yml`) — confirmed `actions/checkout@v5`, `oven-sh/setup-bun@v2` versions
- Project codebase inspection (`packages/core/src/config/index.ts`, `gnomad.json`) — confirmed JSON import pattern with `resolveJsonModule`
- Project codebase inspection (`apps/web/src/composables/useGeneSearch.ts`) — confirmed `selectGene()` integration hook
- Project codebase inspection (`apps/web/src/components/FilterChips.vue`) — confirmed `v-chip` chip pattern for indicators
- Project codebase inspection (`apps/web/src/stores/useFilterStore.ts`, `useCalcStore.ts`) — confirmed store actions for auto-apply
- HGNC REST API docs (genenames.org/help/rest/) — confirmed free unauthenticated access, `https://rest.genenames.org/fetch/symbol/{SYMBOL}`
- OMIM API docs (omim.org/help/api) — confirmed API key required, 6-digit MIM number format

### Secondary (MEDIUM confidence)

- MONDO identifier format (mondo.monarchinitiative.org) — confirmed `MONDO:XXXXXXX` format (7 digits) from multiple search results
- GitHub Actions path filter docs (community discussions, oneuptime.com blog) — confirmed `on: pull_request / paths:` native filter, no third-party action needed

### Tertiary (LOW confidence)

- CFTR penetrance values from published literature — not directly verified against current ACMG guidelines; contributor should cite primary source in config
- GJB2 carrier frequency data — from academic publications found via search; seed config values should be curated from primary literature by domain expert

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Zod v4 already in project; all other libraries existing
- Architecture (schema design): HIGH — follows existing project patterns (url-state.ts, config/index.ts)
- Architecture (loader): HIGH — platform-neutral pattern is well-established; statically imported JSON is Vite-supported
- Architecture (web integration): HIGH — composable + store pattern matches existing project
- Architecture (CI): HIGH — GitHub Actions path filter is documented behavior
- Pitfalls: HIGH — verified from Zod v4 changelog and codebase inspection
- Disease ID verification: MEDIUM — OMIM API confirmed requires key; HGNC free API confirmed; format-only validation recommendation is pragmatic but unverified against maintainer preference

**Research date:** 2026-02-24
**Valid until:** 2026-03-24 (stable ecosystem; Zod v4 is recent stable release)
