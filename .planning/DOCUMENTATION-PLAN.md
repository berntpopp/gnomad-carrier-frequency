# Documentation Site Plan: gnomAD Carrier Frequency Calculator

## Executive Summary

Add a professional documentation site with auto-generated screenshots to the existing GitHub Pages deployment.

**Recommendation**: VitePress in a `docs/` subfolder, Playwright scripts for automated screenshots, unified GitHub Actions deployment.

---

## 1. Research Findings

### 1.1 Documentation Best Practices for Scientific Tools

Per ["Ten Simple Rules for Documenting Scientific Software" (PLOS Comp Bio)](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1006561):

- **Quickstart guide** that gets users running in < 1 minute
- **Abundant examples** with real-world use cases (working examples > written explanations)
- **Version-controlled docs** alongside source code
- **Citation information** (CFF, BibTeX, DOI) -- critical for research tools
- **Error messages that guide** rather than confuse

For a niche clinical audience (genetic counselors):
- Lead with the **clinical problem** solved, not the tech stack
- Include a **complete workflow walkthrough** with screenshots
- Provide **terminology glossary** bridging genetics and informatics

### 1.2 Doc Site Generator Comparison

| Criterion | VitePress | Astro Starlight | Docsify | Inline (Vite plugin) |
|---|---|---|---|---|
| **Ecosystem fit** | Excellent (Vite+Vue) | Moderate (Astro) | Minimal | Same app |
| **Setup effort** | ~30 min | 1-2 hours | 10 min | Hours (build nav/search) |
| **Built-in features** | Search, sidebar, TOC, dark mode | All above + i18n, admonitions | Search, sidebar | None (DIY) |
| **Vue component support** | Native | Via integration | No | Native |
| **Maintenance** | Low (shared deps) | Medium (separate deps) | Very low | Medium (custom code) |
| **Professional look** | Yes | Yes | Moderate | Depends on effort |
| **GitHub Pages compat** | Merged artifact | Merged artifact | Simple | No change needed |

**Winner: VitePress** -- same ecosystem (Vite 7 + Vue 3), shares `node_modules`, professional default theme, native GitHub Pages deployment. Used by Vue.js, Pinia, Vitest, VueUse.

### 1.3 Screenshot Automation Options

| Tool | Approach | Pros | Cons |
|---|---|---|---|
| **Playwright script** (custom) | Node.js script navigates app, captures states | Full control, same language as project, element-level targeting | Must maintain script manually |
| **shot-scraper** | Python CLI + YAML config | Declarative YAML, GitHub Actions template | Python dependency in a Node project |
| **Storycap** | Storybook addon | Auto-captures all stories | Requires Storybook setup (not in project) |

**Winner: Custom Playwright script** -- stays in the Node/TypeScript ecosystem, provides full control over wizard step navigation and state injection, can be run in CI with the same Playwright that GitHub Actions supports natively.

---

## 2. Architecture Decision

### 2.1 Directory Structure

```
gnomad-carrier-frequency/
├── docs/                          # VitePress documentation source
│   ├── .vitepress/
│   │   ├── config.ts              # VitePress config (base, nav, sidebar)
│   │   └── theme/
│   │       └── index.ts           # Theme customization (optional)
│   ├── public/
│   │   └── screenshots/           # Auto-generated screenshots (committed)
│   │       ├── step-1-gene-search.png
│   │       ├── step-2-patient-status.png
│   │       ├── step-3-frequency.png
│   │       ├── step-4-results.png
│   │       ├── text-output.png
│   │       ├── dark-mode.png
│   │       ├── settings-dialog.png
│   │       └── mobile-view.png
│   ├── index.md                   # Landing page (hero + features)
│   ├── guide/
│   │   ├── getting-started.md     # Quick start (< 1 minute)
│   │   ├── gene-search.md         # Step 1 detailed guide
│   │   ├── patient-status.md      # Step 2 detailed guide
│   │   ├── frequency-source.md    # Step 3 detailed guide
│   │   └── results-and-text.md    # Step 4 detailed guide
│   ├── use-cases/
│   │   ├── carrier-screening.md   # Use case: carrier couple counseling
│   │   ├── family-planning.md     # Use case: recurrence risk assessment
│   │   └── clinical-letter.md     # Use case: generating German clinical text
│   ├── reference/
│   │   ├── methodology.md         # Carrier frequency calculation (Hardy-Weinberg)
│   │   ├── data-sources.md        # gnomAD, ClinVar, ClinGen
│   │   ├── filters.md             # Variant filter configuration
│   │   └── templates.md           # Clinical text template system
│   └── about/
│       ├── citation.md            # How to cite (CFF, BibTeX)
│       ├── changelog.md           # Version history
│       └── contributing.md        # Contribution guide
├── scripts/
│   └── generate-screenshots.ts    # Playwright screenshot automation
├── screenshots.config.ts          # Screenshot definitions (URLs, selectors, states)
└── ...existing files
```

