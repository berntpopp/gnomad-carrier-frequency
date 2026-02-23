# Phase 23: Onboarding & Visual Polish - Research

**Researched:** 2026-02-23
**Domain:** Vue 3 / Vuetify 3 — onboarding UI, responsive AppBar, programmatic confirm dialogs
**Confidence:** HIGH (codebase verified) / MEDIUM (Vuetify API patterns from codebase evidence)

## Summary

Phase 23 has three distinct implementation areas: (1) a welcome onboarding card for first-time visitors with a CFTR quick-start, (2) a mobile-only gene context chip in the AppBar on steps 2–4, and (3) migration of three native `alert()`/`confirm()` calls to a reusable `useConfirmDialog` composable backed by a Vuetify `v-dialog`.

The codebase already has all the building blocks in place. The `useAppStore` (Pinia, persisted) is the right home for onboarding state. The `useGeneSearch` composable exposes `selectGene` and `setSearchTerm` directly, so the CFTR quick-start can call those without any new API. The `useWizard` composable's singleton state is accessible from the welcome card component. Vuetify's `useDisplay` already used in `WizardStepper` provides the `xs` boolean for breakpoint-gating. The SettingsDialog already has one in-component Vuetify confirm dialog as a pattern to follow (`showClearHistoryDialog`), and VueUse 12.x is installed — `useConfirmDialog` from `@vueuse/core` is a sound basis for the shared composable.

The approach for `useConfirmDialog` in this codebase should be a **lightweight custom composable** (wrapping a module-level reactive state + a Vuetify `v-dialog` component) rather than importing `useConfirmDialog` from VueUse. The VueUse version uses `Teleport` and headless patterns which don't align with the project's style of inline Vuetify dialogs. The simplest idiomatic approach is a composable exposing `{ isVisible, options, confirm, cancel, ask }` + a single `ConfirmDialog.vue` component mounted once in `App.vue`.

**Primary recommendation:** Build a thin `useConfirmDialog` composable + `ConfirmDialog.vue` component, wired into `App.vue` as a singleton. Call `ask(options)` which returns a Promise resolving to `true`/`false`. Callers await the result and act accordingly.

---

## Standard Stack

No new packages are required. Everything needed is already installed.

### Core (Already in Project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vuetify 3 | ^3.8.1 | `v-dialog`, `v-card`, `v-chip`, `v-app-bar-title`, `useDisplay` | Project UI framework |
| Pinia | ^3.0.4 | `useAppStore` for onboarding state | Project state management |
| pinia-plugin-persistedstate | ^4.7.1 | Persisting `onboardingDismissed` to localStorage | Already configured |
| @vueuse/core | ^12.7.0 | Optional: `useConfirmDialog` for inspiration; not strictly needed | Already installed |
| Vue 3 | ^3.5.24 | `ref`, `computed`, `watch` | Project framework |

### No New Installations Needed
All required capabilities exist in the current dependency set.

---

## Architecture Patterns

### Recommended Project Structure Changes
```
src/
├── components/
│   ├── WelcomeCard.vue           # NEW: onboarding welcome card
│   ├── ConfirmDialog.vue         # NEW: reusable confirm dialog (singleton)
│   └── AppBar.vue                # MODIFIED: add xs-only title hide + context chip
├── composables/
│   └── useConfirmDialog.ts       # NEW: composable for programmatic confirms
├── stores/
│   └── useAppStore.ts            # MODIFIED: add onboardingDismissed state
```

### Pattern 1: Onboarding State in useAppStore (Persisted Pinia)

**What:** Add `onboardingDismissed: boolean` to `useAppStore`. This follows the exact existing pattern for `disclaimerAcknowledged`.

**Current state shape:**
```typescript
// src/stores/useAppStore.ts (current)
interface AppStoreState {
  disclaimerAcknowledged: boolean;
  disclaimerAcknowledgedAt: number | null;
}

export const useAppStore = defineStore('app', {
  state: (): AppStoreState => ({ ... }),
  persist: { key: 'carrier-freq-app', storage: localStorage },
});
```

