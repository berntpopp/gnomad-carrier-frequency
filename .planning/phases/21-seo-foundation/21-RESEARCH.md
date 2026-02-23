# Phase 21: SEO Foundation - Research

**Researched:** 2026-02-23
**Domain:** SEO infrastructure — static HTML seed, meta tags, Open Graph, structured data, sitemaps, cross-linking
**Confidence:** HIGH (most findings verified against official documentation)

## Summary

This phase adds discoverability infrastructure to an existing Vue 3 SPA hosted at `https://gnomad-carrier-frequency.kidney-genetics.org/` with a VitePress docs site at `/docs/`. The app already has a foundation: OG tags exist in `index.html`, a basic `robots.txt` is in place, `WebApplication` + `FAQPage` JSON-LD is implemented, and the current OG image is an SVG (which does NOT work for social sharing). The phase upgrades, expands, and completes that foundation.

The primary technical challenge is the static HTML seed content in `index.html`. Vue 3 **replaces the innerHTML** of the `#app` element on mount — this is the intended behavior. Static HTML placed inside `<div id="app">` is visible to crawlers and users before JavaScript executes, then Vue takes over. This is an established SEO technique for SPAs that cannot use SSR or prerendering, and it works correctly with Vue 3's mount behavior.

The VitePress docs site needs sitemap generation (built-in, just needs `sitemap.hostname` configuration), and the app side needs a hand-crafted `sitemap.xml` in `/public/` since it is a single-page app with one URL. The current SVG OG image must be replaced with a PNG — SVG is universally unsupported by social media platforms for OG images. FAQPage rich results are restricted by Google (since August 2023) to authoritative government/health sites, but FAQPage schema still improves featured snippet eligibility, so it is still worth implementing.

**Primary recommendation:** Replace the SVG OG image with a PNG immediately (it is the highest-impact quick win), then layer in static HTML seed content, expanded FAQPage schema, and cross-linking infrastructure.

## Standard Stack

No additional npm packages are required for this phase. All work is HTML, JSON-LD, CSS, and VitePress configuration.

### Core
| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| VitePress sitemap | built-in (v2.0-alpha.16) | Auto-generate docs sitemap.xml | Zero-config, just add `sitemap.hostname` to VitePress config |
| JSON-LD (`application/ld+json`) | spec | Structured data delivery | Google's preferred method; decoupled from visible HTML |
| PNG for OG image | static file | Social sharing preview image | SVG not supported by Twitter/X, LinkedIn, Facebook, Slack |
| `sharp` | already in devDeps (^0.34.5) | PNG OG image creation from SVG | Already available for scripted conversion |

### Supporting
| Tool | Version | Purpose | When to Use |
|------|---------|---------|-------------|
| `sharp` (devDep) | ^0.34.5 | Convert existing SVG to PNG | Convert `og-image.svg` to `og-image.png` 1200x630 |
| Google Rich Results Test | web tool | Validate structured data | After implementing JSON-LD changes |
| Facebook Sharing Debugger | web tool | Validate OG tags and force cache refresh | After updating OG image |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-written sitemap.xml in public/ | vite-plugin-sitemap | vite-plugin-sitemap adds a dev dependency for a single static URL — not worth it; a static file is simpler and correct |
| VitePress built-in sitemap | Manual sitemap XML | Built-in is zero-maintenance and auto-includes all doc pages |
| PNG OG image | Keep SVG | SVG is not supported by any major social platform for OG images — not an option |

**Installation:** No new packages needed. `sharp` is already in devDependencies.

## Architecture Patterns

### Recommended Project Structure

Files created or modified in this phase:

```
index.html                         # static HTML seed + expanded meta + structured data
public/
├── og-image.png                   # NEW: 1200x630 PNG (replaces functional role of og-image.svg)
├── og-image.svg                   # KEEP: source file for design, but remove from og:image tags
├── robots.txt                     # UPDATE: add Sitemap directive
└── sitemap.xml                    # NEW: app sitemap (single URL)
docs/
├── .vitepress/
│   └── config.ts                  # UPDATE: add sitemap.hostname
└── public/
    └── og-image.png               # SYMLINK or COPY: same OG image as app (shared branding)
src/components/
└── AppFooter.vue                  # UPDATE: add Docs link button
```

