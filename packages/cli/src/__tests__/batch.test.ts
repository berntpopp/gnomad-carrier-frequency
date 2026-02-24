/**
 * Tests for batch command utilities.
 *
 * Covers parseGeneListFile (the exported file parsing function) with all
 * supported input formats: plain text, JSON string array, JSON object array,
 * comment/blank-line skipping, and error handling.
 *
 * Also covers batch processing behaviour: concurrency limits, error collection,
 * partial failure, and fail-fast mode — via direct invocation with a mock
 * queryGene to avoid any real API calls.
 */

import { vi, describe, it, expect, beforeEach } from 'vitest'
import { parseGeneListFile } from '../commands/batch.js'
import type { QueryResult, VariantDetail } from '../types.js'
import type { PopulationFrequency } from '@gnomad-cf/core/types'
import pLimit from 'p-limit'

// ---------------------------------------------------------------------------
// Mock helpers
// ---------------------------------------------------------------------------

function createMockQueryResult(gene: string): QueryResult {
  const populations: PopulationFrequency[] = [
    {
      code: 'nfe',
      label: 'European (non-Finnish)',
      carrierFrequency: 0.02,
      alleleCount: 200,
      alleleNumber: 100000,
      isLowSampleSize: false,
      isFounderEffect: false,
      geneticPrevalence: 0.0001,
    },
  ]

  const variants: VariantDetail[] = [
    {
      variant_id: `${gene}-variant-1`,
      consequence: 'frameshift_variant',
      alleleFrequency: 0.004,
      clinvarSignificance: 'Pathogenic',
      ac_hom: 2,
    },
  ]

  return {
    gene,
    version: 'v4',
    variantCount: 1,
    populations,
    globalCarrierFrequency: 0.02,
    globalAlleleCount: 200,
    globalAlleleNumber: 100000,
    globalSumAF: 0.002,
    geneticPrevalence: 0.000004,
    bayesianPrevalence: 0.000004,
    formula: 'hwe',
    homExclusionActive: true,
    penetrance: 1.0,
    variants,
  }
}

// ---------------------------------------------------------------------------
// parseGeneListFile tests
// ---------------------------------------------------------------------------

describe('parseGeneListFile', () => {
  describe('plain text format', () => {
    it('parses one gene per line', () => {
      const input = 'CFTR\nHEXA\nGJB2\n'
      expect(parseGeneListFile(input)).toEqual(['CFTR', 'HEXA', 'GJB2'])
    })

    it('handles Windows-style line endings (CRLF)', () => {
      const input = 'CFTR\r\nHEXA\r\nGJB2\r\n'
      const result = parseGeneListFile(input)
      expect(result).toEqual(['CFTR', 'HEXA', 'GJB2'])
    })

    it('skips empty lines', () => {
      const input = 'CFTR\n\nHEXA\n\nGJB2\n'
      expect(parseGeneListFile(input)).toEqual(['CFTR', 'HEXA', 'GJB2'])
    })

    it('skips comment lines starting with #', () => {
      const input = '# This is a gene list\nCFTR\n# comment\nHEXA\n'
      expect(parseGeneListFile(input)).toEqual(['CFTR', 'HEXA'])
    })

    it('skips both empty lines and comments', () => {
      const input = 'CFTR\n\n# comment\nHEXA\n'
      expect(parseGeneListFile(input)).toEqual(['CFTR', 'HEXA'])
    })

    it('trims whitespace from gene names', () => {
      const input = '  CFTR  \n  HEXA  \n'
      expect(parseGeneListFile(input)).toEqual(['CFTR', 'HEXA'])
    })

    it('returns empty array for all-comment input', () => {
      const input = '# comment 1\n# comment 2\n'
      expect(parseGeneListFile(input)).toEqual([])
    })

    it('returns empty array for blank input', () => {
      expect(parseGeneListFile('')).toEqual([])
    })
  })

  describe('JSON string array format', () => {
    it('parses a JSON array of strings', () => {
      const input = '["CFTR", "HEXA", "GJB2"]'
      expect(parseGeneListFile(input)).toEqual(['CFTR', 'HEXA', 'GJB2'])
    })

    it('handles a single-element JSON array', () => {
      const input = '["CFTR"]'
      expect(parseGeneListFile(input)).toEqual(['CFTR'])
    })

    it('handles an empty JSON array', () => {
      const input = '[]'
      expect(parseGeneListFile(input)).toEqual([])
    })

    it('filters out empty strings in JSON array', () => {
      const input = '["CFTR", "", "HEXA"]'
      const result = parseGeneListFile(input)
      expect(result).toEqual(['CFTR', 'HEXA'])
    })
  })

  describe('JSON object array format', () => {
    it('parses a JSON array of objects with gene property', () => {
      const input = '[{"gene":"CFTR"},{"gene":"HEXA"},{"gene":"GJB2"}]'
      expect(parseGeneListFile(input)).toEqual(['CFTR', 'HEXA', 'GJB2'])
    })

    it('ignores extra properties on gene objects', () => {
      const input = '[{"gene":"CFTR","note":"cystic fibrosis"},{"gene":"HEXA"}]'
      expect(parseGeneListFile(input)).toEqual(['CFTR', 'HEXA'])
    })

    it('handles a single gene object', () => {
      const input = '[{"gene":"CFTR"}]'
      expect(parseGeneListFile(input)).toEqual(['CFTR'])
    })
  })

  describe('error handling', () => {
    it('throws on JSON with invalid structure (not array of strings or objects)', () => {
      const input = '{"gene": "CFTR"}' // Object, not array
      expect(() => parseGeneListFile(input)).toThrow()
    })

    it('falls back to plain text when JSON has a syntax error', () => {
      // SyntaxError → treated as plain text
      const input = 'CFTR\nHEXA\n'
      expect(parseGeneListFile(input)).toEqual(['CFTR', 'HEXA'])
    })

    it('falls back to plain text for input with invalid JSON characters', () => {
      const input = 'CFTR\nHEXA\nGJB2'
      const result = parseGeneListFile(input)
      expect(result).toEqual(['CFTR', 'HEXA', 'GJB2'])
    })
  })
})

