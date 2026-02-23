# SEO Audit & Improvement Plan

**Target keyword:** "Carrier Frequency Calculator"
**Site:** https://gnomad-carrier-frequency.kidney-genetics.org/
**Date:** 2026-02-23

---

## 1. Current State Assessment

### 1.1 Google Index Status: CRITICAL PROBLEM

**Your site is NOT indexed by Google.** A `site:gnomad-carrier-frequency.kidney-genetics.org` search returns zero results. This is the single biggest issue — no amount of on-page optimization matters if Google hasn't indexed the page.

**Root cause:** The app is a Vue 3 SPA with an empty `<body>`. The raw HTML Google receives on first crawl is:

```html
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.ts"></script>
</body>
```

While Google *can* render JavaScript, SPA indexing is unreliable and slow — Google's two-phase crawl queues JS rendering separately, sometimes waiting days or weeks. For a niche tool with low crawl priority, this likely means **Google has never rendered or indexed the actual content**.

### 1.2 What You Already Have (Good)

| Element | Status | Notes |
|---------|--------|-------|
| Title tag | OK | "gnomAD Carrier Frequency Calculator" |
| Meta description | OK | Good, includes key terms |
| Open Graph tags | Partial | SVG image (not widely supported for OG) |
| Twitter Card tags | Partial | Same SVG issue |
| Structured data | Basic | WebApplication schema present |
| `lang="en"` | OK | Set correctly |
| Favicon | OK | SVG + PNG fallback |
| PWA manifest | OK | Present and valid |
| Docs site | OK | VitePress at /docs/ — pre-rendered HTML |
| robots.txt | Minimal | Only `Allow: /` |

### 1.3 Critical Gaps

| Element | Status | Impact |
|---------|--------|--------|
| **Sitemap.xml** | MISSING | Google can't discover pages efficiently |
| **Canonical URL** | MISSING | No `<link rel="canonical">` |
| **robots meta** | MISSING | No explicit indexing directive |
| **noscript fallback** | MISSING | No content for crawlers that fail JS |
| **Static HTML content** | MISSING | Body is empty `<div id="app">` |
| **Page word count** | ~184 words | Extremely thin (competitors: 1,200-3,500) |
| **Internal links** | 2 links (both GitHub) | Zero internal navigation links |
| **Backlinks** | Near zero | No external authority signals |
| **OG image format** | SVG | Most platforms don't render SVG for previews |
| **FAQ schema** | MISSING | Competitors use FAQPage for rich results |
| **Keyword content** | SPA-only | Key terms only exist in JS-rendered DOM |

### 1.4 Performance Metrics

| Metric | Value | Assessment |
|--------|-------|------------|
| TTFB | 263ms | Good |
| First Contentful Paint | 2,408ms | Needs improvement (SPA overhead) |
| DOM Complete | 2,320ms | Acceptable |
| Transfer size | 1,165 bytes | Very small initial HTML |
| Encoded body | 865 bytes | Almost no static content |

---

## 2. Competitor Deep Dive

### 2.1 Perinatology.com (Rank #1)

**URL:** https://www.perinatology.com/calculators/Hardy-Weinberg.htm
**Title:** "Hardy-Weinberg Carrier Frequency Calculator"

**Why they rank #1:**
- **Domain age & authority:** Perinatology.com has been online since the early 2000s with thousands of backlinks from medical/educational institutions
- **Static HTML:** Entire page is server-rendered HTML — Google indexes it instantly
- **Keyword-rich content:** Page uses "carrier frequency" and "Hardy-Weinberg" throughout body text
- **Internal link network:** Cross-linked from dozens of other medical calculators on the same domain
- **Institutional backlinks:** Linked from university genetics courses, medical reference sites
- **Simple, fast:** Pure HTML/JS calculator, extremely fast load

**What they do that you don't:**
1. Static HTML content (not SPA)
2. Deep internal link network across calculator suite
3. Decades of accumulated backlinks
4. Educational text explaining the formula

---

### 2.2 gnomAD / GeniE (Rank #2)

**URL:** https://gnomad.broadinstitute.org/news/2024-06-genie
**Title:** "GeniE, the Genetic Prevalence Estimator"

**Why they rank well:**
- **Massive domain authority:** broadinstitute.org is one of the highest-authority domains in genomics
- **Rich educational content:** ~1,200+ words with sections: Overview, Background, How to Use, Dashboard, Technical Details
- **Clear heading hierarchy:** H1 through multiple H2s with semantic structure
- **Scientific references:** 7 cited papers — signals expertise to Google
- **Institutional trust signals:** Partnership with Chan Zuckerberg Initiative, patient organizations
- **Fresh content:** Published June 2024, regularly updated

