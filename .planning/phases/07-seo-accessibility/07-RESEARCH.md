# Phase 7: SEO + Accessibility - Research

**Researched:** 2026-01-19
**Domain:** Web accessibility (WCAG 2.1 AA), SEO meta tags, Lighthouse optimization
**Confidence:** HIGH

## Summary

This phase addresses accessibility compliance (WCAG 2.1 AA) and SEO optimization for a Vue 3 + Vuetify 3 SPA. The core challenges are:

1. **ARIA live regions** - Vue's reactive rendering (v-if) breaks screen reader announcements because live regions must exist in DOM before content changes
2. **Focus management** - Vuetify's v-dialog has documented focus trap issues requiring supplemental handling
3. **Color contrast** - Theme already exists with light/dark modes; need verification and potential adjustment
4. **Structured data** - WebApplication schema.org markup via JSON-LD in index.html

The standard approach uses `@vue-a11y/announcer` for live regions (solves the v-if problem), `@vueuse/integrations/useFocusTrap` for dialog focus, and `treosh/lighthouse-ci-action` for automated score verification.

**Primary recommendation:** Implement a global announcer component at app root level, wrap SettingsDialog content with focus trap, verify theme colors meet 4.5:1 contrast, and add meta tags + structured data to index.html.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @vue-a11y/announcer | 3.0.0-beta.3 (@next) | ARIA live region announcements | Solves v-if reactivity issue with persistent DOM region |
| @vueuse/integrations | ^12.x | Focus trap composable | Already have @vueuse/core; integrations add focus-trap wrapper |
| focus-trap | ^7.x | Underlying focus trap library | Peer dependency of useFocusTrap |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| treosh/lighthouse-ci-action | v12 | CI Lighthouse audits | GitHub Actions workflow for score thresholds |
| WebAIM Contrast Checker | N/A | Manual contrast verification | Development-time color validation |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @vue-a11y/announcer | Manual ARIA live div | More code, same pattern, less tested |
| useFocusTrap | focus-trap-vue | useFocusTrap integrates better with existing VueUse |
| Manual meta tags | vite-plugin-meta-tags | Plugin adds complexity; static HTML is simpler for SPA |

**Installation:**
```bash
bun add @vue-a11y/announcer@next focus-trap @vueuse/integrations
```

## Architecture Patterns

### Recommended Component Structure
```
src/
├── composables/
│   ├── useAnnouncer.ts       # Wrapper around @vue-a11y/announcer
│   └── index.ts              # Export new composable
├── components/
│   └── SettingsDialog.vue    # Add focus trap wrapper
└── App.vue                   # Add VueAnnouncer component
```

### Pattern 1: Global Live Region (CRITICAL)

**What:** A single, always-mounted ARIA live region at app root that receives text updates
**When to use:** Any dynamic content changes that screen readers should announce
**Why:** Screen readers track DOM mutations, not reactive state. When Vue uses v-if to show content, the element is recreated and the screen reader loses its connection.

**Example:**
```typescript
// main.ts
import VueAnnouncer from '@vue-a11y/announcer'
import '@vue-a11y/announcer/dist/style.css'

createApp(App)
  .use(VueAnnouncer)
  .use(pinia)
  .use(vuetify)
  .mount('#app')
```

```vue
<!-- App.vue -->
<template>
  <v-app>
    <VueAnnouncer class="sr-only" />
    <!-- rest of app -->
  </v-app>
</template>
```

```typescript
// In any component
import { useAnnouncer } from '@vue-a11y/announcer'

const { polite, assertive } = useAnnouncer()

// For calculation results (non-urgent)
polite('Carrier frequency calculated: 1 in 25 for European population')

// For errors (urgent)
assertive('Error: Gene BRCA1 not found in gnomAD')
```

### Pattern 2: Focus Trap for Modal Dialogs

