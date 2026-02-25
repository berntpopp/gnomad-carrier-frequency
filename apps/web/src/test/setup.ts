import { beforeAll, vi } from "vitest";
import { createVuetify } from "vuetify";

// Create a minimal Vuetify instance without pre-importing all components+directives.
// This avoids triggering CSS imports from vuetify/components at module load time.
// Component tests that need specific components can register them via global.components.
export const vuetify = createVuetify();

beforeAll(() => {
  // Mock ResizeObserver — not available in happy-dom/jsdom
  global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));

  // Mock matchMedia — not available in happy-dom/jsdom
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  // Set window.location for tests
  Object.defineProperty(window, "location", {
    writable: true,
    value: { href: "http://localhost:5173/" },
  });
});
