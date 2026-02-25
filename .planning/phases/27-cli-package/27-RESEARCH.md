# Phase 27: CLI Package - Research

**Researched:** 2026-02-24
**Domain:** Node.js/TypeScript CLI tool with interactive prompts, batch processing, and integration with @gnomad-cf/core
**Confidence:** HIGH (core stack), HIGH (architecture patterns), MEDIUM (tsdown banner exact syntax), LOW (gnomAD rate limits)

---

## Summary

Phase 27 builds `@gnomad-cf/cli` — a `gnomad-cf` binary in `packages/cli/` — that reuses `@gnomad-cf/core` for all calculations, queries, and template rendering. The CLI has three modes: `query <gene>`, `batch <file>`, and `interactive` (auto-launched with no args). It outputs human-readable summary blocks by default, with `--format json|tsv` for machine-readable output, a `--variants` flag for per-variant breakdown, and a `--text`/`--clinical` flag for German/English clinical text via the existing template renderer.

The standard stack for 2026: **commander v14.0.3** for subcommand parsing (281M weekly downloads, git-style subcommands, TypeScript built-in), **@clack/prompts v1.0.1** for interactive wizard (mandated by CLI-10; v1.0 added `autocomplete`, `progress`, and `multiselect` used by this phase), **p-queue v8.1.0** for concurrency-controlled batch processing (better fit than p-limit because it tracks active/pending counts and has queue draining semantics), and **zod v4.3.5** (already in `@gnomad-cf/core`) for `~/.gnomad-cf.json` config file validation.

Build: tsdown v0.20.3 (already in monorepo) with `banner: { js: '#!/usr/bin/env node' }` (ChunkAddon format) and `platform: 'node'`. The `bin` field in `packages/cli/package.json` points to `dist/cli.js`. The CLI package must have `"type": "module"` because both commander 14 and @clack/prompts 1.0 are ESM-only.

**Primary recommendation:** commander v14 + @clack/prompts v1.0.1 + p-queue v8.1 + tsdown with node platform + zod for config. Delegate ALL calculation logic to `@gnomad-cf/core` subpaths. The CLI is a thin I/O layer.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `commander` | `^14.0.3` | Subcommand parsing, option handling, auto-help | 281M weekly downloads; git/docker-style subcommands; TypeScript types built-in; v14 stable (v15 ESM-only expected May 2026) |
| `@clack/prompts` | `^1.0.1` | Interactive wizard (text, select, multiselect, autocomplete, spinner, progress) | Mandated by CLI-10; v1.0.0 added autocomplete + progress + ESM-only; 4,087 npm dependents; maintained by bombshell-dev |
| `p-queue` | `^8.1.0` | Concurrency-limited parallel batch requests | Promise queue with `concurrency` option; ESM-only; tracks activeCount/pendingCount; supports timeout per task; maps directly to `--concurrency N` flag |
| `zod` | `^4.3.5` | Config file schema validation for `~/.gnomad-cf.json` | Already in `@gnomad-cf/core` — reuse same dep; v4 stable (Aug 2025); 14x faster parsing; type inference for config schema |
| `tsdown` | `0.20.3` | Bundle CLI source to executable with shebang | Already in monorepo devDeps; `banner` option for shebang; `platform: 'node'` enables node built-ins; proven in core package |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@gnomad-cf/core` (workspace) | `1.5.0` | ALL calculation, query, filter, template logic | Import via subpaths: `/calculations`, `/client`, `/filters`, `/queries`, `/templates`, `/config`, `/types` |
| Node.js built-in `os` | — | `os.homedir()` for `~/.gnomad-cf.json` path | Config loader only; no external dep |
| Node.js built-in `fs/promises` | — | Read batch input files, read config file | File I/O; no external dep |
| Node.js built-in `path` | — | Path construction for config and output files | No external dep |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `commander` | `citty` (unjs v0.2) | citty is lighter, ESM-only, TypeScript-first — but v0.2 is pre-stable with open GitHub issues about unknown-option handling; commander is safer |
| `commander` | `yargs` | yargs more validation features; heavier; commander cleaner subcommand API; yargs has 148M weekly downloads vs 281M for commander |
| `p-queue` | `p-limit` | p-limit is simpler (just limit concurrent calls) but lacks queue introspection, draining, and per-task timeouts that batch mode benefits from |
| `@clack/prompts` | `inquirer` | inquirer requires extra plugin for autocomplete; @clack/prompts includes it natively in v1.0; CLI-10 mandates @clack/prompts anyway |
| Zod for config | Manual type guards | Zod provides parse errors that name the bad field; static type inference from schema; already a dep |

**Installation:**
```bash
bun add commander @clack/prompts p-queue
# zod already in @gnomad-cf/core — add to packages/cli if needed separately
# bun add zod (if not pulled in via workspace)
```

---

## Architecture Patterns

### Recommended Project Structure

```
packages/cli/
├── src/
│   ├── cli.ts                   # Entry: commander program + shebang source
│   ├── commands/
│   │   ├── query.ts             # gnomad-cf query <gene>
│   │   ├── batch.ts             # gnomad-cf batch <file>
│   │   └── interactive.ts       # gnomad-cf interactive (wizard)
│   ├── output/
│   │   ├── text-formatter.ts    # Human-readable summary blocks
│   │   ├── json-formatter.ts    # JSON serialization
│   │   ├── tsv-formatter.ts     # TSV with field escaping
│   │   └── clinical-formatter.ts # Clinical text via @gnomad-cf/core/templates
│   ├── config/
│   │   └── user-config.ts       # Zod schema + ~/.gnomad-cf.json loader
│   └── utils/
│       ├── gene-query.ts         # Orchestrates fetch → filter → calc for one gene
│       ├── population-aliases.ts # "european" → "nfe" mapping
│       └── retry.ts              # Exponential backoff fetch wrapper
├── tsdown.config.ts
└── package.json                  # type:module, bin: {gnomad-cf: dist/cli.js}
```

### Pattern 1: Commander Subcommand Registration

**What:** One `cli.ts` creates the root `program`, registers subcommands, and falls back to interactive when no args.
**When to use:** Always — this is the entry point.

```typescript
// src/cli.ts
// Source: https://github.com/tj/commander.js (v14.0.3)
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

