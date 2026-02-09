# Phase 16: VitePress Setup - Research

**Researched:** 2026-02-09
**Domain:** VitePress static site generator, Vite PWA coexistence, Makefile integration
**Confidence:** HIGH

## Summary

VitePress 2.0.0-alpha.16 is the current version, built on Vite 7.3.1 and Vue 3.5.27. Installation uses `npm add -D vitepress@next` and requires Node.js 18+. VitePress is ESM-only and integrates seamlessly with existing Vite projects when scaffolded in a nested `docs/` directory. The project uses file-based routing where directory structure directly maps to URL structure. Configuration is via `.vitepress/config.ts` using TypeScript. Theme customization is minimal—CSS variables override brand colors, with `--vp-c-brand-1` being the primary brand color variable. Built-in local search works offline with zero external dependencies. PWA service worker coexistence requires adding `/docs/` path to `navigateFallbackDenylist` regex array in the existing app's `vite.config.ts`.

**Primary recommendation:** Install VitePress alpha into `docs/` directory, configure with `base: '/gnomad-carrier-frequency/docs/'`, override `--vp-c-brand-1` CSS variable to `#a09588`, and add PWA denylist pattern `/^\/docs/` to prevent service worker interception.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| vitepress | 2.0.0-alpha.16 | Static site generator | Built on Vite 7 + Vue 3, official Vue ecosystem project |
| vite | 7.3.1 (peer dep) | Build tool | Already used by main app, shared dependency |
| vue | 3.5.27 (peer dep) | Framework | Already used by main app, shared dependency |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @vitepress/theme-default | included | Default theme | Always—provides nav, sidebar, home layout |
| minisearch | bundled | Local search | Enabled via `search: { provider: 'local' }` config |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| VitePress | Astro Starlight | More features but different framework (Astro vs Vue), separate node_modules |
| VitePress | VuePress | Older, Vue 2 based, superseded by VitePress |
| VitePress | Docusaurus | React-based, requires separate React dependency |

**Installation:**
```bash
npm add -D vitepress@next
```

Note: Use `@next` tag for alpha version. Current stable is 1.6.4, but alpha 2.0.0 includes Vite 7 support.

## Architecture Patterns

### Recommended Project Structure
```
.
├── docs/                       # VitePress root (nested in existing project)
│   ├── .vitepress/            # VitePress config and build output
│   │   ├── config.ts          # Main configuration file
│   │   ├── theme/             # Theme customization
│   │   │   ├── index.ts       # Theme entry (extends default)
│   │   │   └── custom.css     # CSS variable overrides
│   │   ├── cache/             # Dev server cache (gitignored)
│   │   └── dist/              # Build output (gitignored)
│   ├── public/                # Static assets (copied to root)
│   ├── index.md               # Home page (layout: home)
│   ├── guide/                 # Guide section
│   │   ├── index.md           # Section landing page
│   │   └── *.md               # Guide pages
│   ├── use-cases/             # Use Cases section
│   ├── reference/             # Reference section
│   └── about/                 # About section
├── src/                       # Existing Vue app
├── vite.config.ts             # App Vite config (add PWA denylist)
├── package.json               # Add docs:* scripts
├── Makefile                   # Add docs targets
└── .gitignore                 # Add .vitepress/cache and .vitepress/dist
```

### Pattern 1: Config.ts Structure
**What:** TypeScript configuration file for VitePress site metadata, navigation, sidebar, and theme
**When to use:** Required for all VitePress projects
**Example:**
```typescript
// Source: https://vitepress.dev/reference/site-config
import { defineConfig } from 'vitepress'

export default defineConfig({
  // Site metadata
  title: 'gnomAD Carrier Frequency Docs',
  description: 'Calculate carrier frequencies for autosomal recessive conditions from gnomAD data',
  base: '/gnomad-carrier-frequency/docs/',  // GitHub Pages subpath

  // Theme behavior
  appearance: true,  // Enable dark mode (follows system preference)

  // Build configuration
  outDir: './.vitepress/dist',

  // Head tags (favicon, etc.)
  head: [
    ['link', { rel: 'icon', href: '/gnomad-carrier-frequency/favicon.svg' }]
  ],

  // Theme configuration
  themeConfig: {
    // Navigation bar
    nav: [
      { text: 'Guide', link: '/guide/' },
      { text: 'Use Cases', link: '/use-cases/' },
      { text: 'Reference', link: '/reference/' },
      { text: 'About', link: '/about/' },
      { text: 'Calculator', link: '/gnomad-carrier-frequency/' }  // Link to app
    ],

    // Sidebar (hierarchical structure)
    sidebar: {
      '/guide/': [
        {
          text: 'Guide',
          items: [
            { text: 'Introduction', link: '/guide/' },
            { text: 'Getting Started', link: '/guide/getting-started' }
          ]
        }
      ]
      // Repeat for /use-cases/, /reference/, /about/
    },

    // Social links
    socialLinks: [
      { icon: 'github', link: 'https://github.com/berntpopp/gnomad-carrier-frequency' }
    ],

    // Built-in local search
    search: {
      provider: 'local'
    }
  }
})
```