### Pattern 1: Static HTML Seed in `#app` Div

**What:** Place full landing page HTML inside `<div id="app">` in `index.html`. Vue mounts and replaces this content when JavaScript executes. Crawlers and users with slow connections see meaningful content immediately.

**When to use:** SPAs that cannot use SSR or prerendering but need crawler-visible content.

**How it works:** Vue 3's `createApp().mount('#app')` replaces the innerHTML of `#app` with the rendered component tree. The static HTML is visible during the window between page load and JS execution — exactly what crawlers need.

**Example:**
```html
<!-- index.html body -->
<body>
  <div id="app">
    <!-- Static seed: visible to crawlers and users before Vue mounts -->
    <header style="...">
      <nav>
        <a href="/">Calculator</a>
        <a href="/docs/">Documentation</a>
        <a href="#faq">FAQ</a>
      </nav>
    </header>
    <main>
      <h1>gnomAD Carrier Frequency Calculator</h1>
      <p>A tool for genetic counselors...</p>
      <!-- 500+ words of content -->
      <section id="faq">
        <h2>Frequently Asked Questions</h2>
        <!-- mini FAQ: 3-5 Q&As -->
      </section>
    </main>
  </div>
  <script type="module" src="/src/main.ts"></script>
</body>
```

**CSS approach:** Use inline `<style>` block in `<head>` for seed content styling — no external stylesheet dependency, no flash of unstyled content, and no style conflicts with Vuetify once Vue mounts. Vuetify injects its own styles and overrides the seed styles automatically.

### Pattern 2: JSON-LD Structured Data in `<head>`

**What:** Structured data in `<script type="application/ld+json">` tags in `<head>`. Decoupled from visible HTML so changes to one don't break the other.

**When to use:** Always for structured data — Google's preferred method over microdata or RDFa.

**Example:**
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      "name": "gnomAD Carrier Frequency Calculator",
      "url": "https://gnomad-carrier-frequency.kidney-genetics.org/",
      "applicationCategory": "HealthApplication",
      "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" }
    },
    {
      "@type": "FAQPage",
      "inLanguage": "en",
      "mainEntity": [...]
    },
    {
      "@type": "FAQPage",
      "inLanguage": "de",
      "mainEntity": [...]
    }
  ]
}
</script>
```

**Note on FAQPage bilingual strategy:** Use two separate `FAQPage` objects in the `@graph` array — one `"inLanguage": "en"` and one `"inLanguage": "de"`. The `inLanguage` property is inherited from `CreativeWork` and is valid on `FAQPage`. This is the correct schema.org approach for same-page bilingual content.

### Pattern 3: VitePress Sitemap Configuration

**What:** VitePress built-in sitemap generation, configured with hostname.

**When to use:** For the docs site. NOT for the Vue SPA (different mechanism).

```typescript
// docs/.vitepress/config.ts
export default defineConfig({
  title: 'gnomAD Carrier Frequency Docs',
  base: '/docs/',
  sitemap: {
    // Must include the base path in hostname (VitePress known issue #3863)
    hostname: 'https://gnomad-carrier-frequency.kidney-genetics.org/docs/',
    lastmodDateOnly: false,
    transformItems: (items) => {
      // All items auto-populated from markdown files
      return items
    }
  },
  lastUpdated: true, // Enables <lastmod> tags in sitemap
  // ... rest of config
})
```

**Known issue:** VitePress does not automatically append `base` to sitemap URLs. You must include the base path directly in `hostname` (verified: GitHub issue #3863). Since this site uses a custom domain with `base: '/docs/'`, set `hostname: 'https://gnomad-carrier-frequency.kidney-genetics.org/docs/'`.

### Pattern 4: App Sitemap (Static File)

**What:** A hand-crafted `sitemap.xml` placed in `/public/` (copied to dist root at build time).

**When to use:** For SPAs with a fixed set of URLs (in this case, exactly one URL).

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://gnomad-carrier-frequency.kidney-genetics.org/</loc>
    <lastmod>2026-02-23</lastmod>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
```