**Extended shape for Phase 23:**
```typescript
// Add to AppStoreState:
onboardingDismissed: boolean;

// Add getter:
shouldShowOnboarding: (state): boolean => {
  return state.disclaimerAcknowledged && !state.onboardingDismissed;
},

// Add action:
dismissOnboarding() {
  this.onboardingDismissed = true;
},
```

Clearing localStorage or new browser = `onboardingDismissed` is `false` (default) = card appears after disclaimer. Persistence key is already `'carrier-freq-app'`.

**Confidence: HIGH** — identical pattern to `disclaimerAcknowledged`.

---

### Pattern 2: WelcomeCard Component (Inline, Not Modal)

**What:** A `v-card` rendered inline above Step 1 content when `shouldShowOnboarding` is true. Placed in `StepGene.vue` (or in `App.vue` above `WizardStepper`). Auto-dismisses when `dismissOnboarding()` is called.

**Where to place it:** In `App.vue` between the title paragraph and `<WizardStepper>`, conditional on `shouldShowOnboarding && state.currentStep === 1`. This keeps `StepGene.vue` focused on gene-selection logic and keeps the card visible as a contextual intro to the whole wizard, not just the gene step.

Alternative: inside `StepGene.vue` above the `VersionSelector`. This is more local but would require `StepGene` to know about `appStore`.

**Recommendation:** Place in `App.vue` as a sibling to `WizardStepper`. The card is application-level onboarding, not a gene-step concern. Condition: `appStore.shouldShowOnboarding && wizardState.currentStep === 1`.

**Vuetify card with tonal primary tint** (verified from codebase patterns):
```vue
<!-- src/components/WelcomeCard.vue -->
<template>
  <v-card
    v-if="appStore.shouldShowOnboarding"
    variant="tonal"
    color="primary"
    :elevation="2"
    class="mb-6"
    data-testid="welcome-card"
  >
    <v-card-text>
      <p class="text-body-1 mb-3">
        This tool calculates carrier frequencies for autosomal recessive
        conditions using gnomAD population data, and generates clinical
        documentation text for patient letters.
      </p>
      <v-btn
        color="primary"
        variant="elevated"
        data-testid="welcome-cftr-btn"
        @click="handleCftrQuickStart"
      >
        Try with CFTR
      </v-btn>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { useAppStore } from '@/stores/useAppStore';
import { useGeneSearch } from '@/composables';

const appStore = useAppStore();
const { selectGene, setSearchTerm } = useGeneSearch();

async function handleCftrQuickStart() {
  // dismiss first so card disappears immediately
  appStore.dismissOnboarding();
  // pre-fill gene search with CFTR
  setSearchTerm('CFTR');
  // ... then selectGene when result arrives OR
  // use a pre-known GeneSearchResult shape
}
</script>
```

**Confidence: HIGH** — `variant="tonal"` with `color="primary"` is used extensively in the codebase (DisclaimerBanner, DataSourcesDialog, ClingenWarning).

---

### Pattern 3: CFTR Quick-Start Implementation

**What:** Pre-fill the gene search with CFTR and trigger selection — without advancing the wizard.

**Key insight from useGeneSearch:** The composable is a **singleton** (module-level `sharedGeneConstraint`, `sharedConstraintLoading`). Calling `useGeneSearch()` from `WelcomeCard` accesses the same state as `GeneSearch.vue`. However, `GeneSearch.vue` manages its own `model` ref and `searchInput` ref independently.

**Challenge:** `GeneSearch.vue` has its own local `model = ref<GeneSearchResult | null>(null)` and `searchInput = ref('')`. Calling `selectGene()` from `useGeneSearch()` in `WelcomeCard` updates the shared `selectedGene` ref, but `GeneSearch`'s `v-autocomplete` `v-model="model"` will not reactively update because `model` is a local ref, not bound to `selectedGene`.

**Solution options:**