// No-args → interactive mode
if (process.argv.length === 2) {
  // Check TTY first — don't start wizard in piped contexts
  if (!process.stdout.isTTY || !process.stdin.isTTY) {
    console.error('No command given. Run with --help for usage.')
    process.exit(1)
  }
  process.argv.push('interactive')
}

await program.parseAsync(process.argv)
// MUST use parseAsync (not parse) when any action handler is async
```

### Pattern 2: Commander Subcommand with Options

**What:** Each subcommand defined as its own `Command` instance in a separate file.

```typescript
// src/commands/query.ts
// Source: https://www.jsdocs.io/package/commander (v14)
import { Command } from 'commander'

export const queryCommand = new Command('query')
  .description('Query carrier frequency for a single gene')
  .argument('<gene>', 'Gene symbol (e.g. CFTR, HEXA, HBB)')
  .option('-p, --population <id>', 'Restrict to population (short code or full name)')
  .option('-f, --format <fmt>', 'Output format: text|json|tsv', 'text')
  .option('--variants', 'Include per-variant breakdown')
  .option('--text', 'Generate clinical documentation text (alias: --clinical)')
  .option('--clinical', 'Generate clinical documentation text (alias: --text)')
  .option('--gnomad-version <ver>', 'gnomAD version: v4|v3|v2', 'v4')
  .option('--hwe', 'Use HWE 2pq formula (default: VCR/GCR homozygote exclusion)')
  .option('--no-exclude-homozygotes', 'Disable homozygote exclusion (use raw sumAF)')
  .option('--penetrance <n>', 'Penetrance fraction 0-1', parseFloat, 1.0)
  .option('--lof', 'Include LoF HC variants (default: on)')
  .option('--clinvar', 'Include ClinVar P/LP variants (default: on)')
  .option('--star-threshold <n>', 'ClinVar star threshold 0-4', parseInt, 2)
  .option('-o, --output <path>', 'Write output to file (default: stdout)')
  .option('--config <gene>', 'Apply community-curated gene config (Phase 28 feature)')
  .action(async (gene: string, opts) => {
    const { loadUserConfig } = await import('../config/user-config.js')
    const userConfig = await loadUserConfig()
    // CLI flags override userConfig defaults
    await runQuery(gene, mergeOptions(userConfig, opts))
  })
```

### Pattern 3: Clack Interactive Wizard

**What:** Step-by-step wizard using `@clack/prompts` v1.0.1 components.
**When to use:** `gnomad-cf interactive` or `gnomad-cf` with no args.

```typescript
// src/commands/interactive.ts
// Source: https://bomb.sh/docs/clack/packages/prompts (v1.0.1)
import * as p from '@clack/prompts'
import { getPopulations } from '@gnomad-cf/core/config'
import { executeGraphQLQuery } from '@gnomad-cf/core/client'
import { GENE_SEARCH_QUERY } from '@gnomad-cf/core/queries'