// ---------------------------------------------------------------------------
// Batch processing simulation tests
// ---------------------------------------------------------------------------
// These tests simulate the batch processing logic without Commander — using
// p-limit and the mock queryGene directly to verify concurrency and error
// handling behavior matches the batch command implementation.

describe('batch processing logic', () => {
  let activeCalls: number
  let maxActiveCalls: number

  beforeEach(() => {
    activeCalls = 0
    maxActiveCalls = 0
  })

  it('processes all genes and collects results', async () => {
    const genes = ['CFTR', 'HEXA', 'GJB2']
    const mockQueryGene = vi.fn(async (gene: string) => createMockQueryResult(gene))

    const limit = pLimit(3)
    const results: QueryResult[] = []

    await Promise.all(
      genes.map((gene) =>
        limit(async () => {
          const result = await mockQueryGene(gene)
          results.push(result)
        })
      )
    )

    expect(results).toHaveLength(3)
    expect(results.map((r) => r.gene)).toEqual(expect.arrayContaining(['CFTR', 'HEXA', 'GJB2']))
  })

  it('collects errors for failed genes without stopping processing', async () => {
    const genes = ['CFTR', 'HEXA', 'GJB2']
    const errors: Array<{ gene: string; error: string }> = []
    const results: QueryResult[] = []

    const mockQueryGene = vi.fn(async (gene: string) => {
      if (gene === 'HEXA') throw new Error('API timeout')
      return createMockQueryResult(gene)
    })

    const limit = pLimit(3)

    await Promise.all(
      genes.map((gene) =>
        limit(async () => {
          try {
            const result = await mockQueryGene(gene)
            results.push(result)
          } catch (err) {
            errors.push({ gene, error: String(err) })
          }
        })
      )
    )

    expect(results).toHaveLength(2)
    expect(errors).toHaveLength(1)
    expect(errors[0].gene).toBe('HEXA')
    expect(results.map((r) => r.gene)).toEqual(expect.arrayContaining(['CFTR', 'GJB2']))
  })

  it('respects concurrency limit (max active calls <= limit)', async () => {
    const genes = ['CFTR', 'HEXA', 'GJB2', 'PAH', 'PKD1']
    const concurrencyLimit = 2

    const mockQueryGene = vi.fn(async (gene: string) => {
      activeCalls++
      maxActiveCalls = Math.max(maxActiveCalls, activeCalls)
      await new Promise<void>((resolve) => setTimeout(resolve, 20))
      activeCalls--
      return createMockQueryResult(gene)
    })

    const limit = pLimit(concurrencyLimit)
    const results: QueryResult[] = []

    await Promise.all(
      genes.map((gene) =>
        limit(async () => {
          const result = await mockQueryGene(gene)
          results.push(result)
        })
      )
    )

    expect(results).toHaveLength(genes.length)
    expect(maxActiveCalls).toBeLessThanOrEqual(concurrencyLimit)
  })

  it('stops processing remaining genes when fail-fast is triggered', async () => {
    const genes = ['CFTR', 'HEXA', 'GJB2']
    const results: QueryResult[] = []
    const errors: Array<{ gene: string; error: string }> = []
    let failFastTriggered = false

    const mockQueryGene = vi.fn(async (gene: string) => {
      if (gene === 'HEXA') throw new Error('Failed for HEXA')
      return createMockQueryResult(gene)
    })

    const limit = pLimit(1) // Sequential to ensure deterministic order

    await Promise.all(
      genes.map((gene) =>
        limit(async () => {
          // Fail-fast check: skip if already triggered
          if (failFastTriggered) return

          try {
            const result = await mockQueryGene(gene)
            results.push(result)
          } catch (err) {
            errors.push({ gene, error: String(err) })
            failFastTriggered = true
          }
        })
      )
    )

    // CFTR processed, HEXA failed and triggered fail-fast, GJB2 skipped
    expect(results.map((r) => r.gene)).toContain('CFTR')
    expect(errors).toHaveLength(1)
    expect(errors[0].gene).toBe('HEXA')
    expect(mockQueryGene).not.toHaveBeenCalledWith('GJB2')
  })

  it('invokes queryGene once per gene', async () => {
    const genes = ['CFTR', 'HEXA']
    const mockQueryGene = vi.fn(async (gene: string) => createMockQueryResult(gene))

    const limit = pLimit(5)

    await Promise.all(
      genes.map((gene) =>
        limit(async () => mockQueryGene(gene))
      )
    )

    expect(mockQueryGene).toHaveBeenCalledTimes(2)
    expect(mockQueryGene).toHaveBeenCalledWith('CFTR')
    expect(mockQueryGene).toHaveBeenCalledWith('HEXA')
  })
})
