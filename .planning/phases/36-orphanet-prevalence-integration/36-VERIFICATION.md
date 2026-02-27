---
phase: 36-orphanet-prevalence-integration
verified: 2026-02-27T09:07:06Z
status: passed
score: 4/4 must-haves verified
gaps: []
human_verification:
  - test: Navigate to results step with CFTR and confirm Orphanet section visible in summary card
    expected: Section at bottom of summary card showing Cystic fibrosis link, prevalence class, [AR] badge, disclaimer
    why_human: Visual layout and link behavior require browser interaction -- structural wiring verified in code
  - test: Open DevTools Network tab at Step 1, verify api.orphadata.com calls appear before clicking Next
    expected: Calls to /rd-associated-genes/ and /rd-epidemiology/ visible before navigating to Step 4
    why_human: Eager fetch timing can only be confirmed by observing network requests in a live browser
  - test: Run CLI -- cd packages/cli && bun run src/cli.ts query CFTR
    expected: Output includes --- Orphanet Prevalence --- section with disease name, [AR] tag, prevalence class, URL, note
    why_human: CLI requires live network call to real Orphanet API to verify end-to-end flow
---

# Phase 36: Orphanet Prevalence Integration Verification Report

**Phase Goal:** Users see published Orphanet disease prevalence data alongside their calculated carrier frequency, providing a clinical reference point for the gene under analysis -- with graceful degradation when the Orphanet API is unavailable.
**Verified:** 2026-02-27T09:07:06Z
**Status:** passed
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | After a gene is selected, all associated Orphanet diseases are fetched and displayed as a reference card in the results step, with each disease showing its prevalence range and a link to the Orphanet entry | VERIFIED | OrphanetSection.vue renders inside StepResults.vue summary card v-card-text; disease links bound to primaryDisease.orphanetUrl with target=_blank; prevalence class rendered via bestPrevalence.prevalenceClass; primary disease wired through useOrphanetData composable |
| 2 | The Orphanet client lives in @gnomad-cf/core (platform-neutral, fetch-based) so both web and CLI can use it, and responses are cached per session so the same gene is not fetched twice | VERIFIED | packages/core/src/orphanet/client.ts (201 lines) uses native fetch with AbortController; ./orphanet subpath in package.json and tsdown.config.ts; dist/orphanet.js and dist/orphanet.d.ts exist; useOrphanetStore.ts provides Record session cache with getCached/isPending deduplication; CLI query.ts imports from @gnomad-cf/core/orphanet |
| 3 | When the Orphanet API is unavailable (offline PWA, network errors), the app degrades gracefully without breaking the results display | VERIFIED | OrphanetSection.vue has no third branch -- on error/zero diseases renders nothing; fetchOrphanetData catch returns {diseases:[], error: string} and never throws; Workbox StaleWhileRevalidate for api.orphadata.com in vite.config.ts lines 119-132; E2E interceptOrphanetApiWithError confirms section hides while summary card renders |
| 4 | A clear disclaimer states that Orphanet prevalence reflects reported clinical prevalence, not genetic prevalence, to prevent misinterpretation | VERIFIED | Exact text in OrphanetSection.vue line 92: Orphanet reports clinical prevalence (diagnosed cases), not genetic carrier prevalence.; only rendered inside v-else-if=primaryDisease branch; E2E test asserts this exact string |