### 2.2 Deployment Strategy: Merged Artifact

Modify the existing `.github/workflows/deploy.yml` to build both the main app and docs, then merge into a single Pages artifact:

```yaml
# Existing steps: checkout, setup node, install, build main app

- name: Build documentation
  run: bun run docs:build

- name: Merge app and docs into single artifact
  run: |
    mkdir -p dist/docs
    cp -r docs/.vitepress/dist/* dist/docs/

- name: Upload artifact
  uses: actions/upload-pages-artifact@v4
  with:
    path: './dist'
```

**Result**:
- App: `https://berntpopp.github.io/gnomad-carrier-frequency/`
- Docs: `https://berntpopp.github.io/gnomad-carrier-frequency/docs/`

### 2.3 PWA Coexistence

Add a `navigateFallbackDenylist` to the workbox config in `vite.config.ts` so the service worker does not intercept documentation requests:

```ts
workbox: {
  navigateFallback: 'index.html',
  navigateFallbackDenylist: [/^\/gnomad-carrier-frequency\/docs\//],
}
```

---

## 3. Automated Screenshot System

### 3.1 Approach: Playwright Script in CI

A TypeScript Playwright script that:
1. Starts the Vite dev server (or uses the built preview server)
2. Navigates through each wizard step, injecting test data where needed
3. Captures screenshots at defined breakpoints
4. Saves to `docs/public/screenshots/`
5. Commits changes back (only if screenshots changed)

### 3.2 Screenshot Script Design

```typescript
// scripts/generate-screenshots.ts
import { chromium, type Page } from 'playwright';

interface ScreenshotConfig {
  name: string;
  setup: (page: Page) => Promise<void>;  // Navigate to state
  selector?: string;                      // Element to capture (or full page)
  viewport?: { width: number; height: number };
  darkMode?: boolean;
}

const screenshots: ScreenshotConfig[] = [
  {
    name: 'step-1-gene-search',
    setup: async (page) => {
      // App loads on step 1 by default
      // Type a gene name to show autocomplete
      await page.locator('[data-testid="gene-search"]').fill('CFTR');
      await page.waitForSelector('.v-autocomplete__content');
    },
  },
  {
    name: 'step-2-patient-status',
    setup: async (page) => {
      // Select gene, advance to step 2
      // ... navigation logic
    },
  },
  // ... more screenshots
];
```

### 3.3 GitHub Actions Workflow for Screenshots

A separate workflow that runs on push to `main` (or on demand) and updates screenshots:

```yaml
name: Update Screenshots

on:
  workflow_dispatch:            # Manual trigger
  push:
    branches: [main]
    paths:
      - 'src/components/**'    # Only when UI changes
      - 'scripts/generate-screenshots.ts'

jobs:
  screenshots:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v2

      - name: Install dependencies
        run: bun install

      - name: Install Playwright browsers
        run: bunx playwright install chromium

      - name: Build app
        run: bun run build

      - name: Generate screenshots
        run: |
          bun run preview &
          sleep 3
          bun run scripts/generate-screenshots.ts
          kill %1

      - name: Check for changes
        id: diff
        run: |
          git diff --quiet docs/public/screenshots/ || echo "changed=true" >> $GITHUB_OUTPUT

      - name: Commit updated screenshots
        if: steps.diff.outputs.changed == 'true'
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add docs/public/screenshots/
          git commit -m "chore: update documentation screenshots"
          git push
```

### 3.4 Screenshots to Capture