**What:** Trap keyboard focus within dialog, return focus on close
**When to use:** Any modal that should block interaction with background
**Why:** Vuetify's v-dialog has documented focus trap bugs (GitHub issues #2538, #15745, #7907)

**Example:**
```vue
<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { useFocusTrap } from '@vueuse/integrations/useFocusTrap'

const dialogContent = ref<HTMLElement | null>(null)
const { activate, deactivate } = useFocusTrap(dialogContent, {
  immediate: false,
  allowOutsideClick: true,
})

// For v-if rendered content, activate after nextTick
async function onDialogOpen() {
  await nextTick()
  activate()
}

function onDialogClose() {
  deactivate()
}
</script>

<template>
  <v-dialog @update:model-value="$event ? onDialogOpen() : onDialogClose()">
    <v-card ref="dialogContent">
      <!-- dialog content -->
    </v-card>
  </v-dialog>
</template>
```

### Pattern 3: Screen-Reader-Only CSS Class

**What:** Visually hidden but accessible to screen readers
**When to use:** Live region container, skip links, additional context

**Example:**
```css
/* Add to global styles or component scoped */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

### Pattern 4: JSON-LD Structured Data

**What:** schema.org WebApplication markup in HTML head
**When to use:** Single placement in index.html

**Example:**
```html
<!-- index.html -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "gnomAD Carrier Frequency Calculator",
  "alternateName": "gCFCalc",
  "url": "https://username.github.io/gnomad-carrier-frequency/",
  "description": "Calculate carrier frequency and recurrence risk for autosomal recessive conditions using gnomAD population data",
  "applicationCategory": "HealthApplication",
  "operatingSystem": "All",
  "browserRequirements": "Requires JavaScript"
}
</script>
```

### Anti-Patterns to Avoid

- **Conditional live regions:** Never use `v-if` on elements with `aria-live`. The region must exist in DOM before content changes.
- **Multiple h1 tags:** SPA should have single h1 per logical "page" or view
- **Skipping heading levels:** Don't jump from h1 to h3; maintain sequential order
- **aria-live="assertive" overuse:** Reserve for errors only; most announcements should be "polite"
- **Focus trap without escape handling:** Always allow Escape key to close dialogs

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Live region management | Custom div with aria-live | @vue-a11y/announcer | Handles timing, duplicate announcements, politeness levels |
| Focus trapping | Manual tabindex management | useFocusTrap | Edge cases with hidden inputs, nested focusables |
| Color contrast checking | Manual color math | WebAIM Contrast Checker / Lighthouse | Algorithms are complex, tools are authoritative |
| OG image generation | Runtime generation | Static 1200x630 PNG | No runtime overhead, predictable |

**Key insight:** Accessibility libraries encode edge cases discovered over years of real-world testing. Custom implementations inevitably miss scenarios that break on specific screen reader + browser combinations.

## Common Pitfalls

### Pitfall 1: ARIA Live Region Not Announcing

**What goes wrong:** Content changes but screen reader says nothing
**Why it happens:** Live region created with v-if at same time as content, or region destroyed and recreated
**How to avoid:** Mount VueAnnouncer once at app root, never inside conditionally rendered components
**Warning signs:** Announcements work in some browsers but not others

### Pitfall 2: Focus Escapes Dialog

**What goes wrong:** User can Tab to elements behind modal
**Why it happens:** Vuetify v-dialog focus trap has bugs with hidden inputs, certain timing
**How to avoid:** Add useFocusTrap wrapper around dialog card content
**Warning signs:** Background buttons become focusable while modal open

### Pitfall 3: Heading Hierarchy Broken

**What goes wrong:** Lighthouse reports "Heading elements are not in sequential order"
**Why it happens:** Components render h3 without parent h2 in DOM order
**How to avoid:** Audit heading structure: App.vue h1 -> wizard step h2/h3
**Warning signs:** Page outline in accessibility tools shows gaps

### Pitfall 4: Theme Colors Fail Contrast

**What goes wrong:** Lighthouse accessibility score drops due to contrast failures
**Why it happens:** Primary color chosen for aesthetics, not accessibility
**How to avoid:** Test both light AND dark themes; adjust surface/text combinations
**Warning signs:** Text-medium-emphasis classes on colored backgrounds

### Pitfall 5: OG Image Wrong Dimensions

**What goes wrong:** Social previews show cropped or blurry image
**Why it happens:** Wrong aspect ratio or resolution
**How to avoid:** Create 1200x630 PNG for og:image, 1200x675 for Twitter
**Warning signs:** Facebook Debugger shows "Image too small" warning

## Code Examples

Verified patterns from research:

### Announcer Setup (main.ts)
```typescript
// Source: @vue-a11y/announcer documentation
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import { createVuetify } from 'vuetify'
import VueAnnouncer from '@vue-a11y/announcer'
import '@vue-a11y/announcer/dist/style.css'
import App from './App.vue'

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

