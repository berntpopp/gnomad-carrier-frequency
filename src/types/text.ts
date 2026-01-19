// Text generation and template types

/**
 * Perspective for text generation - determines phrasing and focus
 */
export type Perspective = 'affected' | 'carrier' | 'familyMember';

/**
 * Gender-inclusive language style for German text
 * - '*': Anlagetrager*innen
 * - ':': Anlagetrager:innen
 * - '/': Anlagetrager/-innen
 * - 'traditional': Anlagetragerinnen und Anlagetrager
 */
export type GenderStyle = '*' | ':' | '/' | 'traditional';

/**
 * Patient biological sex for German grammatical gender agreement
 * - 'male': der Patient / des Patienten / dem Patienten
 * - 'female': die Patientin / der Patientin / der Patientin
 * - 'neutral': der/die Patient*in / des/der Patient*in / dem/der Patient*in
 */
export type PatientSex = 'male' | 'female' | 'neutral';

/**
 * A single text section within a perspective
 */
export interface TextSection {
  id: string;
  label: string;
  template: string; // Text with {{variables}}
}

/**
 * Configuration for a single perspective
 */
export interface PerspectiveConfig {
  label: string;
  sections: Record<string, TextSection>;
}

/**
 * Full template configuration for a language
 */
export interface TemplateConfig {
  language: 'de' | 'en';
  perspectives: Record<Perspective, PerspectiveConfig>;
}

/**
 * Context object for template variable interpolation
 * All values should be pre-formatted for the target locale
 */
export interface TemplateContext {
  /** Gene symbol (e.g., "CFTR", "NPHP1") */
  gene: string;

  /** Carrier frequency as formatted string (e.g., "4,0%" for German, "4.0%" for English) */
  carrierFrequency: string;

  /** Carrier frequency as ratio (e.g., "1:25") */
  carrierFrequencyRatio: string;

  /** Recurrence risk as formatted percentage (e.g., "0,25%" for German) */
  recurrenceRiskPercent: string;

  /** Recurrence risk as ratio (e.g., "1:400") */
  recurrenceRiskRatio: string;

  /** Full source attribution string */
  source: string;

  /** Index patient status - expanded for status-specific text */
  indexStatus: 'heterozygous' | 'homozygous' | 'compound_het_confirmed' | 'compound_het_assumed';

  /** Status-specific intro text (built by text generator) */
  statusIntro: string;

  /** Patient grammatical forms (German only) */
  patientNominative?: string;
  patientGenitive?: string;
  patientDative?: string;

  /** Population name (optional, for population-specific text) */
  populationName?: string;

  /** PubMed ID for literature citations (optional) */
  pmid?: string;

  /** Gender-inclusive suffix (e.g., "*innen", ":innen", "/-innen", "innen und Anlagetrager") */
  genderSuffix: string;

  /** Formatted access date (e.g., "19.01.2026" for German, "January 19, 2026" for English) */
  accessDate: string;
}
