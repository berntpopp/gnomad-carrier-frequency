// URL state types and Zod validation schemas for shareable URLs
import { z } from 'zod';
import type { FilterConfig } from './filter';
import { FACTORY_FILTER_DEFAULTS } from './filter';

/**
 * Zod schema for URL state parameters
 * Validates and transforms URL query parameters to typed state
 */
export const UrlStateSchema = z.object({
  /** Gene symbol (BRCA1, CFTR, etc.) */
  gene: z.string().min(1).max(50).optional(),

  /** Current wizard step (1-4) */
  step: z.coerce.number().int().min(1).max(4).optional().default(1),

  /** Index patient status */
  status: z.enum(['heterozygous', 'homozygous']).optional().default('heterozygous'),

  /** Frequency source */
  source: z.enum(['gnomad', 'literature', 'default']).optional().default('gnomad'),

  /** Literature frequency value (only when source=literature) */
  litFreq: z.coerce.number().min(0).max(1).optional(),

  /** Literature PMID reference */
  litPmid: z.string().optional(),

  /** Compact filter flags: l=lof, m=missense, c=clinvar, or "none" */
  filters: z
    .string()
    .regex(/^(l?m?c?|none)$/)
    .optional(),

  /** ClinVar star threshold (0-4) */
  clinvarStars: z.coerce.number().int().min(0).max(4).optional(),

  /** Include conflicting classifications (0=no, 1=yes) */
  conflicting: z.enum(['0', '1']).optional(),

  /** Conflicting classification threshold percentage (50-100) */
  conflictThreshold: z.coerce.number().int().min(50).max(100).optional(),
});

/**
 * URL state type derived from Zod schema
 */
export type UrlState = z.infer<typeof UrlStateSchema>;

/**
 * Parse URL parameters into validated URL state
 * Uses safeParse for graceful validation with fallback to defaults
 *
 * @param params - Raw URL parameters as Record<string, unknown>
 * @returns Validated UrlState with defaults applied
 */
export function parseUrlState(params: Record<string, unknown>): UrlState {
  const result = UrlStateSchema.safeParse(params);

  if (!result.success) {
    console.warn('[URL State] Validation failed, using defaults:', result.error.format());
    return UrlStateSchema.parse({});
  }

  return result.data;
}

/**
 * Encode filter configuration to compact URL string
 * - 'lmc' = all enabled (lof, missense, clinvar)
 * - 'lc' = lof + clinvar (no missense)
 * - 'none' = all disabled
 *
 * @param config - Filter configuration to encode
 * @returns Compact string representation
 */
export function encodeFilterFlags(config: FilterConfig): string {
  // Check if all filters are disabled
  if (!config.lofHcEnabled && !config.missenseEnabled && !config.clinvarEnabled) {
    return 'none';
  }

  let flags = '';
  if (config.lofHcEnabled) flags += 'l';
  if (config.missenseEnabled) flags += 'm';
  if (config.clinvarEnabled) flags += 'c';

  return flags;
}

/**
 * Decode compact filter flags string to partial FilterConfig
 *
 * @param flags - Compact string (e.g., 'lmc', 'lc', 'none')
 * @returns Partial FilterConfig with decoded flags
 */
export function decodeFilterFlags(flags: string): Partial<FilterConfig> {
  if (flags === 'none') {
    return {
      lofHcEnabled: false,
      missenseEnabled: false,
      clinvarEnabled: false,
    };
  }

  return {
    lofHcEnabled: flags.includes('l'),
    missenseEnabled: flags.includes('m'),
    clinvarEnabled: flags.includes('c'),
  };
}

/**
 * Check if filter config differs from factory defaults
 * Used to determine if filters param should be included in URL
 *
 * @param config - Current filter configuration
 * @returns True if any filter setting differs from defaults
 */
export function filtersMatchDefaults(config: FilterConfig): boolean {
  return (
    config.lofHcEnabled === FACTORY_FILTER_DEFAULTS.lofHcEnabled &&
    config.missenseEnabled === FACTORY_FILTER_DEFAULTS.missenseEnabled &&
    config.clinvarEnabled === FACTORY_FILTER_DEFAULTS.clinvarEnabled &&
    config.clinvarStarThreshold === FACTORY_FILTER_DEFAULTS.clinvarStarThreshold &&
    config.clinvarIncludeConflicting === FACTORY_FILTER_DEFAULTS.clinvarIncludeConflicting &&
    config.clinvarConflictingThreshold === FACTORY_FILTER_DEFAULTS.clinvarConflictingThreshold
  );
}