### Pattern 2: Theme Customization
**What:** Extend default theme to override CSS variables for brand colors
**When to use:** When you need to customize colors, fonts, or other theme styles
**Example:**
```typescript
// Source: https://vitepress.dev/guide/extending-default-theme
// .vitepress/theme/index.ts
import DefaultTheme from 'vitepress/theme'
import './custom.css'

export default DefaultTheme
```

```css
/* .vitepress/theme/custom.css */
/* Source: https://github.com/vuejs/vitepress/blob/main/src/client/theme-default/styles/vars.css */
:root {
  /* Light mode brand color */
  --vp-c-brand-1: #a09588;  /* Primary brand color (links, buttons) */
  --vp-c-brand-2: #8a7f72;  /* Darker variant (hover states) */
  --vp-c-brand-3: #6d665c;  /* Darkest variant */
  --vp-c-brand-soft: rgba(160, 149, 136, 0.14);  /* Soft background */
}

.dark {
  /* Dark mode brand color */
  --vp-c-brand-1: #c0b5a8;  /* Lighter for dark backgrounds */
  --vp-c-brand-2: #a09588;  /* Medium variant */
  --vp-c-brand-3: #8a7f72;  /* Darker variant */
  --vp-c-brand-soft: rgba(160, 149, 136, 0.16);  /* Soft background */
}
```

### Pattern 3: Home Layout (Landing Page)
**What:** YAML frontmatter for hero section with features and call-to-action buttons
**When to use:** For the main `index.md` landing page
**Example:**
```yaml
# Source: https://vitepress.dev/reference/default-theme-home-page
---
layout: home

hero:
  name: gnomAD Carrier Frequency
  text: Calculate carrier frequencies for autosomal recessive conditions
  tagline: Query gnomAD variant data to calculate carrier frequencies and generate clinical documentation
  actions:
    - theme: brand
      text: Open Calculator
      link: /gnomad-carrier-frequency/
    - theme: alt
      text: Getting Started
      link: /guide/getting-started

features:
  - icon: 🧬
    title: gnomAD Integration
    details: Query the gnomAD GraphQL API directly from the browser for comprehensive variant data
  - icon: 📊
    title: Carrier Frequency Calculation
    details: Calculate carrier frequencies from allele frequencies with support for multiple populations
  - icon: 📄
    title: Clinical Text Generation
    details: Generate German and English clinical documentation text from customizable templates
---
```

### Pattern 4: Package.json Scripts
**What:** npm scripts to run VitePress dev, build, and preview commands
**When to use:** Always—required to run VitePress
**Example:**
```json
{
  "scripts": {
    "docs:dev": "vitepress dev docs",
    "docs:build": "vitepress build docs",
    "docs:preview": "vitepress preview docs"
  }
}
```

### Pattern 5: PWA Service Worker Denylist
**What:** Regex pattern in workbox config to exclude `/docs/` from service worker interception
**When to use:** When VitePress docs coexist with a PWA app in the same domain
**Example:**
```typescript
// Source: https://vite-pwa-org.netlify.app/workbox/generate-sw
// vite.config.ts
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    VitePWA({
      workbox: {
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/docs/]  // Exclude /docs/ path
      }
    })
  ]
})
```

### Anti-Patterns to Avoid
- **Installing VitePress at project root:** Creates config file conflicts. Always use nested `docs/` directory.
- **Using `require()` to import VitePress:** VitePress is ESM-only. Use ES6 `import` statements.
- **Hardcoding base path in markdown links:** Use relative paths without file extensions—VitePress handles base path automatically.
- **Copying existing favicon to docs/public:** Reference existing favicon from app's public directory using absolute path with base path.
- **Deep nesting beyond 6 levels:** Sidebar ignores items nested deeper than 6 levels from root.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Site search | Custom search index + UI | VitePress built-in `search: { provider: 'local' }` | Uses minisearch library, works offline, zero config |
| Dark mode toggle | Custom theme switcher | VitePress `appearance: true` | Follows system preference, persists to localStorage, built-in UI |
| Navigation hierarchy | Custom sidebar component | VitePress `sidebar` config with nested `items` | Auto-highlights active page, supports collapsible sections, responsive |
| Hero layout | Custom Vue components | VitePress `layout: home` frontmatter | Pre-built responsive hero with image, tagline, features grid, CTA buttons |
| Asset optimization | Custom image processing | VitePress asset handling + public directory | Automatically copies public assets, handles image optimization in build |
| PWA path exclusion | Custom service worker logic | Workbox `navigateFallbackDenylist: [/^\/docs/]` | Regex-based exclusion, tested pattern, no custom SW code needed |