**Option A (Recommended):** Make `WelcomeCard` emit an event up to its parent (`App.vue` or `StepGene.vue`), which then calls a new `prefillGene` method on `GeneSearch` via a template ref. This is invasive.

**Option B (Cleaner):** Search for CFTR via the gnomAD API and call `selectGene(result)`, then also emit a `gene-selected` event that the parent wizard picks up. But the wizard state is already watched via `state.gene` in `WizardStepper`.

**Option C (Cleanest):** Rather than fighting the `GeneSearch` local state, update `useWizard` state directly (`state.gene = cftrResult`) with a known CFTR result object, AND update `useGeneSearch`'s `selectedGene`. The `GeneSearch.vue` `items` computed uses `selectedGene.value ? [selectedGene.value] : results.value` — so if `selectedGene` is set, the `v-autocomplete` will show it. But `v-model="model"` in `GeneSearch.vue` is local and won't reflect this.

**Best practical approach:** Add a `prefill(gene: GeneSearchResult)` function to `useGeneSearch` that sets both `selectedGene` and returns the result for the caller to place into wizard state. In `WelcomeCard`, call this + set `state.gene` directly via `useWizard`:

```typescript
// In useGeneSearch - new exported function
function prefillGene(gene: GeneSearchResult) {
  selectedGene.value = gene;
  searchTerm.value = gene.symbol;
  debouncedTerm.value = '';
  fetchConstraint(gene.symbol);
}
```

Then `GeneSearch.vue` needs to watch `selectedGene` and sync its local `model`:
```typescript
// In GeneSearch.vue script setup - add watcher
watch(selectedGene, (gene) => {
  model.value = gene;
  if (gene) searchInput.value = gene.symbol;
});
```

This keeps `GeneSearch.vue` reactive to external prefills.

The CFTR gene object shape (from `GeneSearchResult` type):

```typescript
// src/api/queries/types.ts - check this type
interface GeneSearchResult {
  symbol: string;
  ensembl_id: string;
  // etc.
}
```

**Confidence: MEDIUM** — The GeneSearch local model sync requires careful implementation. The watcher approach is sound but needs the actual `GeneSearchResult` shape verified against the API types.

---

### Pattern 4: Mobile Context Chip in AppBar

**What:** A `v-chip` inside `AppBar.vue` that shows `"CFTR · v4.1"` on `xs` breakpoint, Steps 2–4 only. Tapping navigates to Step 1.

**Breakpoint detection in AppBar** (currently AppBar has no `useDisplay` call):
```typescript
// src/components/AppBar.vue - add:
import { useDisplay } from 'vuetify';
const { xs } = useDisplay();
```

**AppBar needs to know current step and selected gene.** Currently `AppBar.vue` has no wizard state knowledge — it only emits `reset`, `openHistory`, `openSettings`. Options:

- **Props from App.vue:** Pass `currentStep` and `selectedGene` as props. Clean but verbose.
- **Direct store/composable access:** `AppBar` calls `useWizard()` and `useGnomadVersion()` directly. This is how `WizardStepper` works — it calls composables directly. **Preferred** — follows codebase pattern.

```vue
<!-- In AppBar.vue template, inside .app-bar-content: -->
<v-chip
  v-if="xs && state.currentStep > 1 && state.gene"
  size="small"
  color="primary"
  variant="tonal"
  class="ml-2"
  data-testid="gene-context-chip"
  @click="goToStep(1)"
>
  {{ state.gene.symbol }} · {{ version }}
</v-chip>
```

**Hiding title on xs** — `v-app-bar-title` should be hidden when `xs` is true:
```vue
<v-app-bar-title
  v-if="!xs"
  v-bind="props"
  class="app-logo ..."
  @click="emit('reset')"
>
  gCFCalc
</v-app-bar-title>
```

**Confidence: HIGH** — `xs` from `useDisplay` is used in `WizardStepper.vue` already. The chip pattern is used in `LogViewer.vue`, `OfflineIndicator.vue`, `FilterChips.vue`.

---

