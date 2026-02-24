import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref, computed } from 'vue'
import { mountWithPlugins } from '@/test/helpers'
import { useWizard } from '@/composables/useWizard'
import StepResults from '../StepResults.vue'
import type { CarrierFrequencyResult, FilterConfig } from '@gnomad-cf/core/types'

// Vuetify useDisplay requires a display injection that the minimal Vuetify setup does not provide.
// Mock it to return a stable non-responsive state for unit tests.
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

// Mock composables with side effects (API calls, singletons with complex dependencies)
vi.mock('@/composables/useExclusionState', () => ({
  useExclusionState: () => ({
    excluded: computed(() => []),
    excludedCount: computed(() => 0),
    reasons: new Map(),
    currentGene: computed(() => null),
    excludeVariant: vi.fn(),
    includeVariant: vi.fn(),
    toggleVariant: vi.fn(),
    excludeAll: vi.fn(),
    includeAll: vi.fn(),
    isExcluded: vi.fn(() => false),
    getReason: vi.fn(),
    setReason: vi.fn(),
    resetForGene: vi.fn(),
    setExclusions: vi.fn(),
  }),
}))

vi.mock('@/composables/useExport', () => ({
  useExport: () => ({
    exportToJson: vi.fn(),
    exportToExcel: vi.fn(),
  }),
}))

vi.mock('@/composables/useAppAnnouncer', () => ({
  useAppAnnouncer: () => ({
    polite: vi.fn(),
    assertive: vi.fn(),
    announceCalculation: vi.fn(),
    announceError: vi.fn(),
    announceLoading: vi.fn(),
    announceStep: vi.fn(),
    announceGeneSelection: vi.fn(),
  }),
}))

// @vueuse/core clipboard composable
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

// Stub heavy child components — they are tested separately
const stubComponents = {
  FilterPanel: { template: '<div data-testid="filter-panel-stub" />' },
  VariantModal: { template: '<div />' },
  TextOutput: { template: '<div data-testid="text-output-stub" />' },
  ClingenWarning: { template: '<div />' },
}

// Minimal valid CarrierFrequencyResult for seeding tests
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

const mockFilterConfig: FilterConfig = {
  lofHcEnabled: true,
  missenseEnabled: false,
  clinvarEnabled: true,
  clinvarStarThreshold: 1,
  clinvarIncludeConflicting: false,
  clinvarConflictingThreshold: 75,
}

describe('StepResults', () => {
  beforeEach(() => {
    const { resetWizard } = useWizard()
    resetWizard()
  })

  it('renders the step container', () => {
    const wrapper = mountWithPlugins(StepResults, {
      props: {
        result: null,
        globalFrequency: null,
        indexStatus: 'heterozygous',
        frequencySource: 'gnomad',
        literatureFrequency: null,
        literaturePmid: null,
        usingDefault: false,
        variants: [],
        clinvarVariants: [],
        filterConfig: mockFilterConfig,
        submissions: new Map(),
        conflictingVariantIds: [],
        isLoadingSubmissions: false,
        submissionsProgress: 0,
      },
      global: { stubs: stubComponents },
      storeInitialState: {
        'calc-settings': { defaults: { useHWEFormula: true, useHomExclusion: true, penetrance: 1.0 } },
        'filters': { defaults: mockFilterConfig },
      },
    })

    expect(wrapper.find('[data-testid="step-results"]').exists()).toBe(true)
  })

  it('renders summary card when result data is provided', () => {
    const wrapper = mountWithPlugins(StepResults, {
      props: {
        result: mockResult,
        globalFrequency: { percent: '4.00%', ratio: '1:25' },
        indexStatus: 'heterozygous',
        frequencySource: 'gnomad',
        literatureFrequency: null,
        literaturePmid: null,
        usingDefault: false,
        variants: [],
        clinvarVariants: [],
        filterConfig: mockFilterConfig,
        submissions: new Map(),
        conflictingVariantIds: [],
        isLoadingSubmissions: false,
        submissionsProgress: 0,
      },
      global: { stubs: stubComponents },
      storeInitialState: {
        'calc-settings': { defaults: { useHWEFormula: true, useHomExclusion: true, penetrance: 1.0 } },
        'filters': { defaults: mockFilterConfig },
      },
    })

    expect(wrapper.find('[data-testid="results-summary-card"]').exists()).toBe(true)
  })

  it('does not render summary card when result is null', () => {
    const wrapper = mountWithPlugins(StepResults, {
      props: {
        result: null,
        globalFrequency: null,
        indexStatus: 'heterozygous',
        frequencySource: 'gnomad',
        literatureFrequency: null,
        literaturePmid: null,
        usingDefault: false,
        variants: [],
        clinvarVariants: [],
        filterConfig: mockFilterConfig,
        submissions: new Map(),
        conflictingVariantIds: [],
        isLoadingSubmissions: false,
        submissionsProgress: 0,
      },
      global: { stubs: stubComponents },
      storeInitialState: {
        'calc-settings': { defaults: { useHWEFormula: true, useHomExclusion: true, penetrance: 1.0 } },
        'filters': { defaults: mockFilterConfig },
      },
    })

    expect(wrapper.find('[data-testid="results-summary-card"]').exists()).toBe(false)
  })

  it('renders population table when result is provided', () => {
    const wrapper = mountWithPlugins(StepResults, {
      props: {
        result: mockResult,
        globalFrequency: { percent: '4.00%', ratio: '1:25' },
        indexStatus: 'heterozygous',
        frequencySource: 'gnomad',
        literatureFrequency: null,
        literaturePmid: null,
        usingDefault: false,
        variants: [],
        clinvarVariants: [],
        filterConfig: mockFilterConfig,
        submissions: new Map(),
        conflictingVariantIds: [],
        isLoadingSubmissions: false,
        submissionsProgress: 0,
      },
      global: { stubs: stubComponents },
      storeInitialState: {
        'calc-settings': { defaults: { useHWEFormula: true, useHomExclusion: true, penetrance: 1.0 } },
        'filters': { defaults: mockFilterConfig },
      },
    })

    // Population table renders when tableItems is non-empty (mockResult has globalCarrierFrequency)
    expect(wrapper.find('[data-testid="population-table"]').exists()).toBe(true)
  })

  it('shows gene name in results heading', () => {
    const wrapper = mountWithPlugins(StepResults, {
      props: {
        result: mockResult,
        globalFrequency: { percent: '4.00%', ratio: '1:25' },
        indexStatus: 'heterozygous',
        frequencySource: 'gnomad',
        literatureFrequency: null,
        literaturePmid: null,
        usingDefault: false,
        variants: [],
        clinvarVariants: [],
        filterConfig: mockFilterConfig,
        submissions: new Map(),
        conflictingVariantIds: [],
        isLoadingSubmissions: false,
        submissionsProgress: 0,
      },
      global: { stubs: stubComponents },
      storeInitialState: {
        'calc-settings': { defaults: { useHWEFormula: true, useHomExclusion: true, penetrance: 1.0 } },
        'filters': { defaults: mockFilterConfig },
      },
    })

    expect(wrapper.text()).toContain('CFTR')
  })
})