export async function runInteractive() {
  p.intro('gnomad-cf — Carrier Frequency Calculator')

  // Step 1: Gene search with autocomplete typeahead
  const gene = await p.autocomplete({
    message: 'Search for a gene:',
    placeholder: 'Type a gene symbol (min 2 chars, e.g. CFTR)',
    maxItems: 10,
    options: async (input: string) => {
      if (!input || input.length < 2) return []
      // Debounce handled externally or rely on @clack/prompts internal pacing
      const result = await executeGraphQLQuery({
        query: GENE_SEARCH_QUERY,
        variables: { query: input, referenceGenome: 'GRCh38' },
      })
      const genes = result.data?.gene_search ?? []
      return genes.map((g: { symbol: string }) => ({ label: g.symbol, value: g.symbol }))
    },
  })
  if (p.isCancel(gene)) { p.cancel('Cancelled.'); process.exit(0) }

  // Step 2: Population selection (multiselect)
  const pops = getPopulations('v4')
  const populations = await p.multiselect({
    message: 'Select populations (space to toggle, enter to confirm):',
    options: pops.map(pop => ({ value: pop.code, label: pop.label })),
    required: false, // empty = all populations
  })
  if (p.isCancel(populations)) { p.cancel('Cancelled.'); process.exit(0) }

  // Step 3: Output format
  const format = await p.select({
    message: 'Output format:',
    options: [
      { value: 'text', label: 'Human-readable summary' },
      { value: 'json', label: 'JSON (machine-readable)' },
      { value: 'tsv', label: 'TSV (spreadsheet-ready)' },
    ],
  })
  if (p.isCancel(format)) { p.cancel('Cancelled.'); process.exit(0) }

  // Echo equivalent CLI command for scripting graduation
  const popArg = (populations as string[]).length > 0
    ? (populations as string[]).map(pop => `-p ${pop}`).join(' ')
    : ''
  const equivalent = `gnomad-cf query ${gene} --format ${format} ${popArg}`.trim()
  p.note(equivalent, 'Equivalent command for future use:')

  // Run the query using same logic as `query` command
  await runQuery(gene as string, {
    gnomadVersion: 'v4',
    format: format as string,
    populations: populations as string[],
    filterConfig: FACTORY_FILTER_DEFAULTS,
    calcConfig: FACTORY_CALC_DEFAULTS,
  })

  p.outro('Done!')
}
```

### Pattern 4: Batch Processing with p-queue + Progress

**What:** `p-queue` controls concurrency; `@clack/prompts` `progress` tracks completion with ETA-style messages.
**When to use:** `gnomad-cf batch <file>`.

```typescript
// src/commands/batch.ts
// Source: https://github.com/sindresorhus/p-queue (v8.1.0) + @clack/prompts
import PQueue from 'p-queue'
import * as p from '@clack/prompts'
import { queryGene } from '../utils/gene-query.js'

export async function runBatch(filePath: string, opts: BatchOptions) {
  const genes = await readGeneList(filePath) // auto-detect JSON or plain text
  const queue = new PQueue({ concurrency: opts.concurrency ?? 3 })
  const results: BatchResult[] = []
  const errors: BatchError[] = []
  let processed = 0

  const bar = p.progress({ max: genes.length })
  bar.start(`Processing ${genes.length} genes`, 0)

  const tasks = genes.map(gene =>
    queue.add(async () => {
      try {
        const result = await queryGene(gene, opts)
        results.push({ gene, result })
      } catch (err) {
        errors.push({ gene, error: String(err) })
        if (opts.failFast) {
          queue.clear() // stop remaining tasks
          throw err
        }
      } finally {
        processed++
        bar.advance(1, `${processed}/${genes.length} — ${gene}`)
      }
    })
  )

  await Promise.all(tasks)
  bar.stop(`Processed ${genes.length} genes`)

  // Failure summary
  if (errors.length > 0) {
    p.log.warn(`${errors.length} gene(s) failed:`)
    for (const e of errors) p.log.error(`  ${e.gene}: ${e.error}`)
  }

  return { results, errors }
}
```

### Pattern 5: tsdown Config for CLI Binary

**What:** tsdown configuration that produces a node executable with shebang.
**When to use:** `packages/cli/tsdown.config.ts`.

```typescript
// packages/cli/tsdown.config.ts
// Source: https://tsdown.dev/reference/api/Interface.UserConfig (banner: ChunkAddon)
import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: { cli: 'src/cli.ts' },
  format: ['esm'],
  platform: 'node',       // NOT 'neutral' — CLI targets Node.js only
  dts: false,             // CLI binary doesn't need .d.ts declarations
  clean: true,
  banner: {
    js: '#!/usr/bin/env node',  // ChunkAddon object form
  },
  // minify: false (default) — keep for readable stack traces in errors
})
```

And `packages/cli/package.json`:
```json
{
  "name": "@gnomad-cf/cli",
  "version": "1.5.0",
  "type": "module",
  "bin": { "gnomad-cf": "dist/cli.js" },
  "scripts": {
    "build": "tsdown",
    "postbuild": "chmod +x dist/cli.js",
    "dev": "bun run src/cli.ts"
  },
  "dependencies": {
    "commander": "^14.0.3",
    "@clack/prompts": "^1.0.1",
    "p-queue": "^8.1.0"
  },
  "devDependencies": {
    "tsdown": "0.20.3",
    "typescript": "~5.9.3"
  }
}
```

### Pattern 6: User Config File with Zod Schema

**What:** Load `~/.gnomad-cf.json`, validate with Zod, merge with CLI flag overrides. File absence is not an error.

```typescript
// src/config/user-config.ts
// Source: nodejs.org/api/os.html + zod.dev/v4
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
  lofEnabled: z.boolean().optional(),
  clinvarEnabled: z.boolean().optional(),
  clinvarStarThreshold: z.number().int().min(0).max(4).optional(),
  language: z.enum(['de', 'en']).optional(),
}).strict() // reject unknown keys — clear error message if user misspells a key

