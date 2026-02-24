import { describe, it, expect } from 'vitest'
import type { GnomadVariant, ClinVarVariant, TranscriptConsequence, FilterConfig } from '../src/types/index.js'
import type { ClinVarSubmission } from '../src/queries/index.js'
import {
  isHighConfidenceLoF,
  isMissenseVariant,
  isPathogenicClinVar,
  isPathogenicClinVarWithThreshold,
  hasConflictingClassification,
  getConflictingVariantIds,
  shouldIncludeVariant,
  shouldIncludeVariantConfigurable,
  filterPathogenicVariants,
  filterPathogenicVariantsConfigurable,
  MISSENSE_CONSEQUENCES,
} from '../src/filters/index.js'

// ---------------------------------------------------------------------------
// Test data factories
// ---------------------------------------------------------------------------

function makeTranscriptConsequence(
  overrides: Partial<TranscriptConsequence> = {}
): TranscriptConsequence {
  return {
    gene_symbol: 'CFTR',
    transcript_id: 'ENST00000003084',
    canonical: true,
    consequence_terms: ['missense_variant'],
    lof: null,
    lof_filter: null,
    lof_flags: null,
    hgvsc: 'c.1521_1523delCTT',
    hgvsp: 'p.Phe508del',
    ...overrides,
  }
}

function makeGnomadVariant(
  variantId: string,
  overrides: Partial<GnomadVariant> = {}
): GnomadVariant {
  return {
    variant_id: variantId,
    pos: 117559590,
    ref: 'A',
    alt: 'G',
    exome: { ac: 10, an: 120000, populations: [] },
    genome: undefined,
    transcript_consequence: null,
    ...overrides,
  }
}

function makeLofHCVariant(variantId = 'chr7-117559590-A-G'): GnomadVariant {
  return makeGnomadVariant(variantId, {
    transcript_consequence: makeTranscriptConsequence({
      consequence_terms: ['stop_gained'],
      lof: 'HC',
      canonical: true,
    }),
  })
}

function makeMissenseVariant(variantId = 'chr7-117548628-A-G'): GnomadVariant {
  return makeGnomadVariant(variantId, {
    transcript_consequence: makeTranscriptConsequence({
      consequence_terms: ['missense_variant'],
      lof: null,
      canonical: true,
    }),
  })
}

function makeClinVarVariant(
  variantId: string,
  significance: string,
  goldStars: number
): ClinVarVariant {
  return {
    variant_id: variantId,
    clinvar_variation_id: '7105',
    clinical_significance: significance,
    gold_stars: goldStars,
    review_status: 'reviewed by expert panel',
    pos: 117559590,
    ref: 'A',
    alt: 'G',
  }
}

const defaultConfig: FilterConfig = {
  lofHcEnabled: true,
  missenseEnabled: true,
  clinvarEnabled: true,
  clinvarStarThreshold: 1,
  clinvarIncludeConflicting: false,
  clinvarConflictingThreshold: 80,
}

// ---------------------------------------------------------------------------
// isHighConfidenceLoF
// ---------------------------------------------------------------------------