const vuetify = createVuetify({
  // existing config
})

createApp(App)
  .use(VueAnnouncer)  // Before router if using route announcements
  .use(pinia)
  .use(vuetify)
  .mount('#app')
```

### Announcer Wrapper Composable
```typescript
// src/composables/useAnnouncer.ts
import { useAnnouncer as useVueAnnouncer } from '@vue-a11y/announcer'

/**
 * Application-specific announcer wrapper.
 * Provides typed methods for common announcement patterns.
 */
export function useAppAnnouncer() {
  const { polite, assertive } = useVueAnnouncer()

  function announceCalculation(gene: string, ratio: string, population: string) {
    polite(`Carrier frequency calculated: ${ratio} for ${population} population`)
  }

  function announceError(message: string) {
    assertive(`Error: ${message}`)
  }

  function announceLoading(what: string, done = false) {
    polite(done ? `${what} loaded` : `Loading ${what}...`)
  }

  function announceStep(stepNumber: number, stepName: string) {
    polite(`Step ${stepNumber}: ${stepName}`)
  }

  return {
    polite,
    assertive,
    announceCalculation,
    announceError,
    announceLoading,
    announceStep,
  }
}

export type UseAppAnnouncerReturn = ReturnType<typeof useAppAnnouncer>
```

### Meta Tags (index.html)
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" href="./favicon.svg" type="image/svg+xml" />
    <link rel="icon" href="./favicon.png" type="image/png" sizes="32x32" />
    <link rel="apple-touch-icon" href="./apple-touch-icon.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />

    <!-- SEO Meta -->
    <title>gnomAD Carrier Frequency Calculator</title>
    <meta name="description" content="Calculate carrier frequency and recurrence risk for autosomal recessive conditions. Uses gnomAD population data to generate clinical documentation for genetic counseling." />

    <!-- Open Graph -->
    <meta property="og:type" content="website" />
    <meta property="og:title" content="gnomAD Carrier Frequency Calculator" />
    <meta property="og:description" content="Calculate carrier frequency and recurrence risk for autosomal recessive conditions using gnomAD population data." />
    <meta property="og:image" content="https://username.github.io/gnomad-carrier-frequency/og-image.png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:url" content="https://username.github.io/gnomad-carrier-frequency/" />

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="gnomAD Carrier Frequency Calculator" />
    <meta name="twitter:description" content="Calculate carrier frequency and recurrence risk for autosomal recessive conditions using gnomAD population data." />
    <meta name="twitter:image" content="https://username.github.io/gnomad-carrier-frequency/og-image.png" />

    <!-- Structured Data -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      "name": "gnomAD Carrier Frequency Calculator",
      "alternateName": "gCFCalc",
      "url": "https://username.github.io/gnomad-carrier-frequency/",
      "description": "Calculate carrier frequency and recurrence risk for autosomal recessive conditions using gnomAD population data",
      "applicationCategory": "HealthApplication",
      "operatingSystem": "All",
      "browserRequirements": "Requires JavaScript"
    }
    </script>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

### Lighthouse CI Configuration (lighthouserc.json)
```json
{
  "ci": {
    "collect": {
      "numberOfRuns": 3,
      "startServerCommand": "bun run preview",
      "url": ["http://localhost:4173/gnomad-carrier-frequency/"]
    },
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.9 }],
        "categories:accessibility": ["error", { "minScore": 0.95 }],
        "categories:seo": ["error", { "minScore": 0.95 }]
      }
    }
  }
}
```

### GitHub Actions Workflow (.github/workflows/lighthouse.yml)
```yaml
name: Lighthouse CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v2

      - name: Install dependencies
        run: bun install

      - name: Build
        run: bun run build

      - name: Run Lighthouse CI
        uses: treosh/lighthouse-ci-action@v12
        with:
          configPath: './lighthouserc.json'
          uploadArtifacts: true
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| aria-live in conditional components | Global announcer at app root | Always (pattern existed, but often ignored) | Screen readers now reliably announce |
| FID (First Input Delay) | INP (Interaction to Next Paint) | 2024 | INP better reflects real responsiveness |
| Inline meta tags only | JSON-LD structured data | 2020+ | Richer search results, better machine understanding |
| Manual focus management | useFocusTrap composable | VueUse integrations stable | Handles edge cases automatically |