export type UserConfig = z.infer<typeof UserConfigSchema>

export async function loadUserConfig(): Promise<UserConfig> {
  const path = join(homedir(), '.gnomad-cf.json')
  try {
    const raw = await readFile(path, 'utf-8')
    return UserConfigSchema.parse(JSON.parse(raw))
  } catch (err) {
    // No config file is fine. Parse error: warn but don't crash.
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
      process.stderr.write(`Warning: ~/.gnomad-cf.json is invalid — using defaults\n`)
    }
    return {}
  }
}
```

### Pattern 7: Exponential Backoff Retry

**What:** Wrap `executeGraphQLQuery` calls with retry logic. gnomAD has no documented rate limits — treat 429/503 as retryable.

```typescript
// src/utils/retry.ts
// Source: https://oneuptime.com/blog/post/2026-01-06-nodejs-retry-exponential-backoff/
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
      // Exponential backoff with jitter: 1s, ~2s, ~4s, ~8s (capped at maxDelayMs)
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

### Pattern 8: Output to Stdout or File

**What:** Write output to stdout by default; redirect to file when `--output <path>` given.

```typescript
// In each command handler
import { writeFile } from 'node:fs/promises'

async function writeOutput(content: string, outputPath?: string) {
  if (outputPath) {
    await writeFile(outputPath, content, 'utf-8')
    p.log.success(`Output written to ${outputPath}`)
  } else {
    process.stdout.write(content)
  }
}
```

### Anti-Patterns to Avoid

- **Reimplementing calculation logic:** Every frequency, prevalence, and formatter function exists in `@gnomad-cf/core/calculations`. Never copy.
- **Using `platform: 'neutral'` for CLI tsdown:** Core uses neutral (browser+node). CLI is node-only — use `platform: 'node'`.
- **Using `#!/usr/bin/env bun` shebang:** Use `#!/usr/bin/env node` for portability; bun runs node-targeted ESM fine. Users may not have bun.
- **Missing `isCancel()` checks:** Every `@clack/prompts` function can return `Symbol(clack:cancel)`. Check immediately after each prompt with `p.isCancel(result)`.
- **Using `.parse()` instead of `.parseAsync()`:** Commander's `.parse()` does not await async action handlers. Always use `.parseAsync()`.
- **Skipping TTY check before interactive mode:** If `process.stdin.isTTY` is false (pipe/CI), @clack/prompts will hang or produce garbled output. Check before launching wizard.
- **Mixing CJS and ESM:** commander v14 and @clack/prompts v1.0.1 are ESM-only. `packages/cli/package.json` must have `"type": "module"`.
- **Writing errors to stdout:** Errors go to `process.stderr` / `p.log.error()`; data goes to `process.stdout`. This enables `gnomad-cf query CFTR --format json | jq .`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Subcommand argument parsing + help | Custom `process.argv` parser | `commander` v14 | Auto-generates `--help`; handles option validation, TypeScript types, hooks |
| Gene typeahead/autocomplete | `readline` + filter loop | `@clack/prompts` `autocomplete` | Terminal escape sequences, cursor, async filtering, keyboard handling all handled |
| Population multi-select | Checkbox array in readline | `@clack/prompts` `multiselect` | Space-to-select, arrow navigation, required option — all built in |
| Concurrency-limited batch | `Promise.all` chunk-slicing | `p-queue` | Backpressure, queue.clear(), activeCount/pendingCount, per-task timeout |
| Progress bar | ANSI escape sequences | `@clack/prompts` `progress` | Terminal width handling, consistent styling, works with rest of clack UI |
| Config schema validation | Ad-hoc `typeof` checks | `zod` (already in core) | Named field errors, type inference, strict mode rejects unknown keys |
| Clinical text rendering | New template engine | `@gnomad-cf/core/templates` `renderTemplate` | Already implemented; handles German, gender styles, all template variables |
| Population code normalization | Hard-coded `switch` | Alias map + `getPopulations()` from core | Core has authoritative codes; alias map adds full-name support on top |
| Carrier frequency math | Any new calculation | `@gnomad-cf/core/calculations` | HWE, VCR/GCR, prevalence, homozygote exclusion — all tested |
| Retry with exponential backoff | Simple `try/catch` | `withRetry()` utility (see pattern above) | Jitter prevents thundering herd; capped delay prevents infinite wait |

