# Feature Landscape: SEO & UX Polish

**Domain:** Medical/scientific SPA tool -- SEO discoverability and UX polish
**Project:** gnomAD Carrier Frequency Calculator (v1.3 -> v1.4)
**Researched:** 2026-02-23
**Overall Confidence:** HIGH (verified against existing codebase, competitor analysis, SEO audit findings, UX audit findings, and current web standards)

---

## Context

This research focuses on features needed for SEO indexing and UX polish for an existing Vue 3/Vuetify 3 SPA tool. The app is currently NOT indexed by Google (empty `<body>` in HTML), CTA buttons use a muted `#a09588` color that looks disabled, there is no first-time user onboarding, and the app/docs sites are poorly cross-linked. Competitors (Perinatology, GeniE, Omni Calculator) all use static HTML, 1200-3500 words of content, and structured data.

### What Already Exists

- `@unhead/vue` for meta tag management (not actively used in app shell)
- `index.html` with WebApplication + FAQPage structured data (6 FAQ items)
- VitePress docs site at `/docs/` with 17 pages (pre-rendered HTML)
- PWA with offline support via `vite-plugin-pwa`
- Disclaimer modal on first visit via `useAppStore`
- Footer with icon buttons (GitHub, disclaimer, data sources, methodology, FAQ, about, logs)
- Dark/light theme toggle
- `robots.txt` with only `Allow: /` (no sitemap reference)
- OG tags using relative SVG path (broken on all social platforms)

### What Is Missing

- Static HTML content in `<body>` for crawlers (currently `<div id="app"></div>`)
- `sitemap.xml` for either app or docs
- `<link rel="canonical">` tag
- `<meta name="robots">` directive
- PNG OG image (currently SVG, unsupported by social platforms)
- Cross-links between app and docs site
- Any onboarding for first-time users
- Distinct CTA color (primary `#a09588` makes buttons look disabled)

---

## Table Stakes

Features users/crawlers expect. Missing means the product is invisible to search engines or confusing to first-time users.

### SEO: Fix Indexing (CRITICAL)

| Feature | Why Expected | Complexity | Dependencies | Notes |
|---------|--------------|------------|--------------|-------|
| **Static HTML seed in `<div id="app">`** | Google sees empty body; SPA rendering is unreliable for low-crawl-priority sites | Low | None -- edit `index.html` | Place keyword-rich content inside `#app` div; Vue replaces on mount. Include H1, feature list, "How it works" section. Must reach 500+ words to compete. |
| **`<noscript>` fallback** | Crawlers that skip JS need basic content | Low | Pairs with HTML seed | Brief description + link to docs site |
| **`sitemap.xml`** | Google cannot efficiently discover pages without one | Low | List of all app + docs URLs | Place in `public/sitemap.xml` with both app root and all docs pages |
| **`robots.txt` with sitemap reference** | Current `robots.txt` has no sitemap pointer | Low | Depends on sitemap existing | Add `Sitemap: https://gnomad-carrier-frequency.kidney-genetics.org/sitemap.xml` |
| **`<link rel="canonical">`** | Prevents duplicate content issues; required for proper indexing | Low | None -- add to `<head>` | `https://gnomad-carrier-frequency.kidney-genetics.org/` |
| **`<meta name="robots" content="index, follow">`** | Explicit indexing directive for crawlers | Low | None -- add to `<head>` | Standard practice |
| **PNG OG image (1200x630)** | SVG OG images are not rendered by Facebook, LinkedIn, Twitter/X, Slack, Discord | Low | Need to generate PNG from existing SVG or create new | Use `sharp` (already in devDependencies) to convert at build time, or create a static PNG. Keep under 300KB. |
| **Absolute URLs for OG tags** | Current `./og-image.svg` relative path is unreliable across platforms | Low | Depends on PNG creation | Change to full `https://...` URL |
| **VitePress sitemap generation** | Docs pages are pre-rendered HTML that Google can index immediately -- need sitemap to discover them | Low | Add `sitemap` config to `docs/.vitepress/config.ts` | VitePress has built-in sitemap support: `sitemap: { hostname: '...' }` |

**Confidence:** HIGH -- all items verified against Google's own documentation, competitor analysis, and current web standards.

### SEO: On-Page Optimization

