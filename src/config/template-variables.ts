/**
 * Metadata for a template variable
 */
export interface TemplateVariable {
  name: string; // Variable name (without braces)
  description: string; // Human-readable description
  example: string; // Example value for preview
  category: 'gene' | 'frequency' | 'risk' | 'context' | 'formatting';
}

/**
 * All available template variables
 * Source of truth: src/types/text.ts TemplateContext interface
 */
export const TEMPLATE_VARIABLES: TemplateVariable[] = [
  // Gene category
  {
    name: 'gene',
    description: 'Gene symbol',
    example: 'CFTR',
    category: 'gene',
  },

  // Frequency category
  {
    name: 'carrierFrequency',
    description: 'Carrier frequency as percentage',
    example: '4.0%',
    category: 'frequency',
  },
  {
    name: 'carrierFrequencyRatio',
    description: 'Carrier frequency as ratio',
    example: '1:25',
    category: 'frequency',
  },

  // Risk category
  {
    name: 'recurrenceRiskPercent',
    description: 'Recurrence risk as percentage',
    example: '0.25%',
    category: 'risk',
  },
  {
    name: 'recurrenceRiskRatio',
    description: 'Recurrence risk as ratio',
    example: '1:400',
    category: 'risk',
  },

  // Context category
  {
    name: 'source',
    description: 'Data source attribution',
    example: 'gnomAD v4.1.0',
    category: 'context',
  },
  {
    name: 'indexStatus',
    description: 'Index patient status',
    example: 'heterozygous',
    category: 'context',
  },
  {
    name: 'statusIntro',
    description: 'Status-specific introduction text',
    example: 'A homozygous pathogenic variant...',
    category: 'context',
  },
  {
    name: 'populationName',
    description: 'Population name (optional)',
    example: 'European (non-Finnish)',
    category: 'context',
  },
  {
    name: 'pmid',
    description: 'PubMed ID for citations (optional)',
    example: '12345678',
    category: 'context',
  },
  {
    name: 'accessDate',
    description: 'Formatted access date',
    example: 'January 19, 2026',
    category: 'context',
  },

  // Formatting category (German-specific)
  {
    name: 'genderSuffix',
    description: 'Gender-inclusive suffix (German)',
    example: '*innen',
    category: 'formatting',
  },
  {
    name: 'patientNominative',
    description: 'Patient in nominative case (German)',
    example: 'der Patient',
    category: 'formatting',
  },
  {
    name: 'patientGenitive',
    description: 'Patient in genitive case (German)',
    example: 'des Patienten',
    category: 'formatting',
  },
  {
    name: 'patientDative',
    description: 'Patient in dative case (German)',
    example: 'dem Patienten',
    category: 'formatting',
  },
];

/**
 * Get variables by category
 */
export function getVariablesByCategory(
  category: TemplateVariable['category']
): TemplateVariable[] {
  return TEMPLATE_VARIABLES.filter((v) => v.category === category);
}

/**
 * Get variable by name
 */
export function getVariableByName(name: string): TemplateVariable | undefined {
  return TEMPLATE_VARIABLES.find((v) => v.name === name);
}