**Score:** 4/4 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| packages/core/src/orphanet/types.ts | 5 Orphanet interfaces | VERIFIED | 52 lines; OrphanetGeneResult, OrphanetGeneAssociation, OrphanetPrevalenceEntry, OrphanetDisease, OrphanetResult exported; no stubs |
| packages/core/src/orphanet/client.ts | 7 exported functions | VERIFIED | 201 lines; all functions present; gene symbol lowercased at line 35; AbortController 5000ms; 404 returns [] in catch; Promise.allSettled across orphacodes; no stub patterns |
| packages/core/src/orphanet/index.ts | Re-exports all public API | VERIFIED | 18 lines; re-exports 5 types and 6 client functions from ./types.js and ./client.js |
| packages/core/tsdown.config.ts | orphanet entry point | VERIFIED | Line 16: orphanet: src/orphanet/index.ts present in entry object |
| packages/core/package.json | ./orphanet export | VERIFIED | ./orphanet: ./dist/orphanet.js present in exports map |
| packages/core/dist/orphanet.js | Built JS output | VERIFIED | File exists with source map at dist/orphanet.js |
| packages/core/dist/orphanet.d.ts | Built type declarations | VERIFIED | File exists with source map at dist/orphanet.d.ts |
| apps/web/src/stores/useOrphanetStore.ts | Pinia session cache, no persist | VERIFIED | 64 lines; defineStore with Record<string,OrphanetResult> cache and pending tracking; no persist: true; all keys lowercased; getCached/setCached/isPending/setPending actions |
| apps/web/src/composables/useOrphanetData.ts | Reactive composable with cache-first fetchForGene | VERIFIED | 127 lines; imports from @gnomad-cf/core/orphanet (not relative); exposes loading, diseases, primaryDisease, additionalDiseases, error, hasData, fetchForGene; cache-first at lines 86-95; pending dedup at lines 93-95 |
| apps/web/src/components/OrphanetSection.vue | Skeleton + content + hidden states | VERIFIED | 116 lines; v-if loading shows skeleton; v-else-if primaryDisease shows content; no third branch (hides on error/empty); disease link target=_blank rel=noopener noreferrer; [AR] badge; v-chip +N more; v-expand-transition; disclaimer at line 92; data-testid on both visible divs |
| apps/web/src/components/wizard/WizardStepper.vue | Eager fetch on gene selection at Step 1 | VERIFIED | Lines 127, 144, 200-210: imports useOrphanetData; destructures fetchForGene: fetchOrphanet; watch on state.gene with immediate:true |
| apps/web/src/components/wizard/StepResults.vue | OrphanetSection integrated in summary card | VERIFIED | Lines 635-713: imports useOrphanetData and OrphanetSection; watcher on props.result?.gene with immediate:true; OrphanetSection at lines 242-247 inside v-card-text |
| apps/web/vite.config.ts | Workbox cache for api.orphadata.com | VERIFIED | Lines 119-132: urlPattern for api.orphadata.com; StaleWhileRevalidate; cacheName orphanet-api-cache; 24h expiry; 50-entry cap |
| packages/cli/src/types.ts | orphanetDiseases on QueryResult | VERIFIED | Line 4: imports OrphanetDisease from @gnomad-cf/core/orphanet; line 34: orphanetDiseases?: OrphanetDisease[] on QueryResult |
| packages/cli/src/commands/query.ts | Orphanet fetch after gnomAD query, silent failure | VERIFIED | import fetchOrphanetData at line 29; try/catch silent failure at lines 140-147; populates result.orphanetDiseases on success |
| packages/cli/src/output/text-formatter.ts | formatOrphanetSection function | VERIFIED | Lines 111-124: function with --- Orphanet Prevalence --- header, disease/AR/prevalence/URL/note; integrated into formatText at lines 203-205 |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| packages/core/src/orphanet/client.ts | https://api.orphadata.com | native fetch + AbortController | WIRED | ORPHANET_BASE constant; fetchWithTimeout uses fetch with AbortController signal; 5000ms timeout; clearTimeout in both paths |
| packages/core/src/orphanet/index.ts | packages/core/src/orphanet/client.ts | re-export | WIRED | export { fetchOrphanetData, selectBestPrevalence, selectPrimaryDisease, fetchDiseasesByGeneSymbol, fetchEpidemiology, fetchNaturalHistory } from ./client.js |
| apps/web/src/composables/useOrphanetData.ts | @gnomad-cf/core/orphanet | import fetchOrphanetData, selectPrimaryDisease | WIRED | Lines 2-7: imports 4 names from @gnomad-cf/core/orphanet (subpath, not relative path) |
| apps/web/src/composables/useOrphanetData.ts | apps/web/src/stores/useOrphanetStore.ts | useOrphanetStore() cache read/write | WIRED | Line 8: import useOrphanetStore; line 52: const store = useOrphanetStore(); getCached at line 86; setCached at line 104 |
| apps/web/src/components/wizard/WizardStepper.vue | apps/web/src/composables/useOrphanetData.ts | useOrphanetData initialized, watch state.gene | WIRED | Line 144: const { fetchForGene: fetchOrphanet } = useOrphanetData(); lines 200-210: watch state.gene immediate:true calls fetchOrphanet(newGene.symbol) |
| apps/web/src/components/wizard/StepResults.vue | apps/web/src/composables/useOrphanetData.ts | second composable instance, watch result.gene | WIRED | Line 713: const { ..., fetchForGene: fetchOrphanetForGene } = useOrphanetData(); lines 715-723: watch props.result?.gene immediate:true calls fetchOrphanetForGene(geneSymbol) |
| apps/web/src/components/wizard/StepResults.vue | apps/web/src/components/OrphanetSection.vue | component import + template render | WIRED | Line 640: import OrphanetSection; lines 242-247: rendered with all 4 props bound (:loading, :diseases, :primary-disease, :additional-diseases) |
| packages/cli/src/commands/query.ts | @gnomad-cf/core/orphanet | import fetchOrphanetData | WIRED | Line 29: import { fetchOrphanetData }; line 141: called with gene symbol inside try/catch |
| packages/cli/src/output/text-formatter.ts | packages/cli/src/types.ts | QueryResult.orphanetDiseases | WIRED | Line 6: import type { OrphanetDisease }; line 203: if (result.orphanetDiseases && ...) calls formatOrphanetSection |

