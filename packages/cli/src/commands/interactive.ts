/**
 * gnomad-cf interactive
 *
 * Step-by-step wizard that guides users through carrier frequency calculation.
 * Mirrors the web app's stepper flow using @clack/prompts.
 *
 * CLI requirements addressed:
 *   CLI-10: Interactive mode via @clack/prompts
 *
 * Non-TTY environments receive a usage hint and exit immediately.
 */

import * as p from '@clack/prompts'
import { Command } from 'commander'
import { searchGenes, queryGene } from '../utils/gene-query.js'
import { getPopulationOptions } from '../utils/population-aliases.js'
import { loadUserConfig, mergeConfig } from '../config/user-config.js'
import { formatText } from '../output/text-formatter.js'
import { formatJson } from '../output/json-formatter.js'
import { formatTsv } from '../output/tsv-formatter.js'
import type { GnomadVersion } from '@gnomad-cf/core/config'
import type { QueryResult } from '../types.js'

// ---------------------------------------------------------------------------
// Command definition
// ---------------------------------------------------------------------------

export const interactiveCommand = new Command('interactive')
  .description('Launch interactive carrier frequency wizard')
  .action(async () => {
    await runInteractive()
  })

// ---------------------------------------------------------------------------
// Wizard
// ---------------------------------------------------------------------------

/**
 * Run the interactive wizard.
 *
 * Steps:
 *  0. TTY check — non-TTY exits with usage hint
 *  1. Intro banner
 *  2. Gene input with autocomplete typeahead
 *  3. gnomAD version selection
 *  4. Population multiselect
 *  5. Output format selection
 *  6. Advanced options (optional)
 *  7. Query with spinner
 *  8. Display results
 *  9. Echo equivalent CLI command
 * 10. Outro
 */