**What they do that you don't:**
1. 6x more content on the page
2. Scientific references and citations
3. Institutional authority (Broad Institute)
4. Blog-format educational content alongside the tool
5. Named researchers and collaborators

---

### 2.3 Omni Calculator (Rank #3)

**URL:** https://www.omnicalculator.com/biology/allele-frequency
**Title:** "Allele Frequency Calculator"

**Why they rank well:**
- **Content machine:** ~2,500-3,500 words of educational content per calculator page
- **FAQPage schema:** Structured data for 5 FAQ items → rich snippets in Google
- **Expert author bios:** MD, PhD credentials displayed with links to LinkedIn/ResearchGate
- **Heading hierarchy:** Clear H1 → H2s: "What is allele frequency?", "Hardy-Weinberg equation", "How to calculate"
- **Internal link megastructure:** Thousands of calculators cross-linked (biology, chemistry, health, etc.)
- **KaTeX math rendering:** LaTeX formulas that Google can index
- **Domain authority:** 80+ DA from massive calculator network

**What they do that you don't:**
1. **FAQPage structured data** → Google shows FAQ rich results
2. **2,500+ words** of educational content vs your ~184
3. **Step-by-step calculation examples** with real disease data
4. **Author E-E-A-T signals** (credentials, affiliations)
5. **Massive internal linking** across calculator ecosystem
6. **Long-tail keyword targeting** in educational sections

---

### 2.4 Gene Calculators (Rank #4)

**URL:** https://www.genecalculators.net/pq-chwe-pq
**Title:** "Calculator of Hardy-Weinberg Equilibrium (p,q CHWE)"

**Why they rank:**
- **Exact-match keyword domain:** "genecalculators.net" — strong domain signal
- **Internal link cluster:** Multiple related calculators cross-linked
- **Static HTML:** Server-rendered, instantly indexable
- **Focused niche:** Entire domain is genetic calculators

---

### 2.5 Fulgent Genetics (Rank #5)

**URL:** https://web.fulgentgenetics.com/reproductive/resources
**Title:** "Risk Calculator | Beacon Carrier Screening"

**Why they rank:**
- **Commercial genetics company:** High domain authority from industry
- **Clinical context:** Tied to actual screening products
- **Professional credibility:** Medical-grade branding and compliance

---

## 3. Your Competitive Advantages (Unused)

You have significant differentiators that are **invisible to Google** because they're trapped inside JavaScript:

| Advantage | Status |
|-----------|--------|
| **Real gnomAD data** — not just Hardy-Weinberg math | Hidden in SPA |
| **Clinical text generation** — unique feature no competitor has | Hidden in SPA |
| **Multi-population analysis** — ethnicity-specific frequencies | Hidden in SPA |
| **ClinVar integration** — pathogenic variant filtering | Hidden in SPA |
| **Founder effect detection** — advanced genetic analysis | Hidden in SPA |
| **German clinical documentation** — unique niche | Hidden in SPA |
| **VitePress docs site** — rich content exists at /docs/ | Not linked from main app |

---

## 4. Action Plan: Path to Page 1

### Phase 1: Fix Indexing (CRITICAL — Do First)

**Goal:** Get Google to actually index your pages.

#### 1a. Add Static HTML Content to index.html

Add a `<noscript>` fallback and visible static content *before* the SPA mounts. This gives Google crawlable content even if JS rendering fails:

```html
<body>
  <div id="app">
    <!-- Pre-render content visible until Vue mounts (Google indexes this) -->
    <main>
      <h1>Carrier Frequency Calculator — gnomAD Data</h1>
      <p>Calculate carrier frequency and recurrence risk for autosomal
         recessive conditions using real population data from the Genome
         Aggregation Database (gnomAD).</p>
      <h2>How It Works</h2>
      <p>Enter a gene symbol to retrieve loss-of-function and ClinVar
         pathogenic variants from gnomAD. The calculator computes carrier
         frequency using Hardy-Weinberg equilibrium across multiple
         populations.</p>
      <h2>Key Features</h2>
      <ul>
        <li>Real gnomAD allele frequency data (v4.1, v3.1.2, v2.1.1)</li>
        <li>Automatic ClinVar pathogenic variant filtering</li>
        <li>Population-specific carrier frequencies</li>
        <li>Recurrence risk calculations</li>
        <li>Clinical documentation text generation (German/English)</li>
        <li>Founder effect detection</li>
      </ul>
      <h2>Who Is This For?</h2>
      <p>Designed for genetic counselors, clinical geneticists, and
         researchers who need carrier frequency estimates from real
         population data rather than theoretical Hardy-Weinberg
         calculations alone.</p>
    </main>
    <noscript>
      <p>This application requires JavaScript. Please enable JavaScript
         to use the gnomAD Carrier Frequency Calculator.</p>
    </noscript>
  </div>
  <script type="module" src="/src/main.ts"></script>
</body>
```

