# Phase 27: CLI Package - Research

**Researched:** 2026-02-24
**Domain:** Node.js/Bun CLI tooling — subcommand framework, interactive prompts, batch concurrency, tsdown build
**Confidence:** HIGH (core stack), MEDIUM (gnomAD rate limits), HIGH (architecture patterns)

---

## Summary

Phase 27 builds `@gnomad-cf/cli` — a `gnomad-cf` binary living in `packages/cli/` — that reuses `@gnomad-cf/core` for all calculations, queries, and template rendering. The CLI has three modes: `query <gene>`, `batch <file>`, and `interactive` (launched automatically when run with no args). It outputs human-readable summary blocks by default, with `--format json|tsv` for machine-readable output, a `--variants` flag for per-variant breakdown, and a `--text`/`--clinical` flag for German/English clinical text via the existing template renderer.

The standard stack for this domain in 2026 is: **commander v14** for subcommand parsing (most widely adopted, git/docker-style interface, excellent TypeScript types), **@clack/prompts v1.0.1** for interactive wizard prompts (the requirement CLI-10 calls this out by name, and v1.0 added the `autocomplete` and `autocompleteMultiselect` types needed for the gene search typeahead), **p-limit v7.3** for concurrency control in batch mode, and **zod v4** (already in `@gnomad-cf/core`) for `~/.gnomad-cf.json` config file validation. No separate progress bar library is needed — `@clack/prompts` provides `progress` built in.

Build: tsdown with a `banner` callback to inject `#!/usr/bin/env node` shebang only on the CLI entry chunk. The `bin` field in `packages/cli/package.json` points to `dist/cli.js`. tsdown v0.20.x is already installed in the repo devDependencies and proven to work.

**Primary recommendation:** Use commander v14 + @clack/prompts v1.0.1 + p-limit v7.3, build with tsdown (banner shebang), all core logic delegated to `@gnomad-cf/core` subpaths. Zero reimplementation of calculation logic.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| commander | 14.0.3 | Subcommand parsing, option handling, help generation | Most widely adopted, git-style subcommands, excellent TypeScript types, Node v20+ required (matches bun) |
| @clack/prompts | 1.0.1 | Interactive wizard prompts (text, select, multiselect, autocomplete) | Named in CLI-10 requirement; v1.0 added `autocomplete` type needed for gene typeahead; ESM-only; bombshell-dev maintained |
| p-limit | 7.3.0 | Concurrency control for batch mode (max N concurrent fetches) | Sindre Sorhus library, minimal API, `limit.activeCount` for progress tracking, ESM-only |
| zod | 4.x (already in core) | Config file schema validation (`~/.gnomad-cf.json`) | Already a dependency in `@gnomad-cf/core`; reuse across packages; static type inference from schema |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| tsdown | 0.20.3 (already in devDeps) | Bundle `packages/cli/src/` to `dist/` with shebang banner | Build step; already proven in core package; supports `banner` callback for shebang injection |
| @gnomad-cf/core (workspace) | 1.5.0 | ALL calculation logic, types, GraphQL client, templates | Import via subpaths: `/calculations`, `/client`, `/filters`, `/queries`, `/templates`, `/config`, `/types` |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| commander | citty v0.2 | citty (unjs) is lighter and ESM-only but less mature (v0.2.0), fewer users, GitHub issues open about unknown-option warnings. Commander 14 is the safer choice. |
| commander | yargs | yargs has more built-in validation but heavier; commander has cleaner subcommand API |
| p-limit | p-queue | p-queue has queue pausing/priority but adds complexity; p-limit's simple API matches the `--concurrency N` requirement exactly |
| @clack/prompts autocomplete | inquirer autocomplete plugin | inquirer requires extra plugin for autocomplete; @clack/prompts v1.0 includes it natively |

**Installation:**
```bash
bun add commander @clack/prompts p-limit
bun add -d tsdown typescript
```

---

## Architecture Patterns

### Recommended Project Structure