### Pattern 5: useConfirmDialog Composable (Custom)

**What:** A module-level singleton composable that holds dialog state and exposes `ask(options)` returning `Promise<boolean>`. A companion `ConfirmDialog.vue` is registered once in `App.vue`.

**Why custom rather than VueUse's useConfirmDialog:** VueUse's version uses Teleport and event hooks which don't match the project's style. The existing `showClearHistoryDialog` pattern in `SettingsDialog.vue` (lines 263–292, 705–718) is the in-component confirmation pattern, but it's per-dialog boilerplate. The custom composable generalizes this.

**Implementation pattern** (module-level singleton state):

```typescript
// src/composables/useConfirmDialog.ts
import { ref, shallowRef } from 'vue';

interface ConfirmDialogOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: string; // 'error' for destructive, 'primary' for normal
}

// Module-level singleton state
const isVisible = ref(false);
const options = shallowRef<ConfirmDialogOptions>({
  title: '',
  message: '',
  confirmText: 'Confirm',
  cancelText: 'Cancel',
  confirmColor: 'primary',
});

let resolvePromise: ((value: boolean) => void) | null = null;

export function useConfirmDialog() {
  function ask(opts: ConfirmDialogOptions): Promise<boolean> {
    options.value = { ...opts };
    isVisible.value = true;
    return new Promise((resolve) => {
      resolvePromise = resolve;
    });
  }

  function confirm() {
    isVisible.value = false;
    resolvePromise?.(true);
    resolvePromise = null;
  }

  function cancel() {
    isVisible.value = false;
    resolvePromise?.(false);
    resolvePromise = null;
  }

  return { isVisible, options, ask, confirm, cancel };
}
```

**ConfirmDialog.vue** (mounted once in App.vue):

```vue
<template>
  <v-dialog
    v-model="isVisible"
    max-width="400"
    @click:outside="cancel"
  >
    <v-card>
      <v-card-title>{{ options.title }}</v-card-title>
      <v-card-text>{{ options.message }}</v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="cancel">
          {{ options.cancelText ?? 'Cancel' }}
        </v-btn>
        <v-btn
          :color="options.confirmColor ?? 'primary'"
          variant="flat"
          @click="confirm"
        >
          {{ options.confirmText ?? 'Confirm' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
```

**Backdrop click = cancel:** Vuetify `v-dialog` fires `@click:outside` when the scrim is clicked (when not `persistent`). Setting `@click:outside="cancel"` and NOT using `persistent` achieves backdrop-click dismissal as cancel.

**Callers replace `confirm(...)` / `alert(...)` with:**

```typescript
// In SettingsDialog.vue (template reset):
import { useConfirmDialog } from '@/composables';
const { ask } = useConfirmDialog();

async function handleResetLanguage() {
  const confirmed = await ask({
    title: 'Reset Templates',
    message: `Reset all ${lang} templates to defaults? This cannot be undone.`,
    confirmText: 'Yes, reset',
    cancelText: 'Keep current',
    confirmColor: 'error',
  });
  if (confirmed) {
    templateStore.resetLanguageTemplates(templateStore.language);
  }
}
```

**For alert() replacements** (template import errors): `ask` with a single action OR a simple Vuetify `v-snackbar` / `v-alert` in-component. Since the CONTEXT.md says only the 4 native dialog calls need migration, and the import alerts are error notifications (not confirmations), they could use an in-component `v-alert` instead of `ask()`. But `ask()` with only a close button is also valid. **Recommendation:** Use `ask()` for all 4, treating the import error alerts as dialogs with just a "Close" action (cancelText hidden, confirmText "OK", confirmColor "primary").

**Confidence: HIGH** — the singleton module-level pattern matches `useWizard.ts` and `useGeneSearch.ts`. No new libraries needed.

---

### Migrations Summary (UXV-03, UXV-04)

Three locations with native dialogs, 4 total calls:

| File | Line | Type | Current | Migration |
|------|------|------|---------|-----------|
| `SettingsDialog.vue` | ~788 | `alert()` | "Invalid template file format" | `ask()` with title "Import Error", confirm "OK", no cancel |
| `SettingsDialog.vue` | ~791 | `alert()` | "Failed to parse template file" | same as above |
| `SettingsDialog.vue` | ~801 | `confirm()` | Reset templates confirmation | `ask()` with confirmColor "error", confirmText "Yes, reset", cancelText "Keep current" |
| `LogViewer.vue` | ~234 | `confirm()` | "Clear all application logs?" | `ask()` with confirmColor "error", confirmText "Clear logs", cancelText "Cancel" |

Note: `SettingsDialog.vue` lines 263–292 already have a proper Vuetify dialog for "Clear History" — this is the model to follow and does NOT need migration.

---

### Pattern 6: Auto-Dismiss on First Action

**What:** Welcome card disappears immediately when user takes any action (gene search or CFTR quick-start click). No explicit close button.

**How to detect first action:**
- Quick-start click: `handleCftrQuickStart()` calls `appStore.dismissOnboarding()` first.
- Manual gene search: Watch `state.gene` in the component/location where `WelcomeCard` is placed. When `state.gene !== null`, call `appStore.dismissOnboarding()`.

```vue
<!-- In App.vue or WelcomeCard.vue: -->
<script setup>
import { watch } from 'vue';
import { useWizard } from '@/composables';
const { state } = useWizard();

watch(() => state.gene, (gene) => {
  if (gene && appStore.shouldShowOnboarding) {
    appStore.dismissOnboarding();
  }
});
</script>
```

No animation, no delay — `v-if="appStore.shouldShowOnboarding"` disappears synchronously on next tick.

**Confidence: HIGH** — standard Vue reactivity pattern.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Persistent "first-time user" state | Custom localStorage wrapper | Pinia persist (already configured in `useAppStore`) | Already proven pattern; `disclaimerAcknowledged` uses this exact approach |
| Dialog visible/hidden toggle | Custom event bus | Module-level `ref` singleton in composable | Matches `useWizard` and `useGeneSearch` patterns already in codebase |
| Breakpoint detection in AppBar | CSS media queries + JS | `useDisplay()` from Vuetify | Already used in WizardStepper, SettingsDialog — consistent |
| Programmatic dialogs | Dynamic `createApp()` + portal | Module-level ref composable + single `ConfirmDialog.vue` in App | Simpler, no Vuetify plugin re-initialization needed, matches project style |
| Promise-based confirm | VueUse `useConfirmDialog` | Custom composable | VueUse version is headless/Teleport-based; project uses inline Vuetify dialogs |

---

## Common Pitfalls

### Pitfall 1: GeneSearch Local State Not Syncing with External Prefill
**What goes wrong:** Calling `selectGene(cftrGene)` from `useGeneSearch` sets `selectedGene` (module-level), but `GeneSearch.vue`'s `v-autocomplete` `v-model="model"` is a local `ref` — it does NOT automatically reflect `selectedGene` changes.
**Why it happens:** `GeneSearch.vue` was designed for user-driven input, not programmatic prefill.
**How to avoid:** Add a `watch(selectedGene, ...)` inside `GeneSearch.vue` that syncs `model.value` and `searchInput.value` when `selectedGene` changes externally.
**Warning signs:** CFTR quick-start sets `state.gene` in wizard but the autocomplete still shows empty.

### Pitfall 2: `useConfirmDialog` Module State Not Cleared on Cancel
**What goes wrong:** If `resolvePromise` is not cleared after resolution, a second `ask()` call before the previous dialog closes could call the stale resolver.
**Why it happens:** Module-level closure over `resolvePromise` with no cleanup.
**How to avoid:** Always set `resolvePromise = null` after calling it in both `confirm()` and `cancel()`.
**Warning signs:** Dialogs resolving twice or stale resolvers.

