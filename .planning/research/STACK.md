# Technology Stack: SEO & UX Polish (v1.4)

**Project:** gnomAD Carrier Frequency Calculator
**Researched:** 2026-02-23
**Overall Confidence:** HIGH
**Scope:** Stack additions for SEO indexing, structured data, OG image, VitePress sitemap, and Vuetify UX improvements

---

## Executive Summary

This milestone requires **zero new npm dependencies**. Every capability needed is achievable through:
1. Configuration changes to existing tools (VitePress sitemap, Vuetify theme)
2. Build scripts using already-installed `sharp` (OG image conversion)
3. Hand-authored static HTML in `index.html` (SEO seed content)
4. Pure CSS/HTML patterns (skip-to-content, onboarding)
5. Built-in Vuetify components (progress indicators, color system)

The discipline here is restraint: do not add libraries for problems that are solved by configuration or a few lines of code.

---

## Recommended Stack Changes

### 1. SEO: Static HTML Seed Content

**Approach:** Hand-edit `index.html` to place static HTML inside `<div id="app">`
**New dependencies:** NONE

**How it works:** Vue 3's `createApp().mount('#app')` replaces all innerHTML of the mount target when the app mounts. This means any static HTML placed inside `<div id="app">` is visible to crawlers on first load, then seamlessly replaced by the Vue app once JavaScript executes.

**This is the single most impactful SEO change.** The current body contains only `<div id="app"></div>` which gives Google zero indexable content. Adding ~300-500 words of keyword-rich static HTML solves the core indexing problem without any build tooling changes.

```html
<div id="app">
  <!-- Static seed content: visible to crawlers, replaced by Vue on mount -->
  <main>
    <h1>Carrier Frequency Calculator - gnomAD Population Data</h1>
    <p>Calculate carrier frequency and recurrence risk for autosomal
       recessive conditions using real population data from the Genome
       Aggregation Database (gnomAD).</p>
    <!-- ... more educational content ... -->
    <nav>
      <a href="/docs/guide/">Documentation</a>
      <a href="/docs/reference/methodology">Methodology</a>
    </nav>
  </main>
  <noscript>
    <p>This application requires JavaScript to run.</p>
  </noscript>
</div>
```

**Why NOT prerender / SSR / vite-ssg:**
- This is a single-page SPA with one URL (no routes). Prerendering tools are designed for multi-route apps.
- SSR adds server infrastructure complexity for a GitHub Pages static deployment.
- The static HTML seed approach is simpler, has zero build cost, and solves the exact problem (empty body for crawlers).
- Vue replaces the seed content on mount -- there is no hydration mismatch risk because there is no hydration; it is a full replacement.

**Confidence:** HIGH -- This is a well-documented Vue.js pattern. Vue's mount behavior is authoritative: it replaces innerHTML of the mount element.