describe('isHighConfidenceLoF', () => {
  it('returns true for canonical transcript with lof=HC', () => {
    const consequence = makeTranscriptConsequence({ lof: 'HC', canonical: true })
    expect(isHighConfidenceLoF(consequence)).toBe(true)
  })

  it('returns false for non-canonical transcript even with lof=HC', () => {
    const consequence = makeTranscriptConsequence({ lof: 'HC', canonical: false })
    expect(isHighConfidenceLoF(consequence)).toBe(false)
  })

  it('returns false for canonical transcript with lof=LC', () => {
    const consequence = makeTranscriptConsequence({ lof: 'LC', canonical: true })
    expect(isHighConfidenceLoF(consequence)).toBe(false)
  })

  it('returns false for canonical transcript with lof=null', () => {
    const consequence = makeTranscriptConsequence({ lof: null, canonical: true })
    expect(isHighConfidenceLoF(consequence)).toBe(false)
  })

  it('returns false for canonical transcript with lof=OS', () => {
    const consequence = makeTranscriptConsequence({ lof: 'OS', canonical: true })
    expect(isHighConfidenceLoF(consequence)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// isMissenseVariant
// ---------------------------------------------------------------------------

describe('isMissenseVariant', () => {
  it('returns true for missense_variant on canonical transcript', () => {
    const consequence = makeTranscriptConsequence({
      consequence_terms: ['missense_variant'],
      canonical: true,
    })
    expect(isMissenseVariant(consequence)).toBe(true)
  })

  it('returns true for inframe_insertion on canonical transcript', () => {
    const consequence = makeTranscriptConsequence({
      consequence_terms: ['inframe_insertion'],
      canonical: true,
    })
    expect(isMissenseVariant(consequence)).toBe(true)
  })

  it('returns true for inframe_deletion on canonical transcript', () => {
    const consequence = makeTranscriptConsequence({
      consequence_terms: ['inframe_deletion'],
      canonical: true,
    })
    expect(isMissenseVariant(consequence)).toBe(true)
  })

  it('returns false for stop_gained (not missense-class)', () => {
    const consequence = makeTranscriptConsequence({
      consequence_terms: ['stop_gained'],
      canonical: true,
    })
    expect(isMissenseVariant(consequence)).toBe(false)
  })

  it('returns false for missense_variant on non-canonical transcript', () => {
    const consequence = makeTranscriptConsequence({
      consequence_terms: ['missense_variant'],
      canonical: false,
    })
    expect(isMissenseVariant(consequence)).toBe(false)
  })

  it('returns false when consequence_terms is empty', () => {
    const consequence = makeTranscriptConsequence({
      consequence_terms: [],
      canonical: true,
    })
    expect(isMissenseVariant(consequence)).toBe(false)
  })

  it('MISSENSE_CONSEQUENCES includes exactly the three expected terms', () => {
    expect(MISSENSE_CONSEQUENCES).toContain('missense_variant')
    expect(MISSENSE_CONSEQUENCES).toContain('inframe_insertion')
    expect(MISSENSE_CONSEQUENCES).toContain('inframe_deletion')
    expect(MISSENSE_CONSEQUENCES).toHaveLength(3)
  })
})

// ---------------------------------------------------------------------------
// isPathogenicClinVar (hardcoded 1-star threshold)
// ---------------------------------------------------------------------------

describe('isPathogenicClinVar', () => {
  it('returns true for Pathogenic with 1 star', () => {
    const cv = makeClinVarVariant('v1', 'Pathogenic', 1)
    expect(isPathogenicClinVar(cv)).toBe(true)
  })

  it('returns true for Likely pathogenic with 2 stars', () => {
    const cv = makeClinVarVariant('v1', 'Likely pathogenic', 2)
    expect(isPathogenicClinVar(cv)).toBe(true)
  })

  it('returns false for Pathogenic with 0 stars', () => {
    const cv = makeClinVarVariant('v1', 'Pathogenic', 0)
    expect(isPathogenicClinVar(cv)).toBe(false)
  })

  it('returns false for Benign regardless of stars', () => {
    const cv = makeClinVarVariant('v1', 'Benign', 3)
    expect(isPathogenicClinVar(cv)).toBe(false)
  })

  it('returns false for Conflicting interpretations of pathogenicity', () => {
    const cv = makeClinVarVariant('v1', 'Conflicting interpretations of pathogenicity', 2)
    expect(isPathogenicClinVar(cv)).toBe(false)
  })

  it('returns false for Uncertain significance', () => {
    const cv = makeClinVarVariant('v1', 'Uncertain significance', 2)
    expect(isPathogenicClinVar(cv)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// isPathogenicClinVarWithThreshold (configurable star threshold)
// ---------------------------------------------------------------------------

describe('isPathogenicClinVarWithThreshold', () => {
  it('includes Pathogenic with stars exactly at threshold', () => {
    const cv = makeClinVarVariant('v1', 'Pathogenic', 2)
    expect(isPathogenicClinVarWithThreshold(cv, 2)).toBe(true)
  })

  it('excludes Pathogenic with stars below threshold', () => {
    const cv = makeClinVarVariant('v1', 'Pathogenic', 1)
    expect(isPathogenicClinVarWithThreshold(cv, 2)).toBe(false)
  })

  it('includes with threshold=0 regardless of stars', () => {
    const cv = makeClinVarVariant('v1', 'Pathogenic', 0)
    expect(isPathogenicClinVarWithThreshold(cv, 0)).toBe(true)
  })

  it('excludes Conflicting even with high star count', () => {
    const cv = makeClinVarVariant('v1', 'Conflicting interpretations of pathogenicity', 4)
    expect(isPathogenicClinVarWithThreshold(cv, 1)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// hasConflictingClassification
// ---------------------------------------------------------------------------

describe('hasConflictingClassification', () => {
  it('returns true for "Conflicting interpretations of pathogenicity"', () => {
    const cv = makeClinVarVariant('v1', 'Conflicting interpretations of pathogenicity', 1)
    expect(hasConflictingClassification(cv)).toBe(true)
  })

  it('returns false for Pathogenic', () => {
    const cv = makeClinVarVariant('v1', 'Pathogenic', 2)
    expect(hasConflictingClassification(cv)).toBe(false)
  })

  it('returns false for Likely pathogenic', () => {
    const cv = makeClinVarVariant('v1', 'Likely pathogenic', 1)
    expect(hasConflictingClassification(cv)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// getConflictingVariantIds
// ---------------------------------------------------------------------------

describe('getConflictingVariantIds', () => {
  it('returns only IDs of conflicting variants', () => {
    const variants: ClinVarVariant[] = [
      makeClinVarVariant('v1', 'Pathogenic', 2),
      makeClinVarVariant('v2', 'Conflicting interpretations of pathogenicity', 1),
      makeClinVarVariant('v3', 'Benign', 1),
      makeClinVarVariant('v4', 'Conflicting interpretations of pathogenicity', 2),
    ]
    expect(getConflictingVariantIds(variants)).toEqual(['v2', 'v4'])
  })

  it('returns empty array when no conflicting variants', () => {
    const variants: ClinVarVariant[] = [
      makeClinVarVariant('v1', 'Pathogenic', 2),
    ]
    expect(getConflictingVariantIds(variants)).toEqual([])
  })

  it('returns empty array for empty input', () => {
    expect(getConflictingVariantIds([])).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// shouldIncludeVariant (non-configurable, 1-star threshold)
// ---------------------------------------------------------------------------

describe('shouldIncludeVariant', () => {
  it('includes LoF HC variant regardless of ClinVar', () => {
    const variant = makeLofHCVariant('v1')
    expect(shouldIncludeVariant(variant, [])).toBe(true)
  })

  it('includes variant with ClinVar Pathogenic (1 star)', () => {
    const variant = makeGnomadVariant('v1')
    const clinvar = [makeClinVarVariant('v1', 'Pathogenic', 1)]
    expect(shouldIncludeVariant(variant, clinvar)).toBe(true)
  })

  it('excludes variant with ClinVar Pathogenic but 0 stars', () => {
    const variant = makeGnomadVariant('v1')
    const clinvar = [makeClinVarVariant('v1', 'Pathogenic', 0)]
    expect(shouldIncludeVariant(variant, clinvar)).toBe(false)
  })

  it('excludes variant with no LoF and no ClinVar match', () => {
    const variant = makeGnomadVariant('v1')
    expect(shouldIncludeVariant(variant, [])).toBe(false)
  })

  it('includes LoF HC variant that also has ClinVar (no double-counting, single result)', () => {
    const variant = makeLofHCVariant('v1')
    const clinvar = [makeClinVarVariant('v1', 'Pathogenic', 2)]
    // shouldIncludeVariant returns boolean — returns true once
    expect(shouldIncludeVariant(variant, clinvar)).toBe(true)
  })

  it('handles null transcript_consequence gracefully', () => {
    const variant = makeGnomadVariant('v1', { transcript_consequence: null })
    expect(shouldIncludeVariant(variant, [])).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// shouldIncludeVariantConfigurable
// ---------------------------------------------------------------------------

describe('shouldIncludeVariantConfigurable', () => {
  it('includes LoF HC when lofHcEnabled=true', () => {
    const variant = makeLofHCVariant('v1')
    expect(shouldIncludeVariantConfigurable(variant, [], defaultConfig)).toBe(true)
  })

  it('excludes LoF HC when lofHcEnabled=false', () => {
    const variant = makeLofHCVariant('v1')
    const config = { ...defaultConfig, lofHcEnabled: false }
    expect(shouldIncludeVariantConfigurable(variant, [], config)).toBe(false)
  })

  it('excludes LoF LC even when lofHcEnabled=true', () => {
    const variant = makeGnomadVariant('v1', {
      transcript_consequence: makeTranscriptConsequence({ lof: 'LC', canonical: true }),
    })
    expect(shouldIncludeVariantConfigurable(variant, [], defaultConfig)).toBe(false)
  })

  it('includes missense with ClinVar evidence when missenseEnabled=true', () => {
    const variant = makeMissenseVariant('v1')
    const clinvar = [makeClinVarVariant('v1', 'Pathogenic', 2)]
    const config = { ...defaultConfig, clinvarStarThreshold: 1 }
    expect(shouldIncludeVariantConfigurable(variant, clinvar, config)).toBe(true)
  })

  it('excludes missense with ClinVar evidence when missenseEnabled=false', () => {
    const variant = makeMissenseVariant('v1')
    const clinvar = [makeClinVarVariant('v1', 'Pathogenic', 2)]
    const config = { ...defaultConfig, missenseEnabled: false }
    expect(shouldIncludeVariantConfigurable(variant, clinvar, config)).toBe(false)
  })

  it('excludes missense WITHOUT ClinVar evidence even when missenseEnabled=true', () => {
    const variant = makeMissenseVariant('v1')
    // No ClinVar data for this variant
    expect(shouldIncludeVariantConfigurable(variant, [], defaultConfig)).toBe(false)
  })

  it('includes splice variant with ClinVar P/LP evidence', () => {
    const spliceVariant = makeGnomadVariant('v1', {
      transcript_consequence: makeTranscriptConsequence({
        consequence_terms: ['splice_region_variant'],
        lof: null,
        canonical: true,
      }),
    })
    const clinvar = [makeClinVarVariant('v1', 'Pathogenic', 2)]
    expect(shouldIncludeVariantConfigurable(spliceVariant, clinvar, defaultConfig)).toBe(true)
  })

  it('excludes ClinVar Pathogenic below star threshold', () => {
    const variant = makeGnomadVariant('v1', {
      transcript_consequence: makeTranscriptConsequence({
        consequence_terms: ['splice_region_variant'],
        lof: null,
      }),
    })
    const clinvar = [makeClinVarVariant('v1', 'Pathogenic', 1)]
    const config = { ...defaultConfig, clinvarStarThreshold: 2 }
    expect(shouldIncludeVariantConfigurable(variant, clinvar, config)).toBe(false)
  })

  it('excludes conflicting variant when clinvarIncludeConflicting=false', () => {
    const variant = makeGnomadVariant('v1')
    const clinvar = [makeClinVarVariant('v1', 'Conflicting interpretations of pathogenicity', 2)]
    const config = { ...defaultConfig, clinvarIncludeConflicting: false }
    expect(shouldIncludeVariantConfigurable(variant, clinvar, config)).toBe(false)
  })

  it('includes conflicting variant that meets P/LP threshold when clinvarIncludeConflicting=true', () => {
    const variant = makeGnomadVariant('v1')
    const clinvar = [makeClinVarVariant('v1', 'Conflicting interpretations of pathogenicity', 1)]
    const config = { ...defaultConfig, clinvarIncludeConflicting: true, clinvarConflictingThreshold: 80 }

    // 4 out of 5 submissions are pathogenic = 80% — meets 80% threshold
    const submissions: ClinVarSubmission[] = [
      { clinical_significance: 'Pathogenic' },
      { clinical_significance: 'Pathogenic' },
      { clinical_significance: 'Pathogenic' },
      { clinical_significance: 'Pathogenic' },
      { clinical_significance: 'Benign' },
    ]
    const submissionsMap = new Map([['v1', submissions]])
    expect(shouldIncludeVariantConfigurable(variant, clinvar, config, submissionsMap)).toBe(true)
  })

  it('excludes conflicting variant that falls below P/LP threshold', () => {
    const variant = makeGnomadVariant('v1')
    const clinvar = [makeClinVarVariant('v1', 'Conflicting interpretations of pathogenicity', 1)]
    const config = { ...defaultConfig, clinvarIncludeConflicting: true, clinvarConflictingThreshold: 80 }

    // Only 2 out of 5 pathogenic = 40% — below 80% threshold
    const submissions: ClinVarSubmission[] = [
      { clinical_significance: 'Pathogenic' },
      { clinical_significance: 'Pathogenic' },
      { clinical_significance: 'Benign' },
      { clinical_significance: 'Benign' },
      { clinical_significance: 'Benign' },
    ]
    const submissionsMap = new Map([['v1', submissions]])
    expect(shouldIncludeVariantConfigurable(variant, clinvar, config, submissionsMap)).toBe(false)
  })

  it('handles null transcript_consequence gracefully', () => {
    const variant = makeGnomadVariant('v1', { transcript_consequence: null })
    expect(shouldIncludeVariantConfigurable(variant, [], defaultConfig)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// filterPathogenicVariants
// ---------------------------------------------------------------------------

describe('filterPathogenicVariants', () => {
  it('returns empty array for empty input', () => {
    expect(filterPathogenicVariants([], [])).toEqual([])
  })

  it('includes only LoF HC variants when no ClinVar data', () => {
    const lof = makeLofHCVariant('v1')
    const missense = makeMissenseVariant('v2')
    const result = filterPathogenicVariants([lof, missense], [])
    expect(result).toHaveLength(1)
    expect(result[0]?.variant_id).toBe('v1')
  })

  it('includes ClinVar P/LP variant (>= 1 star)', () => {
    const variant = makeGnomadVariant('v1')
    const clinvar = [makeClinVarVariant('v1', 'Pathogenic', 1)]
    const result = filterPathogenicVariants([variant], clinvar)
    expect(result).toHaveLength(1)
  })

  it('excludes variant matching no criteria', () => {
    const variant = makeGnomadVariant('v1')
    const result = filterPathogenicVariants([variant], [])
    expect(result).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// filterPathogenicVariantsConfigurable
// ---------------------------------------------------------------------------

describe('filterPathogenicVariantsConfigurable', () => {
  it('returns empty array for empty input', () => {
    expect(filterPathogenicVariantsConfigurable([], [], defaultConfig)).toEqual([])
  })

  it('returns empty array when all filters disabled', () => {
    const lof = makeLofHCVariant('v1')
    const missense = makeMissenseVariant('v2')
    const pathogenic = makeGnomadVariant('v3')
    const clinvar = [makeClinVarVariant('v3', 'Pathogenic', 2)]

    const allDisabled: FilterConfig = {
      lofHcEnabled: false,
      missenseEnabled: false,
      clinvarEnabled: false,
      clinvarStarThreshold: 1,
      clinvarIncludeConflicting: false,
      clinvarConflictingThreshold: 80,
    }
    const result = filterPathogenicVariantsConfigurable([lof, missense, pathogenic], clinvar, allDisabled)
    expect(result).toHaveLength(0)
  })

  it('returns union of qualifying variants when all filters enabled', () => {
    const lof = makeLofHCVariant('v1')
    const missenseWithClinvar = makeMissenseVariant('v2')
    const spliceWithClinvar = makeGnomadVariant('v3', {
      transcript_consequence: makeTranscriptConsequence({
        consequence_terms: ['splice_region_variant'],
        lof: null,
      }),
    })
    const benign = makeGnomadVariant('v4')

    const clinvar: ClinVarVariant[] = [
      makeClinVarVariant('v2', 'Pathogenic', 2),
      makeClinVarVariant('v3', 'Likely pathogenic', 2),
    ]

    const result = filterPathogenicVariantsConfigurable(
      [lof, missenseWithClinvar, spliceWithClinvar, benign],
      clinvar,
      { ...defaultConfig, clinvarStarThreshold: 2 }
    )
    // lof (HC), missenseWithClinvar (P+stars), spliceWithClinvar (LP+stars) — benign excluded
    expect(result).toHaveLength(3)
    expect(result.map((v) => v.variant_id)).toContain('v1')
    expect(result.map((v) => v.variant_id)).toContain('v2')
    expect(result.map((v) => v.variant_id)).toContain('v3')
    expect(result.map((v) => v.variant_id)).not.toContain('v4')
  })

  it('variant qualifying as both LoF HC and ClinVar is included once (no duplicate)', () => {
    const variant = makeLofHCVariant('v1')
    const clinvar = [makeClinVarVariant('v1', 'Pathogenic', 2)]
    const result = filterPathogenicVariantsConfigurable([variant], clinvar, defaultConfig)
    expect(result).toHaveLength(1)
  })

  it('uses FACTORY_FILTER_DEFAULTS when config not provided', () => {
    const lof = makeLofHCVariant('v1')
    const result = filterPathogenicVariantsConfigurable([lof], [])
    expect(result).toHaveLength(1)
  })
})
