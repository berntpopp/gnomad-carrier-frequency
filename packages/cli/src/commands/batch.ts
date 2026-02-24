/**
 * Batch subcommand for the gnomAD CF CLI.
 *
 * Processes multiple genes from a file (plain text or JSON) with configurable
 * concurrency, progress tracking to stderr, and robust error handling.
 *
 * Usage:
 *   gnomad-cf batch genes.txt
 *   gnomad-cf batch genes.json --concurrency 5 --fail-fast
 *   gnomad-cf batch panel.json --format tsv --output results.tsv
 */

import { Command } from 'commander'
import pLimit from 'p-limit'
import { readFile, writeFile } from 'node:fs/promises'
import { z } from 'zod'
import { queryGene } from '../utils/gene-query.js'
import { loadUserConfig, mergeConfig } from '../config/user-config.js'
import { resolvePopulation } from '../utils/population-aliases.js'
import { formatText } from '../output/text-formatter.js'
import { formatJson } from '../output/json-formatter.js'
import { formatTsv } from '../output/tsv-formatter.js'
import type { QueryResult } from '../types.js'

// ---------------------------------------------------------------------------
// File parsing
// ---------------------------------------------------------------------------

/** Zod schema for JSON gene list: array of strings */
const StringArraySchema = z.array(z.string())

/** Zod schema for JSON gene list: array of objects with `gene` property */
const ObjectArraySchema = z.array(z.object({ gene: z.string() }).passthrough())

/**
 * Parse a gene list file content into an array of gene symbols.
 *
 * Supports two formats:
 *  1. JSON: `["CFTR", "HEXA"]` or `[{ "gene": "CFTR" }, { "gene": "HEXA" }]`
 *  2. Plain text: one gene per line; `#` comment lines and blank lines are skipped
 *
 * Exported for direct testing in Plan 07.
 *
 * @param content - Raw file content as string
 * @returns Array of gene symbols (uppercased from JSON, as-is from plain text)
 */
export function parseGeneListFile(content: string): string[] {
  // Attempt JSON parsing first
  try {
    const parsed = JSON.parse(content)

    // Try string array: ["CFTR", "HEXA"]
    const stringResult = StringArraySchema.safeParse(parsed)
    if (stringResult.success) {
      return stringResult.data.filter((g) => g.trim().length > 0).map((g) => g.trim())
    }

    // Try object array: [{ "gene": "CFTR" }, ...]
    const objectResult = ObjectArraySchema.safeParse(parsed)
    if (objectResult.success) {
      return objectResult.data
        .map((obj) => obj.gene.trim())
        .filter((g) => g.length > 0)
    }

    throw new Error(
      'JSON gene list must be an array of strings or objects with a "gene" property'
    )
  } catch (err) {
    // If it wasn't a format validation error, it's a JSON parse error — fall through to plain text
    if (err instanceof SyntaxError) {
      // Plain text: one gene per line
      return content
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && !line.startsWith('#'))
    }
    // Re-throw JSON structural errors
    throw err
  }
}

// ---------------------------------------------------------------------------
// Batch command
// ---------------------------------------------------------------------------