**Key insight:** The CLI is a thin I/O layer. It reads args, calls core, formats output. Every domain computation is already correct in `@gnomad-cf/core`.

---

## Common Pitfalls

### Pitfall 1: @clack/prompts Cancellation Not Checked

**What goes wrong:** User hits Ctrl+C mid-wizard. The prompt returns `Symbol(clack:cancel)`. If passed to the next step or to a fetch function, the code crashes with a cryptic type error.
**Why it happens:** Developers check once at the end of all prompts, or forget entirely.
**How to avoid:** After every `await p.<prompt>()` call, immediately: `if (p.isCancel(result)) { p.cancel('Cancelled.'); process.exit(0) }`. Use `p.group()` with `onCancel` handler for grouped prompt flows.
**Warning signs:** TypeScript errors ("Symbol not assignable to string") or runtime crashes in wizard code.

### Pitfall 2: Shebang Stripped or Missing from Output

**What goes wrong:** The installed `gnomad-cf` binary fails with "bad interpreter" on Unix, or requires `node dist/cli.js` explicitly.
**Why it happens:** tsdown doesn't add shebang automatically without configuration.
**How to avoid:** Use `banner: { js: '#!/usr/bin/env node' }` in `tsdown.config.ts`. Verify: `head -1 dist/cli.js` should output `#!/usr/bin/env node`. Keep `minify: false` (default) — minifiers can strip comment-like lines.
**Warning signs:** `gnomad-cf: bad interpreter` or `gnomad-cf: command not found` after `npm install -g`.

### Pitfall 3: Missing `chmod +x` on the Built File

**What goes wrong:** On Unix, `dist/cli.js` exists but is not executable. Direct invocation fails.
**Why it happens:** tsdown doesn't set file permissions.
**How to avoid:** Add `"postbuild": "chmod +x dist/cli.js"` to scripts. (npm/bun global installs set permissions via the `bin` field automatically — this pitfall is mainly during local `bun link` development.)
**Warning signs:** `Permission denied: ./dist/cli.js` when running directly.

### Pitfall 4: gnomAD API Has Undocumented Rate Limits

**What goes wrong:** Batch mode with `--concurrency 10+` triggers connection resets or 429 responses mid-batch. Genes silently fail.
**Why it happens:** gnomAD's public GraphQL API has no published rate limit documentation. The web app never hits limits because it's one-at-a-time, user-driven.
**How to avoid:** Default `--concurrency 3` (per STATE.md empirical decision). Implement full exponential backoff with jitter. Treat HTTP 429 and 5xx as retryable. Treat 4xx (except 429) as terminal per-gene errors.
**Warning signs:** Batch job producing many failures with `--concurrency 10+`; error messages contain "connection reset" or "fetch failed".

### Pitfall 5: Commander Option Scoping in Subcommands

**What goes wrong:** Global options (`--format`, `--gnomad-version`) defined on `program` are inaccessible inside subcommand action handlers.
**Why it happens:** Commander scopes `.opts()` per command level. A subcommand's `.opts()` only returns that subcommand's options.
**How to avoid:** Either (a) define common options on each subcommand individually, or (b) share via a context object that `parseAsync` hooks populate. Option (a) is simpler for a small number of global options.
**Warning signs:** `options.format === undefined` inside a `query` action handler when `--format` is a root program option.

### Pitfall 6: TSV Output Breaking on Special Characters

