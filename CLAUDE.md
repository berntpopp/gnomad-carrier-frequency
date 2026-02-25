# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Vue 3 SPA for genetic counselors to calculate carrier frequencies for autosomal recessive conditions. Queries gnomAD GraphQL API directly from browser, calculates recurrence risks, and generates German clinical documentation text ready to paste into patient letters.

The project is structured as a **bun monorepo**: shared logic lives in `@gnomad-cf/core` (platform-neutral TypeScript), the web app in `apps/web`, and a forthcoming CLI in `packages/cli`.

## Commands

Root-level scripts delegate to workspace packages:

```bash
bun install              # Install all workspace dependencies
bun run dev              # Start dev server (http://localhost:5173)
bun run build            # Build core then web app
bun run test             # Run vitest across all workspaces
bun run lint             # ESLint with Vue 3 + TypeScript
bun run typecheck        # tsc --build (composite project references)
bun run preview          # Preview production build locally
bun run docs:build       # Build VitePress documentation site
```

## Monorepo Structure

```
gnomad-carrier-frequency/        # Workspace root
├── packages/
│   └── core/                    # @gnomad-cf/core — platform-neutral shared logic
│       ├── src/
│       │   ├── types/           # All TypeScript types (GnomadVariant, etc.)
│       │   ├── config/          # JSON configs + type-safe loaders
│       │   │   └── templates/   # Clinical text templates (de.json, en.json)
│       │   ├── queries/         # gnomAD GraphQL query strings
│       │   ├── filters/         # Variant filtering (LoF HC + ClinVar pathogenic)
│       │   ├── calculations/    # Carrier frequency math + formatters
│       │   ├── templates/       # Template renderer + parser
│       │   ├── utils/           # Pure utilities (exclusion URL etc.)
│       │   └── client/          # fetch-based GraphQL client (no villus)
│       ├── tsdown.config.ts     # 9 subpath entry points
│       └── package.json         # exports map auto-maintained by tsdown
├── apps/
│   └── web/                     # gnomad-cf-web — Vue 3 SPA
│       ├── src/
│       │   ├── api/             # villus GraphQL client wrapper
│       │   ├── components/      # Vue components + wizard steps
│       │   ├── composables/     # Vue composables (use* pattern)
│       │   ├── stores/          # Pinia stores (persisted to localStorage)
│       │   └── utils/           # Web-only utils (export-utils.ts)
│       └── docs/                # VitePress documentation site
├── package.json                 # Root workspace config + shared scripts
├── tsconfig.json                # Project references: core + web
└── vitest.config.ts             # Root vitest config
```

## Data Flow

1. **Gene Search** → `useGeneSearch` composable (web) queries gnomAD for gene info
2. **Variant Fetch** → `useGeneVariants` fetches variants; `@gnomad-cf/core/filters` applies LoF HC + ClinVar pathogenic filtering
3. **Frequency Calc** → `useCarrierFrequency` calls `@gnomad-cf/core/calculations` for carrier frequency from allele frequencies
4. **Text Generation** → `useTextGenerator` (web) + `@gnomad-cf/core/templates` produces clinical text from templates

Core logic (`@gnomad-cf/core`) is Vue-free. All Vue reactivity, Pinia stores, and Vuetify UI live only in `apps/web`.

## Key Patterns

- **Composables** in `apps/web/src/composables/` manage reactive state and API calls
- **Config-driven**: All magic numbers and strings in `@gnomad-cf/core/config` JSON files, accessed via typed helpers
- **Template Store** (`useTemplateStore`): Pinia store with persistence for user preferences (language, gender style, enabled sections)
- **Wizard State**: `useWizard` composable manages 4-step flow with validation and downstream reset
- **Core imports**: Web code imports from `@gnomad-cf/core/*` subpaths (not `@/` aliases that no longer exist)

## gnomAD Integration

- Browser GraphQL client via `villus` in `apps/web/src/api/client.ts`
- Platform-neutral fetch client in `@gnomad-cf/core/client` (for CLI/Node use)
- Supports multiple gnomAD versions (v4.1, v2.1.1) with version-specific configs
- Queries in `@gnomad-cf/core/queries`: gene search, gene variants
- Version/dataset selection stored in config

## Clinical Text System

- Templates in `@gnomad-cf/core/config/templates/` (de.json, en.json)
- `template-renderer.ts` handles variable substitution with `{{variable}}` syntax
- Supports perspectives: affected patient, carrier, family member
- German gender-inclusive language with configurable style (*, :, /)

## Tech Stack

- **Framework**: Vue 3 with Composition API + `<script setup>`
- **UI**: Vuetify 3 (Material Design, stepper component)
- **Build (web)**: Vite 7, TypeScript 5.9
- **Build (core)**: tsdown 0.20.x (library bundler, tsup successor)
- **State**: Pinia with persisted state plugin
- **GraphQL (web)**: villus client
- **GraphQL (core/CLI)**: native fetch
- **Testing**: Vitest
- **Monorepo**: bun workspaces
- **Deployment**: GitHub Pages at `https://gnomad-carrier-frequency.kidney-genetics.org/`

## WSL2 Note

Vite config includes polling for file watching on WSL2 with Windows filesystem.
