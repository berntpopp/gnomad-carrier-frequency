/**
 * Unit tests for CLI output formatters.
 *
 * Tests formatText, formatJson, and formatTsv with deterministic mock data.
 * No API calls — all inputs are constructed from known QueryResult objects.
 */

import { describe, it, expect } from 'vitest'
import { formatText } from '../output/text-formatter.js'
import { formatJson } from '../output/json-formatter.js'
import { formatTsv } from '../output/tsv-formatter.js'
import type { QueryResult, VariantDetail } from '../types.js'
import type { PopulationFrequency } from '@gnomad-cf/core/types'

// ---------------------------------------------------------------------------
// Mock data helpers
// ---------------------------------------------------------------------------

/**
 * Create a deterministic PopulationFrequency for testing.
 */
function createMockPopulation(
  code: string,
  label: string,
  overrides?: Partial<PopulationFrequency>
): PopulationFrequency {
  return {
    code,
    label,
    carrierFrequency: 0.02,
    alleleCount: 200,
    alleleNumber: 100000,
    isLowSampleSize: false,
    isFounderEffect: false,
    geneticPrevalence: 0.0001,
    ...overrides,
  }
}

/**
 * Create a deterministic QueryResult for testing.
 */
function createMockResult(gene = 'CFTR', overrides?: Partial<QueryResult>): QueryResult {
  const populations: PopulationFrequency[] = [
    createMockPopulation('nfe', 'European (non-Finnish)'),
    createMockPopulation('asj', 'Ashkenazi Jewish', {
      carrierFrequency: 0.04,
      alleleCount: 400,
      alleleNumber: 20000,
      geneticPrevalence: 0.0004,
      isFounderEffect: true,
    }),
    createMockPopulation('afr', 'African/African American', {
      carrierFrequency: null,
      alleleCount: 0,
      alleleNumber: 0,
      geneticPrevalence: null,
    }),
  ]

  const variants: VariantDetail[] = [
    {
      variant_id: '7-117559593-ATCT-A',
      consequence: 'frameshift_variant',
      alleleFrequency: 0.004587,
      clinvarSignificance: 'Pathogenic',
      ac_hom: 6,
    },
    {
      variant_id: '7-117548628-G-A',
      consequence: 'missense_variant',
      alleleFrequency: 0.000493,
      clinvarSignificance: 'Pathogenic',
      ac_hom: 1,
    },
  ]

  return {
    gene,
    version: 'v4',
    variantCount: 2,
    populations,
    globalCarrierFrequency: 0.02083,
    globalAlleleCount: 1660,
    globalAlleleNumber: 330000,
    globalSumAF: 0.005032,
    geneticPrevalence: 0.0000253,
    bayesianPrevalence: 0.0000253,
    formula: 'hwe',
    homExclusionActive: true,
    penetrance: 1.0,
    variants,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// formatText tests
// ---------------------------------------------------------------------------

describe('formatText', () => {
  it('produces output with gene header line', () => {
    const result = createMockResult()
    const output = formatText(result)
    expect(output).toContain('Gene: CFTR')
  })

  it('includes gnomAD version in header', () => {
    const result = createMockResult()
    const output = formatText(result)
    expect(output).toContain('gnomAD')
  })

  it('contains "Carrier frequency:" label', () => {
    const result = createMockResult()
    const output = formatText(result)
    expect(output).toContain('Carrier frequency:')
  })

  it('contains "Genetic prevalence:" label', () => {
    const result = createMockResult()
    const output = formatText(result)
    expect(output).toContain('Genetic prevalence:')
  })

  it('includes Global section with === separator', () => {
    const result = createMockResult()
    const output = formatText(result)
    expect(output).toContain('--- Global ---')
  })

  it('includes per-population sections', () => {
    const result = createMockResult()
    const output = formatText(result)
    expect(output).toContain('=== European (non-Finnish) (nfe) ===')
  })

  it('marks founder effect populations with [!]', () => {
    const result = createMockResult()
    const output = formatText(result)
    expect(output).toContain('[!]')
  })

  it('skips populations with null carrier frequency', () => {
    const result = createMockResult()
    const output = formatText(result)
    // afr has null carrierFrequency — should NOT appear as a population section
    expect(output).not.toContain('=== African/African American (afr) ===')
  })

  it('includes variant section when includeVariants is true', () => {
    const result = createMockResult()
    const output = formatText(result, { includeVariants: true })
    expect(output).toContain('Variants:')
    expect(output).toContain('7-117559593-ATCT-A')
  })

  it('omits variant detail rows when includeVariants is false', () => {
    const result = createMockResult()
    const output = formatText(result, { includeVariants: false })
    // The header line says "Variants: 2" but variant detail rows should not appear
    expect(output).not.toContain('7-117559593-ATCT-A')
  })

  it('includes formula in header', () => {
    const result = createMockResult()
    const output = formatText(result)
    expect(output).toContain('Formula:')
  })

  it('shows HWE formula when formula is hwe', () => {
    const result = createMockResult('CFTR', { formula: 'hwe' })
    const output = formatText(result)
    expect(output).toContain('HWE')
  })

  it('shows Simplified formula when formula is simplified', () => {
    const result = createMockResult('CFTR', { formula: 'simplified' })
    const output = formatText(result)
    expect(output).toContain('Simplified')
  })

  it('includes Bayesian prevalence line', () => {
    const result = createMockResult()
    const output = formatText(result)
    expect(output).toContain('Bayesian prevalence:')
  })
})

// ---------------------------------------------------------------------------
// formatJson tests
// ---------------------------------------------------------------------------

describe('formatJson', () => {
  it('produces valid JSON for a single result', () => {
    const result = createMockResult()
    const output = formatJson(result)
    expect(() => JSON.parse(output)).not.toThrow()
  })

  it('includes gene field in parsed output', () => {
    const result = createMockResult()
    const parsed = JSON.parse(formatJson(result))
    expect(parsed.gene).toBe('CFTR')
  })

  it('omits variants field when includeVariants is false (default)', () => {
    const result = createMockResult()
    const parsed = JSON.parse(formatJson(result))
    expect(parsed).not.toHaveProperty('variants')
  })

  it('includes variants field when includeVariants is true', () => {
    const result = createMockResult()
    const parsed = JSON.parse(formatJson(result, { includeVariants: true }))
    expect(parsed).toHaveProperty('variants')
    expect(Array.isArray(parsed.variants)).toBe(true)
    expect(parsed.variants).toHaveLength(2)
  })

  it('pretty-prints by default (output contains newlines)', () => {
    const result = createMockResult()
    const output = formatJson(result)
    expect(output).toContain('\n')
  })

  it('produces compact JSON when pretty is false', () => {
    const result = createMockResult()
    const output = formatJson(result, { pretty: false })
    expect(output).not.toContain('\n')
  })

  it('handles an array of results', () => {
    const results = [createMockResult('CFTR'), createMockResult('HEXA')]
    const parsed = JSON.parse(formatJson(results))
    expect(Array.isArray(parsed)).toBe(true)
    expect(parsed).toHaveLength(2)
    expect(parsed[0].gene).toBe('CFTR')
    expect(parsed[1].gene).toBe('HEXA')
  })

  it('preserves numeric fields in JSON output', () => {
    const result = createMockResult()
    const parsed = JSON.parse(formatJson(result))
    expect(typeof parsed.globalCarrierFrequency).toBe('number')
    expect(typeof parsed.variantCount).toBe('number')
  })
})

// ---------------------------------------------------------------------------
// formatTsv tests
// ---------------------------------------------------------------------------

describe('formatTsv', () => {
  it('produces output with header row', () => {
    const result = createMockResult()
    const output = formatTsv(result)
    const lines = output.split('\n')
    expect(lines[0]).toContain('gene')
    expect(lines[0]).toContain('population')
    expect(lines[0]).toContain('carrier_frequency')
  })

  it('header contains all expected column names', () => {
    const result = createMockResult()
    const output = formatTsv(result)
    const header = output.split('\n')[0]
    expect(header).toContain('population_code')
    expect(header).toContain('carrier_freq_ratio')
    expect(header).toContain('genetic_prevalence')
    expect(header).toContain('allele_count')
    expect(header).toContain('allele_number')
    expect(header).toContain('founder_effect')
    expect(header).toContain('low_sample_size')
  })

  it('includes a Global row', () => {
    const result = createMockResult()
    const output = formatTsv(result)
    expect(output).toContain('"Global"')
  })

  it('wraps all field values in double quotes', () => {
    const result = createMockResult()
    const output = formatTsv(result)
    // Every data row field should be quoted
    const dataLine = output.split('\n')[1]
    const fields = dataLine.split('\t')
    for (const field of fields) {
      expect(field.startsWith('"')).toBe(true)
      expect(field.endsWith('"')).toBe(true)
    }
  })

  it('includes per-population rows for non-null populations', () => {
    const result = createMockResult()
    const output = formatTsv(result)
    expect(output).toContain('"nfe"')
    expect(output).toContain('"asj"')
  })

  it('skips populations with null carrier frequency', () => {
    const result = createMockResult()
    const output = formatTsv(result)
    // afr population has null carrierFrequency — should not appear
    expect(output).not.toContain('"afr"')
  })

  it('produces multiple gene rows when given array input', () => {
    const results = [createMockResult('CFTR'), createMockResult('HEXA')]
    const output = formatTsv(results)
    expect(output).toContain('"CFTR"')
    expect(output).toContain('"HEXA"')
  })

  it('includes variant section when includeVariants is true', () => {
    const result = createMockResult()
    const output = formatTsv(result, { includeVariants: true })
    expect(output).toContain('# Variants')
    expect(output).toContain('variant_id')
    expect(output).toContain('7-117559593-ATCT-A')
  })

  it('omits variant section when includeVariants is false (default)', () => {
    const result = createMockResult()
    const output = formatTsv(result)
    expect(output).not.toContain('# Variants')
  })

  it('escapes internal double quotes in field values', () => {
    // A result with a field containing a double quote
    const result = createMockResult('CFTR', {
      populations: [
        createMockPopulation('test', 'Label "With" Quotes'),
      ],
    })
    const output = formatTsv(result)
    // Double quotes should be doubled (escaped as "")
    expect(output).toContain('""With""')
  })
})
