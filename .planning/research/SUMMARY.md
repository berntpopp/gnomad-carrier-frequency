# Project Research Summary

**Project:** gnomAD Carrier Frequency Calculator v1.4 -- Discoverability & Polish
**Domain:** Medical/scientific SPA tool -- SEO indexing and UX polish for a Vue 3/Vuetify 3 single-page application
**Researched:** 2026-02-23
**Confidence:** HIGH

## Executive Summary

The v1.4 milestone addresses two critical deficiencies: the app is **invisible to Google** (empty `<body>` yields zero indexable content) and the **CTA buttons look disabled** (`#a09588` fails WCAG AA contrast at 2.94:1). Both problems are well-understood and solvable with zero new dependencies. The recommended approach is static HTML seed content inside `<div id="app">` (replaced when Vue mounts), a new saturated primary CTA color in the Vuetify theme, and cross-linking between the SPA and the pre-rendered VitePress docs site. All capabilities are achievable through configuration changes to existing tools (VitePress sitemap, Vuetify theme), build scripts using already-installed `sharp` (OG image), and hand-authored static HTML/XML.

The architecture is clean: 9 existing files are modified, 3 new files are created, no new composables or API changes are needed. The changes layer onto the existing codebase at five integration points: the static HTML shell (`index.html`), Vuetify theme config (`main.ts`), Vue component tree (`App.vue` and children), VitePress docs config, and the deployment pipeline. The onboarding card follows the existing `DisclaimerBanner` pattern. The color change propagates automatically through Vuetify's `color="primary"` system.

The two highest-risk integration points are the **service worker caching stale `index.html`** after SEO content is added (Workbox precache with `registerType: 'prompt'` means existing PWA users will not see updates until they accept the prompt) and the **Vuetify primary color cascade** affecting 40+ component bindings (filter chips, switches, and informational elements would all become saturated, not just CTAs). Both have clear mitigations: consider `autoUpdate` for this release or ensure the update prompt is tested, and audit all `color="primary"` usages to determine which should shift to a secondary/accent color.

## Key Findings

### Recommended Stack

Zero new npm dependencies. Every feature is achievable through existing tools and configuration. See [STACK.md](./STACK.md) for full analysis.

**Core technologies leveraged (all already installed):**
- **sharp** (^0.34.5, devDep): SVG-to-PNG OG image conversion via build script
- **Vuetify** (^3.8.1): Theme color reconfiguration for CTA contrast, `v-progress-linear` for loading indicators, `v-card` for onboarding
- **VitePress** (^2.0.0-alpha.16, devDep): Built-in sitemap generation via one-line config addition
- **pinia-plugin-persistedstate** (^4.7.1): Onboarding dismissal state persistence

**Explicitly rejected (8 libraries evaluated and declined):** `@unhead/vue`, `vite-ssg`, `vite-plugin-sitemap`, `v-onboarding`, `vue-shepherd`, `@vue-a11y/skip-to`, `prerender-spa-plugin`, `schema-dts`. Each is overkill for this single-page app. Details in [STACK.md](./STACK.md).

### Expected Features

See [FEATURES.md](./FEATURES.md) for full feature landscape with competitor comparison.

**Must have (table stakes -- 9 items):**
- Static HTML seed content in `<div id="app">` (500+ words, keyword-rich)
- `sitemap.xml` for SPA + VitePress sitemap config for docs
- `robots.txt` with sitemap references
- `<link rel="canonical">` and `<meta name="robots">`
- PNG OG image (1200x630) with absolute HTTPS URLs
- Optimized `<title>` and `<meta description>`
- Distinct CTA primary color (WCAG AA compliant)
- Clear disabled vs. enabled button states
- VitePress sitemap generation enabled

**Should have (differentiators -- 10 items):**
- App-to-docs cross-linking (footer icon, static HTML nav, contextual CTAs)
- Expanded FAQPage structured data (8-10 questions)
- E-E-A-T author signals for medical content (YMYL)
- Welcome hero card with "Try with CFTR" quick-start
- Footer icon text labels on desktop
- Contextual help links on wizard steps
- Skip-to-content accessibility link
- Step transition loading indicator
- Brand color preserved as accent/secondary
- `datePublished`/`dateModified` in structured data

**Defer (v2+):**
- Persistent gene context chip (medium complexity)
- Mobile title footprint reduction
- Native `alert()`/`confirm()` replacement with Vuetify dialogs
- Additional educational docs content pages
- E-E-A-T author credential expansion (needs publication/DOI)