**What goes wrong:** Population labels or gene names containing tabs or newlines corrupt the TSV structure downstream.
**Why it happens:** Simple field concatenation with `\t` doesn't escape embedded characters.
**How to avoid:** Escape TSV fields: replace `\t` → space, `\n` → space. Or quote all fields. Clinical text should never appear in TSV rows — it's only for `--format text`.
**Warning signs:** Excel/awk parses TSV with incorrect column alignment.

### Pitfall 7: Batch Input Auto-Detection Ambiguity

**What goes wrong:** A plain-text file starting with `[` (e.g., `[CFTR\nHEXA]`) is mistakenly parsed as JSON.
**Why it happens:** Auto-detection based on `JSON.parse` attempt.
**How to avoid:** Try `JSON.parse`; if it succeeds and the result is an `Array<string>`, treat as plain-text gene list (not structured JSON). If result is `Array<object>`, treat as structured JSON with per-gene settings. Validate each path with zod.
**Warning signs:** User reports that gene list "isn't being read correctly."

### Pitfall 8: Interactive Mode Launched Without TTY

**What goes wrong:** User pipes output (`gnomad-cf | jq`), or CI runs `gnomad-cf` without subcommand. Interactive wizard hangs waiting for stdin.
**Why it happens:** @clack/prompts requires an interactive terminal.
**How to avoid:** Check `process.stdout.isTTY && process.stdin.isTTY` before defaulting to interactive mode. If not a TTY and no subcommand given, print usage message to stderr and exit with code 1.
**Warning signs:** CI pipelines hanging; no output.

### Pitfall 9: @gnomad-cf/core Import Subpath Errors

**What goes wrong:** Importing from wrong path (e.g., `@gnomad-cf/core` root instead of `@gnomad-cf/core/calculations`) returns undefined for expected functions.
**Why it happens:** Core's root `index.ts` re-exports a limited set; most functions are subpath-only.
**How to avoid:** Always use explicit subpaths: `@gnomad-cf/core/calculations`, `@gnomad-cf/core/client`, etc. Reference `packages/core/package.json` exports map for the definitive list.
**Warning signs:** `undefined is not a function` when calling calculation functions.

---

## Code Examples

### Complete Single Gene Query Pipeline

```typescript
// src/utils/gene-query.ts
// Sources: @gnomad-cf/core subpaths (read from source directly)
import { executeGraphQLQuery } from '@gnomad-cf/core/client'
import { GENE_VARIANTS_QUERY } from '@gnomad-cf/core/queries'
import { filterPathogenicVariantsConfigurable } from '@gnomad-cf/core/filters'
import {
  aggregatePopulationFrequenciesWithConfig,
  buildPopulationFrequencies,
} from '@gnomad-cf/core/calculations'
import {
  getDatasetId,
  getReferenceGenome,
  type GnomadVersion,
} from '@gnomad-cf/core/config'
import type { FilterConfig, CalcConfig } from '@gnomad-cf/core/types'
import type { GeneVariantsResponse } from '@gnomad-cf/core/queries'
import { withRetry } from './retry.js'

export async function queryGene(gene: string, version: GnomadVersion, filterConfig: FilterConfig, calcConfig: CalcConfig) {
  const response = await withRetry(() =>
    executeGraphQLQuery<GeneVariantsResponse>({
      query: GENE_VARIANTS_QUERY,
      variables: {
        geneSymbol: gene.toUpperCase(),
        dataset: getDatasetId(version),
        referenceGenome: getReferenceGenome(version),
      },
    }, version)
  )

  if (response.errors?.length) {
    throw new Error(response.errors.map(e => e.message).join('; '))
  }
  if (!response.data?.gene) {
    throw new Error(`Gene "${gene}" not found in gnomAD ${version}`)
  }

  const { variants, clinvar_variants } = response.data.gene

  const pathogenic = filterPathogenicVariantsConfigurable(
    variants,
    clinvar_variants,
    filterConfig
  )

  const aggregated = aggregatePopulationFrequenciesWithConfig(
    pathogenic,
    version,
    calcConfig
  )

  return buildPopulationFrequencies(aggregated, null, version)
}
```

### Human-Readable Text Output (Summary Blocks)

```
Gene: CFTR  |  gnomAD v4.1  |  Qualifying Variants: 12

=== Non-Finnish European (nfe) ===
  Carrier Frequency:    1:29
  Genetic Prevalence:   1:841
  Bayesian Prevalence:  1:841  (penetrance: 100%)
  Allele Count:         2,847
  Allele Number:        247,120
  Sum Allele Freq:      0.01725

=== Ashkenazi Jewish (asj) ===
  Carrier Frequency:    1:25  [!] Elevated — possible founder effect
  ...
```

