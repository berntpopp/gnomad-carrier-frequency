import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref } from 'vue'
import { mountWithPlugins } from '@/test/helpers'
import { useWizard } from '@/composables/useWizard'
import TextOutput from '../TextOutput.vue'
import type { CarrierFrequencyResult } from '@gnomad-cf/core/types'

// Vuetify useDisplay requires the display injection — mock it for the test env
vi.mock('vuetify', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vuetify')>()
  return {
    ...actual,
    useDisplay: () => ({
      smAndDown: ref(false),
      xs: ref(false),
      sm: ref(false),
      md: ref(false),
      lg: ref(false),
      xl: ref(false),
      mdAndUp: ref(true),
      lgAndUp: ref(true),
      width: ref(1280),
      height: ref(800),
      name: ref('lg'),
      platform: ref({ touch: false, win: false, mac: false, linux: false }),
    }),
  }
})

// Mock @vueuse/core clipboard composable
vi.mock('@vueuse/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@vueuse/core')>()
  return {
    ...actual,
    useClipboard: () => ({
      copy: vi.fn(),
      copied: ref(false),
      isSupported: ref(true),
      text: ref(''),
    }),
  }
})

// Minimal valid CarrierFrequencyResult for seeding template store
const mockResult: CarrierFrequencyResult = {
  gene: 'CFTR',
  version: 'v4',
  globalCarrierFrequency: 0.04,
  globalAlleleCount: 10,
  globalAlleleNumber: 250,
  populations: [],
  qualifyingVariantCount: 3,
  minFrequency: 0.01,
  maxFrequency: 0.08,
  hasFounderEffect: false,
  geneticPrevalence: 0.0016,
  bayesianPrevalence: 0.0016,
  formula: 'hwe',
  homExclusionActive: false,
}

describe('TextOutput', () => {
  beforeEach(() => {
    const { resetWizard } = useWizard()
    resetWizard()
  })

  it('renders the text output container', () => {
    const wrapper = mountWithPlugins(TextOutput, {
      props: {
        result: null,
        frequencySource: 'gnomad',
        indexStatus: 'heterozygous',
        literatureFrequency: null,
        literaturePmid: null,
        usingDefault: false,
      },
      storeInitialState: {
        templates: {
          language: 'en',
          genderStyle: '*',
          patientSex: 'neutral',
          enabledSections: {
            affected: ['geneIntro', 'inheritance', 'carrierFrequency', 'recurrenceRisk', 'recommendation'],
            carrier: ['geneIntro', 'inheritance', 'carrierFrequency', 'recurrenceRisk', 'recommendation'],
            familyMember: ['geneIntro', 'inheritance', 'carrierFrequency', 'recurrenceRisk', 'recommendation'],
          },
          customSections: {},
        },
      },
    })

    expect(wrapper.find('[data-testid="text-output"]').exists()).toBe(true)
  })

  it('renders the section chips area', () => {
    const wrapper = mountWithPlugins(TextOutput, {
      props: {
        result: mockResult,
        frequencySource: 'gnomad',
        indexStatus: 'heterozygous',
        literatureFrequency: null,
        literaturePmid: null,
        usingDefault: false,
      },
      storeInitialState: {
        templates: {
          language: 'en',
          genderStyle: '*',
          patientSex: 'neutral',
          enabledSections: {
            affected: ['geneIntro', 'inheritance', 'carrierFrequency', 'recurrenceRisk', 'recommendation'],
            carrier: ['geneIntro', 'inheritance', 'carrierFrequency', 'recurrenceRisk', 'recommendation'],
            familyMember: ['geneIntro', 'inheritance', 'carrierFrequency', 'recurrenceRisk', 'recommendation'],
          },
          customSections: {},
        },
      },
    })

    expect(wrapper.find('[data-testid="text-section-chips"]').exists()).toBe(true)
  })

  it('renders the text content area', () => {
    const wrapper = mountWithPlugins(TextOutput, {
      props: {
        result: mockResult,
        frequencySource: 'gnomad',
        indexStatus: 'heterozygous',
        literatureFrequency: null,
        literaturePmid: null,
        usingDefault: false,
      },
      storeInitialState: {
        templates: {
          language: 'en',
          genderStyle: '*',
          patientSex: 'neutral',
          enabledSections: {
            affected: ['geneIntro', 'inheritance', 'carrierFrequency', 'recurrenceRisk', 'recommendation'],
            carrier: ['geneIntro', 'inheritance', 'carrierFrequency', 'recurrenceRisk', 'recommendation'],
            familyMember: ['geneIntro', 'inheritance', 'carrierFrequency', 'recurrenceRisk', 'recommendation'],
          },
          customSections: {},
        },
      },
    })

    expect(wrapper.find('[data-testid="text-content"]').exists()).toBe(true)
  })

  it('renders language toggle buttons (DE and EN)', () => {
    const wrapper = mountWithPlugins(TextOutput, {
      props: {
        result: null,
        frequencySource: 'gnomad',
        indexStatus: 'heterozygous',
        literatureFrequency: null,
        literaturePmid: null,
        usingDefault: false,
      },
      storeInitialState: {
        templates: {
          language: 'en',
          genderStyle: '*',
          patientSex: 'neutral',
          enabledSections: {
            affected: [],
            carrier: [],
            familyMember: [],
          },
          customSections: {},
        },
      },
    })

    const text = wrapper.text()
    expect(text).toContain('DE')
    expect(text).toContain('EN')
  })

  it('displays "Clinical Text" title when language is English', () => {
    const wrapper = mountWithPlugins(TextOutput, {
      props: {
        result: null,
        frequencySource: 'gnomad',
        indexStatus: 'heterozygous',
        literatureFrequency: null,
        literaturePmid: null,
        usingDefault: false,
      },
      storeInitialState: {
        templates: {
          language: 'en',
          genderStyle: '*',
          patientSex: 'neutral',
          enabledSections: {
            affected: [],
            carrier: [],
            familyMember: [],
          },
          customSections: {},
        },
      },
    })

    expect(wrapper.text()).toContain('Clinical Text')
  })
})
