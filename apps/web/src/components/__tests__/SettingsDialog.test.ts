import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ref, computed } from 'vue'
import { mountWithPlugins } from '@/test/helpers'
import SettingsDialog from '../SettingsDialog.vue'

// SettingsDialog uses useFocusTrap from @vueuse/integrations — mock to avoid DOM requirements
vi.mock('@vueuse/integrations/useFocusTrap', () => ({
  useFocusTrap: () => ({
    activate: vi.fn(),
    deactivate: vi.fn(),
  }),
}))

// SettingsDialog uses useClingenValidity which fetches CSV data
vi.mock('@/composables/useClingenValidity', () => ({
  useClingenValidity: () => ({
    isLoading: ref(false),
    error: computed(() => null),
    isExpired: computed(() => false),
    cacheAge: computed(() => 'Never'),
    entryCount: computed(() => 0),
    refreshCache: vi.fn(),
  }),
}))

// Mock usePwaInstall to avoid window event listeners
vi.mock('@/composables/usePwaInstall', () => ({
  usePwaInstall: () => ({
    canInstall: computed(() => false),
    isInstalled: ref(false),
    isIos: computed(() => false),
    promptInstall: vi.fn(),
  }),
}))

// Mock useConfirmDialog singleton
vi.mock('@/composables/useConfirmDialog', () => ({
  useConfirmDialog: () => ({
    ask: vi.fn().mockResolvedValue(false),
    confirm: vi.fn(),
    cancel: vi.fn(),
    isVisible: ref(false),
    options: ref({}),
  }),
}))

// Stub heavy child components — tested separately
vi.mock('@/components/TemplateEditor.vue', () => ({
  default: {
    name: 'TemplateEditor',
    template: '<div data-testid="template-editor-stub" />',
    methods: { insertVariable: vi.fn() },
  },
}))

vi.mock('@/components/VariablePicker.vue', () => ({
  default: {
    name: 'VariablePicker',
    template: '<div data-testid="variable-picker-stub" />',
    emits: ['select'],
  },
}))

