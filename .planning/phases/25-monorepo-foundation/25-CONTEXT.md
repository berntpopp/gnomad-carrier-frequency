# Phase 25: Monorepo Foundation & Core Extraction - Context

**Gathered:** 2026-02-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Restructure the repository as a bun workspaces monorepo (`packages/core`, `apps/web`), extract all shared logic into `@gnomad-cf/core`, and ensure the web app builds and deploys identically from the new structure. The CLI package (`packages/cli`) is created in Phase 27 — this phase only establishes the monorepo structure and core package.

</domain>

<decisions>
## Implementation Decisions

### Package boundaries
- Core = types + queries + fetch-based gnomAD client + variant filters + carrier frequency calculations + clinical text templates/renderer + all config JSONs
- Core has zero Vue/Pinia/villus imports — verified by TypeScript compilation in isolated `node` environment
- Web app keeps Vue composables as thin reactive wrappers around core functions (useGeneSearch, useGeneVariants, useCarrierFrequency, useTextGenerator delegate all logic to core)
- villus remains in apps/web as the Vue-reactive transport — web composables call core's query strings via villus, not core's fetch client
- GraphQL query strings defined once in core, consumed by both future CLI (via core's fetch client) and web app (via villus using core's query strings)

### Migration strategy
- Incremental extraction: create empty core package first, then move types, queries, filters, calculations, templates, configs one module at a time
- Individual commits may break deploy during migration — branch-level deployability is the requirement (branch deploys correctly before merging to main)
- Light cleanup of apps/web/src/ after extraction: remove empty folders, update barrel exports, but preserve existing structure
- GitHub Actions CI workflow updated as part of Phase 25 — deploy must work from the new monorepo structure before phase is complete

### Build & dev experience
- tsdown (v0.20.x, pinned) for core package build — ESM only output
- Vite alias resolves `@gnomad-cf/core` to source files during dev — instant hot-reload, no rebuild step needed
- `bun run dev` at root starts web app only (Vite dev server) — core watch mode unnecessary due to Vite alias
- `bun run build` at root orchestrates dependency order: builds core (tsdown) first, then web (Vite)
- `bun run test` at root runs Vitest with per-package project configs

### Naming & conventions
- Core package name: `@gnomad-cf/core`
- Subpath exports by domain (tree-shakeable):
  - `@gnomad-cf/core/calculations` — carrier frequency math
  - `@gnomad-cf/core/filters` — variant filtering logic
  - `@gnomad-cf/core/queries` — GraphQL query strings + response types
  - `@gnomad-cf/core/client` — fetch-based gnomAD client
  - `@gnomad-cf/core/templates` — clinical text renderer
  - `@gnomad-cf/core/config` — config JSONs + typed loaders
  - `@gnomad-cf/core/types` — shared cross-cutting domain types (Gene, Variant, Population)
  - `@gnomad-cf/core` — convenience top-level re-export of key items
- Types co-located with runtime code per subpath; shared domain types (Gene, Variant, Population) in `/types`
- tsdown `exports: true` auto-generates package.json exports field
- Web app keeps `@/` alias (resolves to `apps/web/src/`) for intra-app imports
- `@gnomad-cf/core/*` for cross-package imports — two clear scopes, no conflict

### Claude's Discretion
- Exact order of incremental module extraction (types first is likely, but Claude can optimize)
- tsdown configuration details (entry points, DTS generation settings)
- Vitest per-package project config structure
- How to handle the villus → core query string bridging in web composables
- Exact Vite alias configuration for dev-time source resolution

</decisions>

<specifics>
## Specific Ideas

- Core's fetch client should work in Node, Bun, and browser — use standard `fetch` API
- tsdown auto-export generation preferred over manual package.json exports maintenance
- The `@/` + `@gnomad-cf/core/*` dual alias pattern is the standard monorepo convention — keep both
- Subpath exports chosen over barrel files for tree-shaking (community consensus 2025+)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 25-monorepo-foundation*
*Context gathered: 2026-02-23*