### Pattern 5: robots.txt with Sitemap Directives

```
User-agent: *
Allow: /

Sitemap: https://gnomad-carrier-frequency.kidney-genetics.org/sitemap.xml
Sitemap: https://gnomad-carrier-frequency.kidney-genetics.org/docs/sitemap.xml
```

Both sitemaps are declared in the app's robots.txt. Google will discover both sitemap locations.

### Pattern 6: OG Image — PNG via Sharp

The existing `og-image.svg` is well-designed but SVG is unsupported for OG images. Convert to PNG using the already-available `sharp` devDependency.

```typescript
// scripts/convert-og-image.ts (run once, commit output)
import sharp from 'sharp'
import { readFileSync } from 'fs'

const svg = readFileSync('./public/og-image.svg')
await sharp(svg)
  .resize(1200, 630)
  .png()
  .toFile('./public/og-image.png')
```

Run: `npx tsx scripts/convert-og-image.ts`

Then update `index.html` OG tags to reference `./og-image.png`.

**The context decision calls for a "stylized screenshot" showing the actual product.** The existing SVG is a text/logo design, not a screenshot. The planner must decide: create a screenshot-style PNG from scratch (requires design work / screenshot capture), or use the converted SVG-to-PNG as a placeholder and note that it does not meet the "screenshot" intent. The screenshot approach (using Playwright, which is already in devDeps) is possible but needs a separate task.

### Pattern 7: Deep Links from VitePress Docs to App

The URL state composable (`useUrlState`) accepts `?gene=CFTR&step=1` query parameters. Deep links from docs should use these.

```markdown
<!-- docs/use-cases/carrier-screening.md -->
[Try with CFTR →](https://gnomad-carrier-frequency.kidney-genetics.org/?gene=CFTR&step=1)
```

Valid URL parameters (from `useUrlState.ts`):
- `gene`: Gene symbol (e.g., `CFTR`)
- `step`: Wizard step (1-4)
- `status`: Index status (`heterozygous`, `affected`)
- `source`: Frequency source (`gnomad`, `literature`)

### Anti-Patterns to Avoid

- **SVG for OG image:** Twitter/X, LinkedIn, Facebook, Slack all refuse SVG — users see a broken preview card or fallback image.
- **Content in `<noscript>` only:** Google can render JavaScript and may not use noscript content; the seed content must be in the real DOM.
- **`display:none` on seed content:** Google may ignore hidden content for indexing. Content must be visually visible (not hidden).
- **Mixing canonical + noindex:** Contradictory signals — Google may drop the page. Use `rel="canonical"` only, no `noindex` on the primary URL.
- **hreflang on this site:** The app has one URL serving both English and German content dynamically — hreflang is not applicable without separate language URLs. Skip it; the bilingual FAQPage schema handles language targeting instead.
- **VitePress sitemap without base path in hostname:** Produces incorrect sitemap URLs. Must include base path in hostname value directly.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Docs sitemap.xml | Custom build script | VitePress built-in `sitemap.hostname` | Zero lines of code, auto-updates with every docs page |
| PNG from SVG | ImageMagick / manual export | `sharp` (already in devDeps) | One-line conversion, reproducible, already available |
| Structured data validation | Manual JSON checking | Google Rich Results Test (web tool) | Catches schema errors that JSON validators miss |
| OG tag cache refresh | Wait for social platforms | Facebook Sharing Debugger, Twitter Card Validator | Force immediate cache invalidation after deploy |

**Key insight:** This phase is primarily HTML and configuration work. Resist adding npm packages. The only tool needed beyond what's installed is the `sharp` script for PNG conversion (one-time use).

## Common Pitfalls

### Pitfall 1: SVG OG Image Silently Fails

**What goes wrong:** Social platforms like Twitter/X, LinkedIn, and Facebook don't render SVG OG images. They either show a blank preview card or the site's favicon as fallback. The `og:image` meta tag points to `./og-image.svg` in the current codebase.