| Screenshot | State | Theme | Viewport | Purpose |
|---|---|---|---|---|
| `hero-preview.png` | Step 1 with gene selected | Light | 1200x800 | Landing page hero image |
| `step-1-gene-search.png` | Typing "CFTR" in search, autocomplete visible | Light | 1200x800 | Guide: gene search step |
| `step-1-gene-selected.png` | CFTR selected, ClinGen + constraint cards shown | Light | 1200x800 | Guide: gene info display |
| `step-2-patient-status.png` | Step 2 with "Heterozygous carrier" selected | Light | 1200x800 | Guide: status selection |
| `step-3-frequency.png` | gnomAD tab showing calculated frequency | Light | 1200x800 | Guide: frequency result |
| `step-4-results.png` | Full results with variant table | Light | 1200x800 | Guide: results overview |
| `text-output.png` | Clinical text generated (German) | Light | 1200x800 | Use case: clinical letter |
| `variant-table.png` | Expanded variant table with details | Light | 1200x800 | Reference: variant details |
| `filter-panel.png` | Filter panel expanded with options | Light | 1200x800 | Reference: filters |
| `settings-dialog.png` | Settings dialog open | Light | 1200x800 | Reference: configuration |
| `dark-mode.png` | Results page in dark mode | Dark | 1200x800 | Feature showcase |
| `mobile-view.png` | Results page on mobile | Light | 375x812 | Feature showcase: responsive |
| `population-drilldown.png` | Ashkenazi Jewish variant table (click population row) | Light | 1200x800 | Reference: population detail |
| `search-history.png` | History panel open with saved entry | Light | 1200x800 | Feature showcase: history |

**Production app observations (2026-02-09):**
- Clinical disclaimer dialog appears on first load — script must dismiss before capturing
- Filter section is inline chips on results page (not a separate panel) — update `filter-panel.png` capture
- Footer has 7 icon buttons: GitHub, version, disclaimer, data sources, methodology, FAQ, about, logs
- Settings dialog has 3 tabs: General, Filters, Templates
- Stepper collapses to numbered circles on mobile (good responsive behavior)
- Section chips in clinical text are toggleable (Geneinleitung, Vererbungsmuster, etc.)

---

## 4. Documentation Content Plan

### 4.1 Landing Page (`docs/index.md`)

```yaml
layout: home
hero:
  name: gnomAD Carrier Frequency Calculator
  text: Clinical carrier frequency analysis
  tagline: Calculate carrier frequencies for autosomal recessive conditions using gnomAD population data. Generate German clinical documentation ready for patient letters.
  image:
    src: /screenshots/hero-preview.png
    alt: Screenshot of the carrier frequency calculator
  actions:
    - theme: brand
      text: Open Calculator
      link: https://berntpopp.github.io/gnomad-carrier-frequency/
    - theme: alt
      text: Getting Started
      link: /guide/getting-started
features:
  - icon: magnifying glass icon
    title: gnomAD Integration
    details: Query gnomAD v4.1 and v2.1.1 directly from your browser. Filter LoF and ClinVar pathogenic variants automatically.
  - icon: calculator icon
    title: Carrier Frequency Calculation
    details: Population-specific carrier frequencies using Hardy-Weinberg equilibrium. Supports multiple populations and frequency sources.
  - icon: document icon
    title: Clinical Text Generation
    details: Generate German clinical documentation text for carrier screening results, ready to paste into patient letters.
  - icon: shield icon
    title: Privacy-First
    details: No server, no data storage. All calculations happen in your browser. Patient data never leaves your machine.
```

### 4.2 Page Outline: Getting Started

1. **What this tool does** (2 sentences, link to methodology)
2. **Open the calculator** (link to live app)
3. **Step-by-step quick walkthrough** (4 steps, each with screenshot)
   - Search for a gene (e.g., CFTR)
   - Select patient/family status
   - Review carrier frequency
   - Copy clinical text
4. **What next?** (links to detailed guides, use cases)

### 4.3 Use Case Pages

**Carrier Screening Counseling**:
- Scenario: A couple where one partner is a known carrier
- Walk through: gene search -> heterozygous carrier -> frequency -> text for partner
- Screenshot at each step with this specific scenario

**Recurrence Risk Assessment**:
- Scenario: Previously affected child, calculating risk for future pregnancy
- Walk through: gene -> compound het -> frequency -> recurrence risk text

**Clinical Letter Generation**:
- Scenario: Generating text for a genetic counseling letter
- Show template customization, language selection, gender-inclusive options
- Copy-paste workflow

### 4.4 Reference Pages

**Methodology**: Hardy-Weinberg calculation, allele frequency aggregation, population-specific calculations. Mirror the existing MethodologyDialog content but expanded.

**Data Sources**: gnomAD v4.1 vs v2.1.1 differences, ClinVar pathogenicity classification, ClinGen gene-disease validity. Include links to original data sources.