export const batchCommand = new Command('batch')
  .description('Process multiple genes from a file with concurrent API calls')
  .argument('<file>', 'Path to gene list file (plain text or JSON)')
  .option('-f, --format <fmt>', 'Output format: text|json|tsv', 'json')
  .option('--variants', 'Include per-variant breakdown in output')
  .option('-p, --population <id>', 'Filter to a specific population (code or alias)')
  .option('--gnomad-version <ver>', 'gnomAD version: v4|v3|v2 (default: v4)')
  .option('--hwe', 'Use Hardy-Weinberg equilibrium formula (default)')
  .option('--no-hwe', 'Use simplified 2q carrier frequency formula')
  .option('--exclude-homozygotes', 'Exclude homozygotes from carrier frequency (default)')
  .option('--no-exclude-homozygotes', 'Include homozygotes in carrier frequency')
  .option('--penetrance <n>', 'Penetrance as a fraction 0-1', parseFloat)
  .option('-o, --output <path>', 'Write output to file instead of stdout')
  .option('--concurrency <n>', 'Max concurrent API requests (1-10)', parseInt, 3)
  .option('--fail-fast', 'Stop on first gene error instead of skipping')
  .option('--lof', 'Include loss-of-function variants (default)')
  .option('--no-lof', 'Exclude loss-of-function variants')
  .option('--clinvar', 'Include ClinVar pathogenic variants (default)')
  .option('--no-clinvar', 'Exclude ClinVar pathogenic variants')
  .option('--star-threshold <n>', 'ClinVar minimum star rating', parseInt, 2)
  .action(async (file: string, opts: Record<string, unknown>) => {
    // --- Validate concurrency ---
    const concurrency = Number(opts['concurrency'])
    if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 10) {
      process.stderr.write(
        '[gnomad-cf] Error: --concurrency must be an integer between 1 and 10\n'
      )
      process.exit(2)
    }

    // --- Read and parse gene list file ---
    let fileContent: string
    try {
      fileContent = await readFile(file, 'utf-8')
    } catch (err) {
      process.stderr.write(`[gnomad-cf] Error: Cannot read file "${file}": ${String(err)}\n`)
      process.exit(2)
    }

    let genes: string[]
    try {
      genes = parseGeneListFile(fileContent)
    } catch (err) {
      process.stderr.write(
        `[gnomad-cf] Error: Failed to parse gene list file: ${String(err)}\n`
      )
      process.exit(2)
    }

    if (genes.length === 0) {
      process.stderr.write('[gnomad-cf] Error: Gene list file is empty or contains no valid genes\n')
      process.exit(2)
    }

    // --- Load and merge config ---
    const userConfig = await loadUserConfig()

    // Map CLI flags to mergeConfig-compatible shape
    const cliFlags: Record<string, unknown> = {}
    if (opts['gnomadVersion'] !== undefined) cliFlags['version'] = opts['gnomadVersion']
    if (opts['hwe'] !== undefined) cliFlags['hwe'] = opts['hwe']
    if (opts['excludeHomozygotes'] !== undefined) cliFlags['excludeHomozygotes'] = opts['excludeHomozygotes']
    if (opts['penetrance'] !== undefined) cliFlags['penetrance'] = opts['penetrance']
    if (opts['format'] !== undefined) cliFlags['format'] = opts['format']

    const merged = mergeConfig(userConfig, cliFlags)

    // Apply LoF / ClinVar / star-threshold CLI flags (override FilterConfig)
    if (opts['lof'] !== undefined) merged.filterConfig.includeLofHC = Boolean(opts['lof'])
    if (opts['clinvar'] !== undefined) merged.filterConfig.includeClinvar = Boolean(opts['clinvar'])
    if (opts['starThreshold'] !== undefined) {
      merged.filterConfig.minClinvarStars = Number(opts['starThreshold'])
    }

    // Resolve optional population filter
    const population = opts['population'] ? resolvePopulation(String(opts['population'])) : undefined

    // --- Setup concurrency limiter ---
    const limit = pLimit(concurrency)
    const failFast = Boolean(opts['failFast'])
    const includeVariants = Boolean(opts['variants'])

    // --- Process genes ---
    const results: QueryResult[] = []
    const errors: Array<{ gene: string; error: string }> = []
    let processed = 0
    let failFastTriggered = false

    process.stderr.write(`[gnomad-cf] Processing ${genes.length} genes (concurrency: ${concurrency})\n`)

    const tasks = genes.map((gene) =>
      limit(async () => {
        if (failFastTriggered) return

        try {
          const result = await queryGene(gene, {
            version: merged.version,
            filterConfig: merged.filterConfig,
            calcConfig: merged.calcConfig,
            population,
          })

          results.push(result)
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : String(err)
          errors.push({ gene, error: errorMessage })

          if (failFast) {
            failFastTriggered = true
            return
          }

          process.stderr.write(
            `[gnomad-cf] Warning: Failed to process "${gene}": ${errorMessage}\n`
          )
        } finally {
          processed++
          process.stderr.write(
            `[gnomad-cf] Progress: ${processed}/${genes.length} genes processed\r`
          )
        }
      })
    )

    await Promise.all(tasks)

    // Ensure progress line is terminated with newline
    process.stderr.write('\n')

    // --- Report errors ---
    if (errors.length > 0) {
      process.stderr.write(`\n[gnomad-cf] Failed genes (${errors.length}):\n`)
      for (const { gene, error } of errors) {
        process.stderr.write(`  - ${gene}: ${error}\n`)
      }
    }

    if (failFastTriggered) {
      process.stderr.write('[gnomad-cf] Stopped due to --fail-fast\n')
    }

    // --- Format and write output ---
    if (results.length === 0) {
      process.stderr.write('[gnomad-cf] No results to output\n')
      const exitCode = failFastTriggered ? 2 : 1
      process.exit(exitCode)
    }

    let output: string

    switch (merged.format) {
      case 'json':
        output = formatJson(results, { includeVariants })
        break

      case 'tsv':
        // Include variants only if requested (adds variant section after main table)
        output = formatTsv(results, { includeVariants })
        break

      case 'text':
        // For text format, concatenate each gene's block separated by a blank line
        output = results
          .map((r) => formatText(r, { includeVariants }))
          .join('\n\n' + '─'.repeat(60) + '\n\n')
        break

      default:
        process.stderr.write(
          `[gnomad-cf] Warning: Unknown format "${merged.format}", defaulting to json\n`
        )
        output = formatJson(results, { includeVariants })
    }

    // Write to file or stdout
    if (opts['output']) {
      try {
        await writeFile(String(opts['output']), output, 'utf-8')
        process.stderr.write(`[gnomad-cf] Output written to ${opts['output']}\n`)
      } catch (err) {
        process.stderr.write(
          `[gnomad-cf] Error: Cannot write output file "${opts['output']}": ${String(err)}\n`
        )
        process.exit(2)
      }
    } else {
      process.stdout.write(output + '\n')
    }

    // Exit code:
    //   0 — all genes processed successfully
    //   1 — partial failure (some genes skipped)
    //   2 — fail-fast triggered
    if (failFastTriggered) {
      process.exit(2)
    } else if (errors.length > 0) {
      process.exit(1)
    }
    // process.exit(0) — implicit
  })