**Sources:**
- [Vue.js Ways of Using Vue](https://vuejs.org/guide/extras/ways-of-using-vue)
- [Nuxt SEO: SPA Patterns](https://nuxtseo.com/learn-seo/vue/spa)

---

### 2. SEO: Canonical URL and Robots Meta

**Approach:** Add two `<meta>` / `<link>` tags to `index.html` `<head>`
**New dependencies:** NONE

```html
<link rel="canonical" href="https://gnomad-carrier-frequency.kidney-genetics.org/" />
<meta name="robots" content="index, follow" />
```

**Why not `@unhead/vue`:** The project has exactly one page (the SPA root). There are no dynamic routes requiring per-page meta management. A static canonical tag in `index.html` is all that is needed. Installing `@unhead/vue` for a single-page app with no router would be over-engineering.

**Confidence:** HIGH

---

### 3. SEO: Sitemap Strategy (Two Sitemaps)

**Approach:** Hand-authored `public/sitemap.xml` for SPA + VitePress built-in sitemap for docs
**New dependencies:** NONE

#### 3a. SPA Sitemap: `public/sitemap.xml`

The SPA has one URL. A hand-authored sitemap is appropriate:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://gnomad-carrier-frequency.kidney-genetics.org/</loc>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
```

**Why NOT `vite-plugin-sitemap`:**
- It scans the dist folder for generated HTML files. An SPA has exactly one: `index.html`.
- A hand-written file with one `<url>` entry is simpler, faster, and has zero build overhead.
- Adding a build-time plugin for a single URL is unnecessary complexity.

#### 3b. VitePress Docs Sitemap: Built-in Configuration

VitePress has built-in sitemap generation since v1.x. It is a one-line config change:

```typescript
// docs/.vitepress/config.ts
export default defineConfig({
  // ... existing config ...
  sitemap: {
    hostname: 'https://gnomad-carrier-frequency.kidney-genetics.org'
  }
})
```

This generates `sitemap.xml` in the VitePress build output (`docs/.vitepress/dist/sitemap.xml`) containing all docs pages automatically. Since VitePress builds to `/docs/` base, URLs will be correctly prefixed.

**Important:** The VitePress sitemap covers `/docs/*` pages. The SPA sitemap covers `/`. Both are needed. The `robots.txt` should reference both:

```
User-agent: *
Allow: /

Sitemap: https://gnomad-carrier-frequency.kidney-genetics.org/sitemap.xml
Sitemap: https://gnomad-carrier-frequency.kidney-genetics.org/docs/sitemap.xml
```

Alternatively, combine into a single sitemap index file. The simpler approach (two Sitemap entries in robots.txt) is recommended.

**Confidence:** HIGH -- VitePress sitemap is documented at [vitepress.dev/guide/sitemap-generation](https://vitepress.dev/guide/sitemap-generation). Vite's own docs use this exact pattern.

---

### 4. SEO: OG Image (SVG to PNG Conversion)

**Approach:** Build script using `sharp` (already installed as devDependency)
**New dependencies:** NONE

`sharp` is already in `devDependencies` at version `^0.34.5` and is used by `scripts/generate-screenshots.ts` for WebP conversion. It natively supports SVG-to-PNG conversion.

**Build script pattern:**

```typescript
// scripts/generate-og-image.ts
import sharp from 'sharp';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

await sharp(resolve(__dirname, '../public/og-image.svg'))
  .resize(1200, 630)
  .png()
  .toFile(resolve(__dirname, '../public/og-image.png'));
```

Run with: `bun run tsx scripts/generate-og-image.ts`

**Integration:** Add as a `prebuild` script or a standalone npm script. The generated `og-image.png` goes into `public/` and is committed to the repo (it is a static asset, not a build artifact).

**Also required:** Update `index.html` to use absolute PNG URLs:
```html
<meta property="og:image" content="https://gnomad-carrier-frequency.kidney-genetics.org/og-image.png" />
<meta name="twitter:image" content="https://gnomad-carrier-frequency.kidney-genetics.org/og-image.png" />
```

**Why not a dynamic OG image service (Vercel OG, Satori):**
- The app is deployed on GitHub Pages (static hosting). No server-side rendering available.
- The OG image content is static (app name, logo, tagline). It does not change per-page.
- A one-time build script is far simpler than a dynamic image generation pipeline.

**Confidence:** HIGH -- sharp SVG-to-PNG is well-documented. The project already uses sharp.

**Sources:**
- [sharp Output Options](https://sharp.pixelplumbing.com/api-output/)
- [Convert SVG to PNG with sharp](https://techsparx.com/nodejs/graphics/svg-to-png.html)

---

### 5. SEO: FAQPage Structured Data

**Approach:** Expand existing JSON-LD in `index.html`
**New dependencies:** NONE

The project already has FAQPage structured data in `index.html` (6 Q&A pairs added in commit `1ae0bfd`). This is already done correctly as static JSON-LD in the `<head>`.

**Remaining work:** Ensure FAQ content is also rendered as visible HTML in the seed content (not just in JSON-LD). Google prefers FAQ answers that are both in structured data AND visible on the page.

**Confidence:** HIGH -- Already implemented, just needs visible HTML counterpart.

---

### 6. UX: Vuetify Color System (CTA Fix)

**Approach:** Modify Vuetify theme configuration in `src/main.ts`
**New dependencies:** NONE

#### The Problem (Quantified)

The current primary color `#a09588` has a **2.94:1** contrast ratio for white text on the primary background. This fails WCAG AA minimum of 4.5:1 for normal text and 3:1 for large text/UI components. The CONTINUE button with white text on `#a09588` looks disabled.

#### The Solution: Separate Brand Color from CTA Color

Vuetify 3's theme system supports custom named colors beyond the defaults. The recommendation is to:

1. **Keep `#a09588` as a brand/accent color** (it is distinctive and professional)
2. **Add a new, saturated primary color for CTAs**
3. **Use Vuetify's `color` prop** to apply the right color contextually

**Recommended color: `#00796B` (Teal 700)**

| Metric | #a09588 (current) | #00796B (recommended) |
|--------|-------------------|----------------------|
| White text contrast | 2.94:1 (FAIL AA) | 5.32:1 (PASS AA) |
| On `#FAFAFA` background | 2.81:1 | 5.10:1 |
| Visual impression | Muted, disabled-looking | Saturated, actionable |
| Color-blind safe | N/A (too muted to register) | Distinguishable in all types |

**Alternative options (all pass AA):**

| Color | Hex | White text contrast | Character |
|-------|-----|-------------------|-----------|
| Teal 700 | `#00796B` | 5.32:1 | Calm, clinical, trustworthy |
| Blue 800 | `#1565C0` | 5.75:1 | Authoritative, standard SaaS |
| Green 800 | `#2E7D32` | 5.13:1 | Positive, growth, go/proceed |
| Blue 900 | `#0D47A1` | 8.63:1 | Very high contrast, bold |

**Recommendation: Teal 700 (`#00796B`)** because:
- Medical/clinical tools conventionally use teal/green (trust, health)
- High enough contrast (5.32:1) without being jarring
- Pairs well with the warm gray `#a09588` brand accent
- Works in both light and dark themes

**Implementation in `src/main.ts`:**

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
          primary: '#00796B',      // Teal 700 -- CTAs, active stepper, links
          secondary: '#424242',
          accent: '#a09588',       // Brand warm gray -- decorative, logo, borders
          surface: '#FFFFFF',
          background: '#FAFAFA',
        }
      },
      dark: {
        dark: true,
        colors: {
          primary: '#4DB6AC',      // Teal 200 -- lighter for dark backgrounds
          secondary: '#757575',
          accent: '#BDBDBD',
        }
      }
    }
  }
})
```

**Key Vuetify theme facts:**
- Custom color names (like `accent`) become usable as `color="accent"` on any Vuetify component
- Vuetify auto-generates CSS custom properties: `--v-theme-primary`, `--v-theme-accent`, etc.
- Vuetify auto-generates lighten/darken variants for each color
- No SCSS compilation needed -- colors are injected as CSS variables at runtime

**PWA manifest update also needed:**
```typescript
// vite.config.ts VitePWA manifest
theme_color: '#00796B', // Match new primary
```

**Confidence:** HIGH -- Vuetify 3 theme system is well-documented and the project already uses it.

**Sources:**
- [Vuetify Theme Configuration](https://vuetifyjs.com/en/features/theme/)
- [WCAG 2.2 Contrast Requirements](https://www.makethingsaccessible.com/guides/contrast-requirements-for-wcag-2-2-level-aa/)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)

---

### 7. UX: Onboarding Pattern

**Approach:** Custom Vue component using Vuetify built-in components (v-card, v-dialog, v-btn)
**New dependencies:** NONE

#### Why NOT a Tour Library

The project was evaluated for three onboarding libraries:

| Library | Version | Weekly DL | Vue 3 | TypeScript | Verdict |
|---------|---------|-----------|-------|------------|---------|
| v-onboarding | 2.12.2 | 13.8K | Yes | Yes | Overkill |
| vue-onboarding-tour | 1.x | <1K | Yes | Partial | Immature |
| vue-shepherd | 4.x | 7K | Yes | Yes | Heavy (Shepherd dep) |

**Why these are all unnecessary:**

The UX audit recommends a "brief welcome card" and a "Try with CFTR" quick-start button -- not a multi-step spotlight tour. This is a:
- First-visit conditional card (check localStorage flag)
- One or two sentences of explanation
- A "Try with CFTR" CTA button that pre-fills the gene search
- A "Got it" dismiss button that sets the localStorage flag

This is 30-50 lines of Vue code using `v-card` and `v-btn`. Adding a 14KB+ dependency with Popper.js positioning and SVG overlays for a single card is unjustifiable.

**Implementation pattern:**

```vue
<template>
  <v-card v-if="showOnboarding" class="mb-4" variant="tonal" color="primary">
    <v-card-title>Welcome to gCFCalc</v-card-title>
    <v-card-text>
      Calculate carrier frequency for autosomal recessive conditions
      using real gnomAD population data.
    </v-card-text>
    <v-card-actions>
      <v-btn @click="tryExample">Try with CFTR</v-btn>
      <v-btn variant="text" @click="dismiss">Dismiss</v-btn>
    </v-card-actions>
  </v-card>
</template>
```

State persistence: use the existing `pinia-plugin-persistedstate` (already installed) or simple `localStorage.getItem('onboarding-dismissed')`.

**Confidence:** HIGH -- Standard Vuetify components, no external dependencies needed.

---

### 8. UX: Skip-to-Content

**Approach:** Custom HTML/CSS element (6 lines of HTML, 10 lines of CSS)
**New dependencies:** NONE

#### Why NOT `@vue-a11y/skip-to`

- The npm package was last updated 5 years ago (2021)
- The Vue 3 compatible version is on `@next` tag, unclear maintenance status
- Skip-to-content is a standard HTML/CSS pattern that requires no JavaScript framework

**Implementation:**

Add to `App.vue` as the first child of `<v-app>`:

```html
<a href="#main-content" class="skip-link">
  Skip to main content
</a>
```

```css
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  background: var(--v-theme-primary);
  color: white;
  padding: 8px 16px;
  z-index: 9999;
  transition: top 0.2s;
}
.skip-link:focus {
  top: 0;
}
```

Add `id="main-content"` and `tabindex="-1"` to the `<v-main>` element.

This is the pattern recommended by [Vue.js Accessibility Guide](https://vuejs.org/guide/best-practices/accessibility.html) and [WebAIM](https://webaim.org/techniques/skipnav/).

**Confidence:** HIGH -- Standard WCAG pattern, no library needed.

**Sources:**
- [Vue.js Accessibility Best Practices](https://vuejs.org/guide/best-practices/accessibility.html)
- [WebAIM Skip Navigation](https://webaim.org/techniques/skipnav/)

---

### 9. UX: Step Transition Loading Indicator

**Approach:** Vuetify `v-progress-linear` component (already available)
**New dependencies:** NONE

The UX audit identified that transitioning from Step 2 to Step 3 involves an API call with no visible loading indicator. The solution uses Vuetify's built-in `v-progress-linear` component in indeterminate mode.

**Pattern:** Place a `v-progress-linear` at the top of the wizard stepper area, conditionally shown when a step transition involves async work:

```vue
<v-progress-linear
  :active="isTransitioning"
  indeterminate
  color="primary"
  height="3"
/>
```

This is the standard Material Design pattern for indicating background work. Vuetify's `v-progress-linear` supports:
- `indeterminate` mode (no known progress amount)
- `active` prop to show/hide without layout shift
- Automatic color theming via `color="primary"`

**No new components or libraries needed** -- `v-progress-linear` is part of the Vuetify core already imported in `main.ts` via `import * as components from 'vuetify/components'`.

**Confidence:** HIGH

**Sources:**
- [Vuetify Progress Linear](https://vuetifyjs.com/en/components/progress-linear/)

---

## What NOT to Add (and Why)

| Rejected Dependency | Why Rejected |
|-------------------|--------------|
| `@unhead/vue` | Single-page app with no router. Static meta tags in `index.html` suffice. |
| `vite-ssg` | SPA has one route. Static seed HTML in `index.html` achieves the same SEO benefit without SSG complexity. |
| `vite-plugin-sitemap` | One-URL SPA. A hand-written 8-line XML file is simpler than a build plugin. |
| `v-onboarding` / `vue-shepherd` | Onboarding is a single welcome card, not a multi-step spotlight tour. Vuetify's `v-card` handles this. |
| `@vue-a11y/skip-to` | 5 years old, unmaintained Vue 3 support. Skip-to-content is 6 lines of HTML/CSS. |
| `prerender-spa-plugin` | Abandoned (last update 2020). Also unnecessary -- static seed HTML solves the indexing problem. |
| `schema-dts` / JSON-LD libraries | Structured data is hand-authored JSON in `index.html`. A 40KB+ type library for 50 lines of JSON is overkill. |
| `vue-meta` / `@vueuse/head` | Both sunset/deprecated in favor of `@unhead/vue`, which itself is unnecessary (see above). |

---

## Complete Dependency Summary

### New Production Dependencies

**NONE**

### New Dev Dependencies

**NONE**

### Existing Dependencies Leveraged

| Existing Package | Version | New Use |
|-----------------|---------|---------|
| `sharp` | ^0.34.5 (devDep) | SVG-to-PNG OG image conversion build script |
| `vuetify` | ^3.8.1 | Theme color reconfiguration, `v-progress-linear` loading indicators |
| `vitepress` | ^2.0.0-alpha.16 (devDep) | Built-in sitemap generation via config |
| `pinia-plugin-persistedstate` | ^4.7.1 | Onboarding dismissal persistence |

### Configuration-Only Changes

| File | Change | Purpose |
|------|--------|---------|
| `index.html` | Add seed HTML inside `<div id="app">`, canonical, robots meta, absolute OG URLs | SEO indexing |
| `src/main.ts` | Update Vuetify theme colors object | CTA contrast fix |
| `docs/.vitepress/config.ts` | Add `sitemap: { hostname: '...' }` | Docs sitemap generation |
| `public/robots.txt` | Add Sitemap directives | Sitemap discovery |
| `public/sitemap.xml` | New hand-authored file | SPA sitemap |
| `vite.config.ts` | Update PWA `theme_color` | Match new primary color |

### New Files (Code)

| File | Purpose |
|------|---------|
| `scripts/generate-og-image.ts` | Build script: SVG to PNG conversion |
| `src/components/OnboardingCard.vue` | First-visit welcome card |
| Skip-link HTML/CSS in `App.vue` | Keyboard accessibility |

---

## Version Verification

All versions verified against npm registry and official documentation as of 2026-02-23:

| Package | In Project | Latest Available | Action |
|---------|-----------|-----------------|--------|
| sharp | ^0.34.5 | 0.34.5 | No update needed |
| vuetify | ^3.8.1 | 3.8.x | No update needed |
| vitepress | ^2.0.0-alpha.16 | 2.0.0-alpha.16 | No update needed (sitemap supported) |
| pinia-plugin-persistedstate | ^4.7.1 | 4.7.x | No update needed |

---

## Integration Points

### How Color Change Ripples Through the App

Changing `primary` in the Vuetify theme affects ALL components that use `color="primary"`:
- `v-btn` (CONTINUE, BACK buttons)
- `v-stepper` (step circles, active indicator)
- `v-progress-circular` (loading spinners)
- `v-progress-linear` (new transition indicator)
- `v-chip` (filter chips using primary color)
- `v-autocomplete` (focused border color)
- `v-radio` (selected state)
- `v-alert` (if using primary color)

This is intentional -- the primary color should be the "action" color. The warm gray brand identity shifts to `accent` for decorative uses (app bar background, borders, logo area).

**Components that may need manual `color="accent"` override:**
- AppBar background (if currently using primary)
- Logo/branding elements
- Decorative borders or dividers

### How VitePress Sitemap Interacts with SPA Sitemap

The deployment creates this URL structure:
```
/                    -> SPA (index.html)
/sitemap.xml         -> SPA sitemap (hand-authored)
/docs/               -> VitePress docs
/docs/sitemap.xml    -> VitePress sitemap (auto-generated)
```

Both sitemaps are referenced in `robots.txt`. Google treats each independently.

### How Seed HTML Interacts with Vue Mount

1. Browser loads `index.html` -- user sees static seed content
2. JavaScript bundles load and execute
3. `createApp(App).mount('#app')` replaces ALL innerHTML of `#app`
4. Vue app renders normally

The transition is seamless. There is no flash of unstyled content because:
- The seed content has minimal styling (just semantic HTML)
- Vue mounting happens fast (typically <500ms on modern devices)
- The Vuetify CSS loads before the app mounts

**Edge case:** If JavaScript fails to load entirely, the user sees the seed content plus `<noscript>` message. This is a graceful degradation, not a bug.

---

## Sources

### Official Documentation
- [VitePress Sitemap Generation](https://vitepress.dev/guide/sitemap-generation)
- [Vuetify Theme Configuration](https://vuetifyjs.com/en/features/theme/)
- [Vuetify Progress Linear](https://vuetifyjs.com/en/components/progress-linear/)
- [Vue.js Accessibility](https://vuejs.org/guide/best-practices/accessibility.html)
- [sharp API Documentation](https://sharp.pixelplumbing.com/api-output/)
- [WCAG 2.2 Contrast Requirements](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html)

### Web Research (Verified)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/) -- used for contrast ratio calculations
- [WebAIM Skip Navigation](https://webaim.org/techniques/skipnav/) -- skip-to-content pattern
- [Vue SPA SEO Patterns](https://nuxtseo.com/learn-seo/vue/spa) -- seed content approach
- [WCAG AA Contrast for Buttons](https://www.makethingsaccessible.com/guides/contrast-requirements-for-wcag-2-2-level-aa/)

### npm Registry (Version Verification)
- [sharp@0.34.5](https://www.npmjs.com/package/sharp)
- [v-onboarding@2.12.2](https://www.npmjs.com/package/v-onboarding) -- evaluated and rejected
- [@vue-a11y/skip-to](https://www.npmjs.com/package/@vue-a11y/skip-to) -- evaluated and rejected
