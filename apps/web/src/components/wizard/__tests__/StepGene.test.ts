import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref } from 'vue'
import { mountWithPlugins } from '@/test/helpers'
import { useWizard } from '@/composables/useWizard'
import StepGene from '../StepGene.vue'

// Mock composables that use villus/API calls to prevent module-load failures.
// Use real Vue refs so that Vue's watch() inside the component does not warn.
vi.mock('@/composables/useGeneSearch', () => ({
  useGeneSearch: () => ({
    searchTerm: ref(''),
    setSearchTerm: vi.fn(),
    results: ref([]),
    isLoading: ref(false),
    error: ref(null),
    selectedGene: ref(null),
    selectGene: vi.fn(),
    clearSelection: vi.fn(),
    isValidGene: ref(false),
    geneConstraint: ref(null),
    constraintLoading: ref(false),
    prefillGene: vi.fn(),
  }),
}))

vi.mock('@/composables/useNetworkStatus', () => ({
  useNetworkStatus: () => ({
    isOnline: ref(true),
  }),
}))

vi.mock('@/composables/useExclusionState', () => ({
  useExclusionState: () => ({
    resetForGene: vi.fn(),
    excluded: ref([]),
    excludedCount: ref(0),
    reasons: ref({}),
  }),
}))

vi.mock('@/api', () => ({
  useGnomadVersion: () => ({
    version: ref('v4.1'),
  }),
  graphqlClient: {
    executeQuery: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
}))

// Stub all child components to prevent cascading dependency issues
const stubComponents = {
  GeneSearch: { template: '<div data-testid="gene-search-stub" />' },
  WelcomeCard: { template: '<div />' },
  VersionSelector: { template: '<div />' },
  GeneConstraintCard: { template: '<div />' },
  ClingenWarning: { template: '<div />' },
  OfflineFallback: { template: '<div />' },
}

describe('StepGene', () => {
  beforeEach(() => {
    const { resetWizard } = useWizard()
    resetWizard()
  })

  it('renders the step container', () => {
    const wrapper = mountWithPlugins(StepGene, {
      props: { modelValue: null },
      global: { stubs: stubComponents },
    })

    expect(wrapper.find('[data-testid="step-gene"]').exists()).toBe(true)
  })

  it('renders the next button', () => {
    const wrapper = mountWithPlugins(StepGene, {
      props: { modelValue: null },
      global: { stubs: stubComponents },
    })

    expect(wrapper.find('[data-testid="step-gene-next-btn"]').exists()).toBe(true)
  })

  it('next button is disabled when no gene is selected (modelValue is null)', () => {
    const wrapper = mountWithPlugins(StepGene, {
      props: { modelValue: null },
      global: { stubs: stubComponents },
    })

    const btn = wrapper.find('[data-testid="step-gene-next-btn"]')
    // When disabled, Vuetify sets disabled="" or disabled="true" on the element
    const disabledAttr = btn.attributes('disabled')
    expect(disabledAttr === '' || disabledAttr === 'true').toBe(true)
  })

  it('next button is enabled when a gene is selected (modelValue provided)', () => {
    const wrapper = mountWithPlugins(StepGene, {
      props: {
        modelValue: { symbol: 'CFTR', ensemblId: 'ENSG00000001626' },
      },
      global: { stubs: stubComponents },
    })

    const btn = wrapper.find('[data-testid="step-gene-next-btn"]')
    // Vuetify sets disabled="false" when not disabled (string attribute, not presence-only)
    const disabledAttr = btn.attributes('disabled')
    expect(disabledAttr === '' || disabledAttr === 'true').toBe(false)
  })

  it('emits complete event when next button is clicked with gene selected', async () => {
    const wrapper = mountWithPlugins(StepGene, {
      props: {
        modelValue: { symbol: 'CFTR', ensemblId: 'ENSG00000001626' },
      },
      global: { stubs: stubComponents },
    })

    const btn = wrapper.find('[data-testid="step-gene-next-btn"]')
    await btn.trigger('click')

    expect(wrapper.emitted('complete')).toBeTruthy()
  })
})
