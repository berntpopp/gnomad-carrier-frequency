# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Vue 3 SPA for genetic counselors to calculate carrier frequencies for autosomal recessive conditions. Queries gnomAD GraphQL API directly from browser, calculates recurrence risks, and generates German clinical documentation text ready to paste into patient letters.

## Commands

```bash
bun install          # Install dependencies
bun run dev          # Start dev server (http://localhost:5173)
bun run build        # TypeScript check + Vite build
bun run lint         # ESLint with Vue 3 + TypeScript
bun run typecheck    # vue-tsc type checking only
bun run preview      # Preview production build locally
```

## Architecture

### Layer Structure
```
src/
├── api/              # gnomAD GraphQL client (villus) and queries
├── components/       # Vue components
│   └── wizard/       # 4-step wizard flow components
├── composables/      # Vue composables (use* pattern)
├── config/           # JSON configs + type-safe loaders
├── stores/           # Pinia stores (persisted to localStorage)
├── types/            # TypeScript type definitions
└── utils/            # Pure utility functions
```

### Data Flow
1. **Gene Search** → `useGeneSearch` composable queries gnomAD for gene info
2. **Variant Fetch** → `useGeneVariants` fetches variants, `variant-filters.ts` filters LoF HC + ClinVar pathogenic
3. **Frequency Calc** → `useCarrierFrequency` calculates carrier frequency from allele frequencies
4. **Text Generation** → `useTextGenerator` + `template-renderer.ts` produces clinical text from templates

### Key Patterns
- **Composables** in `src/composables/` manage reactive state and API calls
- **Config-driven**: All magic numbers and strings in `src/config/` JSON files, accessed via typed helpers
- **Template Store** (`useTemplateStore`): Pinia store with persistence for user preferences (language, gender style, enabled sections)
- **Wizard State**: `useWizard` composable manages 4-step flow with validation and downstream reset

### gnomAD Integration
- GraphQL client via `villus` in `src/api/client.ts`
- Supports multiple gnomAD versions (v4.1, v2.1.1) with version-specific configs
- Queries in `src/api/queries/`: gene search, gene variants
- Version/dataset selection stored in config

### Clinical Text System
- Templates in `src/config/templates/` (de.json, en.json)
- `template-renderer.ts` handles variable substitution with `{{variable}}` syntax
- Supports perspectives: affected patient, carrier, family member
- German gender-inclusive language with configurable style (*, :, /)

## Tech Stack
- **Framework**: Vue 3 with Composition API + `<script setup>`
- **UI**: Vuetify 3 (Material Design, stepper component)
- **Build**: Vite 7, TypeScript 5.9
- **State**: Pinia with persisted state plugin
- **GraphQL**: villus client
- **Deployment**: GitHub Pages at `/gnomad-carrier-frequency/`

## WSL2 Note
Vite config includes polling for file watching on WSL2 with Windows filesystem.