```
packages/cli/
├── src/
│   ├── cli.ts              # Entry point — commander program setup + shebang
│   ├── commands/
│   │   ├── query.ts        # `gnomad-cf query <gene>` command handler
│   │   ├── batch.ts        # `gnomad-cf batch <file>` command handler
│   │   └── interactive.ts  # `gnomad-cf interactive` (also launched on no-args)
│   ├── output/
│   │   ├── text-formatter.ts   # Human-readable summary block renderer
│   │   ├── json-formatter.ts   # JSON output serializer
│   │   ├── tsv-formatter.ts    # TSV output serializer
│   │   └── clinical-formatter.ts # Clinical text via @gnomad-cf/core/templates
│   ├── config/
│   │   └── user-config.ts  # ~/.gnomad-cf.json loader + zod schema
│   └── utils/
│       ├── population-aliases.ts  # "european" → "nfe" mapping
│       ├── gene-query.ts          # Pure async function: gene + variants + calc
│       └── retry.ts               # Exponential backoff wrapper for fetch
├── tsdown.config.ts
└── package.json
```

### Pattern 1: Commander Subcommand Registration

**What:** One `cli.ts` entry creates the `program`, registers three subcommands, and falls back to interactive when no args given.
**When to use:** Always — this is the entry point.

```typescript
// src/cli.ts
// Source: https://www.jsdocs.io/package/commander (commander v14)
import { Command } from 'commander'
import { queryCommand } from './commands/query.js'
import { batchCommand } from './commands/batch.js'
import { interactiveCommand } from './commands/interactive.js'

const program = new Command()

program
  .name('gnomad-cf')
  .description('Query gnomAD carrier frequencies from the terminal')
  .version('1.5.0')
  .addCommand(queryCommand)
  .addCommand(batchCommand)
  .addCommand(interactiveCommand)

// Launch interactive when no args given
if (process.argv.length === 2) {
  process.argv.push('interactive')
}

program.parseAsync(process.argv)
```

### Pattern 2: Commander Subcommand with Options

**What:** Each subcommand defined in its own file using `new Command()`.

```typescript
// src/commands/query.ts
// Source: https://www.jsdocs.io/package/commander (commander v14)
import { Command } from 'commander'
import { resolvePopulation } from '../utils/population-aliases.js'
import { loadUserConfig } from '../config/user-config.js'

export const queryCommand = new Command('query')
  .description('Query carrier frequency for a single gene')
  .argument('<gene>', 'Gene symbol (e.g. CFTR, HEXA)')
  .option('-p, --population <id>', 'Filter to specific population (e.g. nfe, european)')
  .option('-f, --format <fmt>', 'Output format: text|json|tsv', 'text')
  .option('--variants', 'Include per-variant breakdown in output')
  .option('--text', 'Generate clinical documentation text')
  .option('--gnomad-version <ver>', 'gnomAD version: v4|v3|v2', 'v4')
  .option('--hwe', 'Use HWE formula (default: on)', true)
  .option('--exclude-homozygotes', 'Apply homozygote exclusion (default: on)', true)
  .option('--penetrance <n>', 'Penetrance fraction 0-1', parseFloat, 1.0)
  .option('-o, --output <path>', 'Write output to file (default: stdout)')
  .action(async (gene: string, opts) => {
    const userConfig = await loadUserConfig()
    const pop = opts.population ? resolvePopulation(opts.population) : undefined
    // delegate to gene-query utility
  })
```

### Pattern 3: Clack Interactive Wizard

**What:** `@clack/prompts` drives the step-by-step wizard. Gene input uses `autocomplete` for typeahead search, populations use `multiselect`.

