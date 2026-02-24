import { loadTemplateContent, renderTemplate } from '@gnomad-cf/core/templates'
import { formatCarrierFrequency } from '@gnomad-cf/core/calculations'
import type { TemplateContext, TemplateConfig, Perspective } from '@gnomad-cf/core/types'
import type { QueryResult } from '../types.js'

/**
 * Build a gender suffix for German gender-inclusive language.
 */
function buildGenderSuffix(genderStyle: string | undefined): string {
  switch (genderStyle) {
    case '*':
      return '*innen'
    case ':':
      return ':innen'
    case '/':
      return '/-innen'
    case 'traditional':
      return 'innen und Anlageträger'
    default:
      return '*innen'
  }
}

/**
 * Build German patient grammatical forms based on biological sex.
 */
function buildPatientForms(
  patientSex: string | undefined,
  language: string
): {
  patientNominative: string
  patientGenitive: string
  patientDative: string
} {
  if (language !== 'de') {
    return {
      patientNominative: 'the patient',
      patientGenitive: "the patient's",
      patientDative: 'the patient',
    }
  }

  switch (patientSex) {
    case 'female':
      return {
        patientNominative: 'die Patientin',
        patientGenitive: 'der Patientin',
        patientDative: 'der Patientin',
      }
    case 'male':
      return {
        patientNominative: 'der Patient',
        patientGenitive: 'des Patienten',
        patientDative: 'dem Patienten',
      }
    default:
      return {
        patientNominative: 'der/die Patient*in',
        patientGenitive: 'des/der Patient*in',
        patientDative: 'dem/der Patient*in',
      }
  }
}

/**
 * Build a status intro sentence appropriate for the perspective.
 */
function buildStatusIntro(
  gene: string,
  perspective: Perspective,
  language: string
): string {
  if (language === 'de') {
    switch (perspective) {
      case 'affected':
        return `Bei der untersuchten Person wurden pathogene Varianten im ${gene}-Gen nachgewiesen.`
      case 'carrier':
        return `Bei der untersuchten Person wurde eine heterozygote pathogene Variante im ${gene}-Gen nachgewiesen.`
      case 'familyMember':
        return `In der Familie wurde eine pathogene Variante im ${gene}-Gen nachgewiesen.`
    }
  } else {
    switch (perspective) {
      case 'affected':
        return `Pathogenic variants in the ${gene} gene were identified in the individual.`
      case 'carrier':
        return `A heterozygous pathogenic variant in the ${gene} gene was identified in the individual.`
      case 'familyMember':
        return `A pathogenic variant in the ${gene} gene has been identified in the family.`
    }
  }
}

/**
 * Format a date for display in the given language.
 */
function formatAccessDate(language: string): string {
  const now = new Date()
  if (language === 'de') {
    return now.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }
  return now.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

/**
 * Calculate recurrence risk from carrier frequency.
 * For carrier perspective: carrierFrequency * (1/4) = risk with unknown partner.
 * Returns ratio and percent strings.
 */
function buildRecurrenceRisk(
  carrierFrequency: number | null
): { recurrenceRiskPercent: string; recurrenceRiskRatio: string } {
  if (carrierFrequency === null || carrierFrequency === 0) {
    return { recurrenceRiskPercent: 'N/A', recurrenceRiskRatio: 'N/A' }
  }
  // Risk = P(partner is carrier) * 1/4 = carrierFrequency * 0.25
  const risk = carrierFrequency * 0.25
  const ratio = Math.round(1 / risk)
  const percent = (risk * 100).toFixed(4) + '%'
  return {
    recurrenceRiskPercent: percent,
    recurrenceRiskRatio: `1:${ratio.toLocaleString('en-US')}`,
  }
}

/**
 * Build a gnomAD source attribution string.
 */
function buildSource(version: string, language: string): string {
  const versionLabel = version === 'v4' ? 'gnomAD v4.1' : version === 'v3' ? 'gnomAD v3.1.2' : 'gnomAD v2.1.1'
  if (language === 'de') {
    return `der Genomdatenbank ${versionLabel}`
  }
  return `the genomic database ${versionLabel}`
}

/**
 * Options for formatClinical.
 */
export interface ClinicalFormatOptions {
  /** Output language */
  language: 'de' | 'en'
  /** Clinical perspective (default: 'carrier') */
  perspective?: Perspective
  /** German gender-inclusive style: '*' | ':' | '/' | 'traditional' (default: '*') */
  genderStyle?: string
  /** Patient biological sex for German grammar: 'male' | 'female' | 'neutral' (default: 'neutral') */
  patientSex?: string
  /** Sections to include (default: all sections in order) */
  enabledSections?: string[]
}

/**
 * Format a QueryResult as clinical documentation text using @gnomad-cf/core templates.
 *
 * Loads the template JSON via loadTemplateContent(), builds a TemplateContext
 * from the QueryResult, then renders each enabled section with renderTemplate().
 *
 * @param result - Query result to format
 * @param opts - Clinical formatting options
 * @returns Promise resolving to rendered clinical text
 */
export async function formatClinical(
  result: QueryResult,
  opts: ClinicalFormatOptions
): Promise<string> {
  const language = opts.language
  const perspective: Perspective = opts.perspective ?? 'carrier'

  // Load template JSON
  const templateJson = await loadTemplateContent(language)
  const templateConfig = templateJson as unknown as TemplateConfig

  // Get the perspective config
  const perspectiveConfig = templateConfig.perspectives[perspective]
  if (!perspectiveConfig) {
    throw new Error(
      `Perspective '${perspective}' not found in ${language} template`
    )
  }

  // Build carrier frequency display values
  const cfFormatted = formatCarrierFrequency(result.globalCarrierFrequency)
  const { recurrenceRiskPercent, recurrenceRiskRatio } = buildRecurrenceRisk(
    result.globalCarrierFrequency
  )
  const patientForms = buildPatientForms(opts.patientSex, language)
  const genderSuffix = buildGenderSuffix(opts.genderStyle)
  const statusIntro = buildStatusIntro(result.gene, perspective, language)

  // Build TemplateContext
  const context: Partial<TemplateContext> = {
    gene: result.gene,
    carrierFrequency: cfFormatted.percent,
    carrierFrequencyRatio: cfFormatted.ratio,
    recurrenceRiskPercent,
    recurrenceRiskRatio,
    source: buildSource(result.version, language),
    indexStatus: 'heterozygous',
    statusIntro,
    patientNominative: patientForms.patientNominative,
    patientGenitive: patientForms.patientGenitive,
    patientDative: patientForms.patientDative,
    genderSuffix,
    accessDate: formatAccessDate(language),
  }

  // Determine sections to render
  const allSectionKeys = Object.keys(perspectiveConfig.sections)
  const sectionKeys = opts.enabledSections ?? allSectionKeys

  // Render each section
  const renderedSections: string[] = []
  for (const key of sectionKeys) {
    const section = perspectiveConfig.sections[key]
    if (!section) continue
    const rendered = renderTemplate(section.template, context)
    if (rendered.trim()) {
      renderedSections.push(rendered)
    }
  }

  return renderedSections.join('\n\n')
}
