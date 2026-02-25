import { describe, it, expect } from 'vitest'
import type { TemplateContext } from '../src/types/index.js'
import { renderTemplate } from '../src/templates/index.js'
import { parseTemplate, segmentsToTemplate, isValidVariable } from '../src/templates/index.js'

// ---------------------------------------------------------------------------
// Minimal valid TemplateContext for reuse in tests
// ---------------------------------------------------------------------------

const baseContext: TemplateContext = {
  gene: 'CFTR',
  carrierFrequency: '4.5%',
  carrierFrequencyRatio: '1:22',
  recurrenceRiskPercent: '0.25%',
  recurrenceRiskRatio: '1:400',
  source: 'gnomAD v4.1',
  indexStatus: 'heterozygous',
  statusIntro: 'The patient is a heterozygous carrier of a CFTR variant.',
  genderSuffix: '*innen',
  accessDate: '24.02.2026',
}

// ---------------------------------------------------------------------------
// renderTemplate — variable substitution
// ---------------------------------------------------------------------------

describe('renderTemplate — variable substitution', () => {
  it('replaces a single {{variable}} placeholder', () => {
    const result = renderTemplate('Gene: {{gene}}', { gene: 'CFTR' })
    expect(result).toBe('Gene: CFTR')
  })

  it('replaces multiple variables in one template', () => {
    const result = renderTemplate(
      '{{gene}} has carrier frequency {{carrierFrequencyRatio}}',
      { gene: 'CFTR', carrierFrequencyRatio: '1:22' }
    )
    expect(result).toBe('CFTR has carrier frequency 1:22')
  })

  it('replaces the same variable multiple times', () => {
    const result = renderTemplate('{{gene}} gene — {{gene}} is autosomal recessive', { gene: 'CFTR' })
    expect(result).toBe('CFTR gene — CFTR is autosomal recessive')
  })

  it('returns empty string for empty template', () => {
    expect(renderTemplate('', baseContext)).toBe('')
  })

  it('returns plain text unchanged when no placeholders', () => {
    const template = 'No variables here.'
    expect(renderTemplate(template, baseContext)).toBe(template)
  })

  it('replaces unknown variable with empty string (and logs warning)', () => {
    // Unknown key → empty string (console.warn is expected — tested behavior, not error)
    const result = renderTemplate('{{unknownVariable}}', {})
    expect(result).toBe('')
  })

  it('replaces null/undefined value with empty string', () => {
    // patientNominative is optional — when not provided, placeholder → ''
    const result = renderTemplate('{{patientNominative}}', { gene: 'CFTR' })
    expect(result).toBe('')
  })

  it('renders full clinical sentence from affected perspective inheritance template', () => {
    // Mirrors de.json affected > inheritance template
    const template =
      'Das {{gene}}-Gen wird autosomal rezessiv vererbt. Die Eltern {{patientGenitive}} sind mit großer Wahrscheinlichkeit jeweils heterozygote Anlageträger{{genderSuffix}}.'
    const result = renderTemplate(template, {
      gene: 'CFTR',
      patientGenitive: 'des Patienten',
      genderSuffix: '*innen',
    })
    expect(result).toBe(
      'Das CFTR-Gen wird autosomal rezessiv vererbt. Die Eltern des Patienten sind mit großer Wahrscheinlichkeit jeweils heterozygote Anlageträger*innen.'
    )
  })

  it('renders carrier frequency template with ratio and source', () => {
    // Mirrors de.json affected > carrierFrequency template
    const template = 'Bei einer geschätzten Heterozygotenfrequenz von {{carrierFrequencyRatio}} {{source}}'
    const result = renderTemplate(template, {
      carrierFrequencyRatio: '1:25',
      source: 'gnomAD v4.1',
    })
    expect(result).toBe('Bei einer geschätzten Heterozygotenfrequenz von 1:25 gnomAD v4.1')
  })

  it('renders recurrence risk with gene, percent, and ratio', () => {
    // Mirrors de.json affected > recurrenceRisk template
    const template =
      'läge das Risiko für eine {{gene}}-assoziierte Erkrankung bei Nachkommen {{patientGenitive}} bei etwa {{recurrenceRiskPercent}} ({{recurrenceRiskRatio}}).'
    const result = renderTemplate(template, {
      gene: 'CFTR',
      patientGenitive: 'des Patienten',
      recurrenceRiskPercent: '1,5625%',
      recurrenceRiskRatio: '1:64',
    })
    expect(result).toBe(
      'läge das Risiko für eine CFTR-assoziierte Erkrankung bei Nachkommen des Patienten bei etwa 1,5625% (1:64).'
    )
  })
})