Vue will replace this content when it mounts. Google gets static HTML to index.

#### 1b. Add Canonical URL

```html
<link rel="canonical" href="https://gnomad-carrier-frequency.kidney-genetics.org/" />
```

#### 1c. Add Robots Meta

```html
<meta name="robots" content="index, follow" />
```

#### 1d. Create sitemap.xml

Add `public/sitemap.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://gnomad-carrier-frequency.kidney-genetics.org/</loc>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://gnomad-carrier-frequency.kidney-genetics.org/docs/</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://gnomad-carrier-frequency.kidney-genetics.org/docs/guide/</loc>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://gnomad-carrier-frequency.kidney-genetics.org/docs/reference/methodology</loc>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://gnomad-carrier-frequency.kidney-genetics.org/docs/use-cases/carrier-screening</loc>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://gnomad-carrier-frequency.kidney-genetics.org/docs/use-cases/family-planning</loc>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>https://gnomad-carrier-frequency.kidney-genetics.org/docs/reference/data-sources</loc>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>https://gnomad-carrier-frequency.kidney-genetics.org/docs/about/</loc>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
</urlset>
```

#### 1e. Update robots.txt

```
User-agent: *
Allow: /

Sitemap: https://gnomad-carrier-frequency.kidney-genetics.org/sitemap.xml
```

#### 1f. Submit to Google Search Console