| Feature | Why Expected | Complexity | Dependencies | Notes |
|---------|--------------|------------|--------------|-------|
| **Optimized title tag** | Current title leads with "gnomAD" which means nothing to most searchers. Should lead with target keyword. | Low | None | Change to: "Carrier Frequency Calculator -- gnomAD Population Data" |
| **Optimized meta description** | Current is good but missing differentiators ("free", "real population data", "multiple ancestries") | Low | None | Add "free" modifier and key differentiators |
| **Updated WebApplication structured data** | Current schema missing `datePublished`, `dateModified`, `screenshot` fields | Low | Depends on PNG OG image | Add version, dates, screenshot URL |
| **Internal links in static HTML seed** | Static content must link to docs pages so Google discovers them on first crawl | Low | Depends on HTML seed content | Link to 3-5 key docs pages from the seed content |

**Confidence:** HIGH -- based on SEO audit findings and competitor comparison matrix.

### UX: CTA Color System

| Feature | Why Expected | Complexity | Dependencies | Notes |
|---------|--------------|------------|--------------|-------|
| **Distinct primary CTA color** | Current `#a09588` (muted warm gray) makes CONTINUE buttons look disabled. UX audit scored Color & Contrast 6.5/10. | Low | Edit Vuetify theme in `main.ts` | Recommend a saturated, accessible blue or teal (e.g., `#1976D2` or `#00897B`). Keep warm gray as brand/secondary accent. Must pass WCAG AA contrast on both white and dark backgrounds. |
| **Clear disabled vs. enabled distinction** | Users cannot tell if CONTINUE is clickable -- enabled and disabled states are nearly identical | Low | Depends on new primary color | Enabled = saturated color; Disabled = 30% opacity of that color. Use `aria-disabled` pattern for better a11y. |
| **Stepper header color update** | Stepper circles use same muted primary, reducing visual hierarchy | Low | Depends on new primary color | Completed steps should use the new primary; current step should be visually prominent |

**Confidence:** HIGH -- directly observed in UX audit; confirmed by CTA design best practices research.

---

## Differentiators

Features that set the product apart. Not expected, but create competitive advantage for ranking and user retention.

### SEO: Content & Authority

| Feature | Value Proposition | Complexity | Dependencies | Notes |
|---------|-------------------|------------|--------------|-------|
| **Cross-link: App footer "Docs" icon** | Persistent link from every app page view to docs; passes link equity to pre-rendered content | Low | Add icon button to `AppFooter.vue` | Use `mdi-book-open-variant` icon alongside existing footer icons. Links to `/docs/`. Natural fit with existing icon pattern. |
| **Cross-link: Docs "Open Calculator" CTAs in content** | Docs pages currently have only one nav-bar link back to app. Adding contextual CTAs within page content (e.g., "Try calculating CFTR carrier frequency") increases click-through. | Low | Edit VitePress markdown pages | Place 1-2 contextual CTA links per docs page, not just the navbar button |
| **Cross-link: Static HTML nav to docs** | Links in the HTML seed content create crawl paths Google follows on first visit, before JS renders | Low | Depends on HTML seed | Include `<nav>` with links to "What is Carrier Frequency?", "Methodology", "FAQ", "Getting Started" |
| **Expanded FAQPage structured data** | Already have 6 FAQ items in schema. Competitors with FAQ rich results (Omni Calculator) get enhanced Google listings. Could expand to 8-10 questions. | Low | Edit `index.html` JSON-LD | Add questions about: specific diseases (CFTR, SMA), data freshness, clinical use, methodology comparison vs GeniE |
| **E-E-A-T author signals** | Google prioritizes content from recognized experts for medical topics (YMYL). Adding author credentials builds trust. | Low | Add to structured data + static content | Add `author` with credentials (MD, PhD affiliation). Already have Bernt Popp as author; add institution and credentials. |
| **`datePublished` and `dateModified`** | Signals content freshness to Google. Competitors with recent dates rank higher. | Low | Auto-update in build pipeline or manual | Embed in both structured data and visible static content |

**Confidence:** MEDIUM-HIGH -- cross-linking patterns verified from competitor analysis and SEO best practices. E-E-A-T importance for medical content confirmed by Google's own YMYL guidelines.

### UX: First-Time Onboarding

