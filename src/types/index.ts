// Re-export all type definitions
export type {
  TranscriptConsequence,
  ClinVarVariant,
  VariantPopulation,
  VariantFrequencyData,
  GnomadVariant,
} from './variant';

export type {
  IndexPatientStatus,
  PopulationFrequency,
  CarrierFrequencyResult,
  RecurrenceRiskResult,
} from './frequency';

export type {
  WizardStep,
  FrequencySource,
  WizardState,
} from './wizard';

export type {
  Perspective,
  GenderStyle,
  TextSection,
  PerspectiveConfig,
  TemplateConfig,
  TemplateContext,
} from './text';