**Anti-features (explicitly do NOT build):** SSR/Nuxt migration, prerender services, product tour libraries, video tutorials, SEO keyword stuffing in app UI, custom color themes, splash screens, social sharing buttons, cookie consent banners, tracking analytics.

### Architecture Approach

All changes integrate at five layers without architectural restructuring. The most significant pattern is the static HTML seed: content placed inside `<div id="app">` is visible to crawlers on initial load, then replaced by Vue's `createApp().mount('#app')` (documented behavior: replaces all innerHTML when root component has a template). The `<noscript>` tag must go OUTSIDE `<div id="app">` to persist after mount. See [ARCHITECTURE.md](./ARCHITECTURE.md) for full integration map.

**Files modified (9):**
1. `index.html` -- seed HTML, meta tags, canonical, robots, OG fix, structured data, title optimization
2. `src/main.ts` -- Vuetify theme primary color change (light + dark)
3. `vite.config.ts` -- PWA manifest `theme_color` update
4. `src/App.vue` -- skip-to-content link, `id="main-content"`, OnboardingCard integration
5. `src/stores/useAppStore.ts` -- `onboardingDismissed` state
6. `src/components/AppFooter.vue` -- docs icon button, optional text labels
7. `src/components/wizard/WizardStepper.vue` -- loading indicator
8. `public/robots.txt` -- sitemap references
9. `docs/.vitepress/config.ts` -- sitemap hostname config

**Files created (3):**
1. `src/components/OnboardingCard.vue` -- first-visit welcome card
2. `public/sitemap.xml` -- hand-authored SPA sitemap (1 URL)
3. `public/og-image.png` -- generated from existing SVG via sharp

### Critical Pitfalls

See [PITFALLS.md](./PITFALLS.md) for all 13 identified pitfalls. Top 5:

1. **Service worker precaches stale `index.html`** -- Existing PWA users will not see new SEO content until they accept the update prompt. Mitigate by switching to `registerType: 'autoUpdate'` for this release (changes are additive, not breaking) or ensuring the update prompt is prominent and tested.

2. **Primary color cascade to 40+ bindings** -- Changing `primary` affects CTAs, filter chips, switches, card headers, progress indicators, and CSS variable references (`AppBar.vue`, `HistoryPanel.vue`). Mitigate by auditing all `color="primary"` usages and selectively moving non-CTA uses to `secondary` or a custom named color.

3. **OG image double failure (relative path + SVG format)** -- Must fix BOTH simultaneously. Convert to PNG via sharp AND use absolute HTTPS URL. Test with Facebook Sharing Debugger and Twitter Card Validator after deployment.

4. **VitePress sitemap collision with SPA sitemap** -- Two separate builds produce two `sitemap.xml` files at different paths. Mitigate by referencing both in `robots.txt` (simpler) or creating a sitemap index file (more proper).

5. **Onboarding triple-modal first run** -- Disclaimer + PWA notification + onboarding card creates hostile UX. Mitigate by sequencing: disclaimer first, then onboarding after acceptance, delay PWA notification by 5+ seconds.

## Implications for Roadmap

Based on dependency analysis, feature priorities, and pitfall risk assessment, the work naturally groups into three phases executed sequentially.

### Phase 1: SEO Foundation

**Rationale:** Nothing else matters if Google cannot see the site. SEO indexing fixes are the highest-impact, lowest-effort changes and have zero dependencies on other work. The app has been live since v1.0 with zero Google indexing -- every day this is not fixed is lost discoverability.

**Delivers:** Googlebot-visible content, sitemap discovery, canonical URL, working OG image for social shares, VitePress sitemap for docs pages.

**Addresses (from FEATURES.md):**
- Static HTML seed in `index.html` (500+ words)
- `<noscript>` fallback
- `sitemap.xml` (SPA) + VitePress sitemap config
- `robots.txt` update with sitemap references
- `<link rel="canonical">` + `<meta name="robots">`
- PNG OG image (1200x630) with absolute URLs
- Optimized `<title>` and `<meta description>`
- Updated structured data (`softwareVersion`, `dateModified`, `screenshot`)
- Cross-link nav in static HTML seed pointing to docs
- App footer docs icon button

