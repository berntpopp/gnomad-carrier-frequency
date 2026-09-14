# AGENTS.md — Guidelines for AI Coding Agents

This document defines engineering guidelines, architecture standards, and non-negotiable constraints for AI agents working on `gnomad-carrier-frequency`.

---

## 1. Core Principles & Clinical Mandate

1. **Clinical Rigor & Provenance:**
   - Calculations support clinical genetics and genetic counseling workflows.
   - Every carrier frequency ($CF$), carrier rate ($GCR$), recurrence risk, and genetic prevalence calculation must trace back to authoritative formulas in `@gnomad-cf/core/calculations`.
   - Never approximate or guess clinical formulas. Always preserve explicit research-use and clinical disclaimers.

2. **Hard File Size Limit (< 650 LOC):**
   - **Strict Rule:** No source or component file may exceed **650 lines of code (LOC)**.
   - Monolithic components (such as historical `StepResults.vue`) must be decomposed into single-responsibility sub-components (e.g., population table, export actions, source breakdown).
   - Break large composables or modules into focused utilities rather than allowing file bloat.

3. **High Test Coverage Standard (> 89% Target):**
   - Strive towards **> 89% test coverage** across the codebase.
   - All core calculation functions, filters, formatters, and composables must have direct unit test suites with parameterized boundary cases.
   - Vitest coverage thresholds are strictly enforced in CI. Regressions fail the build.

---

## 2. Monorepo Architecture & Boundaries

```
gnomad-carrier-frequency/
├── packages/
│   ├── core/           # @gnomad-cf/core: Platform-neutral logic (Node/Browser)
│   │   ├── src/calculations/  # Authoritative carrier, risk, and prevalence formulas
│   │   ├── src/filters/       # Consequence, ClinVar, and quality flag filters
│   │   ├── src/queries/       # Parameterized gnomAD GraphQL query builders
│   │   ├── src/templates/     # Clinical report template parser & compiler
│   │   └── src/types/         # Strict Zod schemas & shared TypeScript interfaces
│   └── cli/            # @gnomad-cf/cli: Executable Node.js / Bun command-line tool
├── apps/
│   └── web/            # Vue 3 SPA (Vite, Pinia, Vuetify 3, Web Workers via Comlink)
│       ├── src/components/    # Modular Vue components (< 650 LOC)
│       ├── src/composables/   # Reactive state & worker coordination
│       └── src/stores/        # Pinia stores (wizard, filters, calc, quality, exclusions)
```

### Boundary Constraints:
- `@gnomad-cf/core` must **never** import from `apps/web` or `@gnomad-cf/cli`.
- `@gnomad-cf/core` must **never** reference browser-only or DOM globals (e.g. `window`, `document`, `HTMLElement`).
- `@gnomad-cf/core` must **never** return UI-framework-specific strings (e.g. Vuetify color names); use semantic tokens instead.
- `@gnomad-cf/cli` must declare all runtime dependencies in `packages/cli/package.json` (e.g. `zod`, `commander`).
- External API calls must use parameterized GraphQL variables or strict validation.

---

## 3. State Coordination & Asynchronous Processing

1. **Monotonic Revision Tracking:**
   - Always track `dispatchedRevision` vs `desiredRevision` in worker coordinators.
   - An in-flight worker result must **only** be committed if:
     `activeGeneSessionKey === currentSessionKey && currentRevision === desiredRevision && !hasPendingChanges`.
   - Stale responses from intermediate user clicks must be discarded to prevent out-of-order race conditions and stale autosaves.

2. **Transactional History & URL Restoration:**
   - All restore operations must acquire an `isRestoring` mutex lock.
   - Target dataset and version must be set in `versionStore` **before** gene selection or worker fetch to guarantee correct assembly coordinates (`GRCh38` vs `GRCh37`).
   - Downstream resets in `useWizard` and default profile applications in `useGeneConfig` must be suppressed while `isRestoring` is true.
   - Hold `isRestoring` through `await nextTick()` until Vue microtasks settle.

3. **Recurrence Risk Invariant:**
   - Always route risk calculations through `calculateRecurrenceRisk(carrierFrequency, indexStatus, penetrance)`:
     - `heterozygous`: $CF \times 0.25 \times \text{penetrance}$
     - `homozygous` | `compound_het_confirmed` | `compound_het_assumed`: $CF \times 0.5 \times \text{penetrance}$
     - Unknown / unspecified: returns `null` (UI displays `"N/A — Index status required"`).
     - Penetrance is strictly bounded to `[0.0, 1.0]`.

---

## 4. Testing & Verification Protocols

1. **Test-Driven Development (TDD):**
   - Write reproduction tests before modifying code for defect repairs.
   - Verify failure against baseline, implement fix, then assert clean pass.
2. **Commands:**
   - Unit tests: `bun run test --run`
   - Coverage: `bun run test:coverage`
   - Type check: `bun run typecheck`
   - Lint: `bun run lint`
   - E2E tests: `bun run test:e2e`
3. **Clean Worktrees:**
   - Keep test results, coverage directories, Playwright traces, and temporary scratch files out of git commits.