**Key insight:** VitePress provides comprehensive documentation site features out-of-the-box. Customization should be limited to CSS variables and config options—don't rebuild built-in functionality.

## Common Pitfalls

### Pitfall 1: Version Mismatch with Vite 7
**What goes wrong:** Installing VitePress 1.6.4 (stable) in a Vite 7 project causes peer dependency warnings or build failures
**Why it happens:** VitePress 1.6.4 uses Vite 5, but the main app uses Vite 7. Conflicting peer dependencies cause npm/pnpm errors.
**How to avoid:** Install VitePress alpha 2.0.0 with `npm add -D vitepress@next`, which uses Vite 7.3.1
**Warning signs:** Peer dependency warnings during `npm install`, type errors from `vite` imports, build failures mentioning Vite version mismatches

### Pitfall 2: Base Path Confusion
**What goes wrong:** VitePress site loads but assets return 404, or internal links break on GitHub Pages
**Why it happens:** VitePress base path must match deployment path. App is at `/gnomad-carrier-frequency/`, docs must be at `/gnomad-carrier-frequency/docs/`. Forgetting trailing slashes or using wrong path causes routing failures.
**How to avoid:** Set `base: '/gnomad-carrier-frequency/docs/'` in VitePress config. Always include leading and trailing slashes. Test with `vitepress preview` before deploying.
**Warning signs:** Assets load locally but fail on GitHub Pages, navigation links go to wrong URLs, CSS/JS files return 404

### Pitfall 3: Service Worker Intercepts Docs
**What goes wrong:** VitePress site loads initially but fails to update when docs change, or shows app content instead of docs pages
**Why it happens:** App's service worker has `navigateFallback: 'index.html'` which intercepts ALL navigation requests including `/docs/`. Without denylist, SW serves app's index.html for docs routes.
**How to avoid:** Add `navigateFallbackDenylist: [/^\/docs/]` to workbox config in app's `vite.config.ts`. Deploy both changes together (app + docs).
**Warning signs:** Docs pages show app UI, hard refresh (Ctrl+Shift+R) loads correct page, dev mode works but production doesn't

### Pitfall 4: .gitignore Missing VitePress Directories
**What goes wrong:** Committing thousands of cached files or built assets, bloating repository size and causing merge conflicts
**Why it happens:** VitePress creates `.vitepress/cache` (dev server cache) and `.vitepress/dist` (build output). Without gitignore entries, these get committed.
**How to avoid:** Add `.vitepress/cache` and `.vitepress/dist` to `.gitignore` immediately after creating config directory
**Warning signs:** Git status shows hundreds of files in `.vitepress/`, large commit sizes, merge conflicts in cache files

### Pitfall 5: Node Version Too Old
**What goes wrong:** VitePress installation fails with cryptic errors about ESM modules or syntax errors
**Why it happens:** VitePress 2.0 requires Node.js 18+. Older versions don't support ESM features or ES2022 syntax used by VitePress.
**How to avoid:** Check Node version with `node --version` before installation. Upgrade to Node.js 18+ if needed. CI/CD must also use Node 18+.
**Warning signs:** Errors mentioning "import", "cannot use import statement outside a module", syntax errors in node_modules

### Pitfall 6: Favicon Path Resolution
**What goes wrong:** Favicon works locally but shows 404 on deployed site
**Why it happens:** Favicon referenced as `/favicon.svg` (root absolute) without base path. On GitHub Pages at `/gnomad-carrier-frequency/docs/`, browser requests `/favicon.svg` instead of `/gnomad-carrier-frequency/favicon.svg`.
**How to avoid:** Use full path with base path in head config: `{ rel: 'icon', href: '/gnomad-carrier-frequency/favicon.svg' }`. Asset is in app's public directory, not docs/public.
**Warning signs:** Favicon works on `localhost:5173` but missing on GitHub Pages, console shows 404 for `/favicon.svg`

## Code Examples

