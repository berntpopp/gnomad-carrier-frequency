# Technology Stack

**Project:** gnomAD Carrier Frequency Calculator
**Researched:** 2026-01-18
**Overall Confidence:** HIGH

## Executive Summary

This stack prioritizes **developer velocity, type safety, and minimal bundle size** for a single-page genetic counseling tool. The constraints (Bun, Vue 3, Vuetify 3, Vite, TypeScript, GitHub Pages) are well-established and mutually compatible. The key decision is the GraphQL client: **villus** is recommended over Apollo Client for its Vue-native design and smaller footprint.

---

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Vue | ^3.5.26 | UI framework | Constraint. Composition API + `<script setup>` provides excellent TypeScript support and terse code. | HIGH |
| Vuetify | ^3.11.6 | Component library | Constraint. Built-in `v-stepper` component matches the wizard UI requirement. Material Design consistency. | HIGH |
| Vite | ^7.3.1 | Build tool | Constraint. Sub-50ms HMR, native ESM, optimal for SPA development. | HIGH |
| TypeScript | ^5.7.x | Type safety | Constraint. Strict mode enables compile-time error catching. | HIGH |

### State Management

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Pinia | ^3.0.4 | State management | Official Vue 3 state library. 40% less boilerplate than Vuex, full TypeScript inference, Composition API native. No mutations ceremony. | HIGH |

**Why not Vuex?** Vuex is legacy. Pinia is officially recommended by Vue core team and described as "de facto Vuex 5" by Evan You. For new Vue 3 projects, Pinia is the only correct choice.

### GraphQL Client

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| villus | ^3.5.2 | GraphQL client | Vue-native, <4KB gzipped, Composition API first, TypeScript support. Designed for Vue, not adapted from React. | HIGH |
| graphql | ^16.x | GraphQL core | Required peer dependency for villus. | HIGH |

**Why villus over Apollo Client?**

| Criterion | villus | Apollo Client |
|-----------|--------|---------------|
| Bundle size | ~4KB | ~31KB |
| Vue integration | Native | Adapted wrapper |
| API surface | Minimal, focused | Large, complex |
| TypeScript | First-class | Good, but more ceremony |
| Caching | Simple document cache | Normalized cache (overkill for this app) |
| Learning curve | Low | Medium-high |

Apollo Client's normalized cache is valuable for complex apps with many overlapping queries. This app has 1-2 query types (gene lookup, variant lookup). villus's document cache is sufficient and simpler.

**Why not urql?** urql is excellent but React-first. villus is purpose-built for Vue with Vue-native reactivity integration.

### Utilities

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| @vueuse/core | ^14.1.0 | Vue composables | `useClipboard` for copy-to-clipboard, `useLocalStorage` for preferences. Tree-shakeable, 200+ composables. Requires Vue 3.5+. | HIGH |

**Key composables for this project:**
- `useClipboard({ legacy: true })` - Copy German text with Safari fallback
- `useLocalStorage` - Persist user preferences (population selection, text format)
- `useDebounceFn` - Debounce gene search input

### Type Generation (Optional but Recommended)

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| @graphql-codegen/cli | ^5.x | Type generation | Generate TypeScript types from gnomAD GraphQL schema. Ensures type safety for API responses. | MEDIUM |
| @graphql-codegen/typescript | ^4.x | TypeScript plugin | Core types for GraphQL operations. | MEDIUM |
| @graphql-codegen/client-preset | ^4.x | Client preset | Modern preset for typed document nodes. | MEDIUM |

**Why MEDIUM confidence?** The gnomAD schema is large. Code generation adds complexity. For a small app with 2-3 queries, manual typing may be sufficient. Evaluate during development.

### Testing (Dev Dependencies)

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| vitest | ^3.x | Unit/component testing | Vite-native, same config as dev server, fast HMR in test mode. | HIGH |
| @vue/test-utils | ^2.x | Vue testing utilities | Official Vue testing library. | HIGH |
| @testing-library/vue | ^8.x | Component testing | User-behavior focused testing. Complements Vue Test Utils. | MEDIUM |

### Linting & Formatting (Dev Dependencies)

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| eslint | ^9.x | Linting | Flat config format (ESLint 9+). Catches errors, enforces consistency. | HIGH |
| @vue/eslint-config-typescript | latest | Vue + TS rules | Official Vue ESLint config for TypeScript. | HIGH |
| prettier | ^3.x | Formatting | Code formatting. Use eslint-config-prettier to avoid conflicts. | HIGH |
| eslint-config-prettier | latest | Conflict resolution | Disables ESLint rules that conflict with Prettier. | HIGH |

---

## Alternatives Considered

### GraphQL Clients

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| villus | Apollo Client | 8x larger bundle, complex normalized cache unnecessary for this app |
| villus | urql | React-first design, less Vue-native |
| villus | fetch + manual types | More boilerplate, no caching, less maintainable |

### State Management

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| Pinia | Vuex | Legacy, more boilerplate, officially superseded |
| Pinia | Composables only | Could work for this app, but Pinia adds DevTools support and structure |

### Clipboard

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| @vueuse/core useClipboard | vue-clipboard3 | VueUse is more maintained, provides many other utilities |
| @vueuse/core useClipboard | navigator.clipboard direct | No Safari fallback, no reactive state |

---

## gnomAD API Integration Notes

### Endpoint

```
https://gnomad.broadinstitute.org/api
```

### CORS Status

The gnomAD API supports browser-based fetch requests. The GitHub documentation shows JavaScript examples using standard `fetch()` without special CORS configuration. Direct browser queries are supported.

### Rate Limiting