### Pitfall 3: Template Import Alert Replacement Must Not Block UI
**What goes wrong:** Using `await ask(...)` inside the FileReader `onload` callback creates a Promise inside an event handler. This is fine in modern browsers but must not accidentally hold the file input open.
**Why it happens:** FileReader `onload` is async-friendly in browsers.
**How to avoid:** Reset `input.value = ''` BEFORE awaiting the dialog, not after. The current code does `input.value = ''` at the end — move it before the `ask()` call.

### Pitfall 4: Onboarding Card Shown While Disclaimer Still Blocking
**What goes wrong:** `shouldShowOnboarding` could return `true` if `onboardingDismissed = false` even when disclaimer hasn't been accepted yet.
**Why it happens:** Logical dependency between disclaimer and onboarding not enforced.
**How to avoid:** `shouldShowOnboarding` getter must require `disclaimerAcknowledged === true` AND `onboardingDismissed === false`. See Pattern 1 code above.

### Pitfall 5: v-dialog backdrop click vs persistent
**What goes wrong:** If `persistent` prop is set on the `ConfirmDialog.vue`, backdrop click does NOT close it — `@click:outside` is ignored.
**Why it happens:** Vuetify's `persistent` prop prevents all outside-click dismissal.
**How to avoid:** Do NOT use `persistent` on the `ConfirmDialog`. Use `@click:outside="cancel"` only. This matches the CONTEXT.md requirement: "Dialogs dismissable by backdrop click."

### Pitfall 6: `xs` breakpoint from `useDisplay` is `Ref<boolean>` not raw boolean
**What goes wrong:** Using `xs` without `.value` in `<script>` blocks.
**Why it happens:** `useDisplay` returns refs, but in templates they auto-unwrap.
**How to avoid:** In Vue templates, use `xs` directly. In `<script setup>`, use `xs.value`. Confirmed by existing `WizardStepper.vue` usage: `:title="xs ? '' : 'Gene'"` (template auto-unwrap).

---

## Code Examples

Verified patterns from codebase:

### Existing Vuetify Confirm Dialog Pattern (SettingsDialog.vue lines 263–292)
```vue
<!-- In-component dialog (already working, use as reference) -->
<v-dialog
  v-model="showClearHistoryDialog"
  max-width="400"
  aria-label="Clear history confirmation"
>
  <v-card>
    <v-card-title>Clear Search History?</v-card-title>
    <v-card-text>
      This will permanently delete all {{ historyStore.entryCount }} history entries.
    </v-card-text>
    <v-card-actions>
      <v-spacer />
      <v-btn variant="text" @click="showClearHistoryDialog = false">Cancel</v-btn>
      <v-btn color="error" variant="flat" @click="clearAllHistory">Clear All</v-btn>
    </v-card-actions>
  </v-card>
</v-dialog>
```

### v-chip Pattern (OfflineIndicator.vue — exact model for context chip)
```vue
<v-chip
  size="small"
  color="primary"
  variant="tonal"
  prepend-icon="mdi-dna"
  @click="goToStep(1)"
>
  CFTR · v4.1
</v-chip>
```

### useDisplay Breakpoint (WizardStepper.vue — confirmed)
```typescript
import { useDisplay } from 'vuetify';
const { smAndDown, xs } = useDisplay();
// In template: v-if="!xs"  or  :title="xs ? '' : 'Gene'"
```

### Pinia Persist Pattern (useAppStore.ts — confirmed)
```typescript
persist: {
  key: 'carrier-freq-app',
  storage: localStorage,
},
// State defaults to false = initial value for new users
```