```typescript
// src/commands/interactive.ts
// Source: https://github.com/bombshell-dev/clack (v1.0.1)
import * as p from '@clack/prompts'
import { executeGraphQLQuery } from '@gnomad-cf/core/client'
import { GENE_SEARCH_QUERY } from '@gnomad-cf/core/queries'

export async function runInteractive() {
  p.intro('gnomad-cf — Carrier Frequency Calculator')

  // Gene autocomplete: user types partial name, gets matching options
  const gene = await p.autocomplete({
    message: 'Search for a gene:',
    placeholder: 'Type a gene symbol (e.g. CFTR)',
    options: async (input: string) => {
      if (!input || input.length < 2) return []
      const results = await searchGenes(input)
      return results.map(g => ({ label: g.symbol, value: g.symbol, hint: g.name }))
    },
  })
  if (p.isCancel(gene)) { p.cancel('Cancelled'); process.exit(0) }

  // Population multiselect
  const populations = await p.multiselect({
    message: 'Select populations (space to select, enter to confirm):',
    options: getPopulationOptions(),
    required: false,
  })
  if (p.isCancel(populations)) { p.cancel('Cancelled'); process.exit(0) }

  // Format selection
  const format = await p.select({
    message: 'Output format:',
    options: [
      { value: 'text', label: 'Human-readable text' },
      { value: 'json', label: 'JSON' },
      { value: 'tsv', label: 'TSV (spreadsheet)' },
    ],
  })

  // Echo equivalent command for scripting graduation
  const cmd = buildEquivalentCommand({ gene, populations, format })
  p.note(cmd, 'Equivalent command for future use:')

  p.outro('Query complete!')
}
```

### Pattern 4: Batch Processing with p-limit + Progress

**What:** `p-limit` controls concurrency; `@clack/prompts` `progress` tracks completion.

```typescript
// src/commands/batch.ts
// Source: https://github.com/sindresorhus/p-limit (v7.3.0)
import pLimit from 'p-limit'
import * as p from '@clack/prompts'

export async function runBatch(filePath: string, opts: BatchOptions) {
  const genes = await readGeneList(filePath) // auto-detect JSON or plain text
  const limit = pLimit(opts.concurrency ?? 3)
  const results: BatchResult[] = []
  const errors: BatchError[] = []

  const bar = p.progress()
  bar.start(`Processing ${genes.length} genes`, 0)

  const tasks = genes.map((gene, i) =>
    limit(async () => {
      try {
        const result = await queryGeneWithRetry(gene, opts)
        results.push({ gene, result })
      } catch (err) {
        errors.push({ gene, error: String(err) })
        if (opts.failFast) throw err
      } finally {
        bar.advance(1, `${i + 1}/${genes.length} — ${gene}`)
      }
    })
  )

  await Promise.all(tasks)
  bar.stop('Done')

  // Print failure summary
  if (errors.length > 0) {
    p.log.warn(`${errors.length} gene(s) failed:`)
    for (const e of errors) p.log.error(`  ${e.gene}: ${e.error}`)
  }
}
```

### Pattern 5: tsdown Build with Shebang Banner

**What:** tsdown config adds `#!/usr/bin/env node` only to the CLI chunk, leaving the rest clean.

```typescript
// packages/cli/tsdown.config.ts
// Source: https://rolldown.rs/reference/interface.outputoptions (banner option)
import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: { cli: 'src/cli.ts' },
  format: ['esm'],
  dts: false,          // CLI doesn't need declarations
  clean: true,
  platform: 'node',   // NOT 'neutral' — CLI is node-specific
  banner: {
    js: '#!/usr/bin/env node',
  },
})
```

And in `packages/cli/package.json`:
```json
{
  "name": "@gnomad-cf/cli",
  "version": "1.5.0",
  "type": "module",
  "bin": { "gnomad-cf": "dist/cli.js" },
  "scripts": {
    "build": "tsdown",
    "dev": "bun run src/cli.ts"
  }
}
```

### Pattern 6: User Config File (Zod Schema)

**What:** `~/.gnomad-cf.json` sets per-user defaults; CLI flags override per-invocation.

```typescript
// src/config/user-config.ts
// Zod already in @gnomad-cf/core dependencies — reuse same version
import { z } from 'zod'
import { homedir } from 'node:os'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

const UserConfigSchema = z.object({
  defaultVersion: z.enum(['v4', 'v3', 'v2']).optional(),
  defaultFormat: z.enum(['text', 'json', 'tsv']).optional(),
  defaultConcurrency: z.number().int().min(1).max(10).optional(),
  defaultPopulation: z.string().optional(),
  hwe: z.boolean().optional(),
  excludeHomozygotes: z.boolean().optional(),
  penetrance: z.number().min(0).max(1).optional(),
}).strict()

export type UserConfig = z.infer<typeof UserConfigSchema>

export async function loadUserConfig(): Promise<UserConfig> {
  const path = join(homedir(), '.gnomad-cf.json')
  try {
    const raw = await readFile(path, 'utf-8')
    return UserConfigSchema.parse(JSON.parse(raw))
  } catch {
    return {} // No config file = all defaults
  }
}
```