| Feature | Value Proposition | Complexity | Dependencies | Notes |
|---------|-------------------|------------|--------------|-------|
| **Welcome hero card on Step 1** | Replace the bare gene search with a brief welcome card showing what the tool does and why to use it. Displayed only for first-time users (before any gene search). 2-3 sentences + "Try with CFTR" quick-start button. | Medium | `useAppStore` already tracks `disclaimerAcknowledged`; add `hasUsedApp` flag | Card disappears after first gene search. Stored in localStorage via Pinia persistence. Should NOT block the gene search input -- display above or alongside it. |
| **"Try with CFTR" quick-start** | One-click demo with a well-known gene dramatically reduces time-to-value. CFTR (cystic fibrosis) is universally recognized by genetic counselors. | Medium | Depends on welcome card; requires programmatic gene selection | Pre-fill the gene search and trigger selection. Show as a prominent button on the welcome card. |
| **Contextual help links on wizard steps** | Small "Learn more" links on each step pointing to relevant docs pages. Step 1 -> "What is carrier frequency?", Step 3 -> "Methodology", Step 4 -> "How to interpret results". | Low | Requires docs pages to exist at target URLs (they do) | Use `text-caption` links below step descriptions. Non-intrusive but discoverable. |
| **Footer icon text labels (desktop)** | Current footer uses icon-only buttons (data sources, methodology, FAQ, about, logs). First-time users cannot discover these features. | Low | Edit `AppFooter.vue` | Add text labels below or beside icons on sm+ screens. Keep icon-only on mobile (already correct via overflow menu). |

**Confidence:** HIGH for welcome card and quick-start patterns (standard onboarding UX). MEDIUM for contextual help links (value depends on docs content quality).

### UX: Visual Polish

| Feature | Value Proposition | Complexity | Dependencies | Notes |
|---------|-------------------|------------|--------------|-------|
| **Brand color as secondary, not primary** | Keep `#a09588` warm gray as brand accent (AppBar logo hover, section dividers, subtle backgrounds) while using a saturated color for all interactive elements | Low | Part of CTA color system change | Update Vuetify theme: `primary` becomes the new CTA color; add `brand: '#a09588'` as custom color |
| **Persistent gene context chip** | After gene selection, show a small chip below stepper ("CFTR \| gnomAD v4.1") on Steps 2-4 so users never lose context | Medium | Access wizard state from new component | Reduces cognitive load; users do not have to navigate back to confirm their selection |
| **Reduced mobile title footprint** | Full title wraps to 3 lines on mobile, consuming 25%+ of viewport | Low | Edit `App.vue` conditional rendering | On mobile (xs), hide the `<h1>` since "gCFCalc" in AppBar already identifies the app |
| **Replace native alert/confirm dialogs** | Template import errors and template reset use native `alert()`/`confirm()` which break the visual language | Medium | Create reusable Vuetify confirm dialog component | Use `v-dialog` with confirm/cancel actions for consistency |

**Confidence:** HIGH -- all directly observed in UX audit screenshots.

---

## Anti-Features

Features to explicitly NOT build. Common mistakes when adding SEO and UX polish.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Server-side rendering (SSR) / Nuxt migration** | Massive architectural change for a single-page calculator tool. The app has one indexable route (`/`). Static HTML seed content in `index.html` achieves 90% of SSR's SEO benefit at 1% of the effort. The docs site (VitePress) already handles the content-heavy pages with pre-rendered HTML. | Use static HTML seed in `index.html` + VitePress for content pages. |
| **Prerender service (Prerender.io, Rendertron)** | Adds infrastructure complexity and cost for a tool with one page. Dynamic rendering is for sites with hundreds of JS-rendered routes. | Static HTML seed is sufficient for a single-page app. |
| **Full product tour library (Shepherd, Intro.js)** | Genetic counselors are domain experts, not consumer users. A multi-step tooltip tour is patronizing and adds 15-40KB bundle size. | Simple welcome card with quick-start button. One-time, non-intrusive. |
| **Video tutorials or animated walkthroughs** | High production cost, accessibility burden (captions, audio descriptions), maintenance as UI changes. Target audience learns by doing. | Text-based "Getting Started" in docs (already exists). Quick-start button for hands-on learning. |
| **SEO-focused keyword stuffing in app UI** | Adding visible "SEO text" to the running application degrades the professional tool experience for actual users. | Put SEO content in static HTML seed (replaced by Vue on mount) and in VitePress docs pages. Keep the app UI clean. |
| **Multiple color themes or color customization** | Scope creep. Light/dark toggle already exists and works well. Custom themes add testing burden and distract from core functionality. | Stick with light/dark. Fix the CTA color within the existing theme system. |
| **Elaborate loading/splash screen** | Adds perceived wait time. The app loads in ~2.4s FCP which is acceptable. A splash screen makes it feel slower. | Keep current approach: app shell renders quickly, wizard appears when ready. |
| **Social sharing buttons in the app** | Medical professionals share tools via institutional channels (email, Slack), not social media buttons. Social buttons look unprofessional in clinical tools. | Fix OG image so that when professionals DO share links, the preview renders correctly. |
| **Cookie consent banner** | The app uses only localStorage for user preferences (no tracking cookies, no analytics cookies). A cookie banner would be both unnecessary and annoying. | If analytics are added later, revisit. For now, localStorage-only does not require consent under GDPR. |
| **Google Analytics or tracking scripts** | Adds privacy concerns for a medical tool. Genetic counselors work with sensitive patient contexts. Third-party tracking undermines trust. | Use privacy-respecting analytics only if needed (e.g., Plausible, or none at all). Rely on Google Search Console for search performance data. |