describe('SettingsDialog', () => {
  let wrapper: ReturnType<typeof mountWithPlugins> | null = null

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
      wrapper = null
    }
  })

  it('renders without errors', () => {
    wrapper = mountWithPlugins(SettingsDialog, {
      props: { modelValue: true },
      attachTo: document.body,
      storeInitialState: {
        app: { disclaimerAcknowledged: false, disclaimerAcknowledgedAt: null, onboardingDismissed: false },
        filters: { defaults: {
          lofHcEnabled: true,
          missenseEnabled: true,
          clinvarEnabled: true,
          clinvarStarThreshold: 2,
          clinvarIncludeConflicting: false,
          clinvarConflictingThreshold: 80,
        }},
        templates: {
          language: 'en',
          genderStyle: '*',
          patientSex: 'male',
          enabledSections: {
            affected: ['geneIntro'],
            carrier: ['geneIntro'],
            familyMember: ['geneIntro'],
          },
          customSections: {},
        },
        history: { entries: [], settings: { maxEntries: 50 } },
        logs: { entries: [], nextId: 1, droppedCount: 0, settings: { maxEntries: 500, autoClearOnStart: false, defaultFilterLevel: 'INFO', enabledCategories: [] } },
      },
    })
    expect(wrapper.exists()).toBe(true)
  })

  it('renders the settings-dialog data-testid container', () => {
    wrapper = mountWithPlugins(SettingsDialog, {
      props: { modelValue: true },
      attachTo: document.body,
      storeInitialState: {
        app: { disclaimerAcknowledged: false, disclaimerAcknowledgedAt: null, onboardingDismissed: false },
        filters: { defaults: {
          lofHcEnabled: true,
          missenseEnabled: true,
          clinvarEnabled: true,
          clinvarStarThreshold: 2,
          clinvarIncludeConflicting: false,
          clinvarConflictingThreshold: 80,
        }},
        templates: { language: 'en', genderStyle: '*', patientSex: 'male', enabledSections: { affected: [], carrier: [], familyMember: [] }, customSections: {} },
        history: { entries: [], settings: { maxEntries: 50 } },
        logs: { entries: [], nextId: 1, droppedCount: 0, settings: { maxEntries: 500, autoClearOnStart: false, defaultFilterLevel: 'INFO', enabledCategories: [] } },
      },
    })
    // SettingsDialog uses v-dialog which teleports to document.body.
    // The data-testid="settings-dialog" is on the v-dialog component stub itself.
    const html = wrapper.html()
    expect(html).toContain('settings-dialog')
  })

  it('renders general settings tab', () => {
    wrapper = mountWithPlugins(SettingsDialog, {
      props: { modelValue: true },
      attachTo: document.body,
      storeInitialState: {
        app: { disclaimerAcknowledged: false, disclaimerAcknowledgedAt: null, onboardingDismissed: false },
        filters: { defaults: {
          lofHcEnabled: true,
          missenseEnabled: true,
          clinvarEnabled: true,
          clinvarStarThreshold: 2,
          clinvarIncludeConflicting: false,
          clinvarConflictingThreshold: 80,
        }},
        templates: { language: 'en', genderStyle: '*', patientSex: 'male', enabledSections: { affected: [], carrier: [], familyMember: [] }, customSections: {} },
        history: { entries: [], settings: { maxEntries: 50 } },
        logs: { entries: [], nextId: 1, droppedCount: 0, settings: { maxEntries: 500, autoClearOnStart: false, defaultFilterLevel: 'INFO', enabledCategories: [] } },
      },
    })
    // General tab has data-testid="settings-tab-general"
    const html = wrapper.html()
    expect(html).toContain('settings-tab-general')
  })

  it('renders filters settings tab', () => {
    wrapper = mountWithPlugins(SettingsDialog, {
      props: { modelValue: true },
      attachTo: document.body,
      storeInitialState: {
        app: { disclaimerAcknowledged: false, disclaimerAcknowledgedAt: null, onboardingDismissed: false },
        filters: { defaults: {
          lofHcEnabled: true,
          missenseEnabled: true,
          clinvarEnabled: true,
          clinvarStarThreshold: 2,
          clinvarIncludeConflicting: false,
          clinvarConflictingThreshold: 80,
        }},
        templates: { language: 'en', genderStyle: '*', patientSex: 'male', enabledSections: { affected: [], carrier: [], familyMember: [] }, customSections: {} },
        history: { entries: [], settings: { maxEntries: 50 } },
        logs: { entries: [], nextId: 1, droppedCount: 0, settings: { maxEntries: 500, autoClearOnStart: false, defaultFilterLevel: 'INFO', enabledCategories: [] } },
      },
    })
    const html = wrapper.html()
    expect(html).toContain('settings-tab-filters')
  })

  it('renders templates settings tab', () => {
    wrapper = mountWithPlugins(SettingsDialog, {
      props: { modelValue: true },
      attachTo: document.body,
      storeInitialState: {
        app: { disclaimerAcknowledged: false, disclaimerAcknowledgedAt: null, onboardingDismissed: false },
        filters: { defaults: {
          lofHcEnabled: true,
          missenseEnabled: true,
          clinvarEnabled: true,
          clinvarStarThreshold: 2,
          clinvarIncludeConflicting: false,
          clinvarConflictingThreshold: 80,
        }},
        templates: { language: 'en', genderStyle: '*', patientSex: 'male', enabledSections: { affected: [], carrier: [], familyMember: [] }, customSections: {} },
        history: { entries: [], settings: { maxEntries: 50 } },
        logs: { entries: [], nextId: 1, droppedCount: 0, settings: { maxEntries: 500, autoClearOnStart: false, defaultFilterLevel: 'INFO', enabledCategories: [] } },
      },
    })
    const html = wrapper.html()
    expect(html).toContain('settings-tab-templates')
  })
})
