# Phase 29: Test Suite Completion & Web App Validation - Context

**Gathered:** 2026-02-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Verify the assembled system end-to-end: Vue component tests confirm the web app renders correctly after monorepo restructure, Playwright E2E confirms the wizard flow is unchanged, and CI enforces coverage thresholds on every push. No new features — pure validation and quality gates.

</domain>

<decisions>
## Implementation Decisions

### Component test scope
- Test ALL interactive components: wizard steps (StepGene, StepStatus, StepFrequency, StepResults), settings (FilterPanel, TemplateSettings, GeneConfigIndicator), and chrome (AppBar, LanguageSelector, VersionSelector)
- Test depth: key interactions (gene search, filter toggles, wizard navigation, profile switching) — skip cosmetic-only states
- Mount strategy: `mount()` with real Vuetify plugin (not `shallowMount`) — Vuetify's slot/provide/inject architecture breaks with stubs. Selectively stub only custom child components that do API calls (e.g., stub StepGene when testing WizardStepper)
- Global test setup: `createVuetify()` registered in setup file so every `mount()` gets Vuetify automatically; `ResizeObserver` mock for jsdom
- Pinia strategy: two-tier hybrid
  - Store unit tests: real `createPinia()`, test getters/actions/state directly
  - Component tests: `createTestingPinia({ stubActions: true, initialState: {...} })` — seed state, verify action calls, don't re-test store logic
  - Selective integration: `stubActions: false` for 1-2 critical wizard flow tests only
- Dependencies needed: `@pinia/testing`, `@vue/test-utils` in apps/web devDependencies

### E2E scenario coverage
- CFTR happy path only: one gene, full 4-step wizard (gene search → carrier status → frequency display → results with clinical text)
- Mock gnomAD API using Playwright `page.route()` with operation-name matching on GraphQL POST body — inline TypeScript fixtures, NOT HAR files (HAR can't distinguish GraphQL operations to same endpoint)
- URL state roundtrip: navigate wizard, copy URL params, open fresh page with those params, verify same state loads
- Clinical text assertion: verify clinical text section contains expected carrier frequency text and gene name (not just that container renders)
- Optional future: separate scheduled smoke suite against real gnomAD API (non-blocking, not part of Phase 29 scope)

### CI pipeline behavior
- Single GitHub Actions job, sequential: core tests → CLI tests → web component tests → E2E
- E2E tests run on PRs to main only (not every push to feature branches); unit/component tests run on all pushes
- Coverage reporting: console output only — no PR comment bots, no badges
- Scope: tests + coverage only — lint and typecheck are separate concerns (not part of this workflow)

### Coverage gap handling
- Coverage thresholds: core 90%+, CLI 80%+, web 40%+ (lowered from 60% — realistic for Vuetify component testing)
- Threshold enforcement: warn only (print warning in logs, don't fail the build)
- Browser-only code paths (villus client, localStorage persistence, Vite env vars) excluded with `/* istanbul ignore */` comments to keep thresholds realistic
- E2E coverage NOT counted toward package thresholds — Playwright runs in separate browser context

### Claude's Discretion
- Exact Vuetify test setup file structure and helper utilities
- Which specific interactions to test per component (within "key interactions" scope)
- Playwright fixture data shape (as long as it matches real gnomAD response structure)
- Test file organization (co-located vs `__tests__` directory)
- Vitest workspace configuration details

</decisions>

<specifics>
## Specific Ideas

- Vuetify testing approach researched thoroughly: `mount()` with real Vuetify is the only viable approach — `shallowMount` breaks Vuetify's slot rendering, provide/inject chains, and layout composables (documented in Vuetify GitHub issues #18076, #20075, #19895)
- Pinia `createTestingPinia` with `initialState` preferred over `$patch` — state is ready before component mounts, which matters for `setup()` reads
- Playwright GraphQL interception pattern: inspect `route.request().postDataJSON().operationName` to match different gnomAD operations (GeneSearch, GeneDetails, GeneVariants) going to the same endpoint
- Use `route.fallback()` (not `route.continue()`) for unmatched requests — allows handler stacking

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 29-test-suite-completion*
*Context gathered: 2026-02-24*