---

## Feature Dependencies

```
CRITICAL PATH (SEO Indexing):
  Static HTML seed in index.html
    |
    +-- Internal links to docs (in seed content)
    +-- <noscript> fallback
    +-- <link rel="canonical">
    +-- <meta name="robots">

  sitemap.xml (independent)
    |
    +-- robots.txt update (depends on sitemap)

  VitePress sitemap config (independent)

  PNG OG image (independent)
    |
    +-- Absolute OG URLs (depends on PNG)
    +-- Updated structured data screenshot (depends on PNG)

CTA COLOR SYSTEM:
  New primary color in Vuetify theme (main.ts)
    |
    +-- Stepper header color (automatic via Vuetify theming)
    +-- Disabled state distinction (automatic via Vuetify theming)
    +-- Brand color as secondary (same edit)

ONBOARDING:
  Welcome hero card
    |
    +-- "Try with CFTR" quick-start (depends on card)
    +-- hasUsedApp localStorage flag (depends on card)

  Footer icon labels (independent)
  Contextual help links (independent, but more valuable with good docs content)

CROSS-LINKING:
  App footer "Docs" icon (independent)
  Docs contextual CTAs (independent, edit markdown)
  Static HTML nav to docs (part of HTML seed)
```

### Build Order Recommendation

1. **SEO Indexing fixes** -- everything else is pointless if Google cannot see the site
2. **CTA color system** -- single highest-impact UX change, low effort
3. **Cross-linking** -- connects app to its pre-rendered content
4. **On-page SEO optimization** -- title, meta, structured data refinement
5. **First-time onboarding** -- welcome card + quick-start
6. **Visual polish** -- gene context chip, mobile title, native dialog replacement

---

## MVP Recommendation

### Must-Have for This Milestone

These features address the two critical problems (not indexed, CTA looks disabled):

1. **Static HTML seed content** in `index.html` (500+ words, keyword-rich, with internal links)
2. **`sitemap.xml`** + **`robots.txt`** update + **canonical URL** + **robots meta**
3. **PNG OG image** with absolute URLs
4. **New CTA primary color** (saturated, accessible, distinct from disabled state)
5. **App-to-docs cross-link** (footer icon)
6. **VitePress sitemap configuration**

### Should-Have for This Milestone

High-value, low-effort enhancements:

7. **Optimized title and meta description**
8. **Updated structured data** (dates, version, screenshot)
9. **Welcome hero card** with "Try with CFTR" quick-start
10. **Footer icon text labels** on desktop
11. **Docs-to-app contextual CTAs** in page content

### Defer to Future Milestones

- Persistent gene context chip (medium complexity, UX improvement not SEO)
- Mobile title reduction (low impact relative to SEO fixes)
- Native dialog replacement (cosmetic, not blocking)
- E-E-A-T author credential expansion (depends on publication/DOI)
- Additional educational docs content pages (content creation, not development)

---

## Competitor Feature Comparison