**Filters**: Explain each filter option (LoF HC, missense, ClinVar pathogenic, star threshold) with impact on calculations.

**Templates**: Document the template syntax (`{{variable}}`), available variables, perspective options, gender-inclusive language styles.

---

## 5. Implementation Plan

### Phase 1: VitePress Setup (1-2 hours)

1. Install VitePress: `bun add -D vitepress`
2. Initialize: `bunx vitepress init` targeting `./docs`
3. Configure `docs/.vitepress/config.ts`:
   - `base: '/gnomad-carrier-frequency/docs/'`
   - Navigation (Guide, Use Cases, Reference, About)
   - Sidebar structure
   - Theme colors matching app branding (#a09588)
4. Add package.json scripts: `docs:dev`, `docs:build`, `docs:preview`
5. Add `docs/.vitepress/cache` and `docs/.vitepress/dist` to `.gitignore`
6. Write landing page (`docs/index.md`) with hero and features
7. Verify local dev: `bun run docs:dev`

### Phase 2: Screenshot Automation (2-3 hours)

1. Add Playwright as dev dependency: `bun add -D playwright @playwright/test`
2. Create `scripts/generate-screenshots.ts`:
   - Define screenshot configs (12 screenshots per table above)
   - Handle app startup (preview server)
   - Navigate wizard steps with test data
   - Support light/dark mode and viewport sizes
3. Add `data-testid` attributes to key UI elements if not present
4. Run locally, verify all 12 screenshots generate correctly
5. Commit initial screenshots to `docs/public/screenshots/`

### Phase 3: Documentation Content (3-4 hours)

1. Write Getting Started guide with screenshots embedded
2. Write 3 use case pages with step-by-step walkthroughs
3. Write reference pages (methodology, data sources, filters, templates)
4. Write citation page with CFF and BibTeX
5. Review all pages for clinical accuracy and professional tone
6. Add cross-links between pages

### Phase 4: CI/CD Integration (1 hour)

1. Modify `.github/workflows/deploy.yml`:
   - Add docs build step
   - Add artifact merge step
   - Add PWA denylist for `/docs/` path
2. Create `.github/workflows/screenshots.yml`:
   - Trigger on UI component changes
   - Build app, run Playwright script
   - Commit updated screenshots if changed
3. Test full deployment pipeline
4. Verify both app and docs work at their respective URLs

### Phase 5: README Streamlining (30 min)

1. Slim down README.md to essentials:
   - Title, badges, one-line description
   - One hero screenshot/GIF
   - 3-step quick start
   - Link to full documentation site
   - License + citation
2. Add "Documentation" badge linking to docs site

---

## 6. Ongoing Maintenance

- **Screenshot updates**: Automatic via CI when `src/components/**` changes
- **Content updates**: Manual, tracked via PR reviews
- **VitePress upgrades**: Follows Vite ecosystem updates (same cadence as main app)
- **Link checking**: Add `markdown-link-check` to CI (optional)

---

## Sources

- [Ten Simple Rules for Documenting Scientific Software (PLOS)](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1006561)
- [VitePress Official Documentation](https://vitepress.dev/guide/what-is-vitepress)
- [VitePress GitHub Pages Deployment](https://vitepress.dev/guide/deploy)
- [VitePress Getting Started](https://vitepress.dev/guide/getting-started)
- [VitePress vs Astro Starlight (DEV Community)](https://dev.to/kevinbism/coding-the-perfect-documentation-deciding-between-vitepress-and-astro-starlight-2i11)
- [Nuxt vs VitePress vs Astro (Vue Mastery)](https://www.vuemastery.com/blog/nuxt-vs-vitepress-vs-astro/)
- [Deploying Multiple Apps to GitHub Pages (This Dot Labs)](https://www.thisdot.co/blog/deploying-multiple-apps-from-a-monorepo-to-github-pages)
- [Playwright Screenshots for Documentation](https://mfyz.com/github-actions-and-playwright-to-generate-web-page-screenshots/)
- [Advanced Playwright Screenshot Patterns](https://lirantal.com/blog/advanced-usage-patterns-for-taking-page-element-screenshots-with-playwright)
- [shot-scraper GitHub Actions Integration](https://shot-scraper.datasette.io/en/stable/github-actions.html)
- [Best Practices for Sharing Research Software (NIH)](https://datascience.nih.gov/tools-and-analytics/best-practices-for-sharing-research-software-faq)
- [Astro Starlight 2025 Year in Review](https://astro.build/blog/year-in-review-2025/)