**Avoids (from PITFALLS.md):**
- Pitfall 1 (SW stale cache): Consider `autoUpdate` for this deploy
- Pitfall 3 (OG double failure): Fix both path and format simultaneously
- Pitfall 4 (sitemap collision): Reference both sitemaps in robots.txt
- Pitfall 5 (navigateFallback): Add `/sitemap*.xml` and `/robots.txt` to denylist
- Pitfall 8 (FOUC): Add minimal inline styles to seed content
- Pitfall 9 (canonical mismatch): Use consistent trailing slash matching OG URL

### Phase 2: CTA Color System

**Rationale:** The UX audit's #1 recommendation. Single highest-impact visual change (CTA contrast jumps from 2.94:1 to 5.32:1). Should follow Phase 1 so the onboarding card (Phase 3) and skip-link use the new color. This is a 2-file edit (`main.ts` + `vite.config.ts`) but needs careful auditing of the cascade.

**Delivers:** WCAG AA-compliant CTA buttons, clear enabled/disabled distinction, updated stepper colors, professional visual hierarchy separating brand identity from interactive elements.

**Addresses (from FEATURES.md):**
- New primary CTA color (recommended: Teal 700 `#00796B` or Green 800 `#2E7D32`)
- Clear disabled vs. enabled distinction
- Brand color preserved as secondary/accent
- Stepper header color improvement (automatic via Vuetify)

**Avoids (from PITFALLS.md):**
- Pitfall 2 (color cascade): Audit all 40+ `color="primary"` bindings, move non-CTA uses to secondary
- Pitfall 11 (manifest mismatch): Update `theme_color` in `vite.config.ts` in same PR

### Phase 3: UX Polish & Onboarding

**Rationale:** Depends on Phase 2 (onboarding CTA needs the new visible color). These are the differentiators that improve first-time experience and accessibility. Lower priority than SEO and color because the app is functional without them.

**Delivers:** First-time user guidance, accessibility improvements, step transition feedback, desktop footer discoverability.

**Addresses (from FEATURES.md):**
- Welcome hero card with "Try with CFTR" quick-start
- Skip-to-content accessibility link
- Step transition loading indicator (`v-progress-linear`)
- Footer icon text labels on desktop
- Contextual help links on wizard steps (if time permits)

**Avoids (from PITFALLS.md):**
- Pitfall 7 (triple-modal): Sequence onboarding AFTER disclaimer acceptance, delay PWA notification
- Pitfall 12 (footer label mobile break): Desktop-only labels via `d-none d-sm-inline`

### Phase Ordering Rationale

- **Phase 1 before Phase 2:** SEO fixes are the critical path. The site is not indexed. Color is a UX issue that only matters for users who already found the tool.
- **Phase 2 before Phase 3:** The color system must be in place before building components (onboarding card, skip-link) that inherit the primary color. Shipping a welcome card with the muted gray CTA button defeats its purpose.
- **All phases are independently deployable.** Each phase produces a releasable increment. Phase 1 alone would be a meaningful v1.4.0. Phases 2 and 3 could be v1.4.1 and v1.4.2 if needed.
- **Dependency graph is linear and shallow.** No circular dependencies. Phase 1 items are all independent of each other. Phase 2 is a 2-file edit. Phase 3 items are mostly independent except onboarding depends on `useAppStore` extension.

### Research Flags

**Phases likely needing deeper research during planning:**
- **Phase 1 (SEO Foundation):** The Vite build output may be stripping `<head>` meta tags (observed in current `dist/index.html`). A fresh `bun run build` should clarify -- if Vite is misconfigured, may need `vite-plugin-html` investigation. Also: the SW `registerType` change from `'prompt'` to `'autoUpdate'` needs testing to ensure it does not break the existing update flow.
- **Phase 2 (Color System):** The full list of 40+ `color="primary"` bindings needs auditing to decide which shift to secondary. This is implementation research, not design research -- the pattern is well-documented.

