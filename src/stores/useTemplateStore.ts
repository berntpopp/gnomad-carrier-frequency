import { defineStore } from 'pinia';
import type { Perspective, GenderStyle, TemplateConfig } from '@/types';
import defaultDe from '@/config/templates/de.json';
import defaultEn from '@/config/templates/en.json';

// Type assertion for imported JSON
const templateDe = defaultDe as TemplateConfig;
const templateEn = defaultEn as TemplateConfig;

interface TemplateStoreState {
  language: 'de' | 'en';
  genderStyle: GenderStyle;
  enabledSections: Record<Perspective, string[]>; // Which sections are enabled per perspective
  customSections: Record<string, string>; // section key -> custom template override
}

export const useTemplateStore = defineStore('templates', {
  state: (): TemplateStoreState => ({
    language: detectBrowserLanguage(),
    genderStyle: '*',
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
  },

  actions: {
    setLanguage(lang: 'de' | 'en') {
      this.language = lang;
    },

    setGenderStyle(style: GenderStyle) {
      this.genderStyle = style;
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
