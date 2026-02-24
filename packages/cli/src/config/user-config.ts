/**
 * User configuration loader for the gnomAD CF CLI.
 *
 * Reads ~/.gnomad-cf.json and validates it with Zod. Falls back to empty object
 * (all defaults) on any error — missing file, parse error, or validation failure.
 *
 * Merge priority (highest wins): CLI flags > user config > factory defaults
 */

import { readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { z } from 'zod'
import type { FilterConfig, CalcConfig } from '@gnomad-cf/core/types'
import { FACTORY_FILTER_DEFAULTS, FACTORY_CALC_DEFAULTS } from '@gnomad-cf/core/types'
import type { GnomadVersion } from '@gnomad-cf/core/config'

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const UserConfigSchema = z
  .object({
    defaultVersion: z.enum(['v4', 'v3', 'v2']).optional(),
    defaultFormat: z.enum(['text', 'json', 'tsv']).optional(),
    defaultConcurrency: z.number().int().min(1).max(10).optional(),
    defaultPopulation: z.string().optional(),
    hwe: z.boolean().optional(),
    excludeHomozygotes: z.boolean().optional(),
    penetrance: z.number().min(0).max(1).optional(),
  })
  .strict()

export type UserConfig = z.infer<typeof UserConfigSchema>

// ---------------------------------------------------------------------------
// Loader
// ---------------------------------------------------------------------------

/**
 * Load user configuration from ~/.gnomad-cf.json.
 *
 * Returns an empty object ({}) on any error:
 *  - ENOENT — file doesn't exist (normal for new users)
 *  - SyntaxError — invalid JSON
 *  - Zod validation error — unknown keys or invalid values (logged to stderr)
 *
 * @returns Validated UserConfig (may be partial / empty)
 */
export async function loadUserConfig(): Promise<UserConfig> {
  const configPath = join(homedir(), '.gnomad-cf.json')

  let raw: string
  try {
    raw = await readFile(configPath, 'utf-8')
  } catch {
    // File not found or not readable — silently return defaults
    return {}
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    process.stderr.write(
      `[gnomad-cf] Warning: ~/.gnomad-cf.json contains invalid JSON — using defaults\n`
    )
    return {}
  }

  const result = UserConfigSchema.safeParse(parsed)
  if (!result.success) {
    process.stderr.write(
      `[gnomad-cf] Warning: ~/.gnomad-cf.json validation failed — using defaults\n` +
        result.error.issues
          .map((e) => `  ${e.path.join('.')}: ${e.message}`)
          .join('\n') +
        '\n'
    )
    return {}
  }

  return result.data
}

// ---------------------------------------------------------------------------
// Merge helper
// ---------------------------------------------------------------------------

export interface MergedConfig {
  filterConfig: FilterConfig
  calcConfig: CalcConfig
  version: GnomadVersion
  format: string
}

/**
 * Merge factory defaults, user config, and CLI flags into a final config.
 *
 * Priority (highest to lowest):
 *  1. CLI flags (cliFlags argument)
 *  2. User config (~/.gnomad-cf.json)
 *  3. Factory defaults
 *
 * @param userConfig - Validated user config loaded from disk
 * @param cliFlags   - Raw CLI option values (string | boolean | number | undefined)
 * @returns Merged configuration ready for queryGene()
 */
export function mergeConfig(
  userConfig: UserConfig,
  cliFlags: Record<string, unknown>
): MergedConfig {
  // --- Filter config ---
  const filterConfig: FilterConfig = { ...FACTORY_FILTER_DEFAULTS }
  // (user config doesn't currently expose filter toggles — only calcConfig knobs)

  // --- Calc config ---
  const calcConfig: CalcConfig = { ...FACTORY_CALC_DEFAULTS }

  // Overlay user config values
  if (userConfig.hwe !== undefined) {
    calcConfig.useHWEFormula = userConfig.hwe
  }
  if (userConfig.excludeHomozygotes !== undefined) {
    calcConfig.useHomExclusion = userConfig.excludeHomozygotes
  }
  if (userConfig.penetrance !== undefined) {
    calcConfig.penetrance = userConfig.penetrance
  }

  // Overlay CLI flags (always win)
  if (typeof cliFlags['hwe'] === 'boolean') {
    calcConfig.useHWEFormula = cliFlags['hwe']
  }
  if (typeof cliFlags['excludeHomozygotes'] === 'boolean') {
    calcConfig.useHomExclusion = cliFlags['excludeHomozygotes']
  }
  if (typeof cliFlags['penetrance'] === 'number') {
    calcConfig.penetrance = cliFlags['penetrance']
  }

  // --- Version ---
  let version: GnomadVersion =
    (userConfig.defaultVersion as GnomadVersion | undefined) ?? 'v4'
  if (typeof cliFlags['version'] === 'string') {
    version = cliFlags['version'] as GnomadVersion
  }

  // --- Format ---
  let format: string = userConfig.defaultFormat ?? 'text'
  if (typeof cliFlags['format'] === 'string') {
    format = cliFlags['format']
  }

  return { filterConfig, calcConfig, version, format }
}