Verified patterns from official sources:

### Minimal VitePress Config
```typescript
// Source: https://vitepress.dev/reference/site-config
// docs/.vitepress/config.ts
import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'gnomAD Carrier Frequency Docs',
  description: 'Calculate carrier frequencies for autosomal recessive conditions from gnomAD data',
  base: '/gnomad-carrier-frequency/docs/',

  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/' },
      { text: 'Calculator', link: '/gnomad-carrier-frequency/' }
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Guide',
          items: [
            { text: 'Introduction', link: '/guide/' }
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/berntpopp/gnomad-carrier-frequency' }
    ],

    search: {
      provider: 'local'
    }
  }
})
```

### Hierarchical Sidebar with Multiple Sections
```typescript
// Source: https://vitepress.dev/reference/default-theme-sidebar
sidebar: {
  '/guide/': [
    {
      text: 'Guide',
      items: [
        { text: 'Introduction', link: '/guide/' },
        { text: 'Getting Started', link: '/guide/getting-started' },
        {
          text: 'Core Concepts',
          collapsed: false,
          items: [
            { text: 'Carrier Frequency', link: '/guide/concepts/carrier-frequency' },
            { text: 'gnomAD Data', link: '/guide/concepts/gnomad-data' }
          ]
        }
      ]
    }
  ],
  '/use-cases/': [
    {
      text: 'Use Cases',
      items: [
        { text: 'Overview', link: '/use-cases/' },
        { text: 'Genetic Counseling', link: '/use-cases/genetic-counseling' }
      ]
    }
  ]
}
```

### Makefile Targets for Docs
```makefile
# Source: Make best practices + VitePress CLI
# Add to existing Makefile

# Documentation
docs:
	npm run docs:build

docs-dev:
	npm run docs:dev

docs-preview:
	npm run docs:preview

# Update existing ci target to include docs build
ci:
	npm run lint && npm run typecheck && npm run build && npm run docs:build && npm run lighthouse
```

### Package.json with Docs Scripts
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc -b && vite build",
    "preview": "vite preview",
    "docs:dev": "vitepress dev docs",
    "docs:build": "vitepress build docs",
    "docs:preview": "vitepress preview docs",
    "ci": "npm run lint && npm run typecheck && npm run build && npm run docs:build && npm run lighthouse"
  }
}
```

### PWA Denylist for Docs Path
```typescript
// Source: https://vite-pwa-org.netlify.app/workbox/generate-sw
// vite.config.ts (existing file, modify workbox section)
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    VitePWA({
      workbox: {
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/docs/],  // ADD THIS LINE
        runtimeCaching: [
          // Existing runtime caching config...
        ]
      }
    })
  ]
})
```

### .gitignore Additions
```gitignore
# VitePress
.vitepress/cache
.vitepress/dist
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| VitePress 1.x (Vite 5) | VitePress 2.0 alpha (Vite 7) | Jan 2026 | Requires `@next` tag for installation, breaking changes in config API |
| `--vp-c-brand` CSS var | `--vp-c-brand-1/2/3` | VitePress 1.0 | Old var deprecated, use numbered variants for light/medium/dark shades |
| `cjkFriendly` option | `cjkFriendlyEmphasis` | VitePress 1.x | Renamed in recent versions, affects CJK language emphasis rendering |
| Node.js 16 | Node.js 18+ | VitePress 1.0 | Minimum version requirement increased, older Node versions fail |
| CommonJS (`require`) | ESM (`import`) | VitePress 1.0 | VitePress is ESM-only, no CommonJS support |

**Deprecated/outdated:**
- **VitePress 1.6.4 with Vite 7 projects:** Use alpha 2.0.0 instead—stable version uses Vite 5 and causes peer dependency conflicts
- **`base` without trailing slash:** Always use trailing slash (`'/docs/'` not `'/docs'`)—VitePress documentation emphasizes this requirement
- **Manual sidebar generation:** Auto-generation plugins exist (`vitepress-sidebar` npm package) but manual config is simpler for 4 sections with few pages

## Open Questions

Things that couldn't be fully resolved:

1. **VitePress 2.0 Alpha Stability**
   - What we know: Alpha 16 is current version, uses Vite 7.3.1 + Vue 3.5.27, required for Vite 7 compatibility
   - What's unclear: Release timeline for stable 2.0, potential breaking changes before stable release
   - Recommendation: Use alpha for now (only option for Vite 7), monitor VitePress releases, expect possible minor config changes. Alpha is mature enough for this use case (official Vue docs use it).