**Why it happens:** SVG is vector-based and requires browser rendering; social crawlers use simplified image fetchers that only handle raster formats.

**How to avoid:** Replace `og:image` reference with `og-image.png` (1200x630). The SVG can remain as a source file.

**Warning signs:** Share the URL to Slack/Twitter/LinkedIn and check the preview card.

### Pitfall 2: FAQPage Rich Results Are Restricted

**What goes wrong:** Google restricted FAQ rich results (expandable questions in search) to authoritative government/health sites in August 2023. This calculator is not a government or established health authority site, so it will NOT get FAQ rich result cards.

**Why it happens:** Google reduced FAQ rich results to combat spam and keyword stuffing.

**How to avoid:** Do not optimize expecting FAQ rich results panels. The value of FAQPage schema is still real — it improves featured snippet eligibility and helps Google understand page content. Implement the schema, but don't expect the visual rich result panel.

**Warning signs:** If using Google Rich Results Test, it will validate the schema but may indicate the site is not eligible for rich results display.

### Pitfall 3: Static HTML Seed Content Flashes or Conflicts with Vuetify

**What goes wrong:** Users see the static HTML landing page briefly before Vue mounts. If styled inconsistently with the app's Material Design theme, this creates a jarring visual flash. Alternatively, if seed content uses class names that Vuetify reuses, there may be style conflicts.

**Why it happens:** Vue mounts asynchronously after the JavaScript bundle loads.

**How to avoid:**
- Use inline CSS (not external stylesheet) for seed styles to prevent additional HTTP requests
- Style the seed content to look intentionally like a landing page — not a broken version of the app
- Use generic class names prefixed with `seed-` to avoid Vuetify conflicts
- Keep colors consistent with the app's `#a09588` brand palette

**Warning signs:** Users report seeing two different visual states on load; Vuetify CSS overriding seed styles in visible ways.

### Pitfall 4: VitePress Sitemap Base Path Missing

**What goes wrong:** VitePress generates sitemap URLs without the base path (e.g., `https://example.org/page` instead of `https://example.org/docs/page`).