**Deprecated/outdated:**
- **FID metric**: Replaced by INP in Lighthouse
- **Vuetify v-dialog focus trap reliance**: Has documented bugs, supplement with useFocusTrap

## Open Questions

Things that couldn't be fully resolved:

1. **Vuetify v-stepper keyboard navigation**
   - What we know: GitHub issue #9975 documents that v-stepper-step[editable] is not keyboard accessible
   - What's unclear: Whether this is fixed in Vuetify 3.8.1 or still an issue
   - Recommendation: Test keyboard nav on stepper; if broken, add manual tabindex and keydown handlers

2. **Theme color contrast specifics**
   - What we know: Primary color is #a09588 (light) and #BDBDBD (dark)
   - What's unclear: Exact contrast ratios against all surface colors
   - Recommendation: Run Lighthouse locally first; adjust colors only if failures reported

3. **OG image design**
   - What we know: User wants "app logo + tagline (gCFCalc branding, clean and recognizable)"
   - What's unclear: Exact design, font, layout
   - Recommendation: Create simple 1200x630 PNG with logo centered, tagline below, neutral background

## Sources

### Primary (HIGH confidence)
- [k9n.dev - Fixing aria-live in Vue](https://k9n.dev/blog/2025-11-aria-live/) - Core problem and solution pattern
- [VueUse useFocusTrap](https://vueuse.org/integrations/useFocusTrap/) - API documentation and usage
- [treosh/lighthouse-ci-action](https://github.com/treosh/lighthouse-ci-action) - CI configuration

### Secondary (MEDIUM confidence)
- [Vue A11y Announcer GitHub](https://github.com/vue-a11y/vue-announcer) - Installation for Vue 3
- [Darren Lester - JSON-LD for Web Apps](https://www.darrenlester.com/blog/json-ld-structured-data-for-web-applications) - WebApplication schema example
- [Open Graph Image Guide 2025](https://www.krumzi.com/blog/open-graph-image-sizes-for-social-media-the-complete-2025-guide) - Image dimensions

### Tertiary (LOW confidence)
- Vuetify v-stepper keyboard accessibility status - based on old GitHub issues, may be resolved
- Vuetify v-dialog focus trap bugs - documented for v2, unclear status in v3

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Libraries verified via npm and official documentation
- Architecture: HIGH - Patterns validated against official Vue accessibility guides
- Pitfalls: MEDIUM - Based on documented issues and community experience

**Research date:** 2026-01-19
**Valid until:** 2026-02-19 (30 days - accessibility libraries are stable)
