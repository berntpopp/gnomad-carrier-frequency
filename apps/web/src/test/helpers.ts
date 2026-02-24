import { mount, type MountingOptions } from '@vue/test-utils'
import { createTestingPinia, type TestingOptions } from '@pinia/testing'
import type { Component } from 'vue'
import { vi } from 'vitest'
import { vuetify } from './setup'

interface MountWithPluginsOptions extends MountingOptions<Record<string, unknown>> {
  piniaOptions?: TestingOptions
  storeInitialState?: Record<string, unknown>
}

/**
 * Mount a Vue component with Vuetify and a testing Pinia instance pre-configured.
 * Eliminates boilerplate in component tests.
 */
export function mountWithPlugins(
  component: Component,
  options: MountWithPluginsOptions = {},
) {
  const { piniaOptions, storeInitialState, ...rest } = options

  return mount(component, {
    global: {
      plugins: [
        vuetify,
        createTestingPinia({
          createSpy: vi.fn,
          stubActions: true,
          initialState: storeInitialState,
          ...piniaOptions,
        }),
      ],
    },
    ...rest,
  })
}