export async function runInteractive(): Promise<void> {
  // Step 0: TTY check (RESEARCH.md pitfall 7)
  if (!process.stdout.isTTY || !process.stdin.isTTY) {
    console.error(
      'Interactive mode requires a terminal. Use "gnomad-cf query <gene>" for non-interactive usage.'
    )
    process.exit(1)
  }

  // Step 1: Intro
  p.intro('gnomad-cf - Carrier Frequency Calculator')

  // Load user config for defaults
  const userConfig = await loadUserConfig()
  const merged = mergeConfig(userConfig, {})

  // Step 2: Gene input with autocomplete
  // @clack/prompts autocomplete v1.0.1 uses a synchronous options function + filter.
  // For typeahead search, we pre-seed an empty list and use the filter callback
  // to drive async gene searches via a shared state trick.
  // Simpler approach: use p.text for gene input, validate non-empty,
  // then optionally confirm via a search result.
  const geneInput = await p.text({
    message: 'Enter a gene symbol:',
    placeholder: 'e.g. CFTR, HEXA, GJB2',
    validate: (v) => {
      if (v.trim().length < 1) return 'Gene symbol required'
      if (!/^[A-Za-z0-9_.-]+$/.test(v.trim())) return 'Invalid gene symbol'
    },
  })
  if (p.isCancel(geneInput)) {
    p.cancel('Cancelled.')
    process.exit(0)
  }

  const geneRaw = (geneInput as string).trim().toUpperCase()

  // Typeahead: search gnomAD for matching genes and let user confirm/pick
  let gene = geneRaw
  const s0 = p.spinner()
  s0.start(`Searching gnomAD for "${geneRaw}"...`)
  let searchResults: Array<{ symbol: string; ensembl_id: string }> = []
  try {
    searchResults = await searchGenes(geneRaw, merged.version)
    s0.stop(`Found ${searchResults.length} matching gene(s)`)
  } catch {
    s0.stop('Gene search unavailable — proceeding with entered symbol')
  }

  if (searchResults.length === 0) {
    // No results — proceed with the raw input (queryGene will validate)
    p.log.warn(`No gnomAD matches for "${geneRaw}" — will attempt query anyway`)
  } else if (searchResults.length === 1 && searchResults[0].symbol === geneRaw) {
    // Exact match — no disambiguation needed
    gene = searchResults[0].symbol
  } else if (searchResults.length >= 1) {
    // Offer autocomplete from search results
    const options: Array<{ value: string; label: string; hint: string }> = searchResults
      .slice(0, 10)
      .map((g) => ({ value: g.symbol, label: g.symbol, hint: g.ensembl_id }))

    // If the exact symbol is already in the list, pre-select it
    const hasExactMatch = options.some((o) => o.value === geneRaw)

    const selected = await p.autocomplete({
      message: 'Select gene (type to filter):',
      placeholder: geneRaw,
      options,
      initialValue: hasExactMatch ? geneRaw : options[0].value,
    })
    if (p.isCancel(selected)) {
      p.cancel('Cancelled.')
      process.exit(0)
    }
    gene = selected as string
  }

  // Step 3: gnomAD version selection
  const version = await p.select({
    message: 'Select gnomAD version:',
    options: [
      { value: 'v4', label: 'gnomAD v4.1', hint: 'Recommended — largest dataset (~807K samples)' },
      { value: 'v3', label: 'gnomAD v3.1.2', hint: 'Genome-only, includes Amish population' },
      { value: 'v2', label: 'gnomAD v2.1.1', hint: 'GRCh37, legacy' },
    ],
    initialValue: merged.version as string,
  })
  if (p.isCancel(version)) {
    p.cancel('Cancelled.')
    process.exit(0)
  }
  const selectedVersion = version as GnomadVersion

  // Step 4: Population multiselect (empty = all populations)
  const populationOptions = getPopulationOptions(selectedVersion)
  const populations = await p.multiselect({
    message: 'Select populations to display (space to toggle, enter to confirm):',
    options: populationOptions.map((pop) => ({
      value: pop.value,
      label: pop.label,
    })),
    required: false, // Empty = show all populations
  })
  if (p.isCancel(populations)) {
    p.cancel('Cancelled.')
    process.exit(0)
  }
  const selectedPopulations = populations as string[]

  // Step 5: Output format
  const format = await p.select({
    message: 'Output format:',
    options: [
      { value: 'text', label: 'Human-readable text', hint: 'Summary blocks per population' },
      { value: 'json', label: 'JSON', hint: 'Machine-readable structured data' },
      { value: 'tsv', label: 'TSV', hint: 'Tab-separated for spreadsheets' },
    ],
    initialValue: merged.format,
  })
  if (p.isCancel(format)) {
    p.cancel('Cancelled.')
    process.exit(0)
  }
  const selectedFormat = format as string

  // Step 6: Advanced options (optional)
  const showAdvanced = await p.confirm({
    message: 'Configure advanced options?',
    initialValue: false,
  })
  if (p.isCancel(showAdvanced)) {
    p.cancel('Cancelled.')
    process.exit(0)
  }

  // Advanced option state (defaults match factory defaults)
  let useHWE = merged.calcConfig.useHWEFormula
  let excludeHomozygotes = merged.calcConfig.useHomExclusion
  let penetrance = merged.calcConfig.penetrance
  let includeVariants = false

  if (showAdvanced) {
    const hweToggle = await p.confirm({
      message: 'Use Hardy-Weinberg Equilibrium (HWE) formula?',
      initialValue: useHWE,
    })
    if (p.isCancel(hweToggle)) {
      p.cancel('Cancelled.')
      process.exit(0)
    }
    useHWE = hweToggle as boolean

    const homToggle = await p.confirm({
      message: 'Exclude homozygous variants from carrier frequency?',
      initialValue: excludeHomozygotes,
    })
    if (p.isCancel(homToggle)) {
      p.cancel('Cancelled.')
      process.exit(0)
    }
    excludeHomozygotes = homToggle as boolean

    const penetranceInput = await p.text({
      message: 'Penetrance (0–1, e.g. 0.85 for 85%):',
      placeholder: String(penetrance),
      validate: (v) => {
        const n = parseFloat(v)
        if (isNaN(n) || n < 0 || n > 1) return 'Enter a number between 0 and 1'
      },
    })
    if (p.isCancel(penetranceInput)) {
      p.cancel('Cancelled.')
      process.exit(0)
    }
    penetrance = parseFloat(penetranceInput as string)

    const variantsToggle = await p.confirm({
      message: 'Include per-variant breakdown in output?',
      initialValue: false,
    })
    if (p.isCancel(variantsToggle)) {
      p.cancel('Cancelled.')
      process.exit(0)
    }
    includeVariants = variantsToggle as boolean
  }

  // Step 7: Execute query with spinner
  const s = p.spinner()
  s.start(`Querying gnomAD ${selectedVersion} for ${gene}...`)

  let result: QueryResult
  try {
    result = await queryGene(gene, {
      version: selectedVersion,
      filterConfig: merged.filterConfig,
      calcConfig: {
        ...merged.calcConfig,
        useHWEFormula: useHWE,
        useHomExclusion: excludeHomozygotes,
        penetrance,
      },
      // population filter: only if exactly one population selected
      // (query command accepts single --population; multi-pop = show all)
      population: selectedPopulations.length === 1 ? selectedPopulations[0] : undefined,
    })
    s.stop(`Found ${result.variantCount} qualifying variant(s) for ${gene}`)
  } catch (err) {
    s.stop('Query failed')
    p.log.error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }

  // Step 8: Display results
  let output: string
  if (selectedFormat === 'json') {
    output = formatJson(result, { includeVariants, pretty: true })
  } else if (selectedFormat === 'tsv') {
    output = formatTsv(result, { includeVariants })
  } else {
    output = formatText(result, { includeVariants })
  }

  // Filter to selected populations in text output (multi-pop not filtered via queryGene)
  if (selectedPopulations.length > 1) {
    result = {
      ...result,
      populations: result.populations.filter((pop) =>
        selectedPopulations.includes(pop.code)
      ),
    }
    // Re-format with filtered populations
    if (selectedFormat === 'json') {
      output = formatJson(result, { includeVariants, pretty: true })
    } else if (selectedFormat === 'tsv') {
      output = formatTsv(result, { includeVariants })
    } else {
      output = formatText(result, { includeVariants })
    }
  }

  console.log('\n' + output)

  // Step 9: Echo equivalent CLI command
  const cmd = buildEquivalentCommand({
    gene,
    version: selectedVersion,
    populations: selectedPopulations,
    format: selectedFormat,
    hwe: useHWE,
    excludeHomozygotes,
    penetrance,
    variants: includeVariants,
  })
  p.note(cmd, 'Equivalent command')

  // Step 10: Outro
  p.outro('Done! Run the command above to repeat without the wizard.')
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build the equivalent gnomad-cf CLI command string from wizard selections.
 *
 * Omits flags that match their default values to keep the output minimal.
 * Multi-population selections cannot be expressed as a single --population flag;
 * in that case, the population filter is omitted and a comment is added.
 */
function buildEquivalentCommand(opts: {
  gene: string
  version: GnomadVersion
  populations: string[]
  format: string
  hwe: boolean
  excludeHomozygotes: boolean
  penetrance: number
  variants: boolean
}): string {
  const parts: string[] = ['gnomad-cf', 'query', opts.gene]

  // gnomAD version (omit if default v4)
  if (opts.version !== 'v4') {
    parts.push(`--gnomad-version ${opts.version}`)
  }

  // Population filter (single only — multi-pop not expressible with one flag)
  if (opts.populations.length === 1) {
    parts.push(`--population ${opts.populations[0]}`)
  }

  // Format (omit if default text)
  if (opts.format !== 'text') {
    parts.push(`--format ${opts.format}`)
  }

  // HWE formula (omit if default true)
  if (!opts.hwe) {
    parts.push('--no-hwe')
  }

  // Homozygote exclusion (omit if default true)
  if (!opts.excludeHomozygotes) {
    parts.push('--no-exclude-homozygotes')
  }

  // Penetrance (omit if default 1.0)
  if (opts.penetrance !== 1.0) {
    parts.push(`--penetrance ${opts.penetrance}`)
  }

  // Variants breakdown
  if (opts.variants) {
    parts.push('--variants')
  }

  const cmd = parts.join(' ')

  // Add note for multi-population case
  if (opts.populations.length > 1) {
    return (
      cmd +
      '\n# Note: multiple populations selected; --population flag supports one at a time.'
    )
  }

  return cmd
}
