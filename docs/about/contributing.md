# Contributing

Thank you for your interest in contributing to the gnomAD Carrier Frequency Calculator. This guide covers development setup, code standards, and the pull request process.

## Prerequisites

- [Node.js](https://nodejs.org/) 18 or later
- [Bun](https://bun.sh/) package manager (recommended) or npm
- Git

## Development Setup

### Clone the Repository

```bash
git clone https://github.com/berntpopp/gnomad-carrier-frequency.git
cd gnomad-carrier-frequency
```

### Install Dependencies

```bash
bun install
```

### Start Development Server

```bash
bun run dev
```

The app runs at `http://localhost:5173`.

### Run the Documentation Site

```bash
bun run docs:dev
```

The docs site runs at `http://localhost:5174` (or the next available port).

## Available Commands

| Command | Description |
|---------|-------------|
| `bun run dev` | Start development server |
| `bun run build` | TypeScript check + production build |
| `bun run lint` | Run ESLint with Vue 3 + TypeScript rules |
| `bun run typecheck` | Run vue-tsc type checking |
| `bun run preview` | Preview production build |
| `bun run docs:dev` | Start VitePress documentation dev server |
| `bun run docs:build` | Build documentation site |

## Code Style

- **Framework**: Vue 3 with Composition API and `<script setup>` syntax
- **Language**: TypeScript with strict mode
- **UI Library**: Vuetify 3 (Material Design components)
- **State**: Pinia stores with persisted state
- **Naming**: Composables use `use*` prefix (e.g., `useGeneSearch`), utilities are pure functions
- **Config-driven**: Magic numbers and strings go in `src/config/` JSON files, not in component code

Before submitting a pull request, ensure all checks pass:

```bash
bun run lint      # No lint errors
bun run typecheck # No type errors
bun run build     # Builds successfully
```

## Project Structure

```
src/
  api/           # gnomAD GraphQL client and queries
  components/    # Vue components (wizard/ subdirectory for wizard steps)
  composables/   # Reactive composables (useGeneSearch, useCarrierFrequency, etc.)
  config/        # JSON configuration files with typed loaders
  stores/        # Pinia stores (template store, history store)
  types/         # TypeScript type definitions
  utils/         # Pure utility functions (variant filters, template renderer)
docs/            # VitePress documentation site
```

## Pull Request Process

1. Fork the repository and create a feature branch from `main`
2. Make your changes with clear, focused commits
3. Ensure all checks pass: lint, typecheck, build
4. Open a pull request with a description of what changed and why
5. Wait for review - the maintainer will review and merge or request changes

## Reporting Issues

Use the [GitHub issue tracker](https://github.com/berntpopp/gnomad-carrier-frequency/issues) to report bugs or suggest features. Include:

- Steps to reproduce (for bugs)
- Expected vs. actual behavior
- Browser and OS information
- Screenshots if applicable

---

See the [Getting Started](/guide/getting-started) guide for a user-oriented walkthrough of the calculator, or the [Reference](/reference/) section for technical details about methodology and filters.