// ---------------------------------------------------------------------------
// renderTemplate — German gender-inclusive language styles
// ---------------------------------------------------------------------------

describe('renderTemplate — German gender-inclusive language (genderSuffix)', () => {
  it('renders "*" (Genderstern) style', () => {
    const template = 'Anlageträger{{genderSuffix}}'
    const result = renderTemplate(template, { genderSuffix: '*innen' })
    expect(result).toBe('Anlageträger*innen')
  })

  it('renders ":" (Genderdoppelpunkt) style', () => {
    const template = 'Anlageträger{{genderSuffix}}'
    const result = renderTemplate(template, { genderSuffix: ':innen' })
    expect(result).toBe('Anlageträger:innen')
  })

  it('renders "/" (Schrägstrich) style', () => {
    const template = 'Anlageträger{{genderSuffix}}'
    const result = renderTemplate(template, { genderSuffix: '/-innen' })
    expect(result).toBe('Anlageträger/-innen')
  })

  it('renders traditional style (innen und Anlageträger)', () => {
    const template = 'Anlageträger{{genderSuffix}}'
    const result = renderTemplate(template, { genderSuffix: 'innen und Anlageträger' })
    expect(result).toBe('Anlageträgerinnen und Anlageträger')
  })

  it('applies genderSuffix consistently across multiple occurrences in template', () => {
    const template = 'Anlageträger{{genderSuffix}} ... Anlageträger{{genderSuffix}}'
    const result = renderTemplate(template, { genderSuffix: '*innen' })
    expect(result).toBe('Anlageträger*innen ... Anlageträger*innen')
  })
})

// ---------------------------------------------------------------------------
// renderTemplate — perspective-specific context values
// ---------------------------------------------------------------------------

describe('renderTemplate — perspectives', () => {
  it('renders affected perspective with patientGenitive', () => {
    const template = 'Das Risiko für Nachkommen {{patientGenitive}} beträgt {{recurrenceRiskPercent}}.'
    expect(
      renderTemplate(template, { patientGenitive: 'des Patienten', recurrenceRiskPercent: '0,25%' })
    ).toBe('Das Risiko für Nachkommen des Patienten beträgt 0,25%.')
  })

  it('renders carrier perspective intro (statusIntro)', () => {
    const template = '{{statusIntro}}'
    const result = renderTemplate(template, {
      statusIntro: 'Der Patient ist heterozygoter Anlageträger einer CFTR-Variante.',
    })
    expect(result).toBe('Der Patient ist heterozygoter Anlageträger einer CFTR-Variante.')
  })

  it('renders family member perspective with gene and ratio', () => {
    // Family member perspective focuses on risk for a relative
    const template = 'Eine Untersuchung auf die {{gene}}-Variante wird empfohlen (Trägerfrequenz {{carrierFrequencyRatio}}).'
    const result = renderTemplate(template, { gene: 'HEXA', carrierFrequencyRatio: '1:27' })
    expect(result).toBe('Eine Untersuchung auf die HEXA-Variante wird empfohlen (Trägerfrequenz 1:27).')
  })

  it('renders English inheritance template correctly', () => {
    // en.json affected > inheritance template
    const template = 'The {{gene}} gene follows autosomal recessive inheritance. The patient\'s parents are most likely heterozygous carriers.'
    const result = renderTemplate(template, { gene: 'NPHP1' })
    expect(result).toBe('The NPHP1 gene follows autosomal recessive inheritance. The patient\'s parents are most likely heterozygous carriers.')
  })
})