**Phases with standard patterns (skip research-phase):**
- **Phase 3 (UX Polish):** All components use standard Vuetify patterns. The onboarding card mirrors the existing `DisclaimerBanner`. Skip-to-content is a 6-line HTML/CSS pattern. `v-progress-linear` is a built-in Vuetify component.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Zero new dependencies. All capabilities verified against existing `package.json`. 8 alternatives evaluated and rejected with clear rationale. |
| Features | HIGH | Based on SEO audit, UX audit, and competitor analysis (Perinatology, GeniE, Omni Calculator). Feature list is grounded in observed deficiencies, not speculation. |
| Architecture | HIGH | Vue mount replacement behavior verified against official docs. All file modification targets verified in codebase. VitePress sitemap config verified including base-path hostname issue (#3863). |
| Pitfalls | HIGH | 13 pitfalls identified from codebase analysis (exact line numbers), Workbox issue tracker, and community post-mortems. SW caching risk is the only one with MEDIUM sub-confidence (needs testing). |

**Overall confidence:** HIGH

### Gaps to Address

- **Vite build stripping `<head>` content:** Current `dist/index.html` appears to be missing meta tags and structured data. This may be a stale build artifact or a Vite configuration issue. Must verify with a fresh `bun run build` before starting Phase 1. If Vite is stripping content, investigate `vite-plugin-html` or Vite's HTML processing configuration.
- **CFTR pre-configured data for quick-start:** The "Try with CFTR" button needs a hardcoded `GeneSearchResult` object matching the gnomAD API response shape. This should be a constant in `src/config/` rather than a live API fetch (which defeats instant demo purpose). The exact shape needs to be captured from a real API response.
- **Color choice final decision:** Research recommends Teal 700 (`#00796B`) or Green 800 (`#2E7D32`). Both pass WCAG AA. Final choice should be validated visually in the running app before committing. The STACK and ARCHITECTURE researchers suggest slightly different colors -- either works, but the team should pick one.
- **OG image content review:** The existing `og-image.svg` content should be reviewed before PNG conversion. If the image references the old brand color, it may need updating to reflect the new primary color (but this creates a dependency between Phase 1 and Phase 2). Recommendation: generate PNG from current SVG in Phase 1, update OG image content in Phase 2 if needed.

## Sources

### Primary (HIGH confidence)
- [Vue.js Application API: app.mount()](https://vuejs.org/api/application.html#app-mount) -- innerHTML replacement behavior
- [Vue 3 Migration: Mount Changes](https://v3-migration.vuejs.org/breaking-changes/mount-changes) -- Vue 3 mount semantics
- [VitePress Sitemap Generation](https://vitepress.dev/guide/sitemap-generation) -- built-in sitemap config
- [VitePress Issue #3863](https://github.com/vuejs/vitepress/issues/3863) -- base path + sitemap hostname
- [Vuetify Theme Configuration](https://vuetifyjs.com/en/features/theme/) -- theme color system
- [Vuetify Progress Linear](https://vuetifyjs.com/en/components/progress-linear/) -- loading indicator
- [Vue.js Accessibility Best Practices](https://vuejs.org/guide/best-practices/accessibility.html) -- skip-to-content pattern
- [sharp API Documentation](https://sharp.pixelplumbing.com/api-output/) -- SVG-to-PNG conversion
- [WCAG 2.2 Contrast Requirements](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html) -- 4.5:1 AA minimum
- [Google JavaScript SEO Basics](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics) -- SPA indexing

### Secondary (MEDIUM confidence)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/) -- contrast ratio calculations
- [WebAIM Skip Navigation](https://webaim.org/techniques/skipnav/) -- skip-to-content pattern
- [Open Graph Protocol](https://ogp.me/) -- og:image format requirements
- [Sitemaps XML Format](https://www.sitemaps.org/protocol.html) -- sitemap index specification
- [FAQPage Structured Data](https://developers.google.com/search/docs/appearance/structured-data/faqpage) -- rich results
- [Workbox Issue #1528](https://github.com/GoogleChrome/workbox/issues/1528) -- stale index.html caching
- [SPA SEO Strategies](https://www.copebusiness.com/technical-seo/spa-seo-strategies/) -- SPA-specific SEO patterns
- [OG Image Sizes Guide](https://www.krumzi.com/blog/open-graph-image-sizes-for-social-media-the-complete-2025-guide) -- format and dimension requirements

### Tertiary (LOW confidence)
- Competitor analysis (Perinatology, GeniE, Omni Calculator) -- feature comparison observations, not verified feature lists
- SEO title keyword priority -- judgment call between brand recognition ("gnomAD") and keyword leading ("Carrier Frequency Calculator")

### Project-Internal References
- `.planning/SEO-REPORT.md` -- comprehensive SEO audit with competitor deep-dive (2026-02-23)
- `.planning/UI-UX-AUDIT.md` -- 12-category UX audit scoring 7.3/10 overall (2026-02-23)

---
*Research completed: 2026-02-23*
*Ready for roadmap: yes*
