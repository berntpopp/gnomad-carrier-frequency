import { describe, it, expect, beforeEach, vi } from "vitest";
import { ref, computed } from "vue";
import { mountWithPlugins } from "@/test/helpers";
import { useWizard } from "@/composables/useWizard";
import WizardStepper from "../WizardStepper.vue";

// Vuetify useDisplay requires the display injection — mock it for the test env
vi.mock("vuetify", async (importOriginal) => {
  const actual = await importOriginal<typeof import("vuetify")>();
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
      name: ref("lg"),
      platform: ref({ touch: false, win: false, mac: false, linux: false }),
    }),
  };
});

// Mock useCarrierFrequency — singleton with complex villus/store dependencies
vi.mock("@/composables/useCarrierFrequency", () => ({
  useCarrierFrequency: () => ({
    geneSymbol: ref(null),
    setGeneSymbol: vi.fn(),
    isLoading: ref(false),
    hasError: ref(false),
    errorMessage: ref(null),
    result: ref(null),
    globalFrequency: ref(null),
    populations: ref([]),
    qualifyingVariantCount: ref(0),
    hasFounderEffect: ref(false),
    usingDefault: ref(false),
    geneticPrevalenceFormatted: ref(null),
    bayesianPrevalenceFormatted: ref(null),
    variants: ref([]),
    clinvarVariants: ref([]),
    filterConfig: ref({
      lofHcEnabled: true,
      missenseEnabled: false,
      clinvarEnabled: true,
      clinvarStarThreshold: 1,
      clinvarIncludeConflicting: false,
      clinvarConflictingThreshold: 75,
    }),
    setFilterConfig: vi.fn(),
    submissions: ref(new Map()),
    conflictingVariantIds: ref([]),
    isLoadingSubmissions: ref(false),
    submissionsProgress: ref(0),
    submissionsError: ref(null),
    retryFailedSubmissions: vi.fn(),
    currentVersion: ref("v4"),
    excludedCount: ref(0),
    totalPathogenicCount: ref(0),
    calculateRisk: vi.fn(),
    refetch: vi.fn(),
  }),
}));

// Mock useGeneConfig — uses useGeneSearch (villus) internally
vi.mock("@/composables/useGeneConfig", () => ({
  useGeneConfig: () => ({
    activeGeneConfig: ref(null),
    activeProfile: ref(null),
    configLoaded: ref(false),
    availableProfiles: computed(() => []),
    selectProfile: vi.fn(),
    resetConfig: vi.fn(),
  }),
}));

// Mock useAppAnnouncer — uses @vue-a11y/announcer which needs app-level plugin
vi.mock("@/composables/useAppAnnouncer", () => ({
  useAppAnnouncer: () => ({
    polite: vi.fn(),
    assertive: vi.fn(),
    announceCalculation: vi.fn(),
    announceError: vi.fn(),
    announceLoading: vi.fn(),
    announceStep: vi.fn(),
    announceGeneSelection: vi.fn(),
  }),
}));

// Mock useGeneSearch so WizardStepper's indirect dependency doesn't cause villus errors
vi.mock("@/composables/useGeneSearch", () => ({
  useGeneSearch: () => ({
    searchTerm: ref(""),
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
}));

vi.mock("@/api", () => ({
  useGnomadVersion: () => ({
    version: ref("v4"),
  }),
  graphqlClient: {
    executeQuery: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
}));

// Stub individual step components — WizardStepper orchestrates them;
// they are tested individually in their own test files.
const stubComponents = {
  StepGene: { template: '<div data-testid="step-gene-stub" />' },
  StepStatus: { template: '<div data-testid="step-status-stub" />' },
  StepFrequency: { template: '<div data-testid="step-frequency-stub" />' },
  StepResults: { template: '<div data-testid="step-results-stub" />' },
};

describe("WizardStepper", () => {
  beforeEach(() => {
    const { resetWizard } = useWizard();
    resetWizard();
  });

  it("renders the wizard stepper container", () => {
    const wrapper = mountWithPlugins(WizardStepper, {
      global: { stubs: stubComponents },
    });

    expect(wrapper.find('[data-testid="wizard-stepper"]').exists()).toBe(true);
  });

  it("renders all 4 step header items", () => {
    const wrapper = mountWithPlugins(WizardStepper, {
      global: { stubs: stubComponents },
    });

    expect(wrapper.find('[data-testid="wizard-step-1"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="wizard-step-2"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="wizard-step-3"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="wizard-step-4"]').exists()).toBe(true);
  });

  it("renders the wizard content area", () => {
    const wrapper = mountWithPlugins(WizardStepper, {
      global: { stubs: stubComponents },
    });

    expect(wrapper.find('[data-testid="wizard-content"]').exists()).toBe(true);
  });

  it("starts on step 1 (Gene selection)", () => {
    const wrapper = mountWithPlugins(WizardStepper, {
      global: { stubs: stubComponents },
    });

    // Step 1 stub should be rendered (WizardStepper uses v-model on currentStep)
    expect(wrapper.find('[data-testid="step-gene-stub"]').exists()).toBe(true);
  });
});