1. Verify site ownership in [Google Search Console](https://search.google.com/search-console)
2. Submit sitemap.xml
3. Request indexing for the main URL
4. Monitor coverage reports for indexing issues

---

### Phase 2: On-Page SEO Optimization

#### 2a. Optimize Title Tag

Current: `gnomAD Carrier Frequency Calculator`
Proposed: `Carrier Frequency Calculator — gnomAD Population Data | gCFCalc`

**Rationale:** Lead with the target keyword "Carrier Frequency Calculator". The current title puts "gnomAD" first, which only matters to people who already know gnomAD. Most searchers type "carrier frequency calculator".

#### 2b. Optimize Meta Description

Current (good but can be better):
```
Calculate carrier frequency and recurrence risk for autosomal recessive
conditions. Uses gnomAD population data to generate clinical documentation
for genetic counseling.
```

Proposed (add differentiators + CTA):
```
Free carrier frequency calculator using real gnomAD population data.
Calculate recurrence risk for autosomal recessive conditions across
multiple ancestries. Includes clinical text generation for genetic counseling.
```

**Rationale:** Add "free" (high-intent modifier), "real gnomAD population data" (differentiator vs Hardy-Weinberg-only tools), "multiple ancestries" (unique feature).

#### 2c. Fix OG Image

Replace SVG with PNG/JPG. Most social platforms (Facebook, LinkedIn, Twitter/X, Slack) do not render SVG for Open Graph previews.

```html
<meta property="og:image" content="https://gnomad-carrier-frequency.kidney-genetics.org/og-image.png" />
<meta name="twitter:image" content="https://gnomad-carrier-frequency.kidney-genetics.org/og-image.png" />
```

Use absolute URLs (not relative `./og-image.svg`).

#### 2d. Expand Structured Data

Replace the minimal WebApplication schema with a richer version:

```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      "name": "Carrier Frequency Calculator",
      "alternateName": ["gCFCalc", "gnomAD Carrier Frequency Calculator"],
      "url": "https://gnomad-carrier-frequency.kidney-genetics.org/",
      "description": "Calculate carrier frequency and recurrence risk for autosomal recessive conditions using gnomAD population data across multiple ancestries",
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
      "datePublished": "2024-01-01",
      "dateModified": "2026-02-01",
      "softwareVersion": "1.2.0",
      "featureList": [
        "gnomAD allele frequency data (v4.1, v3.1.2, v2.1.1)",
        "ClinVar pathogenic variant filtering",
        "Hardy-Weinberg carrier frequency calculation",
        "Population-specific analysis across multiple ancestries",
        "Recurrence risk calculation",
        "Clinical documentation text generation",
        "Founder effect detection"
      ],
      "screenshot": "https://gnomad-carrier-frequency.kidney-genetics.org/og-image.png"
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "What is carrier frequency?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Carrier frequency is the proportion of individuals in a population who carry one copy of a recessive disease-causing allele. Carriers typically do not show symptoms but can pass the allele to their children. It is calculated using the Hardy-Weinberg equation: carrier frequency = 2pq, where q is the disease allele frequency."
          }
        },
        {
          "@type": "Question",
          "name": "How does this calculator differ from a simple Hardy-Weinberg calculator?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Unlike basic Hardy-Weinberg calculators that require you to input a disease prevalence, this tool queries real allele frequency data from the Genome Aggregation Database (gnomAD) for over 800,000 individuals. It identifies loss-of-function and ClinVar pathogenic variants for any gene and calculates carrier frequency from actual population data across multiple ancestries."
          }
        },
        {
          "@type": "Question",
          "name": "What populations are supported?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "The calculator provides carrier frequencies for all gnomAD genetic ancestry groups including European, African/African-American, East Asian, South Asian, Ashkenazi Jewish, Latino/Admixed American, Middle Eastern, and Finnish populations."
          }
        },
        {
          "@type": "Question",
          "name": "Can I use this for clinical genetic counseling?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "This tool is designed for research use to support clinical documentation workflows. It generates ready-to-use text for clinical letters in German and English. Results should always be reviewed by a qualified clinician and verified against primary sources before use in patient care."
          }
        }
      ]
    }
  ]
}
```

---

### Phase 3: Content Strategy (Biggest Long-Term Impact)

This is where the real ranking gains happen. Your competitors outrank you primarily because they have **10-20x more indexable content**.

#### Strategy: Docs-First Content with App Cross-Linking

The ideal architecture keeps the main app **clean and focused** (calculator tool) while the VitePress docs site hosts all educational/SEO content. This works because:

1. **VitePress pre-renders to static HTML** — Google indexes docs pages instantly, unlike the SPA
2. **Same domain** (`/docs/`) — all pages contribute to one domain's authority
3. **Each docs page can rank independently** for long-tail keywords, creating multiple entry points
4. **Internal links from the app to docs pass link equity** — the app's authority reinforces the docs and vice versa

The app footer already has an icon bar (GitHub, disclaimer, data sources, methodology, FAQ, about, logs). **Add a "Documentation" icon** (e.g., `mdi-book-open-variant`) that links to `/docs/` — this is a natural fit alongside the existing icons and creates a persistent cross-link on every page view.

Additionally, the static HTML seed content in `index.html` (Phase 1a) should include links to key docs pages, making them discoverable to Google even before JS renders.

#### 3a. Create High-Value Educational Pages in VitePress Docs

| Page | Target Keyword | Est. Words | Priority |
|------|---------------|------------|----------|
| `/docs/guide/what-is-carrier-frequency` | "what is carrier frequency" | 1,500 | HIGH |
| `/docs/guide/hardy-weinberg-explained` | "Hardy-Weinberg equation explained" | 1,200 | HIGH |
| `/docs/guide/faq` | "carrier frequency calculator FAQ" | 1,000 | HIGH |
| `/docs/reference/populations` | "carrier frequency by ethnicity" | 800 | HIGH |
| `/docs/use-cases/cystic-fibrosis` | "CFTR carrier frequency" | 1,000 | MEDIUM |
| `/docs/use-cases/sma` | "SMN1 carrier frequency" | 800 | MEDIUM |
| `/docs/guide/carrier-vs-affected` | "carrier vs affected genetics" | 600 | MEDIUM |
| `/docs/comparison/genie-vs-gcfcalc` | "GeniE vs carrier frequency calculator" | 800 | MEDIUM |
| `/docs/guide/how-to-calculate-carrier-frequency` | "how to calculate carrier frequency" | 1,200 | HIGH |

**Content template for each page:**
1. Clear H1 with target keyword
2. 2-3 paragraphs of educational introduction
3. Step-by-step explanation or walkthrough
4. Worked example with real data
5. Prominent "Open Calculator" CTA linking back to the app
6. FAQ section at the bottom (with FAQPage schema per page)

#### 3b. Cross-Link Architecture (App ↔ Docs)

Currently the docs site and app are **completely disconnected** from an SEO perspective:
- The app has zero links to docs
- The docs link to the app only via one "Open Calculator" button

**Fixes:**

1. **App → Docs (footer icon):** Add a documentation icon to the existing footer icon bar that links to `/docs/`. This is the simplest, most consistent approach — every page view includes the link, and it matches the existing UI pattern (alongside GitHub, disclaimer, methodology icons).

2. **App → Docs (static HTML):** In the `index.html` static seed content (Phase 1a), include links to the top docs pages:
   ```html
   <nav>
     <a href="/docs/guide/what-is-carrier-frequency">What is Carrier Frequency?</a>
     <a href="/docs/guide/hardy-weinberg-explained">Hardy-Weinberg Equation</a>
     <a href="/docs/reference/methodology">Methodology</a>
     <a href="/docs/guide/faq">FAQ</a>
   </nav>
   ```
   These links exist in the raw HTML so Google discovers them on first crawl, before JS renders.

3. **Docs → App (CTAs):** Each docs page should have a prominent "Open Calculator" button/link back to the main app. VitePress already has one in the nav bar; add contextual ones within page content too (e.g., "Try calculating CFTR carrier frequency → Open Calculator").

4. **Docs internal cross-linking:** Each docs page should link to 2-3 related docs pages. This creates a web of internal links that distributes authority and helps Google discover all pages.

**Resulting link topology:**
```
App (/) ←──────────────────→ Docs Hub (/docs/)
  │ (footer icon + static)       │
  │                               ├── Guide pages (cross-linked)
  │                               ├── Use Cases (cross-linked)
  │                               ├── Reference (cross-linked)
  │                               └── About (cross-linked)
  │                                     │
  └───────────── each page links back ──┘
```

---

### Phase 4: Technical SEO Fixes

#### 4a. Fix OG Image Format

Replace `og-image.svg` with a PNG version (1200x630px). SVGs are not rendered by:
- Facebook/Meta
- LinkedIn
- Twitter/X
- Slack
- Discord
- Most link preview services

#### 4b. Use Absolute URLs for OG Tags

Current: `content="./og-image.svg"` (relative)
Required: `content="https://gnomad-carrier-frequency.kidney-genetics.org/og-image.png"` (absolute)

Relative OG URLs are unreliable across platforms.

#### 4c. Add Prerender/SSG for the Main App

Consider using `vite-ssg` or a prerender plugin to generate static HTML at build time. This is the most reliable way to ensure Google indexes your content:

```bash
bun add -D vite-ssg
```

Alternatively, add a Vite plugin that injects static HTML into the built `index.html` at build time.

#### 4d. Add `<link rel="preconnect">` for Performance

```html
<link rel="preconnect" href="https://gnomad-api.broadinstitute.org" />
```

#### 4e. Generate the VitePress Docs Sitemap

Configure VitePress to generate a sitemap:

```js
// docs/.vitepress/config.ts
export default defineConfig({
  sitemap: {
    hostname: 'https://gnomad-carrier-frequency.kidney-genetics.org'
  }
})
```

---

### Phase 5: Off-Page SEO & Authority Building

#### 5a. Link Building (Most Important for Long-Term Ranking)

| Strategy | Effort | Impact | Details |
|----------|--------|--------|---------|
| **Publish a preprint/paper** | High | Very High | Even a brief application note on bioRxiv/medRxiv drives massive authority. GeniE ranks partly because of Broad Institute authority |
| **Submit to bioinformatics tool directories** | Low | Medium | bio.tools, OMICtools, Elixir registry |
| **GitHub README optimization** | Low | Medium | GitHub pages rank well; ensure README targets "carrier frequency calculator" |
| **Academic citations** | Medium | High | If used in publications, ask authors to cite with URL |
| **Genetics education sites** | Medium | High | Reach out to university genetics courses that link to Perinatology |
| **AlternativeTo listing** | Low | Low-Med | Already exists at alternativeto.net — verify and optimize |
| **Blog posts / tutorials** | Medium | Medium | Write a tutorial on your institution's blog |

#### 5b. Google Scholar Presence

If you publish the tool as a citeable resource (e.g., JOSS, F1000Research, or even Zenodo with a DOI), Google Scholar will index it and create a separate authority signal.

#### 5c. Social Sharing

Fix the OG image (PNG, not SVG) so that shares on Twitter/X, LinkedIn, and genetic counseling forums show rich previews.

---

## 5. Priority Roadmap

### Immediate (Week 1) — Fix Indexing

- [ ] Add static HTML seed content to `<div id="app">` in index.html (with links to docs)
- [ ] Add `<link rel="canonical">` URL
- [ ] Add `<meta name="robots" content="index, follow">`
- [ ] Create `public/sitemap.xml`
- [ ] Update `public/robots.txt` with sitemap reference
- [ ] Fix OG image: convert SVG to PNG, use absolute URLs
- [ ] Add docs icon to app footer icon bar (link to `/docs/`)
- [ ] Register & verify in Google Search Console
- [ ] Submit sitemap & request indexing

### Short-Term (Weeks 2-4) — On-Page Optimization

- [ ] Optimize title tag (lead with "Carrier Frequency Calculator")
- [ ] Optimize meta description (add differentiators)
- [ ] Expand structured data (FAQPage schema + richer WebApplication)
- [ ] Configure VitePress sitemap generation (add `sitemap` option to config)
- [ ] Ensure docs pages cross-link to each other and back to the app
- [ ] Create FAQ docs page with FAQPage schema

### Medium-Term (Months 1-2) — Content Creation

- [ ] Write "What is Carrier Frequency?" educational page
- [ ] Write "Hardy-Weinberg Equation Explained" page
- [ ] Write "How to Calculate Carrier Frequency" tutorial
- [ ] Create condition-specific pages (CFTR, SMA, HFE)
- [ ] Add population reference page
- [ ] Add comparison page (vs GeniE, vs Perinatology)

### Long-Term (Months 2-6) — Authority Building

- [ ] Publish application note (bioRxiv/JOSS)
- [ ] Submit to bioinformatics tool registries
- [ ] Seek backlinks from genetics education sites
- [ ] Monitor Google Search Console for ranking progress
- [ ] Iterate on content based on search query data

---

## 6. Expected Outcome

| Timeframe | Realistic Goal |
|-----------|---------------|
| Week 1-2 | Site gets indexed by Google (currently not indexed at all) |
| Month 1 | Appears in Google results for brand name "gCFCalc" |
| Month 2-3 | Ranks page 2-3 for "carrier frequency calculator" |
| Month 3-6 | Ranks page 1 for long-tail terms like "gnomAD carrier frequency", "carrier frequency by ethnicity" |
| Month 6-12 | Top 5 for "carrier frequency calculator" (requires content + backlinks) |

**Key insight:** Perinatology and Omni Calculator have 15-20 years of domain authority. You won't outrank them on domain authority alone. Your path to page 1 is through:
1. **Unique value** — real gnomAD data (no competitor does this in a simple calculator)
2. **Content depth** — educational pages that match or exceed their word count
3. **Technical differentiation** — "calculator using real population data" vs "Hardy-Weinberg formula"
4. **Niche authority** — become the canonical tool for gnomAD-based carrier frequency

---

## 7. Quick Reference: Competitor Comparison Matrix

| Feature | Your Site | Perinatology | GeniE (gnomAD) | Omni Calculator | Gene Calculators |
|---------|-----------|-------------|----------------|-----------------|-----------------|
| **Google indexed** | NO | Yes | Yes | Yes | Yes |
| **Static HTML** | No (SPA) | Yes | Yes (SSR) | Yes (SSR) | Yes |
| **Word count** | ~184 | ~500 | ~1,200 | ~3,000 | ~300 |
| **FAQ schema** | No | No | No | Yes (5 items) | No |
| **Sitemap** | No | Yes | Yes | Yes | No |
| **Canonical URL** | No | Yes | Yes | Yes | No |
| **Educational content** | No (in docs only) | Basic | Detailed | Extensive | Basic |
| **Backlinks** | ~0 | Thousands | Thousands | Tens of thousands | Low |
| **Domain age** | ~1-2 years | 20+ years | 5+ years | 10+ years | 5+ years |
| **Real population data** | YES | No | YES | No | No |
| **Clinical text generation** | YES | No | No | No | No |
| **Multi-population** | YES | No | YES | No | No |
| **Author E-E-A-T** | Minimal | Established | Broad Institute | MD/PhD bios | Minimal |

Your biggest competitive advantages (real data, clinical text, multi-population) are currently **invisible** to search engines. Making them visible through static content and educational pages is the fastest path to ranking.