// ---------------------------------------------------------------------------
// renderTemplate — edge cases for frequency values
// ---------------------------------------------------------------------------

describe('renderTemplate — frequency value formatting', () => {
  it('renders very small carrier frequency correctly', () => {
    const template = 'Carrier frequency: {{carrierFrequency}}'
    const result = renderTemplate(template, { carrierFrequency: '0,001%' })
    expect(result).toBe('Carrier frequency: 0,001%')
  })

  it('renders very large ratio correctly', () => {
    const template = 'Ratio: {{carrierFrequencyRatio}}'
    const result = renderTemplate(template, { carrierFrequencyRatio: '1:10000' })
    expect(result).toBe('Ratio: 1:10000')
  })

  it('renders formatted access date', () => {
    const template = 'Abgerufen am {{accessDate}}.'
    const result = renderTemplate(template, { accessDate: '24.02.2026' })
    expect(result).toBe('Abgerufen am 24.02.2026.')
  })
})

// ---------------------------------------------------------------------------
// parseTemplate
// ---------------------------------------------------------------------------

describe('parseTemplate', () => {
  it('returns single text segment for plain text', () => {
    const segments = parseTemplate('Hello world')
    expect(segments).toHaveLength(1)
    expect(segments[0]).toEqual({ type: 'text', content: 'Hello world' })
  })

  it('parses a single variable into three segments', () => {
    const segments = parseTemplate('Hello {{gene}} world')
    expect(segments).toHaveLength(3)
    expect(segments[0]).toEqual({ type: 'text', content: 'Hello ' })
    expect(segments[1]).toEqual({ type: 'variable', content: 'gene', raw: '{{gene}}' })
    expect(segments[2]).toEqual({ type: 'text', content: ' world' })
  })

  it('parses multiple variables correctly', () => {
    const segments = parseTemplate('{{gene}} — {{carrierFrequencyRatio}}')
    const variableSegments = segments.filter((s) => s.type === 'variable')
    expect(variableSegments).toHaveLength(2)
    expect(variableSegments[0]?.content).toBe('gene')
    expect(variableSegments[1]?.content).toBe('carrierFrequencyRatio')
  })

  it('returns empty array for empty string', () => {
    expect(parseTemplate('')).toEqual([])
  })

  it('returns variable segment for template with only a variable', () => {
    const segments = parseTemplate('{{gene}}')
    expect(segments).toHaveLength(1)
    expect(segments[0]).toEqual({ type: 'variable', content: 'gene', raw: '{{gene}}' })
  })
})

// ---------------------------------------------------------------------------
// segmentsToTemplate
// ---------------------------------------------------------------------------

describe('segmentsToTemplate', () => {
  it('reconstructs original template from parsed segments', () => {
    const original = 'Hello {{gene}} world'
    const segments = parseTemplate(original)
    expect(segmentsToTemplate(segments)).toBe(original)
  })

  it('handles plain text segments only', () => {
    const segments = parseTemplate('No variables here.')
    expect(segmentsToTemplate(segments)).toBe('No variables here.')
  })

  it('round-trips a complex clinical template', () => {
    const original =
      'Das {{gene}}-Gen wird autosomal rezessiv vererbt. Anlageträger{{genderSuffix}} haben ein Risiko von {{recurrenceRiskPercent}}.'
    expect(segmentsToTemplate(parseTemplate(original))).toBe(original)
  })
})

// ---------------------------------------------------------------------------
// isValidVariable
// ---------------------------------------------------------------------------

describe('isValidVariable', () => {
  it('returns true for known template variables', () => {
    expect(isValidVariable('gene')).toBe(true)
    expect(isValidVariable('carrierFrequency')).toBe(true)
    expect(isValidVariable('genderSuffix')).toBe(true)
    expect(isValidVariable('accessDate')).toBe(true)
  })

  it('returns false for unknown variable names', () => {
    expect(isValidVariable('unknownVariable')).toBe(false)
    expect(isValidVariable('')).toBe(false)
    expect(isValidVariable('Gene')).toBe(false) // case-sensitive
  })
})