### Pattern 7: Exponential Backoff for gnomAD Fetch

**What:** gnomAD API has no documented rate limits. The web app has no retry logic. The CLI needs retry because batch jobs are long-running and transient failures must not abort the batch.

```typescript
// src/utils/retry.ts
export async function withRetry<T>(
  fn: () => Promise<T>,
  opts = { retries: 3, baseDelayMs: 1000, maxDelayMs: 16000 }
): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt <= opts.retries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      if (attempt === opts.retries) break
      const delay = Math.min(
        opts.baseDelayMs * Math.pow(2, attempt) + Math.random() * 500,
        opts.maxDelayMs
      )
      await new Promise(r => setTimeout(r, delay))
    }
  }
  throw lastError
}
```

### Anti-Patterns to Avoid

- **Reimplementing calculation logic:** All frequency math lives in `@gnomad-cf/core/calculations`. The CLI imports and calls it. Never copy.
- **Reimplementing the GraphQL client:** Use `executeGraphQLQuery` from `@gnomad-cf/core/client`. It uses native `fetch`, works in both bun and node.
- **Using `platform: 'neutral'` for CLI tsdown:** The core package uses neutral because it targets both browser and node. The CLI is node-only — use `platform: 'node'` to enable node built-ins.
- **Mixing CJS and ESM:** Both commander 14 and @clack/prompts 1.0.1 are ESM-only. The `packages/cli/package.json` must have `"type": "module"`. Never `require()`.
- **Using bun's `#!/usr/bin/env bun` shebang:** The CLI should use `#!/usr/bin/env node` so it works when installed via `npm install -g @gnomad-cf/cli` by users who have node (not necessarily bun). Bun can run node-targeted ESM fine.
- **Calling `p.isCancel()` only once at the end:** Check `isCancel` immediately after each prompt. Clack returns a `Symbol` sentinel when the user hits Ctrl+C; passing that to subsequent prompts causes confusing behavior.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Subcommand argument parsing | Custom `process.argv` parser | commander v14 | Help generation, validation, TypeScript types, hooks all built in |
| Interactive gene typeahead | readline + filter loop | `@clack/prompts` `autocomplete` | Terminal escape sequences, cursor handling, async filtering all handled |
| Multi-select population picker | Checkbox array in readline | `@clack/prompts` `multiselect` | Space-to-select, enter-to-confirm, disabled options — all built in |
| Concurrency limiting | `Promise.all` chunk-slicing | p-limit v7.3 | activeCount/pendingCount introspection, clearQueue, correct back-pressure |
| User config validation | Ad-hoc JSON type-checking | zod (already in core) | Parse errors surface the bad field name, types inferred, strict mode rejects unknown keys |
| Clinical text rendering | New template system | `@gnomad-cf/core/templates` `renderTemplate` | Already handles `{{variable}}` substitution, German language, gender styles |
| Population code normalization | Hard-coded switch | Population alias map + `getPopulations()` from core config | Core has all codes and labels; alias map adds "european" → "nfe" etc. on top |
| Carrier frequency math | Any calculation | `@gnomad-cf/core/calculations` | HWE, VCR/GCR, prevalence, formatters all tested and correct |

**Key insight:** The CLI is primarily an I/O layer. It reads arguments, calls core, formats output. Every computation is already in `@gnomad-cf/core`.

---

## Common Pitfalls

### Pitfall 1: @clack/prompts Cancellation Not Checked