### TSV Output with Field Escaping

```typescript
// src/output/tsv-formatter.ts
function escapeField(value: string): string {
  return value.replace(/\t/g, ' ').replace(/\n/g, ' ').replace(/\r/g, '')
}

export function formatTSV(gene: string, pops: PopulationFrequency[], version: string): string {
  const headers = ['gene', 'gnomad_version', 'population_code', 'population_label',
    'carrier_frequency', 'genetic_prevalence', 'allele_count', 'allele_number']
  const rows = pops.map(pop => [
    escapeField(gene),
    escapeField(version),
    escapeField(pop.code),
    escapeField(pop.label),
    pop.carrierFrequency?.toFixed(6) ?? 'NA',
    pop.geneticPrevalence?.toFixed(8) ?? 'NA',
    String(pop.alleleCount),
    String(pop.alleleNumber),
  ].join('\t'))
  return [headers.join('\t'), ...rows].join('\n')
}
```

### Population Alias Map

```typescript
// src/utils/population-aliases.ts
// Source: packages/core/src/config/gnomad.json (verified by reading source)
// Accept full names ("european") or short codes ("nfe") — output is always the short code
const POPULATION_ALIASES: Record<string, string> = {
  african: 'afr', 'african-american': 'afr',
  'admixed-american': 'amr', latino: 'amr', hispanic: 'amr',
  ashkenazi: 'asj', 'ashkenazi-jewish': 'asj',
  'east-asian': 'eas',
  finnish: 'fin',
  'middle-eastern': 'mid',
  european: 'nfe', 'non-finnish-european': 'nfe',
  'south-asian': 'sas',
  amish: 'ami',   // v3 only
  other: 'oth',   // v2 only
}

export function resolvePopulation(input: string): string {
  const lower = input.toLowerCase().trim().replace(/\s+/g, '-')
  return POPULATION_ALIASES[lower] ?? lower // pass-through if already a short code
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@clack/prompts` v0.x (CJS+ESM) | v1.0.1 (ESM-only) | Jan 2026 | Autocomplete, progress, autocompleteMultiselect added; package must be `"type": "module"` |
| Zod v3 | Zod v4.3.5 (stable) | Aug 2025 | Already in core; 14x faster; same API for simple schemas (z.string(), z.object()) |
| Commander v13 | Commander v14.0.3 | May 2024 | Node.js v20+ required; v15 (ESM-only) expected May 2026 — don't use yet |
| p-limit v7 | p-queue v8.1.0 | p-queue stable (2023+) | p-queue adds queue introspection (activeCount, pendingCount), timeout, priority — better for batch |
| tsup (esbuild) | tsdown v0.20.3 (rolldown) | 2024-2025 | Already in monorepo; better tree-shaking; `banner` option for shebang |
| Hand-rolled retry | `withRetry()` utility | ongoing | No library needed — simple pattern; avoid adding `exponential-backoff` npm dep |

**Deprecated/outdated:**
- `inquirer`: Still maintained; heavier; @clack/prompts is the modern standard for wizard-style flows
- `ora` spinner: @clack/prompts includes spinner built-in since v1.0
- `cli-progress`: @clack/prompts v1.0 includes `progress` built-in
- `#!/usr/bin/env bun` shebang: Use `node` for portability; bun handles node-targeted ESM fine
- Commander v15 (pre-release, ESM-only): Not yet stable as of Feb 2026; stick with v14

---

## Open Questions

1. **tsdown `banner` exact ChunkAddon type signature**
   - What we know: `UserConfig.banner?: ChunkAddon`; tsdown powered by Rolldown which uses `banner: { js: string }` (object) or `banner: string` (in some contexts). The tsdown docs page `/options/banner-footer` returned 404. DeepWiki confirms `banner` is supported.
   - What's unclear: Whether `{ js: '#!/usr/bin/env node' }` or `'#!/usr/bin/env node'` is the correct ChunkAddon format for tsdown v0.20.3.
   - Recommendation: Try `banner: { js: '#!/usr/bin/env node' }` first (Rolldown API format). Fallback: `banner: '#!/usr/bin/env node'`. Verify by checking `head -1 dist/cli.js` after build. Test as first task.

2. **gnomAD API rate limits**
   - What we know: Not documented. Default `--concurrency 3` is empirical per STATE.md. The web app makes no parallel requests.
   - What's unclear: Actual threshold before 429 responses; per-second vs per-minute limiting.
   - Recommendation: Default `--concurrency 3`. Full exponential backoff. If 429 received, halve concurrency for remaining batch. Log warnings on retry.