### Requirements Coverage

| Requirement | Status | Blocking Issue |
|-------------|--------|----------------|
| ORPH-01: Orphanet prevalence fetched via api.orphadata.com for selected gene | SATISFIED | None |
| ORPH-02: All associated diseases displayed with prevalence ranges | SATISFIED | None |
| ORPH-03: Shown as section in summary card in results step | SATISFIED | None |
| ORPH-04: Disease names link to Orphanet entry | SATISFIED | None |
| ORPH-05: Client in @gnomad-cf/core (platform-neutral) | SATISFIED | None |
| ORPH-06: Session-level caching | SATISFIED | None |
| ORPH-07: Graceful degradation on API failure | SATISFIED | None |
| ORPH-08: Disclaimer states Orphanet shows clinical prevalence, not genetic carrier prevalence | SATISFIED | None |

### Anti-Patterns Found

No blocker or warning anti-patterns. Three info-level return [] / return null occurrences are intentional design decisions documented in the PLAN.

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| packages/core/src/orphanet/client.ts | 55, 70 | return [] | Info | Intentional graceful 404 handling for epidemiology/natural history endpoints |
| packages/core/src/orphanet/client.ts | 83 | return null | Info | Intentional: selectBestPrevalence returns null for empty input -- callers handle null |
| apps/web/src/composables/useOrphanetData.ts | 64 | return [] | Info | Intentional: additionalDiseases returns empty array when no primary disease selected |

### Human Verification Required

#### 1. Summary Card Visual Integration

**Test:** Run bun run dev, navigate to CFTR, proceed to Step 4 results
**Expected:** Orphanet section appears at the bottom of the summary card with Orphanet Prevalence label, Cystic fibrosis as a clickable link, prevalence class (e.g. 1-5 / 10 000), geographic (e.g. Europe), [AR] badge, and disclaimer text. A subtle top border separates it from content above.
**Why human:** Visual layout, CSS border rendering with Vuetify border variables, and link behavior (opens in new tab) require a live browser. Structural wiring is fully verified in code.

#### 2. Eager Fetch Timing

**Test:** Open DevTools Network tab before selecting CFTR at Step 1. Watch for api.orphadata.com calls.
**Expected:** Calls to /rd-associated-genes/genes/symbols/cftr and /rd-epidemiology/orphacodes/586 appear in Network tab before user clicks Next (before gnomAD query starts or completes).
**Why human:** Verifying fetch fires at Step 1 (not Step 4) requires observing network requests in a live browser session. Code structure is correct -- watcher on state.gene in WizardStepper with immediate:true -- but timing requires visual confirmation.

#### 3. CLI Live Output

**Test:** cd packages/cli && bun run src/cli.ts query CFTR (requires active internet connection)
**Expected:** Output includes --- Orphanet Prevalence --- section with Cystic fibrosis [AR]: followed by prevalence class, an Orphanet URL, and Note: Orphanet reports clinical prevalence, not genetic carrier prevalence.
**Why human:** CLI requires live network access to the real Orphanet API. Structural wiring is fully verified in code.

### Gaps Summary

No gaps. All 4 observable truths verified. All 15 required artifacts exist, are substantive, and are wired. All 9 key links confirmed. No blocker anti-patterns. 9 Playwright E2E tests exist at apps/web/e2e/phase36-orphanet.spec.ts covering clinical accuracy (CFTR disease count, prevalence values), eager fetch timing, graceful degradation (API failure hides section), and accessibility (data-testid, link attributes).

One implementation detail differs from plan spec: StepResults watches props.result?.gene (a string) instead of result.value?.gene?.symbol. This is functionally equivalent -- CarrierFrequencyResult.gene is typed as string and contains the gene symbol directly. The watcher correctly triggers fetchOrphanetForGene with the gene symbol string on mount and on gene changes.

---

_Verified: 2026-02-27T09:07:06Z_
_Verifier: Claude (gsd-verifier)_