Rate limiting exists at the IP level. For normal usage (occasional gene lookups by a single user), this should not be an issue. Certain IPs can be whitelisted if needed.

### Query Pattern

```typescript
const response = await fetch('https://gnomad.broadinstitute.org/api', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: GENE_VARIANTS_QUERY,
    variables: { geneSymbol: 'CFTR', dataset: 'gnomad_r4' }
  })
});
```

### Available Datasets

- `gnomad_r4` - Latest (gnomAD v4)
- `gnomad_r3` - gnomAD v3 (recommended for this project - well-documented)
- `gnomad_r2_1` - gnomAD v2.1
- Various filtered subsets (non_neuro, non_cancer, etc.)

---

## Installation

```bash
# Initialize project with Vite + Vue 3 + TypeScript
bun create vite gnomad-carrier-frequency --template vue-ts

# Core dependencies
bun add vue vuetify pinia villus graphql @vueuse/core

# Vuetify dependencies
bun add @mdi/font

# Dev dependencies
bun add -D typescript vite @vitejs/plugin-vue
bun add -D vitest @vue/test-utils
bun add -D eslint @vue/eslint-config-typescript prettier eslint-config-prettier
bun add -D vue-tsc  # For type checking Vue SFCs

# Optional: GraphQL codegen
bun add -D @graphql-codegen/cli @graphql-codegen/typescript @graphql-codegen/client-preset
```

---

## Configuration Files

### vite.config.ts

```typescript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  base: '/gnomad-carrier-frequency/',  // GitHub Pages subpath
  resolve: {
    alias: {
      '@': '/src'
    }
  }
})
```

### tsconfig.json (Key Settings)

```json
{
  "compilerOptions": {
    "strict": true,
    "moduleResolution": "bundler",
    "target": "ESNext",
    "module": "ESNext",
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### villus Setup (src/plugins/villus.ts)

```typescript
import { createClient, defaultPlugins } from 'villus'

export const villusClient = createClient({
  url: 'https://gnomad.broadinstitute.org/api',
  use: defaultPlugins()
})
```

---

## What NOT to Use

| Technology | Why Avoid |
|------------|-----------|
| Vuex | Legacy, replaced by Pinia |
| Apollo Client | Overkill for simple queries, large bundle |
| axios | fetch is sufficient for GraphQL, no need for extra dependency |
| Vue Class Components | Deprecated pattern, Composition API is the standard |
| Options API | Composition API has better TypeScript support and is recommended for new projects |
| Tailwind CSS | Conflicts with Vuetify's styling approach; use Vuetify's built-in utility classes |
| vue-clipboard2 | Deprecated, not compatible with Vue 3 |
| Nuxt | SSR/SSG framework, overkill for a GitHub Pages SPA |

---

## Bun Compatibility Notes

Bun works seamlessly as a package manager for Vue 3 + Vite projects:

- Use `bun install` instead of `npm install`
- Use `bun run dev` instead of `npm run dev`
- Add `--bun` flag to run Vite with Bun runtime: `bunx --bun vite`
- For Vitest: use `bun run test`, NOT `bun test` (which invokes Bun's own test runner)

Vite requires Node.js 20.19+ or 22.12+. Bun handles this correctly as it uses its own runtime for most operations.

---

## Version Currency Note

All versions verified via npm registry and official sources as of 2026-01-18:

| Package | Verified Version | Source |
|---------|------------------|--------|
| Vue | 3.5.26 | npm, Vue School 2025 review |
| Vuetify | 3.11.6 | npm, Vuetify April 2025 update |
| Vite | 7.3.1 | npm, Vite releases page |
| Pinia | 3.0.4 | npm, GitHub releases |
| villus | 3.5.2 | npm, GitHub releases |
| VueUse | 14.1.0 | npm (requires Vue 3.5+) |
| vue-router | 4.6.4 | npm (not needed for single-page) |

---

## Sources

### Official Documentation
- [Vue.js Official Docs](https://vuejs.org/)
- [Vuetify 3 Docs](https://vuetifyjs.com/)
- [Pinia Official Docs](https://pinia.vuejs.org/)
- [villus Documentation](https://villus.dev/)
- [VueUse Documentation](https://vueuse.org/)
- [Vite Documentation](https://vite.dev/)

### gnomAD
- [gnomAD GraphQL API (GitHub)](https://github.com/broadinstitute/gnomad-browser/tree/main/graphql-api)
- [gnomAD API Endpoint](https://gnomad.broadinstitute.org/api)
- [gnomAD Help - API](https://gnomad.broadinstitute.org/help/how-do-i-query-a-batch-of-variants-do-you-have-an-api)

### Comparisons & Best Practices
- [GraphQL in Vue: 5 Best Approaches (Tailcall)](https://tailcall.run/blog/graphql-vue-client/)
- [Vuex vs Pinia 2025 Guide (Medium)](https://medium.com/@vishalhari01/vuex-vs-pinia-the-ultimate-guide-to-vue-js-state-management-in-2025-36f629d85aa7)
- [Vue.js 2025 in Review (Vue School)](https://vueschool.io/articles/news/vue-js-2025-in-review-and-a-peek-into-2026/)
- [Vue 3 + TypeScript Best Practices (Enterprise Guide)](https://eastondev.com/blog/en/posts/dev/20251124-vue3-typescript-best-practices/)
- [How to Copy to Clipboard in Vue (Vue School)](https://vueschool.io/articles/vuejs-tutorials/how-to-copy-to-clipboard-in-vue/)
- [Bun with Vite (Official Docs)](https://bun.com/docs/guides/ecosystem/vite)
