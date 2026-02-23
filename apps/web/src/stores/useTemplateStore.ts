import { defineStore } from 'pinia';
import type { Perspective, GenderStyle, PatientSex, TemplateConfig } from '@/types';
import defaultDe from '@/config/templates/de.json';
import defaultEn from '@/config/templates/en.json';

// Type assertion for imported JSON
const templateDe = defaultDe as TemplateConfig;
const templateEn = defaultEn as TemplateConfig;

interface TemplateStoreState {
  language: 'de' | 'en';
  genderStyle: GenderStyle;
  patientSex: PatientSex;
  enabledSections: Record<Perspective, string[]>; // Which sections are enabled per perspective
  customSections: Record<string, string>; // section key -> custom template override
}

/**
 * Export format for template customizations
 */
export interface TemplateExport {
  version: string;
  language: 'de' | 'en';
  exportDate: string;
  customSections: Record<string, string>;
  enabledSections: Record<Perspective, string[]>;
}

export const useTemplateStore = defineStore('templates', {
  state: (): TemplateStoreState => ({
    language: detectBrowserLanguage(),
    genderStyle: '*',
    patientSex: 'male',
    enabledSections: {
      affected: ['geneIntro', 'inheritance', 'carrierFrequency', 'recurrenceRisk', 'recommendation'],
      carrier: ['geneIntro', 'inheritance', 'carrierFrequency', 'recurrenceRisk', 'recommendation'],
      familyMember: ['geneIntro', 'inheritance', 'carrierFrequency', 'recurrenceRisk', 'recommendation'],
    },
    customSections: {},
  }),

  getters: {
    defaultTemplates: (state): TemplateConfig => {
      return state.language === 'de' ? templateDe : templateEn;
    },

    genderSuffix: (state): string => {
      switch (state.genderStyle) {
        case '*': return '*innen';
        case ':': return ':innen';
        case '/': return '/-innen';
        case 'traditional': return 'innen';
        default: return '*innen';
      }
    },

    patientForms: (state): { nominative: string; genitive: string; dative: string } => {
      switch (state.patientSex) {
        case 'male':
          return {
            nominative: 'der Patient',
            genitive: 'des Patienten',
            dative: 'dem Patienten',
          };
        case 'female':
          return {
            nominative: 'die Patientin',
            genitive: 'der Patientin',
            dative: 'der Patientin',
          };
        case 'neutral':
          return {
            nominative: 'der/die Patient*in',
            genitive: 'des/der Patient*in',
            dative: 'dem/der Patient*in',
          };
      }
    },
  },

  actions: {
    setLanguage(lang: 'de' | 'en') {
      this.language = lang;
    },

    setGenderStyle(style: GenderStyle) {
      this.genderStyle = style;
    },

    setPatientSex(sex: PatientSex) {
      this.patientSex = sex;
    },

    toggleSection(perspective: Perspective, sectionId: string) {
      const sections = this.enabledSections[perspective];
      const index = sections.indexOf(sectionId);
      if (index > -1) {
        sections.splice(index, 1);
      } else {
        sections.push(sectionId);
      }
    },

    setSectionEnabled(perspective: Perspective, sectionId: string, enabled: boolean) {
      const sections = this.enabledSections[perspective];
      const index = sections.indexOf(sectionId);
      if (enabled && index === -1) {
        sections.push(sectionId);
      } else if (!enabled && index > -1) {
        sections.splice(index, 1);
      }
    },

    setCustomSection(sectionKey: string, template: string) {
      this.customSections[sectionKey] = template;
    },

    resetCustomSection(sectionKey: string) {
      delete this.customSections[sectionKey];
    },

    resetAllCustomizations() {
      this.customSections = {};
    },

    /**
     * Export current template customizations for the current language
     */
    exportTemplates(): TemplateExport {
      return {
        version: '1.0',
        language: this.language,
        exportDate: new Date().toISOString(),
        customSections: { ...this.customSections },
        enabledSections: { ...this.enabledSections },
      };
    },

    /**
     * Import template customizations from file
     * Returns true if successful, false if invalid format
     */
    importTemplates(data: unknown): boolean {
      // Validate structure
      if (!data || typeof data !== 'object') return false;
      const exported = data as TemplateExport;

      if (!exported.version || !exported.language) return false;
      if (!exported.customSections || typeof exported.customSections !== 'object') return false;
      if (!exported.enabledSections || typeof exported.enabledSections !== 'object') return false;

      // Apply customizations
      this.language = exported.language;
      this.customSections = { ...exported.customSections };

      // Merge enabled sections (preserve structure for all perspectives)
      for (const perspective of ['affected', 'carrier', 'familyMember'] as Perspective[]) {
        if (exported.enabledSections[perspective]) {
          this.enabledSections[perspective] = [...exported.enabledSections[perspective]];
        }
      }

      return true;
    },

    /**
     * Reset customizations for a specific language
     * Only clears customSections when user is on that language
     */
    resetLanguageTemplates(lang: 'de' | 'en') {
      // Custom sections are keyed by perspective.sectionId
      // They apply regardless of language, but user expects per-language reset
      // Since templates are language-specific in the JSON files, we clear all customizations
      // when user resets, as the custom content was likely written in that language
      if (this.language === lang) {
        this.customSections = {};
      }
    },

    /**
     * Get effective template for a section
     * Returns custom if exists, otherwise default
     */
    getEffectiveTemplate(perspective: Perspective, sectionId: string): string {
      const key = `${perspective}.${sectionId}`;
      if (this.customSections[key]) {
        return this.customSections[key];
      }
      return this.defaultTemplates.perspectives[perspective]?.sections[sectionId]?.template ?? '';
    },

    /**
     * Check if a section has customizations
     */
    hasCustomization(perspective: Perspective, sectionId: string): boolean {
      const key = `${perspective}.${sectionId}`;
      return key in this.customSections;
    },
  },

  persist: {
    key: 'carrier-freq-templates',
    storage: localStorage,
  },
});

function detectBrowserLanguage(): 'de' | 'en' {
  const browserLang = navigator.language.split('-')[0];
  return browserLang === 'de' ? 'de' : 'en';
}
