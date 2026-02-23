# Architecture Research: SEO & UX Polish Milestone

**Researched:** 2026-02-23
**Overall confidence:** HIGH
**Scope:** How SEO (static HTML, sitemap, structured data) and UX (color system, onboarding, context chips, accessibility) changes integrate with the existing Vue 3/Vuetify 3/VitePress architecture

---

## Executive Summary

The SEO and UX improvements integrate with the existing architecture at five distinct layers: the static HTML shell (`index.html`), the Vuetify theme configuration (`main.ts`), the Vue component tree (`App.vue` and children), the VitePress docs configuration (`docs/.vitepress/config.ts`), and the deployment pipeline (`.github/workflows/deploy.yml`). None of these changes require new dependencies or architectural restructuring. The most architecturally significant change is adding static HTML seed content to `index.html`, which leverages a well-documented Vue 3 behavior: `createApp(App).mount('#app')` **replaces all innerHTML** of the container element when the root component has a `<template>` (which `App.vue` does). This means any static content placed inside `<div id="app">` is visible to crawlers and users until Vue initializes, then cleanly replaced by the SPA. The `<noscript>` tag should be placed **outside** `<div id="app">` to persist after Vue mounts.

---

## 1. Static HTML Seed Content in index.html

### 1.1 Vue 3 Mount Behavior (HIGH confidence)

**Key finding verified via official Vue docs:**

When `app.mount('#app')` is called and the root component (`App.vue`) has a `<template>` or render function, Vue **replaces** the entire innerHTML of the container element. This is the documented Vue 3 behavior:

> "If [the root component] has a template or a render function defined, it will replace any existing DOM nodes inside the container."
> -- [Vue.js Application API: app.mount()](https://vuejs.org/api/application.html#app-mount)

This means:
- Static HTML placed **inside** `<div id="app">...</div>` is visible to crawlers and users on initial page load
- When Vue initializes (typically 1-3 seconds), that static content is replaced by the rendered SPA
- No flash-of-content issues because Vue replaces the entire container at once
- No hydration mismatches because this is NOT SSR hydration -- it is full replacement

**This is NOT SSR.** The `createSSRApp()` API preserves and hydrates pre-rendered DOM. The existing `createApp()` API simply replaces it. This is the desired behavior for SEO seed content.

### 1.2 Integration Architecture

**File modified:** `index.html` (root)

```
BEFORE (current):
<body>
  <div id="app"></div>                    <!-- empty, 0 bytes of content -->
  <script type="module" src="/src/main.ts"></script>
</body>

AFTER:
<body>
  <div id="app">
    <!-- SEO seed content: visible until Vue mounts, then replaced -->
    <header>...</header>
    <main>
      <h1>Carrier Frequency Calculator -- gnomAD Population Data</h1>
      <p>Calculate carrier frequency and recurrence risk...</p>
      <h2>How It Works</h2>
      <p>...</p>
      <h2>Key Features</h2>
      <ul>...</ul>
      <nav aria-label="Documentation">
        <a href="/docs/guide/">Guide</a>
        <a href="/docs/reference/methodology">Methodology</a>
        ...
      </nav>
    </main>
  </div>
  <noscript>
    <p>This application requires JavaScript...</p>
  </noscript>
  <script type="module" src="/src/main.ts"></script>
</body>
```

### 1.3 Critical Detail: noscript Placement

The `<noscript>` element MUST be placed **outside** `<div id="app">`, not inside it. Reasons:

1. Vue replaces all innerHTML of `<div id="app">` on mount -- including `<noscript>` tags inside it
2. Vue templates cannot contain `<noscript>` elements (compilation error)
3. Browsers with JS disabled need the noscript content to persist permanently

Place `<noscript>` between `</div>` and `<script>` in the body.

### 1.4 Build Output Consideration

**Important:** The current Vite build strips `<head>` meta tags from `dist/index.html` (observed in the current build output). This is a Vite configuration issue. The build output at `dist/index.html` currently shows:

```html
<head>
  <meta charset="UTF-8" />
  <link rel="icon" href="./favicon.svg" type="image/svg+xml" />
  <!-- meta description, OG tags, structured data are ALL MISSING -->
  <title>gnomAD Carrier Frequency Calculator</title>
  <script type="module" crossorigin src="/assets/index-xxx.js"></script>
  <link rel="stylesheet" crossorigin href="/assets/index-xxx.css">
</head>
<body>
  <div id="app"></div>  <!-- seed content also missing -->
</body>
```

This needs investigation. Vite should preserve the HTML in `index.html` and only inject script/style tags. The seed content inside `<div id="app">` and all `<head>` content should be preserved in the build output. If Vite is configured correctly (which it appears to be), the issue may be a stale build artifact. Verify with a fresh `bun run build`.

### 1.5 What the Seed Content Should NOT Include

- No Vue directives (`v-if`, `v-model`, etc.) -- this is plain HTML, not a Vue template
- No dynamic data -- keep it static and generic (no specific gene names)
- No Vuetify classes -- those require Vuetify CSS which loads with JS
- No interactive elements -- buttons, forms, etc. won't work before Vue mounts
- Keep it under ~2KB to avoid layout shift when Vue replaces it

### 1.6 Build Order Dependency

This change has **zero dependencies** on any other change. It can be done first, independently, and verified immediately by viewing the page source.

---

## 2. Vuetify Primary Color Change

### 2.1 Current Theme Configuration

**File:** `src/main.ts` (lines 26-50)

```typescript
const vuetify = createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        dark: false,
        colors: {
          primary: '#a09588',     // warm gray -- looks disabled
          secondary: '#424242',
          surface: '#FFFFFF',
          background: '#FAFAFA',
        }
      },
      dark: {
        dark: true,
        colors: {
          primary: '#BDBDBD',
          secondary: '#757575',
        }
      }
    }
  }
})
```

### 2.2 Impact Analysis

The `primary` color is used throughout the codebase:

| Component | Usage | Impact of Color Change |
|-----------|-------|----------------------|
| `StepGene.vue` | `<v-btn color="primary">Continue</v-btn>` | CTA becomes more visible |
| `StepStatus.vue` | `<v-btn color="primary">Continue</v-btn>` | Same |
| `StepFrequency.vue` | `<v-btn color="primary">Continue</v-btn>` + `<v-tabs bg-color="primary">` | CTAs + tab bar change |
| `StepResults.vue` | Various chip colors, share button | Accent chips change |
| `DisclaimerBanner.vue` | `<v-btn color="primary">I Understand</v-btn>` | Disclaimer CTA |
| `WizardStepper.vue` | Stepper item active color (implicit Vuetify default) | Active step indicator |
| `App.vue` | PWA update snackbar `color="primary"` | Snackbar background |
| `vite.config.ts` | PWA manifest `theme_color: '#a09588'` | PWA chrome color |

### 2.3 Recommended Approach

**Do NOT change `primary` directly.** Instead, keep the warm gray as the brand identity and introduce a separate **action color** for CTAs. However, this would require changing every `color="primary"` to a custom color name throughout the codebase, which is high-effort for low additional benefit.

**Simpler approach: Change `primary` to the new action color.** The warm gray `#a09588` is currently only used via `color="primary"`. There is no separate "brand color" CSS variable usage. Changing `primary` to a more saturated color affects all usages at once, which is the desired outcome.

**Recommended change in `src/main.ts`:**

```typescript
light: {
  dark: false,
  colors: {
    primary: '#2E7D32',       // green-800: medical/clinical feel, good contrast
    secondary: '#a09588',     // move warm gray to secondary (preserve brand)
    surface: '#FFFFFF',
    background: '#FAFAFA',
  }
},
dark: {
  dark: true,
  colors: {
    primary: '#66BB6A',       // green-400: visible on dark backgrounds
    secondary: '#BDBDBD',
  }
}
```

**Also update:** `vite.config.ts` PWA manifest `theme_color` to match the new primary.

### 2.4 Ripple Effects

Changing `primary` in Vuetify automatically updates:
- All `color="primary"` component props
- The `rgb(var(--v-theme-primary))` CSS custom property used in `AppBar.vue` hover style
- Stepper active step color (Vuetify uses primary by default)
- Tab active indicator color
- Progress circular color (when `color="primary"`)
- Any implicit Vuetify defaults that reference the primary theme color

**No component code changes needed** -- only the theme definition in `main.ts` and the PWA manifest in `vite.config.ts`.

### 2.5 Build Order Dependency

This change has **zero dependencies** on other changes. It is a single-file edit (`main.ts`) plus one line in `vite.config.ts`. Can be done independently and verified immediately in dev server.

---

## 3. Onboarding Component

### 3.1 Component Tree Integration Point

The onboarding component fits into the existing component tree at the `App.vue` level, between the `DisclaimerBanner` and the `WizardStepper`:

```
App.vue
  |-- VueAnnouncer (sr-only)
  |-- DisclaimerBanner       <-- shows first (persistent dialog until acknowledged)
  |-- AppBar
  |-- v-main
  |    |-- v-container
  |         |-- h1 title
  |         |-- p subtitle
  |         |-- OnboardingCard  <-- NEW: shows after disclaimer, before wizard
  |         |-- WizardStepper
  |-- AppFooter
  |-- SettingsDialog
  |-- LogViewerPanel
  |-- HistoryDrawer
```

### 3.2 State Management

The onboarding state should be managed in `useAppStore` (Pinia, persisted to localStorage), alongside the existing `disclaimerAcknowledged` state:

```typescript
// src/stores/useAppStore.ts
interface AppStoreState {
  disclaimerAcknowledged: boolean;
  disclaimerAcknowledgedAt: number | null;
  onboardingDismissed: boolean;      // NEW
  onboardingSeen: boolean;           // NEW: track if ever shown
}
```

### 3.3 Display Logic

```
Show onboarding when:
  1. disclaimerAcknowledged === true  (disclaimer must be dismissed first)
  2. onboardingDismissed === false    (not yet dismissed by user)
  3. state.gene === null              (wizard is at initial state)
```

This prevents the onboarding from overlapping with the disclaimer modal and ensures it only appears for first-time users who haven't started using the tool yet.

### 3.4 Component Design

**New file:** `src/components/OnboardingCard.vue`

A simple `v-card` (not a dialog/overlay) that appears inline above the wizard, containing:
- Brief description of what the tool does (2-3 sentences)
- "Try with CFTR" quick-start button (pre-populates gene search)
- "Dismiss" text button to hide permanently

The "Try with CFTR" action would:
1. Set `state.gene` to a pre-configured CFTR GeneSearchResult object
2. Trigger the gene search flow (same as selecting from autocomplete)
3. Dismiss the onboarding card

### 3.5 Build Order Dependency

Depends on:
- Nothing technically, but should be done AFTER the primary color change (so the CTA button has the new visible color)
- Uses existing `useAppStore` (extend state) and `useWizard` (set gene state)

---

## 4. VitePress Sitemap and Cross-Linking

### 4.1 Current Deployment Architecture

```
GitHub Actions deploy.yml:
  1. bun run build          --> dist/           (Vite SPA)
  2. bun run docs:build     --> docs/.vitepress/dist/  (VitePress static)
  3. cp -r docs/.vitepress/dist dist/docs      (merge into single artifact)
  4. Upload dist/ to GitHub Pages

Result on gnomad-carrier-frequency.kidney-genetics.org:
  /              --> Vite SPA (index.html + JS/CSS)
  /docs/         --> VitePress static site
  /docs/guide/   --> VitePress guide pages
  /docs/about/   --> VitePress about pages
  etc.
```

### 4.2 Sitemap Strategy

There are TWO sitemaps needed:

**A. App sitemap:** `public/sitemap.xml` (static, hand-authored)
- Covers `/` (the SPA root)
- Listed in `public/robots.txt`
- Deployed to `dist/sitemap.xml` --> `https://domain/sitemap.xml`

**B. VitePress sitemap:** Auto-generated by VitePress
- Covers all `/docs/*` pages
- Configured in `docs/.vitepress/config.ts`
- Generated during `bun run docs:build` to `docs/.vitepress/dist/sitemap.xml`
- Deployed to `dist/docs/sitemap.xml` --> `https://domain/docs/sitemap.xml`

### 4.3 VitePress Sitemap Configuration

**File modified:** `docs/.vitepress/config.ts`

```typescript
export default defineConfig({
  title: 'gnomAD Carrier Frequency Docs',
  description: '...',
  base: '/docs/',

  sitemap: {
    hostname: 'https://gnomad-carrier-frequency.kidney-genetics.org/docs/'
  },

  // ... rest of config
})
```

**Critical detail from VitePress issue #3863:** When using `base: '/docs/'`, the hostname MUST include the base path with trailing slash: `hostname: 'https://domain/docs/'`. VitePress does NOT automatically append the base to sitemap URLs.

### 4.4 Unified Sitemap Index

To link both sitemaps, the `robots.txt` should reference both:

```
User-agent: *
Allow: /

Sitemap: https://gnomad-carrier-frequency.kidney-genetics.org/sitemap.xml
Sitemap: https://gnomad-carrier-frequency.kidney-genetics.org/docs/sitemap.xml
```

Alternatively, create a sitemap index file. But dual-sitemap reference in `robots.txt` is simpler and equally effective for Google.

### 4.5 Cross-Link Architecture

**App --> Docs links (3 integration points):**

1. **Static HTML seed content in `index.html`:** Include `<nav>` with links to key docs pages. These exist in the raw HTML so Google discovers them before JS renders. Replaced when Vue mounts (but Google already indexed them).

2. **AppFooter.vue docs icon:** Add a documentation icon button to the existing footer icon bar, alongside GitHub, disclaimer, methodology, FAQ, and about icons. Pattern matches existing footer structure exactly:
   ```vue
   <v-tooltip text="Documentation" location="top">
     <template #activator="{ props }">
       <v-btn v-bind="props" icon variant="text" size="small"
              href="/docs/" aria-label="Documentation">
         <v-icon size="small">mdi-book-open-variant</v-icon>
       </v-btn>
     </template>
   </v-tooltip>
   ```

3. **Structured data in `index.html`:** Add `sameAs` or `relatedLink` properties pointing to docs pages in the JSON-LD.

**Docs --> App links (already partially exist):**
- VitePress nav bar has "Open Calculator" link (already configured)
- Add contextual "Open Calculator" CTAs within docs page content

### 4.6 Build Order Dependency

- `robots.txt` update: independent, do first
- `sitemap.xml` creation: independent, do alongside robots.txt
- VitePress config update: independent, verify with `bun run docs:build`
- Footer docs link: independent of other changes
- All can be done in parallel

---

## 5. Gene Context Chip in Wizard Steps

### 5.1 Integration Point

The context chip shows the selected gene and gnomAD version on Steps 2-4. It fits in the `WizardStepper.vue` component, between the stepper header and the stepper window:

```vue
<!-- WizardStepper.vue -->
<v-stepper ...>
  <v-stepper-header>
    <!-- existing step items -->
  </v-stepper-header>

  <!-- NEW: Gene context chip, shown after gene selection (steps 2-4) -->
  <div v-if="state.gene && state.currentStep > 1" class="px-4 pt-2">
    <v-chip size="small" variant="tonal" color="primary" prepend-icon="mdi-dna">
      {{ state.gene.symbol }} | gnomAD {{ gnomadVersionLabel }}
    </v-chip>
  </div>

  <v-stepper-window>
    <!-- existing step content -->
  </v-stepper-window>
</v-stepper>
```

### 5.2 Data Flow

The gene symbol is already available via `state.gene.symbol` from `useWizard()`. The gnomAD version needs to come from `useGnomadVersion()`:

```typescript
// Already imported in WizardStepper.vue:
const { state } = useWizard();

// Need to add:
import { useGnomadVersion } from '@/api';
const { versionLabel } = useGnomadVersion();
```

Check that `useGnomadVersion` exposes a display-friendly label. If it only exposes a raw version string, that is sufficient.

### 5.3 Accessibility

Add `aria-label` to the chip: `aria-label="Currently analyzing gene ${state.gene.symbol} using gnomAD version ${versionLabel}"`.

### 5.4 Build Order Dependency

- Depends on: nothing (uses existing composables and state)
- Should be done AFTER primary color change (so the chip uses the new visible primary color)

---

## 6. Accessibility Improvements

### 6.1 Skip-to-Content Link

**Integration point:** First element inside `<v-app>` in `App.vue`, before `VueAnnouncer`:

```vue
<v-app>
  <!-- Skip to main content link (a11y) -->
  <a href="#main-content" class="skip-link">
    Skip to main content
  </a>
  <VueAnnouncer class="sr-only" />
  <DisclaimerBanner />
  <AppBar ... />
  <v-main>
    <v-container id="main-content" max-width="900">
      ...
    </v-container>
  </v-main>
  ...
</v-app>
```

The `id="main-content"` target goes on the `v-container` inside `v-main`. CSS for the skip link:

```css
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  background: rgb(var(--v-theme-primary));
  color: white;
  padding: 8px 16px;
  z-index: 100;
  transition: top 0.2s;
}
.skip-link:focus {
  top: 0;
}
```

This is a standard pattern. The link is visually hidden until focused via Tab, then slides into view.

### 6.2 Footer Text Labels

**File modified:** `AppFooter.vue`

Current footer buttons are icon-only with tooltips. On desktop (`d-none d-sm-flex`), add text labels below or beside the icons. Two approaches:

**Approach A: Add text to existing buttons (minimal change)**
Change icon buttons to text buttons with icons on desktop:
```vue
<v-btn v-bind="props" variant="text" size="small"
       :icon="xs" :prepend-icon="xs ? undefined : 'mdi-database'">
  <template v-if="!xs">Data Sources</template>
  <v-icon v-else size="small">mdi-database</v-icon>
</v-btn>
```

**Approach B: Keep icons, add aria improvements only**
Keep the visual design but ensure every button has comprehensive `aria-label` and `title` attributes (most already do).

Approach A is recommended by the UX audit. It makes footer navigation self-documenting without requiring hover. The existing mobile overflow menu already has text labels, so this brings parity.

### 6.3 Build Order Dependency

- Skip-to-content: independent, no dependencies
- Footer labels: independent, no dependencies
- Both can be done in parallel with other changes

---

## 7. OG Image and Meta Tag Fixes

### 7.1 OG Image Format

**Current:** `./og-image.svg` (relative path, SVG format)
**Required:** Absolute URL, PNG format (1200x630px)

SVG is not rendered by Facebook, LinkedIn, Twitter/X, Slack, or Discord for Open Graph previews.

**Files to modify:**
- `index.html`: Update `<meta property="og:image">` and `<meta name="twitter:image">` to absolute PNG URL
- `public/`: Generate or add `og-image.png` (1200x630px)

The project already has `sharp` as a dev dependency, so an SVG-to-PNG conversion can be scripted.

### 7.2 Canonical URL

Add to `index.html` `<head>`:
```html
<link rel="canonical" href="https://gnomad-carrier-frequency.kidney-genetics.org/" />
```

### 7.3 Robots Meta

Add to `index.html` `<head>`:
```html
<meta name="robots" content="index, follow" />
```

### 7.4 Build Order Dependency

Independent. Can be done as part of the initial `index.html` modifications.

---

## 8. Structured Data Updates

### 8.1 Current State

`index.html` already has a `<script type="application/ld+json">` block with:
- `@graph` array containing `WebApplication` and `FAQPage` schemas
- WebApplication has `featureList`, `author`, `offers` (free), `applicationCategory`
- FAQPage has 6 questions with answers

### 8.2 Recommended Updates

1. **Update `softwareVersion`** from `"1.2.0"` to match `package.json` version (`"1.3.0"`)
2. **Add `dateModified`** with current date
3. **Add `screenshot`** property pointing to the new PNG OG image
4. **Optimize title in WebApplication `name`** to lead with target keyword: `"Carrier Frequency Calculator"` with `"gnomAD Carrier Frequency Calculator"` as `alternateName`
5. **Add `sameAs`** array linking to the docs site and GitHub

These changes are all in `index.html` and have no code dependencies.

---

## 9. Integration Map: Files Modified vs Created

### Files MODIFIED (existing)

| File | Changes | Dependencies |
|------|---------|-------------|
| `index.html` | Seed HTML content in `<div id="app">`, noscript outside, canonical URL, robots meta, OG image fix, structured data updates, title tag optimization, meta description optimization | None |
| `src/main.ts` | Change `primary` color in both light and dark themes, move warm gray to `secondary` | None |
| `vite.config.ts` | Update PWA manifest `theme_color` to match new primary | After main.ts |
| `src/App.vue` | Add skip-to-content link, add `id="main-content"` to container, add OnboardingCard conditionally | After OnboardingCard created |
| `src/stores/useAppStore.ts` | Add `onboardingDismissed` and `onboardingSeen` state properties | None |
| `src/components/AppFooter.vue` | Add docs icon button, optionally add text labels to icon buttons | None |
| `src/components/wizard/WizardStepper.vue` | Add gene context chip between stepper header and window | None |
| `public/robots.txt` | Add sitemap references | None |
| `docs/.vitepress/config.ts` | Add `sitemap` configuration with hostname including base path | None |

### Files CREATED (new)

| File | Purpose | Dependencies |
|------|---------|-------------|
| `src/components/OnboardingCard.vue` | First-time user welcome card with "Try CFTR" button | useAppStore, useWizard |
| `public/sitemap.xml` | App sitemap with root URL + doc page URLs | None |
| `public/og-image.png` | PNG version of OG image (1200x630) | sharp (already installed as devDep) |

### Files NOT modified

| File | Why |
|------|-----|
| `src/composables/*` | No new composables needed -- existing useWizard, useAppTheme, useGnomadVersion suffice |
| `src/api/*` | No API changes |
| `src/config/*` | No new config files |
| `src/types/*` | Extend AppStoreState in-place; no new type files |
| Wizard step components | Context chip lives in WizardStepper parent, not in individual steps |

---

## 10. Suggested Build Order

Based on dependency analysis:

```
Phase 1: Independent Foundation (can all be done in parallel)
  |
  |-- [A] index.html: seed content, meta tags, canonical, robots meta, OG image fix
  |-- [B] public/robots.txt: add sitemap references
  |-- [C] public/sitemap.xml: create static app sitemap
  |-- [D] docs/.vitepress/config.ts: add sitemap config
  |-- [E] public/og-image.png: generate PNG from SVG
  |
Phase 2: Theme (independent, but UX audit's top priority)
  |
  |-- [F] src/main.ts: change primary color
  |-- [G] vite.config.ts: update PWA theme_color (after F)
  |
Phase 3: Component Changes (after Phase 2 for visual consistency)
  |
  |-- [H] src/App.vue: add skip-to-content link + id="main-content"
  |-- [I] src/components/AppFooter.vue: add docs icon, text labels
  |-- [J] src/components/wizard/WizardStepper.vue: add gene context chip
  |-- [K] src/stores/useAppStore.ts: add onboarding state
  |-- [L] src/components/OnboardingCard.vue: create onboarding card (after K)
  |-- [M] src/App.vue: integrate OnboardingCard (after L)
```

### Rationale for Ordering

1. **Phase 1 first** because the SEO report identifies "not indexed by Google" as the critical problem. Static HTML seed content, sitemap, and robots.txt are the highest-impact changes for indexing.

2. **Phase 2 second** because the UX audit's #1 recommendation is the CTA color. This is a single-file edit with maximum visual impact.

3. **Phase 3 third** because component changes benefit from the new color system being in place (the onboarding card CTA, context chip, and skip link all use `primary`).

---

## 11. Architectural Patterns to Follow

### 11.1 Static Content Pattern

The seed HTML in `index.html` establishes a pattern: **static content for crawlers, dynamic content for users**. This is not SSR. It is a deliberate divergence where the raw HTML serves a different purpose (SEO) than the rendered app (interactivity). Keep this content focused on:
- Keywords and descriptions (for crawlers)
- Links to docs pages (for crawler discovery)
- Minimal presentation (no styling that would flash before Vue loads)

### 11.2 Pinia Store Extension Pattern

The `useAppStore` extension follows the existing pattern: add new state properties with persistence. The `onboardingDismissed` state mirrors `disclaimerAcknowledged`:
- Boolean flag with localStorage persistence
- Getter for display logic
- Action to dismiss
- No expiry needed (once dismissed, permanently dismissed)

### 11.3 Vuetify Theme Pattern

The color change stays within the existing `createVuetify` configuration pattern. No runtime theme mutation, no new theme variants, no additional CSS custom properties. Just update the hex values.

---

## 12. Anti-Patterns to Avoid

### 12.1 Do NOT Use createSSRApp

The seed content strategy uses standard `createApp()` replacement, not SSR hydration. Using `createSSRApp()` would cause hydration mismatch warnings because the seed HTML does not match the Vue template output. The replacement behavior is correct and intended.

### 12.2 Do NOT Install @unhead/vue

The milestone context mentions `@unhead/vue` as "installed" but it is NOT in `package.json` and NOT in `node_modules`. It is not needed for these changes. The existing `<head>` content in `index.html` is sufficient for static meta tags. Dynamic head management would only be needed if the app had multiple routes with different titles -- this is a single-page wizard with one URL.

### 12.3 Do NOT Use Vite Plugin for HTML Injection

Vite plugins like `vite-plugin-html` or `vite-ssg` add complexity. The seed content can be placed directly in `index.html` as static HTML. Vite preserves `index.html` content during build and only injects script/style tags.

### 12.4 Do NOT Create a Sitemap Index File

With only two sitemaps (app root + VitePress docs), a sitemap index XML adds unnecessary complexity. Listing both sitemaps in `robots.txt` is the simpler and equally effective approach.

### 12.5 Do NOT Add Vuetify CSS Classes to Seed Content

Seed content in `index.html` renders before Vuetify CSS loads. Using Vuetify classes (`text-h4`, `mb-6`, etc.) would cause unstyled content. Keep seed content in plain semantic HTML with minimal inline styles if any.

---

## 13. Confidence Assessment

| Area | Confidence | Basis |
|------|------------|-------|
| Vue mount replacement behavior | HIGH | Official Vue docs, verified |
| Vuetify theme color change | HIGH | Verified in codebase: all usages are via `color="primary"` prop |
| VitePress sitemap config | HIGH | Official VitePress docs + issue #3863 for base path behavior |
| Seed content Vite build preservation | MEDIUM | Vite docs say index.html is preserved, but current build output is suspicious (appears stale). Needs verification with fresh build |
| noscript placement | HIGH | Vue mount replaces innerHTML of container; noscript outside container persists |
| OnboardingCard integration | HIGH | Follows existing DisclaimerBanner pattern in App.vue |
| Gene context chip | HIGH | WizardStepper.vue already has access to state.gene and display breakpoints |
| OG image SVG->PNG | HIGH | sharp is already a devDependency |

---

## 14. Open Questions

1. **Build output stripping:** The current `dist/index.html` is missing meta tags and structured data. Is this a stale build or a Vite configuration issue? A fresh `bun run build` should clarify. If Vite is stripping content, may need to investigate `vite-plugin-html` or move meta to a Vite plugin.

2. **CFTR pre-configured data:** For the "Try with CFTR" onboarding button, a pre-configured `GeneSearchResult` object for CFTR is needed. This should match the structure returned by the gnomAD gene search API. It could be hard-coded as a constant in `src/config/` or fetched live (but live fetch defeats the "instant demo" purpose).

3. **OG image content:** The current `og-image.svg` content should be reviewed. Converting SVG to PNG with sharp is straightforward, but the image content itself may need updating to reflect the new branding (new primary color).

---

## Sources

- [Vue.js Application API: app.mount()](https://vuejs.org/api/application.html#app-mount) -- official docs on mount replacement behavior
- [Vue.js SSR Guide](https://vuejs.org/guide/scaling-up/ssr.html) -- createSSRApp vs createApp distinction
- [Vue 3 Migration: Mount Changes](https://v3-migration.vuejs.org/breaking-changes/mount-changes) -- innerHTML replacement in Vue 3
- [VitePress Sitemap Generation](https://vitepress.dev/guide/sitemap-generation) -- official sitemap config
- [VitePress Issue #3863](https://github.com/vuejs/vitepress/issues/3863) -- base path + sitemap hostname must include base
- [Vuetify Theme Documentation](https://vuetifyjs.com/en/features/theme/) -- theme color configuration
- [Vue Discussion #12788](https://github.com/orgs/vuejs/discussions/12788) -- keeping/replacing mount element content
