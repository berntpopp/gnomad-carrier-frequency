import { computed } from 'vue';
import { useTemplateStore } from '@/stores/useTemplateStore';
import { renderTemplate } from '@/utils/template-renderer';
import type {
  Perspective,
  TemplateContext,
  FrequencySource,
  IndexPatientStatus,
  CarrierFrequencyResult,
} from '@/types';
import { config } from '@/config';

interface TextGeneratorInput {
  result: CarrierFrequencyResult | null;
  frequencySource: FrequencySource;
  indexStatus: IndexPatientStatus;
  literatureFrequency: number | null;
  literaturePmid: string | null;
  usingDefault: boolean;
}

export function useTextGenerator(input: () => TextGeneratorInput) {
  const store = useTemplateStore();

  // Build template context from calculation results
  const templateContext = computed((): TemplateContext | null => {
    const data = input();
    if (!data.result) return null;

    const effectiveFrequency = getEffectiveFrequency(data);
    if (effectiveFrequency === null) return null;

    const divisor = data.indexStatus === 'heterozygous' ? 4 : 2;
    const recurrenceRisk = effectiveFrequency / divisor;

    return {
      gene: data.result.gene,
      carrierFrequency: formatFrequencyForLocale(effectiveFrequency, store.language),
      carrierFrequencyRatio: formatRatio(effectiveFrequency),
      recurrenceRiskPercent: formatPercentForLocale(recurrenceRisk, store.language),
      recurrenceRiskRatio: formatRatio(recurrenceRisk),
      source: formatSourceAttribution(data, store.language),
      indexStatus: data.indexStatus,
      statusIntro: buildStatusIntro(
        data.indexStatus,
        data.result.gene,
        store.patientForms.dative,
        store.language
      ),
      genderSuffix: store.genderSuffix,
      accessDate: formatAccessDate(store.language),
      patientNominative: store.patientForms.nominative,
      patientGenitive: store.patientForms.genitive,
      patientDative: store.patientForms.dative,
    };
  });

  // Generate text for a given perspective
  const generateText = (perspective: Perspective): string => {
    const context = templateContext.value;
    if (!context) return '';

    const templates = store.defaultTemplates;
    const perspectiveConfig = templates.perspectives[perspective];
    if (!perspectiveConfig) return '';

    const enabledSections = store.enabledSections[perspective];
    const sectionOrder = ['geneIntro', 'inheritance', 'carrierFrequency', 'recurrenceRisk', 'populationContext', 'founderEffect', 'sourceCitation', 'recommendation'];

    const textParts: string[] = [];

    for (const sectionId of sectionOrder) {
      if (!enabledSections.includes(sectionId)) continue;

      const section = perspectiveConfig.sections[sectionId];
      if (!section) continue;

      // Use custom template if exists, otherwise default
      const customKey = `${perspective}.${sectionId}`;
      const template = store.customSections[customKey] ?? section.template;

      const rendered = renderTemplate(template, context);
      if (rendered.trim()) {
        textParts.push(rendered);
      }
    }

    return textParts.join(' ');
  };

  // Get all available sections for a perspective (for UI toggles)
  const getSections = (perspective: Perspective) => {
    const templates = store.defaultTemplates;
    const perspectiveConfig = templates.perspectives[perspective];
    if (!perspectiveConfig) return [];

    return Object.entries(perspectiveConfig.sections).map(([id, section]) => ({
      id,
      label: section.label,
      enabled: store.enabledSections[perspective].includes(id),
    }));
  };

  return {
    templateContext,
    generateText,
    getSections,
    language: computed(() => store.language),
    genderStyle: computed(() => store.genderStyle),
    patientSex: computed(() => store.patientSex),
    setLanguage: store.setLanguage,
    setGenderStyle: store.setGenderStyle,
    setPatientSex: store.setPatientSex,
    toggleSection: store.toggleSection,
  };
}

// Helper functions
function getEffectiveFrequency(data: TextGeneratorInput): number | null {
  switch (data.frequencySource) {
    case 'gnomad':
      return data.result?.globalCarrierFrequency ?? null;
    case 'literature':
      return data.literatureFrequency;
    case 'default':
      return config.settings.defaultCarrierFrequency;
    default:
      return null;
  }
}

function formatFrequencyForLocale(freq: number, lang: 'de' | 'en'): string {
  const percent = freq * 100;
  return percent.toLocaleString(lang === 'de' ? 'de-DE' : 'en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + '%';
}

function formatPercentForLocale(value: number, lang: 'de' | 'en'): string {
  const percent = value * 100;
  return percent.toLocaleString(lang === 'de' ? 'de-DE' : 'en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + '%';
}

function formatRatio(value: number): string {
  if (value <= 0) return 'N/A';
  return `1:${Math.round(1 / value).toLocaleString()}`;
}

function formatAccessDate(lang: 'de' | 'en'): string {
  const now = new Date();
  if (lang === 'de') {
    return now.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }
  return now.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatSourceAttribution(data: TextGeneratorInput, lang: 'de' | 'en'): string {
  const accessDate = formatAccessDate(lang);

  switch (data.frequencySource) {
    case 'gnomad':
      if (data.usingDefault) {
        return lang === 'de'
          ? '(Standardannahme mangels gnomAD-Daten)'
          : '(default assumption, no gnomAD data)';
      }
      return lang === 'de'
        ? `(gnomAD v4, https://gnomad.broadinstitute.org, abgerufen am ${accessDate})`
        : `(gnomAD v4, https://gnomad.broadinstitute.org, accessed ${accessDate})`;

    case 'literature':
      // Format: (Author et al. year, PMID: xxx)
      // Since we only have PMID, format as (PMID: xxx)
      return `(PMID: ${data.literaturePmid})`;

    case 'default':
      return lang === 'de'
        ? '(Standardannahme)'
        : '(default assumption)';

    default:
      return '';
  }
}

function buildStatusIntro(
  indexStatus: IndexPatientStatus,
  gene: string,
  patientDative: string,
  lang: 'de' | 'en'
): string {
  if (lang === 'de') {
    switch (indexStatus) {
      case 'heterozygous':
        return `Bei ${patientDative} wurde eine heterozygote pathogene Variante im ${gene}-Gen nachgewiesen.`;
      case 'homozygous':
        return `Bei ${patientDative} wurde eine pathogene Variante im ${gene}-Gen im homozygoten Zustand nachgewiesen.`;
      case 'compound_het_confirmed':
        return `Bei ${patientDative} wurden zwei pathogene Varianten im ${gene}-Gen im compound heterozygoten Zustand nachgewiesen.`;
      case 'compound_het_assumed':
        return `Bei ${patientDative} wurden zwei pathogene Varianten im ${gene}-Gen nachgewiesen. Aufgrund des passenden Phanotyps erscheint ein compound heterozygotes Vorliegen wahrscheinlich.`;
    }
  } else {
    switch (indexStatus) {
      case 'heterozygous':
        return `A heterozygous pathogenic variant in the ${gene} gene was identified in the patient.`;
      case 'homozygous':
        return `A pathogenic variant in the ${gene} gene was identified in the homozygous state in the patient.`;
      case 'compound_het_confirmed':
        return `Two pathogenic variants in the ${gene} gene were identified in compound heterozygous state in the patient.`;
      case 'compound_het_assumed':
        return `Two pathogenic variants in the ${gene} gene were identified in the patient. Based on the clinical phenotype, compound heterozygous inheritance is presumed.`;
    }
  }
}

export type UseTextGeneratorReturn = ReturnType<typeof useTextGenerator>;
