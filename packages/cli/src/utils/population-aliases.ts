/**
 * Population alias mapping for the gnomAD CLI.
 *
 * Allows users to specify population names in a natural, readable way
 * (e.g., "european", "east asian") rather than gnomAD short codes (e.g., "nfe", "eas").
 * Short codes are passed through unchanged, enabling both styles.
 */

import { getPopulations } from '@gnomad-cf/core/config'
import type { GnomadVersion } from '@gnomad-cf/core/config'

/**
 * Map from human-readable aliases (lowercase) to gnomAD population codes.
 * Covers both hyphenated and space-separated forms, plus common alternatives.
 */
export const POPULATION_ALIASES: ReadonlyMap<string, string> = new Map([
  ['african', 'afr'],
  ['african/african-american', 'afr'],
  ['african-american', 'afr'],
  ['european', 'nfe'],
  ['non-finnish-european', 'nfe'],
  ['non-finnish european', 'nfe'],
  ['ashkenazi-jewish', 'asj'],
  ['ashkenazi jewish', 'asj'],
  ['ashkenazi', 'asj'],
  ['east-asian', 'eas'],
  ['east asian', 'eas'],
  ['south-asian', 'sas'],
  ['south asian', 'sas'],
  ['finnish', 'fin'],
  ['middle-eastern', 'mid'],
  ['middle eastern', 'mid'],
  ['admixed-american', 'amr'],
  ['admixed american', 'amr'],
  ['latino', 'amr'],
  ['latin-american', 'amr'],
  ['amish', 'ami'],
  ['other', 'oth'],
])

/**
 * Resolve a user-supplied population string to a gnomAD population code.
 *
 * - Trims and lowercases the input
 * - Looks up in the alias map; returns mapped code if found
 * - If not found in alias map, returns the input as-is (assumed to be a valid code)
 *
 * @param input - User-supplied population name or code
 * @returns gnomAD population code
 */
export function resolvePopulation(input: string): string {
  const normalized = input.trim().toLowerCase()
  return POPULATION_ALIASES.get(normalized) ?? normalized
}

/**
 * Get the list of available population options for a given gnomAD version,
 * formatted for use in interactive prompts and help text.
 *
 * @param version - gnomAD version (defaults to v4 if not specified)
 * @returns Array of { value, label } objects for all available populations
 */
export function getPopulationOptions(
  version?: GnomadVersion
): Array<{ value: string; label: string }> {
  return getPopulations(version).map((pop) => ({
    value: pop.code,
    label: pop.label,
  }))
}