**Why it happens:** VitePress does not automatically append `base` to `sitemap.hostname`. This is a known issue (GitHub issue #3863) and will not be auto-fixed (it would be a breaking change).

**How to avoid:** Set `sitemap.hostname` to `'https://gnomad-carrier-frequency.kidney-genetics.org/docs/'` — include the `/docs/` in the hostname value itself.

**Warning signs:** Inspect the generated `sitemap.xml` after build and verify URLs include `/docs/`.

### Pitfall 5: OG Description Truncation

**What goes wrong:** OG descriptions are truncated at approximately 200 characters by most social platforms. Long descriptions get cut mid-sentence.

**Why it happens:** Platform display limits.

**How to avoid:** Keep `og:description` under 155 characters for Twitter, 200 for Facebook/LinkedIn. Write the most important information first.

### Pitfall 6: Seed Content Word Count

**What goes wrong:** The success criteria requires 500+ words of seed content. Rushed implementations fall short.

**Why it happens:** Underestimating word count needed for headlines, intro, feature bullets, and FAQ Q&A pairs.

**How to avoid:** Plan explicitly for 500+ words. An intro (100w) + 4 feature sections (50w each) + 3-5 FAQ Q&As (50-100w each) reaches 500+ words comfortably. The bilingual FAQ items in the JSON-LD structured data do NOT count toward the visible content word count.

### Pitfall 7: WebApplication Schema Missing Required Properties

**What goes wrong:** Google's software app structured data requires `name`, `offers`, and at least `aggregateRating` or `review` to be eligible for rich results.

**Why it happens:** The current schema has `offers` but lacks any rating/review. Without both, the WebApplication schema will not trigger rich results.

**How to avoid:** Since there is no user rating system, either (a) accept that WebApplication rich results won't display but keep the schema for semantic value, or (b) add a self-authored review with appropriate caution. The current CONTEXT.md does not mention adding ratings, so option (a) is assumed — the schema provides semantic value without rich result eligibility.

## Code Examples

### OG Tags Update (PNG and absolute URL)

```html
<!-- Source: Open Graph spec, verified against platform requirements -->
<meta property="og:image" content="https://gnomad-carrier-frequency.kidney-genetics.org/og-image.png" />
<meta property="og:image:type" content="image/png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:alt" content="gnomAD Carrier Frequency Calculator showing results for CFTR gene with carrier frequency 1 in 25" />
```

Note: Use absolute URLs for OG images (some crawlers cannot resolve relative paths).

### Twitter Card Update

```html
<!-- Source: Twitter/X documentation -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:image" content="https://gnomad-carrier-frequency.kidney-genetics.org/og-image.png" />
```

### Canonical URL

```html
<!-- Already exists, verify it points to canonical domain -->
<link rel="canonical" href="https://gnomad-carrier-frequency.kidney-genetics.org/" />
```

### Preconnect Hints

```html
<!-- Source: MDN, web.dev - preconnect to critical third-party origins -->
<link rel="preconnect" href="https://gnomad.broadinstitute.org" />
<link rel="dns-prefetch" href="https://gnomad.broadinstitute.org" />
```

Preconnect saves 100-500ms on first API call by establishing TCP + TLS ahead of time. `dns-prefetch` as fallback for browsers that don't support preconnect.

### Bilingual FAQPage JSON-LD Structure

```json
// Source: schema.org/FAQPage, schema.org/inLanguage
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      "name": "gnomAD Carrier Frequency Calculator",
      "alternateName": "gCFCalc",
      "url": "https://gnomad-carrier-frequency.kidney-genetics.org/",
      "description": "...",
      "applicationCategory": "HealthApplication",
      "applicationSubCategory": "Genetics Calculator",
      "operatingSystem": "All",
      "browserRequirements": "Requires JavaScript",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD"
      },
      "author": {
        "@type": "Person",
        "name": "Bernt Popp",
        "url": "https://github.com/berntpopp"
      },
      "featureList": ["..."]
    },
    {
      "@type": "FAQPage",
      "inLanguage": "en",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "How do I calculate carrier frequency from gnomAD data?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "..."
          }
        }
        // 7-9 more English Q&As
      ]
    },
    {
      "@type": "FAQPage",
      "inLanguage": "de",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Wie berechne ich die Trägerfrequenz aus gnomAD-Daten?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "..."
          }
        }
        // 7-9 more German Q&As
      ]
    }
  ]
}
```

### VitePress Docs Sitemap Config

```typescript
// docs/.vitepress/config.ts
// Source: https://vitepress.dev/guide/sitemap-generation
export default defineConfig({
  // ... existing config ...
  base: '/docs/',
  sitemap: {
    // IMPORTANT: Must include base path in hostname (VitePress issue #3863)
    hostname: 'https://gnomad-carrier-frequency.kidney-genetics.org/docs/',
    lastmodDateOnly: false,
  },
  lastUpdated: true,  // Enables <lastmod> in sitemap
})
```

### VitePress OG Image (Head Config for Docs)

```typescript
// docs/.vitepress/config.ts
export default defineConfig({
  head: [
    ['link', { rel: 'icon', href: '/favicon.svg' }],
    // Add OG image for docs site
    ['meta', { property: 'og:image', content: 'https://gnomad-carrier-frequency.kidney-genetics.org/og-image.png' }],
    ['meta', { property: 'og:image:width', content: '1200' }],
    ['meta', { property: 'og:image:height', content: '630' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:image', content: 'https://gnomad-carrier-frequency.kidney-genetics.org/og-image.png' }],
  ],
  // ...
})
```

### AppFooter Docs Link

```vue
<!-- src/components/AppFooter.vue — add to footer-primary row -->
<!-- Source: existing footer pattern -->
<v-tooltip
  text="Documentation"
  location="top"
>
  <template #activator="{ props }">
    <v-btn
      v-bind="props"
      icon
      variant="text"
      size="small"
      href="https://gnomad-carrier-frequency.kidney-genetics.org/docs/"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Open documentation"
    >
      <v-icon size="small">mdi-book-open-outline</v-icon>
    </v-btn>
  </template>
</v-tooltip>
```

### Deep Link from VitePress to App (Markdown)

```markdown
<!-- docs/use-cases/carrier-screening.md -->
[Try calculating carrier frequency for CFTR →](https://gnomad-carrier-frequency.kidney-genetics.org/?gene=CFTR&step=1)
```

Valid URL state parameters (from `src/composables/useUrlState.ts`):
- `gene=SYMBOL` — pre-fills gene search (e.g., `gene=CFTR`)
- `step=1` — sets wizard step (1-4)
- `status=heterozygous` or `status=affected` — sets index status
- `source=gnomad` or `source=literature` — frequency source

### Static HTML Seed Skeleton

```html
<!-- index.html — inside <div id="app"> -->
<div id="app">
  <style>
    /* Seed styles — Vuetify overrides these on mount */
    .seed-header { background: #fff; border-bottom: 1px solid #e0e0e0; padding: 12px 24px; display: flex; align-items: center; justify-content: space-between; }
    .seed-nav a { color: #a09588; text-decoration: none; margin-left: 16px; font-size: 14px; }
    .seed-main { max-width: 900px; margin: 0 auto; padding: 32px 24px; font-family: system-ui, sans-serif; }
    .seed-h1 { font-size: 2rem; font-weight: 700; color: #212121; margin-bottom: 8px; }
    .seed-subtitle { color: #616161; margin-bottom: 24px; }
    .seed-faq-q { font-weight: 600; color: #212121; margin-top: 16px; }
    .seed-faq-a { color: #424242; margin-top: 4px; }
    .seed-cta { display: inline-block; background: #a09588; color: #fff; padding: 12px 24px; border-radius: 4px; text-decoration: none; margin-top: 16px; }
  </style>

  <header class="seed-header">
    <span style="font-weight:700;color:#a09588">gCFCalc</span>
    <nav>
      <a href="/" class="seed-nav">Calculator</a>
      <a href="/docs/" class="seed-nav">Documentation</a>
      <a href="#faq" class="seed-nav">FAQ</a>
    </nav>
  </header>

  <main class="seed-main">
    <h1 class="seed-h1">gnomAD Carrier Frequency Calculator</h1>
    <p class="seed-subtitle">A free tool for genetic counselors to calculate carrier frequencies and recurrence risks for autosomal recessive conditions, using real population data from gnomAD.</p>

    <!-- [500+ words of content follows] -->

    <section id="faq">
      <h2>Frequently Asked Questions</h2>
      <p class="seed-faq-q">How do I calculate carrier frequency from gnomAD data?</p>
      <p class="seed-faq-a">...</p>
      <!-- 3-4 more Q&A pairs -->
    </section>
  </main>
</div>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| prerender-spa-plugin for SPA SEO | Static HTML seed in index.html + Google's JS rendering | 2020+ | Simpler, no extra build step; Google renders JS well for single-page apps |
| SVG for OG images | PNG 1200x630 | Always — SVG never worked | Social previews actually appear |
| FAQ rich results for all sites | Restricted to gov/health authority sites | August 2023 | FAQPage schema still valuable for featured snippets, just no rich result panel |
| Separate sitemap.xml creation tool | VitePress built-in `sitemap.hostname` | VitePress 1.0+ | Zero-code sitemap for docs sites |
| Dynamic rendering (cloaking) for SPA SEO | Google directly renders JavaScript | 2019+ | Dynamic rendering deprecated/discouraged by Google |

**Deprecated/outdated:**
- **Dynamic rendering (Prerender.io pattern):** Google explicitly advises against serving different HTML to crawlers vs users. Considered cloaking risk.
- **SVG OG images:** Functional only on WhatsApp. All other platforms reject them.
- **Broad FAQ rich result panels:** Google stopped showing them broadly in August 2023.

## Open Questions

1. **OG image content: screenshot vs. logo design**
   - What we know: CONTEXT.md says "stylized screenshot of the calculator in action"; the current SVG is a logo/text design, not a screenshot
   - What's unclear: Creating a true screenshot requires either manual screenshot + image editing, or a Playwright automation script (Playwright is already in devDeps). This is non-trivial design work.
   - Recommendation: The planner should create a dedicated task for OG image creation. Options: (a) Playwright screenshot script during build, (b) manual screenshot + Figma editing. The PNG conversion from SVG is a fallback if this proves too complex. Playwright is already available.

2. **VitePress docs OG image placement**
   - What we know: OG image should be shared between app and docs; docs site has its own `/docs/public/` folder for static assets
   - What's unclear: Whether to copy `og-image.png` into `docs/public/` or reference the app's absolute URL. The absolute URL approach is simpler and avoids duplication.
   - Recommendation: Reference the absolute URL `https://gnomad-carrier-frequency.kidney-genetics.org/og-image.png` in VitePress head config. No file copy needed.

3. **FAQPage: two `FAQPage` objects in same `@graph` vs. one merged**
   - What we know: `inLanguage` is a valid property on FAQPage; schema.org says one FAQPage per page in Google's docs for rich results
   - What's unclear: Whether two FAQPage nodes in the same `@graph` violates Google's "one FAQPage per page" guideline
   - Recommendation: Since rich results are already restricted for this site type, use two FAQPage nodes (one per language) for maximum SEO value. The semantic benefit outweighs any rich result eligibility concern.

4. **Docs CTA buttons — VitePress custom components or markdown links**
   - What we know: VitePress supports Vue components in markdown; the theme uses standard DefaultTheme; CTA buttons at page bottom need styling
   - What's unclear: Whether to use plain markdown links (simpler) or styled Vue components (better visual)
   - Recommendation: Use VitePress's built-in `[text](url)` with `{.link-button}` class or a simple markdown link. Avoid adding a custom Vue component just for CTAs unless the planner decides the visual impact justifies the complexity.

## Sources

### Primary (HIGH confidence)
- `https://vitepress.dev/guide/sitemap-generation` — VitePress sitemap configuration and hostname requirements
- `https://github.com/vuejs/vitepress/issues/3863` — Confirmed: VitePress does not auto-append base to sitemap URLs; workaround documented
- `https://developers.google.com/search/docs/appearance/structured-data/faqpage` — FAQPage requirements, health/gov restriction, content visibility rules
- `https://developers.google.com/search/docs/appearance/structured-data/software-app` — WebApplication required fields (name, offers, rating/review)
- `https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap` — Sitemap format, robots.txt Sitemap directive
- `https://schema.org/FAQPage` — FAQPage properties, inLanguage inheritance from CreativeWork
- `https://github.com/orgs/vuejs/discussions/12788` — Vue 3 mount replaces innerHTML; static seed pattern documented
- Project source inspection: `index.html`, `public/og-image.svg`, `docs/.vitepress/config.ts`, `src/composables/useUrlState.ts`, `src/components/AppFooter.vue`

### Secondary (MEDIUM confidence)
- `https://developers.google.com/search/blog/2023/08/howto-faq-changes` — August 2023 FAQ restriction (verified via search results from Search Engine Journal, Search Engine Land)
- `https://web.dev/articles/preconnect-and-dns-prefetch` — Preconnect/dns-prefetch best practice (100-500ms improvement for third-party origins)
- `https://darekkay.com/blog/open-graph-image-formats/` — OG image format support by platform (PNG/JPEG universal; SVG unsupported)
- WebSearch: OG image 1200x630 standard — confirmed by Hootsuite, Buffer, and multiple official platform guides

### Tertiary (LOW confidence)
- FAQPage inLanguage bilingual strategy (two @graph nodes) — schema.org docs confirm inLanguage is valid on FAQPage, but the specific two-node-per-language pattern is an inference from schema.org design principles, not an explicit Google guideline

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — No new packages; all tools already present or built-in
- Architecture patterns: HIGH — Verified against official docs and project code inspection
- Pitfalls: HIGH — SVG OG image and FAQPage restriction are verified against official/authoritative sources; others from official docs
- Open questions: MEDIUM — Represent genuine design choices, not research gaps

**Research date:** 2026-02-23
**Valid until:** 2026-06-01 (Google's structured data guidelines stable; VitePress sitemap behavior stable)
