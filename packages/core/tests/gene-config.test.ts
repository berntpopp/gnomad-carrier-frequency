import { describe, it, expect, beforeEach } from 'vitest'
import {
  GeneConfigSchema,
  registerGeneConfig,
  loadGeneConfig,
  setPlatformLoader,
  getRegisteredGenes,
} from '../src/gene-config/index.js'
import type { GeneConfig } from '../src/gene-config/index.js'

// ---------------------------------------------------------------------------
// Test data factories
// ---------------------------------------------------------------------------

function makeMinimalConfig(overrides: Partial<GeneConfig> = {}): GeneConfig {
  return {
    schemaVersion: '1.0',
    geneSymbol: 'CFTR',
    profiles: [
      {
        profileId: 'cystic-fibrosis',
        displayName: 'Cystic Fibrosis',
        isDefault: true,
        disease: {
          omimId: '219700',
          name: 'Cystic Fibrosis',
        },
      },
    ],
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// GeneConfigSchema validation tests
// ---------------------------------------------------------------------------

describe('GeneConfigSchema', () => {
  describe('valid configs', () => {
    it('validates a minimal valid config', () => {
      const config = {
        schemaVersion: '1.0',
        geneSymbol: 'CFTR',
        profiles: [
          {
            profileId: 'cystic-fibrosis',
            displayName: 'Cystic Fibrosis',
            isDefault: true,
            disease: {
              omimId: '219700',
              name: 'Cystic Fibrosis',
            },
          },
        ],
      }
      const result = GeneConfigSchema.safeParse(config)
      expect(result.success).toBe(true)
    })

    it('validates a full config with all optional fields populated', () => {
      const config = {
        schemaVersion: '1.0',
        geneSymbol: 'HEXA',
        displayName: 'Hexosaminidase Subunit Alpha',
        omimGeneId: '606869',
        inheritance: 'AR',
        profiles: [
          {
            profileId: 'tay-sachs',
            displayName: 'Tay-Sachs Disease',
            isDefault: true,
            disease: {
              omimId: '272800',
              mondoId: 'MONDO:0010029',
              name: 'Tay-Sachs Disease',
            },
            penetrance: 1.0,
            filterOverrides: {
              lofHcEnabled: true,
              missenseEnabled: false,
              clinvarEnabled: true,
              clinvarStarThreshold: 2,
              clinvarIncludeConflicting: false,
              clinvarConflictingThreshold: 80,
            },
            variantExclusions: ['rs80338901', 'rs80338902'],
            notes: 'Common in Ashkenazi Jewish population',
            references: [
              'https://www.ncbi.nlm.nih.gov/books/NBK1218/',
              'https://www.omim.org/entry/272800',
            ],
          },
          {
            profileId: 'tay-sachs-late-onset',
            displayName: 'Late-Onset Tay-Sachs',
            isDefault: false,
            disease: {
              omimId: '272800',
              name: 'Late-Onset Tay-Sachs',
            },
            penetrance: 0.7,
          },
        ],
      }
      const result = GeneConfigSchema.safeParse(config)
      expect(result.success).toBe(true)
    })

    it('accepts a disease with only mondoId (no omimId)', () => {
      const config = {
        schemaVersion: '1.0',
        geneSymbol: 'TEST1',
        profiles: [
          {
            profileId: 'test-disease',
            displayName: 'Test Disease',
            isDefault: true,
            disease: {
              mondoId: 'MONDO:0007374',
              name: 'Test Disease',
            },
          },
        ],
      }
      const result = GeneConfigSchema.safeParse(config)
      expect(result.success).toBe(true)
    })
  })

  describe('invalid configs — constraint violations', () => {
    it('rejects config with no default profile', () => {
      const config = {
        schemaVersion: '1.0',
        geneSymbol: 'CFTR',
        profiles: [
          {
            profileId: 'cystic-fibrosis',
            displayName: 'Cystic Fibrosis',
            isDefault: false,
            disease: { omimId: '219700', name: 'Cystic Fibrosis' },
          },
        ],
      }
      const result = GeneConfigSchema.safeParse(config)
      expect(result.success).toBe(false)
      if (!result.success) {
        const messages = result.error.issues.map((i) => i.message)
        expect(messages.some((m) => m.includes('Exactly one profile'))).toBe(true)
      }
    })

    it('rejects config with two default profiles', () => {
      const config = {
        schemaVersion: '1.0',
        geneSymbol: 'CFTR',
        profiles: [
          {
            profileId: 'profile-a',
            displayName: 'Profile A',
            isDefault: true,
            disease: { omimId: '219700', name: 'Cystic Fibrosis' },
          },
          {
            profileId: 'profile-b',
            displayName: 'Profile B',
            isDefault: true,
            disease: { omimId: '219700', name: 'Cystic Fibrosis' },
          },
        ],
      }
      const result = GeneConfigSchema.safeParse(config)
      expect(result.success).toBe(false)
      if (!result.success) {
        const messages = result.error.issues.map((i) => i.message)
        expect(messages.some((m) => m.includes('Exactly one profile'))).toBe(true)
      }
    })

    it('rejects config with wrong schemaVersion', () => {
      const config = {
        schemaVersion: '2.0',
        geneSymbol: 'CFTR',
        profiles: [
          {
            profileId: 'cf',
            displayName: 'CF',
            isDefault: true,
            disease: { omimId: '219700', name: 'Cystic Fibrosis' },
          },
        ],
      }
      const result = GeneConfigSchema.safeParse(config)
      expect(result.success).toBe(false)
    })

    it('rejects config with empty profiles array', () => {
      const config = {
        schemaVersion: '1.0',
        geneSymbol: 'CFTR',
        profiles: [],
      }
      const result = GeneConfigSchema.safeParse(config)
      expect(result.success).toBe(false)
    })

    it('rejects disease without OMIM or MONDO ID (only has name)', () => {
      const config = {
        schemaVersion: '1.0',
        geneSymbol: 'CFTR',
        profiles: [
          {
            profileId: 'cf',
            displayName: 'Cystic Fibrosis',
            isDefault: true,
            disease: {
              name: 'Cystic Fibrosis',
              // no omimId, no mondoId
            },
          },
        ],
      }
      const result = GeneConfigSchema.safeParse(config)
      expect(result.success).toBe(false)
      if (!result.success) {
        const messages = result.error.issues.map((i) => i.message)
        expect(messages.some((m) => m.includes('disease identifier'))).toBe(true)
      }
    })

    it('rejects invalid OMIM format (5 digits instead of 6)', () => {
      const config = {
        schemaVersion: '1.0',
        geneSymbol: 'CFTR',
        profiles: [
          {
            profileId: 'cf',
            displayName: 'Cystic Fibrosis',
            isDefault: true,
            disease: { omimId: '12345', name: 'Cystic Fibrosis' },
          },
        ],
      }
      const result = GeneConfigSchema.safeParse(config)
      expect(result.success).toBe(false)
    })

    it('rejects invalid MONDO format (wrong digit count)', () => {
      const config = {
        schemaVersion: '1.0',
        geneSymbol: 'CFTR',
        profiles: [
          {
            profileId: 'cf',
            displayName: 'Cystic Fibrosis',
            isDefault: true,
            disease: { mondoId: 'MONDO:123', name: 'Cystic Fibrosis' },
          },
        ],
      }
      const result = GeneConfigSchema.safeParse(config)
      expect(result.success).toBe(false)
    })

    it('rejects non-URL strings in references', () => {
      const config = {
        schemaVersion: '1.0',
        geneSymbol: 'CFTR',
        profiles: [
          {
            profileId: 'cf',
            displayName: 'Cystic Fibrosis',
            isDefault: true,
            disease: { omimId: '219700', name: 'Cystic Fibrosis' },
            references: ['not-a-url', 'also not a url'],
          },
        ],
      }
      const result = GeneConfigSchema.safeParse(config)
      expect(result.success).toBe(false)
    })
  })

  describe('boundary values', () => {
    it('accepts penetrance at 0 and 1', () => {
      const makeWithPenetrance = (penetrance: number) => ({
        schemaVersion: '1.0',
        geneSymbol: 'GENE1',
        profiles: [
          {
            profileId: 'p',
            displayName: 'P',
            isDefault: true,
            disease: { omimId: '219700', name: 'Disease' },
            penetrance,
          },
        ],
      })
      expect(GeneConfigSchema.safeParse(makeWithPenetrance(0)).success).toBe(true)
      expect(GeneConfigSchema.safeParse(makeWithPenetrance(1)).success).toBe(true)
    })

    it('rejects penetrance below 0 and above 1', () => {
      const makeWithPenetrance = (penetrance: number) => ({
        schemaVersion: '1.0',
        geneSymbol: 'GENE1',
        profiles: [
          {
            profileId: 'p',
            displayName: 'P',
            isDefault: true,
            disease: { omimId: '219700', name: 'Disease' },
            penetrance,
          },
        ],
      })
      expect(GeneConfigSchema.safeParse(makeWithPenetrance(-0.1)).success).toBe(false)
      expect(GeneConfigSchema.safeParse(makeWithPenetrance(1.1)).success).toBe(false)
    })

    it('accepts clinvarStarThreshold at 0 and 4', () => {
      const makeWithThreshold = (clinvarStarThreshold: number) => ({
        schemaVersion: '1.0',
        geneSymbol: 'GENE2',
        profiles: [
          {
            profileId: 'p',
            displayName: 'P',
            isDefault: true,
            disease: { omimId: '219700', name: 'Disease' },
            filterOverrides: { clinvarStarThreshold },
          },
        ],
      })
      expect(GeneConfigSchema.safeParse(makeWithThreshold(0)).success).toBe(true)
      expect(GeneConfigSchema.safeParse(makeWithThreshold(4)).success).toBe(true)
    })

    it('rejects clinvarStarThreshold of 5 (above max)', () => {
      const config = {
        schemaVersion: '1.0',
        geneSymbol: 'GENE2',
        profiles: [
          {
            profileId: 'p',
            displayName: 'P',
            isDefault: true,
            disease: { omimId: '219700', name: 'Disease' },
            filterOverrides: { clinvarStarThreshold: 5 },
          },
        ],
      }
      const result = GeneConfigSchema.safeParse(config)
      expect(result.success).toBe(false)
    })
  })
})

// ---------------------------------------------------------------------------
// loadGeneConfig loader tests
// ---------------------------------------------------------------------------

describe('loadGeneConfig', () => {
  // Use unique gene symbols per test to avoid cross-test registry contamination

  it('returns null for unknown gene symbol', async () => {
    const result = await loadGeneConfig('UNKNOWN_GENE_XYZ')
    expect(result).toBeNull()
  })

  it('returns registered config by exact symbol', async () => {
    const config = makeMinimalConfig({ geneSymbol: 'BRCA2_TEST' })
    registerGeneConfig(config)
    const result = await loadGeneConfig('BRCA2_TEST')
    expect(result).not.toBeNull()
    expect(result?.geneSymbol).toBe('BRCA2_TEST')
  })

  it('returns registered config case-insensitively (register uppercase, query lowercase)', async () => {
    const config = makeMinimalConfig({ geneSymbol: 'CFTR_CASE_TEST' })
    registerGeneConfig(config)
    const result = await loadGeneConfig('cftr_case_test')
    expect(result).not.toBeNull()
    expect(result?.geneSymbol).toBe('CFTR_CASE_TEST')
  })

  it('returns registered config case-insensitively (register lowercase, query uppercase)', async () => {
    const config = makeMinimalConfig({ geneSymbol: 'hexa_lower' })
    registerGeneConfig(config)
    const result = await loadGeneConfig('HEXA_LOWER')
    expect(result).not.toBeNull()
    expect(result?.geneSymbol).toBe('hexa_lower')
  })

  it('calls platform loader on registry miss', async () => {
    const platformConfig = makeMinimalConfig({ geneSymbol: 'PLATFORM_GENE' })
    let loaderCalled = false

    setPlatformLoader(async (_symbol: string) => {
      loaderCalled = true
      return platformConfig
    })

    const result = await loadGeneConfig('PLATFORM_GENE_MISS')
    expect(loaderCalled).toBe(true)
    // Reset platform loader after test
    setPlatformLoader(async () => null)
  })

  it('validates platform loader result against schema and returns null for invalid data', async () => {
    const invalidData = {
      schemaVersion: '99.0',
      geneSymbol: 'BAD',
      profiles: [],
    }

    setPlatformLoader(async (_symbol: string) => invalidData)

    const result = await loadGeneConfig('INVALID_FROM_PLATFORM')
    expect(result).toBeNull()

    // Reset platform loader
    setPlatformLoader(async () => null)
  })

  it('returns valid config from platform loader when schema passes', async () => {
    const validConfig = makeMinimalConfig({ geneSymbol: 'FROM_FS' })

    setPlatformLoader(async (_symbol: string) => validConfig)

    const result = await loadGeneConfig('FROM_FS_MISS')
    expect(result).not.toBeNull()
    expect(result?.geneSymbol).toBe('FROM_FS')

    // Reset platform loader
    setPlatformLoader(async () => null)
  })
})

// ---------------------------------------------------------------------------
// getRegisteredGenes tests
// ---------------------------------------------------------------------------

describe('getRegisteredGenes', () => {
  it('returns registered gene symbols', () => {
    const config = makeMinimalConfig({ geneSymbol: 'VISIBLE_GENE' })
    registerGeneConfig(config)
    const genes = getRegisteredGenes()
    // Registry uses uppercase keys
    expect(genes).toContain('VISIBLE_GENE')
  })

  it('returns an array of strings', () => {
    const genes = getRegisteredGenes()
    expect(Array.isArray(genes)).toBe(true)
    genes.forEach((g) => expect(typeof g).toBe('string'))
  })
})