| Feature | This App (Current) | This App (After Milestone) | Perinatology (#1) | GeniE/gnomAD (#2) | Omni Calculator (#3) |
|---------|-------------------|---------------------------|--------------------|--------------------|----------------------|
| Google indexed | NO | YES (static HTML seed) | Yes (static HTML) | Yes (SSR) | Yes (SSR) |
| Static/crawlable content | 0 words | 500+ words | ~500 words | ~1200 words | ~3000 words |
| Sitemap | No | Yes | Yes | Yes | Yes |
| Canonical URL | No | Yes | Yes | Yes | Yes |
| FAQPage schema | Yes (6 items) | Yes (expanded) | No | No | Yes (5 items) |
| OG image (PNG) | No (SVG) | Yes (PNG 1200x630) | N/A | Yes | Yes |
| Internal cross-linking | None | App<->Docs bidirectional | Deep (calculator network) | Deep (gnomAD ecosystem) | Massive (thousands) |
| CTA visual clarity | Poor (muted gray) | Clear (saturated color) | Basic HTML form | Standard buttons | Green CTAs |
| First-time onboarding | None (disclaimer only) | Welcome card + quick-start | None | Blog-style explanation | Extensive educational text |
| Real gnomAD data | YES | YES | No | YES | No |
| Clinical text generation | YES | YES | No | No | No |
| Multi-population | YES | YES | No | YES | No |

---

## Sources

### SEO & Indexing
- [SPA SEO Strategies 2026](https://www.copebusiness.com/technical-seo/spa-seo-strategies/) -- SPA-specific SEO challenges and solutions
- [Prerendering Vue SPAs for SEO](https://nuxtseo.com/learn-seo/vue/spa/prerendering) -- Vue-specific prerendering approaches
- [Google JavaScript SEO Basics](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics) -- Official Google guidance on JS rendering
- [VitePress Sitemap Generation](https://vitepress.dev/guide/sitemap-generation) -- Built-in sitemap support documentation
- [FAQPage Structured Data](https://developers.google.com/search/docs/appearance/structured-data/faqpage) -- Google's FAQPage rich result requirements
- [Schema.org Health and Medical Types](https://schema.org/docs/meddocs.html) -- Medical schema best practices

### OG Images
- [OG Image Sizes 2025 Guide](https://www.krumzi.com/blog/open-graph-image-sizes-for-social-media-the-complete-2025-guide) -- Format and dimension requirements
- [OG Image Tips 2025](https://myogimage.com/blog/og-image-tips-2025-social-sharing-guide) -- PNG vs SVG, compression, platform compatibility

### CTA & Button Design
- [Disabled Buttons in UI](https://uxplanet.org/disabled-buttons-in-user-interface-4dafda3e6fe7) -- Active vs disabled state patterns
- [CTA Best Practices for UX & Accessibility](https://www.portent.com/blog/content/cta-best-practices-for-ux-design-web-accessibility-w-examples.htm) -- Color, contrast, and accessibility
- [Button States Explained](https://www.uxpin.com/studio/blog/button-states/) -- How to design distinct button states
- [Why You Should Not Gray Out Disabled Buttons](https://uxmovement.com/buttons/why-you-shouldnt-gray-out-disabled-buttons/) -- Use opacity of primary color instead

### Onboarding
- [Onboarding UX Patterns](https://www.appcues.com/blog/user-onboarding-ui-ux-patterns) -- Welcome messages, product tours, interactive learning
- [Guide to Onboarding UX](https://www.toptal.com/designers/product-design/guide-to-onboarding-ux) -- First impressions and activation patterns
- [Best User Onboarding Examples](https://www.appcues.com/blog/the-10-best-user-onboarding-experiences) -- Real-world patterns from successful products

### Competitor Analysis
- [GeniE Genetic Prevalence Estimator](https://gnomad.broadinstitute.org/news/2024-06-genie/) -- Broad Institute's competing tool
- [Omni Calculator Allele Frequency](https://www.omnicalculator.com/biology/allele-frequency) -- SEO-optimized competitor with FAQPage schema
- [Perinatology Hardy-Weinberg Calculator](https://www.perinatology.com/calculators/Hardy-Weinberg.htm) -- #1 ranked static HTML competitor

### Project-Internal References
- `.planning/SEO-REPORT.md` -- Comprehensive SEO audit with competitor deep-dive (2026-02-23)
- `.planning/UI-UX-AUDIT.md` -- 12-category UX audit scoring 7.3/10 overall (2026-02-23)
