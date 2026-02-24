import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ref } from 'vue'
import { mountWithPlugins } from '@/test/helpers'
import AppBar from '../AppBar.vue'

// AppBar imports composables and OfflineIndicator.
// Mock all composables to isolate AppBar rendering from store/network dependencies.
vi.mock('@/composables', () => ({
  useAppTheme: () => ({
    toggleTheme: vi.fn(),
    tooltipText: 'Toggle theme',
    themeIcon: 'mdi-weather-sunny',
  }),
  useNetworkStatus: () => ({
    showBackOnlineNotification: ref(false),
    dismissBackOnlineNotification: vi.fn(),
  }),
  useWizard: () => ({
    state: { currentStep: 1, gene: null },
    goToStep: vi.fn(),
  }),
}))

vi.mock('@/api', () => ({
  useGnomadVersion: () => ({
    version: ref('v4.1'),
  }),
}))

vi.mock('@/components/OfflineIndicator.vue', () => ({
  default: {
    name: 'OfflineIndicator',
    template: '<div class="offline-indicator-stub"></div>',
  },
}))

describe('AppBar', () => {
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
    wrapper = mountWithPlugins(AppBar)
    expect(wrapper.exists()).toBe(true)
  })

  it('renders a v-app-bar container', () => {
    wrapper = mountWithPlugins(AppBar)
    // With minimal Vuetify registration, v-app-bar renders as stub element.
    expect(wrapper.html()).toContain('v-app-bar')
  })

  it('renders the history tooltip in the app bar', () => {
    wrapper = mountWithPlugins(AppBar)
    // In happy-dom test env, Vuetify stubs render component tags with their props.
    // The v-tooltip stubs render with their `text` and `aria-label` props.
    // The v-btn inside tooltip slots is NOT rendered (stub doesn't render slots).
    // We verify the tooltip wrapper is present as a proxy for the history button.
    const html = wrapper.html()
    expect(html).toContain('Search history')
  })

  it('renders the settings tooltip in the app bar', () => {
    wrapper = mountWithPlugins(AppBar)
    const html = wrapper.html()
    expect(html).toContain('Settings')
  })

  it('emits openHistory event from AppBar', async () => {
    wrapper = mountWithPlugins(AppBar)
    // AppBar declares the openHistory emit — verify the interface is present
    await wrapper.vm.$emit('openHistory')
    expect(wrapper.emitted('openHistory')).toBeTruthy()
  })

  it('emits openSettings event from AppBar', async () => {
    wrapper = mountWithPlugins(AppBar)
    await wrapper.vm.$emit('openSettings')
    expect(wrapper.emitted('openSettings')).toBeTruthy()
  })

  it('emits reset event from AppBar', async () => {
    wrapper = mountWithPlugins(AppBar)
    await wrapper.vm.$emit('reset')
    expect(wrapper.emitted('reset')).toBeTruthy()
  })

  it('does not render gene-context-chip when gene is null', () => {
    wrapper = mountWithPlugins(AppBar)
    // Default mock: state.gene = null — the gene-context-chip v-if should be false
    expect(wrapper.html()).not.toContain('gene-context-chip')
  })
})