**What goes wrong:** User hits Ctrl+C during any prompt. The prompt returns `Symbol(clack:cancel)`. If the code passes this to the next prompt (e.g., using it as `gene` in a fetch), it crashes cryptically.
**Why it happens:** Developers check once at the end of all prompts or forget entirely.
**How to avoid:** After every `await p.<prompt>()` call, immediately call `if (p.isCancel(result)) { p.cancel('Cancelled'); process.exit(0) }`.
**Warning signs:** TypeScript type errors when passing prompt result to a typed function (the Symbol isn't assignable to string).

### Pitfall 2: Shebang Stripped by Minifier

**What goes wrong:** tsdown with minification active strips the `#!/usr/bin/env node` line, making the installed binary not self-executing on Unix.
**Why it happens:** Minifiers treat the shebang as a comment and remove it.
**How to avoid:** Either disable minification for CLI bundles (acceptable — not a library), or use a legal comment format. With tsdown, the `banner` option runs after minification in postBanner. In practice: keep `minify: false` for the CLI entry.
**Warning signs:** `gnomad-cf: command not found` after `npm install -g`, or permission error on Unix because the file isn't recognized as executable.

### Pitfall 3: Missing `chmod +x` on dist Output

**What goes wrong:** On Unix, the bundled `dist/cli.js` is not executable. `npm install -g` makes the bin symlink but the file has no execute permission.
**Why it happens:** tsdown doesn't set file permissions.
**How to avoid:** Add a postbuild step: `"postbuild": "chmod +x dist/cli.js"` in `packages/cli/package.json` scripts. Alternatively, npm/bun automatically sets executable bits on `bin` files during install — test this during development with `bun link`.
**Warning signs:** `Permission denied` error when running `gnomad-cf`.

### Pitfall 4: gnomAD API Has No Documented Rate Limits

**What goes wrong:** Batch jobs with high `--concurrency` values hit 429 or connection-reset errors from gnomAD's API. The web app never encounters this because users manually click one gene at a time.
**Why it happens:** gnomAD's public API has no published rate limit documentation. The default concurrency of 3 in the CONTEXT.md is empirical.
**How to avoid:** Default `--concurrency 3`. Implement exponential backoff with jitter (see retry pattern above). On 429 response, back off and retry. On 5xx response, retry up to 3 times. On 4xx (not 429), treat as terminal error for that gene.
**Warning signs:** Batch job producing many failures when running with `--concurrency 10+`.

### Pitfall 5: TSV Output Breaking on Multi-Value Fields

**What goes wrong:** Clinical text or population labels containing commas or newlines break TSV/CSV parsers downstream.
**Why it happens:** Simple string concatenation doesn't escape special characters.
**How to avoid:** For TSV: wrap every field value in quotes and escape internal quotes as `""`. For JSON: no escaping needed (JSON.stringify handles it). Clinical text only appears in `--format text`, never in TSV rows.
**Warning signs:** Excel opens TSV with rows split incorrectly.

### Pitfall 6: Batch File Format Auto-Detection Ambiguity

**What goes wrong:** A plain-text file whose first non-whitespace character is `[` (e.g., `[CFTR, HEXA]` written as text) gets mistakenly parsed as JSON.
**Why it happens:** Auto-detection based on `JSON.parse` attempts.
**How to avoid:** Try `JSON.parse`; if it fails, fall back to line-by-line plain text. If JSON parses successfully but the result is an array of strings, treat as plain-text gene list. If it's an array of objects, treat as structured JSON with per-gene settings. Validate with zod after parsing.
**Warning signs:** User reports that their gene list file "isn't being read correctly."

### Pitfall 7: Interactive Mode Launched Without TTY

**What goes wrong:** User pipes output (`gnomad-cf | jq`), and clack's prompts try to render to a non-TTY, causing garbled output or hanging.
**Why it happens:** `@clack/prompts` needs an interactive terminal.
**How to avoid:** Check `process.stdout.isTTY && process.stdin.isTTY` before launching interactive mode. If not a TTY and no subcommand given, print usage and exit with code 1 instead.
**Warning signs:** CI pipelines hanging when `gnomad-cf` is called without arguments.

---

## Code Examples

### Complete gene query pipeline (the core CLI operation)

```typescript
// src/utils/gene-query.ts
// Sources: @gnomad-cf/core subpaths (all verified by reading source)
import { executeGraphQLQuery } from '@gnomad-cf/core/client'
import { GENE_VARIANTS_QUERY } from '@gnomad-cf/core/queries'
import { filterPathogenicVariantsConfigurable } from '@gnomad-cf/core/filters'
import {
  aggregatePopulationFrequenciesWithConfig,
  buildPopulationFrequencies,
  formatCarrierFrequency,
  formatPrevalence,
  calculateBayesianPrevalence,
} from '@gnomad-cf/core/calculations'
import {
  getDatasetId,
  getReferenceGenome,
  type GnomadVersion,
} from '@gnomad-cf/core/config'
import type { FilterConfig, CalcConfig } from '@gnomad-cf/core/types'
import type { GeneVariantsResponse } from '@gnomad-cf/core/queries'
import { withRetry } from './retry.js'

export interface QueryOptions {
  version: GnomadVersion
  filterConfig: FilterConfig
  calcConfig: CalcConfig
  population?: string
}

export async function queryGene(gene: string, opts: QueryOptions) {
  const response = await withRetry(() =>
    executeGraphQLQuery<GeneVariantsResponse>({
      query: GENE_VARIANTS_QUERY,
      variables: {
        geneSymbol: gene.toUpperCase(),
        dataset: getDatasetId(opts.version),
        referenceGenome: getReferenceGenome(opts.version),
      },
    }, opts.version)
  )

  if (response.errors?.length) {
    throw new Error(response.errors.map(e => e.message).join('; '))
  }
  if (!response.data?.gene) {
    throw new Error(`Gene "${gene}" not found in gnomAD`)
  }

  const { variants, clinvar_variants } = response.data.gene
  const pathogenic = filterPathogenicVariantsConfigurable(
    variants as any,
    clinvar_variants as any,
    opts.filterConfig,
    new Map()
  )

  const aggregated = aggregatePopulationFrequenciesWithConfig(
    pathogenic,
    opts.version,
    opts.calcConfig
  )

  // Global carrier frequency (all populations combined)
  // ... (follow same pattern as useCarrierFrequency.ts globalStats computed)
}
```

### Human-readable text output format (summary blocks)

```
Gene: CFTR  |  gnomAD v4.1  |  Variants: 12  |  Formula: HWE + Hom. exclusion

=== Non-Finnish European (nfe) ===
  Carrier frequency:    1:29 (3.45%)
  Genetic prevalence:   1:841
  Bayesian prevalence:  1:841 (penetrance: 100%)
  Allele count:         2,847
  Allele number:        247,120
  Sum allele freq:      0.01725

=== Ashkenazi Jewish (asj) ===
  Carrier frequency:    1:25 (4.00%)  [!] Elevated — possible founder effect
  ...
```

### @clack/prompts autocomplete for gene search

```typescript
// Source: https://bomb.sh/docs/clack/packages/prompts (v1.0.1)
import * as p from '@clack/prompts'

const gene = await p.autocomplete({
  message: 'Search for a gene symbol:',
  placeholder: 'Type at least 2 characters...',
  options: async (input: string) => {
    if (!input || input.length < 2) return []
    // Use gnomAD gene search query from core
    const results = await searchGenes(input)
    return results.map(g => ({
      label: g.symbol,
      value: g.symbol,
      hint: g.full_name,
    }))
  },
})
if (p.isCancel(gene)) { p.cancel('Cancelled'); process.exit(0) }
```

### Population alias mapping

```typescript
// src/utils/population-aliases.ts
// Source: packages/core/src/config/gnomad.json (verified)
const POPULATION_ALIASES: Record<string, string> = {
  // Full names → codes
  african: 'afr',
  european: 'nfe',
  'ashkenazi-jewish': 'asj',
  'ashkenazi jewish': 'asj',
  'east-asian': 'eas',
  'south-asian': 'sas',
  finnish: 'fin',
  'middle-eastern': 'mid',
  'admixed-american': 'amr',
  latino: 'amr',
  // Short codes pass through
}

export function resolvePopulation(input: string): string {
  const lower = input.toLowerCase().trim()
  return POPULATION_ALIASES[lower] ?? lower
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| yargs for subcommands | commander v14 | ongoing evolution | commander has cleaner git-style subcommand API with better TypeScript inference |
| inquirer for prompts | @clack/prompts v1.0.1 | Jan 2026 (v1.0 release) | clack provides better visual UX, built-in autocomplete, ESM-only |
| hand-rolled retry | exponential-backoff or custom | 2025 | trivial to implement; no heavy library needed |
| tsup (old) | tsdown v0.20 | late 2024 | tsdown is the tsup successor; repo already uses it for core |
| CJS CLI bundles | ESM-only (commander 14+ & clack 1.0+) | 2026 | both key libraries now require ESM; CLI must be `"type": "module"` |

**Deprecated/outdated:**
- `inquirer` v9+: Still valid but @clack/prompts is lighter and has better visual design for wizard-style flows
- `ora` spinner: @clack/prompts includes spinner built-in; no separate library needed
- `cli-progress`: @clack/prompts v1.0 includes `progress` built-in with the same functionality
- `#!/usr/bin/env bun` shebang: Use `#!/usr/bin/env node` for portability; bun executes node-targeted ESM fine

---

## Open Questions

1. **gnomAD API rate limits**
   - What we know: No public documentation. The web app makes requests sequentially (one gene at a time, user-driven). Default concurrency of 3 is the team's empirical conservative choice.
   - What's unclear: Actual threshold before 429 responses. Whether there's IP-based throttling per second vs per minute.
   - Recommendation: Default to `--concurrency 3`, implement full exponential backoff with 429 detection. If a 429 is received, treat it as a signal to reduce concurrency for the remaining batch.

2. **Gene autocomplete data source**
   - What we know: The web app uses `GENE_SEARCH_QUERY` (from `@gnomad-cf/core/queries`) for gene search. This is a gnomAD API call.
   - What's unclear: Latency of gene search query during interactive typeahead. If gnomAD search is slow (>300ms), the autocomplete UX may feel sluggish.
   - Recommendation: Add a debounce of ~300ms before firing the API call in the autocomplete `options` callback. This is standard for search-as-you-type. Consider a minimum 2-character threshold before querying.

3. **Windows executable permissions**
   - What we know: The `chmod +x` postbuild step only applies on Unix. Windows uses `.cmd` wrapper files created by package managers.
   - What's unclear: Whether bun installs the `bin` correctly on Windows when doing `bun link` during development.
   - Recommendation: Test `bun link` on the dev machine (Windows 11) early in implementation. npm global installs on Windows create `.cmd` wrappers automatically — this should work fine.

4. **@clack/prompts `autocomplete` options callback signature**
   - What we know: Bombshell docs (bomb.sh) show `options: async (input: string) => Promise<Option[]>`. The v1.0.1 release notes confirm autocomplete support.
   - What's unclear: Whether the options callback can be async (returning Promise) or must be sync. The documentation examples suggest async is supported.
   - Recommendation: Write the implementation as async; test immediately after installation. If async isn't supported, cache gene search results in memory during the session.

---

## Sources

### Primary (HIGH confidence)

- `@gnomad-cf/core` source code (read directly) — types, calculations, client, config, filters, templates
- https://www.jsdocs.io/package/commander — commander v14.0.3 TypeScript API
- https://github.com/sindresorhus/p-limit — p-limit v7.3.0 API and usage
- https://rolldown.rs/reference/interface.outputoptions — banner/shebang option for tsdown
- https://github.com/bombshell-dev/clack/releases — @clack/prompts v1.0.1 release notes confirming autocomplete

### Secondary (MEDIUM confidence)

- https://bomb.sh/docs/clack/packages/prompts — @clack/prompts full prompt type list including `autocomplete` and `autocompleteMultiselect` APIs
- https://github.com/bombshell-dev/clack/blob/main/packages/prompts/README.md — prompt type inventory
- WebSearch for commander v14 + bun compatibility (multiple credible sources agree)
- https://tsdown.dev/options/entry — tsdown entry configuration

### Tertiary (LOW confidence)

- WebSearch on gnomAD API rate limits: no authoritative source found; default concurrency 3 remains empirical
- @clack/prompts `autocomplete` async options callback: documented in bomb.sh but could not verify from actual package source

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — commander v14, @clack/prompts v1.0.1, p-limit v7.3 all verified via official sources
- Architecture: HIGH — based directly on reading existing `@gnomad-cf/core` source + commander/clack official docs
- Pitfalls: HIGH for shebang/ESM/TTY issues (established patterns); MEDIUM for gnomAD rate limits (empirical)
- Core integration: HIGH — read actual source of all relevant core modules

**Research date:** 2026-02-24
**Valid until:** 2026-03-24 (stable libraries); gnomAD rate limit info: validate on first real batch test