3. **Gene autocomplete response latency**
   - What we know: `GENE_SEARCH_QUERY` is a live gnomAD API call. The web app debounces at 300ms (`debounceMs: 300` in `settings.json`).
   - What's unclear: Whether @clack/prompts `autocomplete` has internal debounce or fires options callback on every keystroke.
   - Recommendation: Add manual debounce inside the `options` callback (300ms matches existing web app setting). Minimum 2-character threshold before querying (matches `minSearchChars: 2` in `settings.json`).

4. **@clack/prompts `autocomplete` async options signature**
   - What we know: Bombshell docs show `options: async (input: string) => Promise<Option[]>`. The v1.0.0 CHANGELOG confirms the autocomplete component addition.
   - What's unclear: TypeScript exact type signature of the `options` parameter (sync vs async function).
   - Recommendation: Implement as async; TypeScript will surface a compile error if the signature is wrong. Verify immediately after installation by running interactive mode.

5. **Windows `bun link` bin handling**
   - What we know: `npm install -g` creates `.cmd` wrappers on Windows automatically via the `bin` field. The `chmod +x` postbuild step is Unix-only.
   - What's unclear: Whether `bun link` (for local dev) creates the correct Windows wrapper.
   - Recommendation: Test `bun link` on the dev machine (Windows 11) early. The `postbuild: chmod +x dist/cli.js` is harmless on Windows (exits silently on WSL; ignored by PowerShell).

---

## Sources

### Primary (HIGH confidence)

- `@gnomad-cf/core` source (read directly) — all types, calculations, client, config, filters, templates
  - `packages/core/src/client/index.ts` — `executeGraphQLQuery` signature
  - `packages/core/src/calculations/` — HWE, VCR/GCR, prevalence, formatters
  - `packages/core/src/types/calculations.ts` — `CalcConfig`, `FACTORY_CALC_DEFAULTS`
  - `packages/core/src/types/filter.ts` — `FilterConfig`, `FACTORY_FILTER_DEFAULTS`
  - `packages/core/src/config/gnomad.json` — versions (v4, v3, v2) + population codes
  - `packages/core/package.json` — 9 subpath exports map
- `https://bomb.sh/docs/clack/packages/prompts` — full @clack/prompts v1.0.1 API: autocomplete, multiselect, progress, spinner, tasks, group, confirm, isCancel
- `https://github.com/bombshell-dev/clack/blob/main/packages/prompts/CHANGELOG.md` — v1.0.0 ESM-only + autocomplete + progress additions; v1.0.1 patch
- `https://github.com/tj/commander.js/releases` — v14.0.3 is latest stable; v15 pre-release (ESM-only, May 2026)
- `https://github.com/sindresorhus/p-queue` — p-queue v8.1.0 ESM-only, concurrency API, TypeScript usage
- `https://tsdown.dev/reference/api/Interface.UserConfig` — `banner?: ChunkAddon`, `platform`, `format` confirmed
- `https://zod.dev/v4` — Zod v4 stable release; current npm version 4.3.5

### Secondary (MEDIUM confidence)

- `https://deepwiki.com/rolldown/tsdown` — ShebangPlugin description; banner/footer injection support
- `https://github.com/lirantal/nodejs-cli-apps-best-practices` — exit codes (0=success), stderr for errors, stdout for data, POSIX signals, XDG Base Directory
- `https://oneuptime.com/blog/post/2026-01-06-nodejs-retry-exponential-backoff/view` — exponential backoff with jitter pattern for 2026
- WebSearch: commander 281M weekly downloads vs yargs 148M weekly downloads (multiple npm stats sources)

### Tertiary (LOW confidence)

- gnomAD API rate limits: Not documented. `--concurrency 3` default is empirical only (STATE.md).
- tsdown banner exact syntax: Documentation 404'd; inferred from Rolldown API + DeepWiki; needs task-time verification.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libs verified via official npm/docs/releases with specific versions
- Architecture patterns: HIGH — code examples based on verified API signatures from official sources
- @gnomad-cf/core integration: HIGH — read actual source of all relevant core modules
- @clack/prompts API: HIGH — verified via Bombshell docs site + CHANGELOG (v1.0.0 additions confirmed)
- tsdown CLI binary banner: MEDIUM — UserConfig interface verified; ChunkAddon type syntax needs task-time test
- gnomAD rate limits: LOW — undocumented; empirical default only

**Research date:** 2026-02-24
**Valid until:** 2026-03-24 (30 days — stable libraries; @clack/prompts 1.0.1 very recent so small API changes possible)