2. **Merged Deployment Artifact Build Order**
   - What we know: App builds to `dist/`, docs build to `docs/.vitepress/dist/`, both need to be merged for single GitHub Pages deploy
   - What's unclear: Best approach to merge—copy docs build into app dist, or build directly to nested location?
   - Recommendation: Research this in Phase 19 (Deployment CI/CD). For Phase 16, focus on getting local builds working. Options: post-build copy script, GitHub Actions artifact merging, or VitePress `outDir` config pointing to `../../dist/docs/`.

3. **Favicon Reuse Mechanism**
   - What we know: App has `public/favicon.svg`, docs should reference it with full base path in head config
   - What's unclear: Will VitePress correctly resolve `/gnomad-carrier-frequency/favicon.svg` when docs are at `/gnomad-carrier-frequency/docs/`, or does favicon need to be copied to docs/public?
   - Recommendation: Start with head config pointing to app favicon path. Test on localhost and GitHub Pages. If 404s, copy favicon to docs/public and reference as `/docs/favicon.svg`.

## Sources

### Primary (HIGH confidence)
- [VitePress Getting Started](https://vitepress.dev/guide/getting-started) - Installation, setup, Node requirements
- [VitePress Site Config Reference](https://vitepress.dev/reference/site-config) - Config.ts structure, base path, head options
- [VitePress Default Theme Config](https://vitepress.dev/reference/default-theme-config) - Navigation, sidebar, social links, search
- [VitePress Home Page Reference](https://vitepress.dev/reference/default-theme-home-page) - Hero layout frontmatter structure
- [VitePress Routing Guide](https://vitepress.dev/guide/routing) - File-based routing, directory structure
- [VitePress Extending Default Theme](https://vitepress.dev/guide/extending-default-theme) - Theme customization, CSS variables
- [VitePress CLI Reference](https://vitepress.dev/reference/cli) - Commands for dev, build, preview
- [VitePress GitHub package.json](https://github.com/vuejs/vitepress/blob/main/package.json) - Dependencies (Vite 7.3.1, Vue 3.5.27)
- [VitePress GitHub vars.css](https://github.com/vuejs/vitepress/blob/main/src/client/theme-default/styles/vars.css) - Brand color CSS variables
- [Vite PWA VitePress Guide](https://vite-pwa-org.netlify.app/frameworks/vitepress) - PWA integration (not used in Phase 16)
- [Vite PWA Workbox generateSW](https://vite-pwa-org.netlify.app/workbox/generate-sw) - navigateFallbackDenylist syntax
- [Workbox Build Reference](https://developer.chrome.com/docs/workbox/modules/workbox-build) - navigateFallbackDenylist regex patterns

### Secondary (MEDIUM confidence)
- [VitePress npm page](https://www.npmjs.com/package/vitepress) - Version 1.6.4 stable, 2.0.0-alpha.16 latest
- [GitHub: VitePress Releases](https://github.com/vuejs/vitepress/releases) - Release history and changelogs
- [GitHub Discussion: VitePress in existing project](https://github.com/vuejs/vitepress/discussions/1603) - Nested directory recommendation
- [GitHub Issue: VitePress Vite compatibility](https://github.com/vuejs/vitepress/issues/2220) - Vue 3 + Vite compatibility notes
- [GitHub PR: Update gitignore for VitePress](https://github.com/github/gitignore/pull/4543) - Standard gitignore patterns

### Tertiary (LOW confidence)
- [DEV: Add VitePress to existing project](https://dev.to/arielmejiadev/add-vuepress-docs-to-existing-project-3aca) - Tutorial (mentions VuePress but principles apply)
- [Medium: VitePress Guide](https://leapcell.medium.com/vitepress-guide-from-installation-to-deployment-b6ec6713bc0d) - General tutorial
- [FreeCodeCamp: Build docs with VitePress](https://www.freecodecamp.org/news/how-to-build-a-modern-documentation-site-with-vitepress/) - Tutorial with examples

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Verified via official VitePress package.json, npm page, and GitHub releases
- Architecture: HIGH - All patterns from official VitePress documentation with verified code examples
- PWA denylist: HIGH - Verified via Vite PWA documentation and Workbox official reference
- Pitfalls: HIGH - Based on official documentation requirements (Node 18+, ESM-only, base path rules) and verified issue discussions
- VitePress 2.0 alpha stability: MEDIUM - Alpha version choice necessary for Vite 7, but release timeline unclear

**Research date:** 2026-02-09
**Valid until:** 2026-03-09 (30 days - VitePress 2.0 is in alpha, but stable enough for production use by official Vue projects)