### Singleton Composable State (useWizard.ts — confirmed pattern)
```typescript
// Module-level state - shared across all useWizard() calls
const state = reactive<WizardState>({ ... });

export function useWizard() {
  // returns state + actions
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Native `alert()`/`confirm()` | Vuetify `v-dialog` composable | Phase 23 | Native dialogs block JS thread; Vuetify dialogs are non-blocking, styleable, accessible |
| No onboarding | Welcome card + persisted state | Phase 23 | First-time UX without modals or blocked content |

**Deprecated/outdated:**
- `alert()` / `confirm()`: Synchronous, unstyled, WCAG-problematic; replaced by Vuetify dialogs throughout.

---

## Open Questions

1. **CFTR GeneSearchResult shape for prefill**
   - What we know: `GeneSearchResult` is typed in `src/api/queries/types.ts` and includes at least `symbol` and `ensembl_id`.
   - What's unclear: Whether a hardcoded fallback CFTR object (for quick-start without a live API call) would need `ensembl_id` and whether `selectGene()` calls `fetchConstraint()` (it does — confirmed in `useGeneSearch.ts` line 122).
   - Recommendation: The quick-start should trigger a real gnomAD search for "CFTR" (call `setSearchTerm('CFTR')` which debounces and queries the API), wait for `results`, then `selectGene(results[0])`. Alternatively, hardcode the known CFTR Ensembl ID (`ENSG00000001626`) as a fallback if offline. The CONTEXT.md says "uses whatever gnomAD version is currently set" — live search is correct.

2. **Template import alert dialogs — error-only vs confirm pattern**
   - What we know: `alert('Invalid template file format')` and `alert('Failed to parse template file')` are one-button notifications, not confirmations.
   - What's unclear: Whether `useConfirmDialog` should support an "alert" mode (only confirm button, no cancel) or if these should be inline `v-alert` components.
   - Recommendation: Add an `alert` shorthand to `useConfirmDialog` (calls `ask` with `cancelText: undefined` and only shows the confirm button). This keeps one composable for all cases.

3. **WelcomeCard placement — App.vue vs StepGene.vue**
   - What we know: CONTEXT.md says "inline card above Step 1 gene search content."
   - What's unclear: Whether "above Step 1 gene search content" means inside the stepper window item (StepGene scope) or in the outer App container.
   - Recommendation: Inside `StepGene.vue` at the top before the `h2` — this matches "above Step 1 gene search content" most literally, and StepGene already imports `useGeneSearch`. Accept the minor coupling to `appStore`.

---

## Sources

### Primary (HIGH confidence)
- Codebase: `src/stores/useAppStore.ts` — Pinia persist pattern for onboarding state
- Codebase: `src/composables/useWizard.ts` — singleton composable pattern
- Codebase: `src/composables/useGeneSearch.ts` — `selectGene`, `setSearchTerm`, `selectedGene` module-level ref
- Codebase: `src/components/wizard/WizardStepper.vue` — `useDisplay()` with `xs` breakpoint
- Codebase: `src/components/SettingsDialog.vue` lines 263–292, 705–718 — existing Vuetify confirm dialog pattern
- Codebase: `src/components/OfflineIndicator.vue` — `v-chip` with `variant="tonal"` pattern
- Codebase: `src/components/AppBar.vue` — current app bar structure

### Secondary (MEDIUM confidence)
- VueUse docs (vueuse.org/core/useconfirmdialog/) — `useConfirmDialog` API shape, Promise return type
- WebSearch verified: `useDisplay` from Vuetify returns `xs` as `Ref<boolean>`, auto-unwraps in templates

### Tertiary (LOW confidence)
- WebSearch: Vuetify `@click:outside` for backdrop-click dismissal — unverified against official API docs directly, but consistent with codebase pattern where `persistent` prop is absent on dismissable dialogs

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in project, no new installs
- Architecture (Pinia onboarding state): HIGH — exact clone of existing `disclaimerAcknowledged` pattern
- Architecture (useConfirmDialog): HIGH — singleton composable pattern matches codebase style
- Architecture (CFTR prefill / GeneSearch sync): MEDIUM — requires adding a `watch` to GeneSearch and a `prefillGene` function to `useGeneSearch`
- Architecture (AppBar chip): HIGH — `useDisplay` already used, chip component already used
- Pitfalls: HIGH — derived from direct codebase inspection

**Research date:** 2026-02-23
**Valid until:** 2026-03-25 (Vuetify 3 API is stable; codebase patterns are stable)
