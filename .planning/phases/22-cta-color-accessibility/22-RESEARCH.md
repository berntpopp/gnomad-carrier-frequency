# Phase 22: CTA Color System & Accessibility - Research

**Researched:** 2026-02-23
**Domain:** Vuetify 3 theming, WCAG accessibility, Vue 3 DOM patterns
**Confidence:** HIGH

## Summary

Phase 22 involves three distinct workstreams: (1) replacing the Vuetify theme's primary color from warm gray `#a09588` to teal `#117A7F` while moving warm gray to `secondary`, (2) auditing and migrating ~24 `color="primary"` bindings across 14 files to either keep as primary (CTA) or change to secondary/semantic colors, and (3) adding three small accessibility improvements: a skip-to-content link, desktop footer labels, and a step-transition loading indicator.

All three workstreams are well-understood with clear Vuetify 3 APIs. The color change in `createVuetify` propagates automatically to all theme-aware components — no manual CSS overrides needed. The audit of `color="primary"` bindings is the most labor-intensive part; the codebase has already been catalogued (24 occurrences across 14 files). Several of the existing bindings are semantically correct CTAs and should stay as `primary`; others (filter chips, switches, decorative icons, variable picker chips) should move to `secondary`.

The `index.html` seed content uses hardcoded `#a09588` hex values in inline CSS that must also be updated when the color changes. The PWA manifest's `theme_color` is defined in `vite.config.ts` (not a `.webmanifest` file), which is a single-location change.

**Primary recommendation:** Change `createVuetify` theme colors first (22-01), then do the `color="primary"` audit with full codebase context (22-02), then add skip link + footer labels + progress indicator (22-03). This order ensures the audit is done against the final color system.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vuetify 3 | ^3.8.1 | Theme definition, component color props | Already in project; theme system is the right mechanism |
| Vue 3 | ^3.5.24 | Skip-link component, DOM refs | Already in project |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `vite-plugin-pwa` | existing | PWA manifest `theme_color` | PWA manifest lives in `vite.config.ts` manifest object |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Vuetify theme colors | CSS custom property overrides | Vuetify theme is the correct mechanism; CSS overrides would fight the framework |
| Simple `<a>` skip link | `vue-a11y/vue-skip-to` package | External package is unnecessary; a plain HTML anchor with CSS is sufficient and Vue.js official guide recommends this approach |

**Installation:** No new packages needed. All changes are configuration and template modifications.

## Architecture Patterns

### Recommended Project Structure
No new files or folders needed. All changes are within existing files:
```
src/
├── main.ts              # createVuetify theme colors (primary/secondary swap)
├── App.vue              # Skip-to-content link + main-content ID
├── components/
│   ├── AppFooter.vue    # Desktop footer labels (sm+ breakpoint)
│   ├── FilterChips.vue  # color="primary" → color="secondary" (LoF HC chip)
│   ├── HistoryPanel.vue # color="primary" → color="secondary" (decorative icon)
│   ├── TemplateEditor.vue # color="primary" → color="secondary" (variable chips)
│   ├── VariablePicker.vue # color="primary" → color="secondary" (variable chips)
│   ├── DataSourcesDialog.vue # color="primary" → informational - review
│   ├── AboutDialog.vue  # color="primary" → color="secondary" (decorative icon)
│   └── wizard/WizardStepper.vue # step color inherits from theme primary
vite.config.ts           # PWA manifest theme_color
index.html               # Seed content inline CSS hex values
```

### Pattern 1: Vuetify 3 Theme Color Configuration
**What:** Defining named colors in `createVuetify` for use as `color="primary"` and `color="secondary"` throughout the app.
**When to use:** This is the single source of truth for all theme colors in Vuetify 3.
**Example:**
```typescript
// Source: Vuetify 3 official documentation + verified via w3tutorials.net
const vuetify = createVuetify({
  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        dark: false,
        colors: {
          primary: '#117A7F',    // Teal CTA
          secondary: '#a09588',  // Warm gray brand
          surface: '#FFFFFF',
          background: '#FAFAFA',
        }
      },
      dark: {
        dark: true,
        colors: {
          primary: '#4DB6AC',    // Material Teal 300
          secondary: '#a09588',  // Warm gray unchanged in dark
        }
      }
    }
  }
})
```

**CSS variable effect:** Vuetify automatically generates `--v-theme-primary`, `--v-theme-secondary`, etc. The AppBar.vue already uses `rgb(var(--v-theme-primary))` in its CSS (line 141) — this will automatically pick up the new teal color after the theme change.

### Pattern 2: Skip-to-Content Link (WCAG 2.4.1)
**What:** First focusable element in App.vue, hidden off-screen until Tab-focused, links to `#main-content` anchor.
**When to use:** Required for WCAG 2.4.1 Bypass Blocks compliance.
**Example:**
```html
<!-- Source: Vue.js official accessibility guide (vuejs.org/guide/best-practices/accessibility.html) -->

<!-- In App.vue template, BEFORE <AppBar>: -->
<a href="#main-content" class="skip-link">Skip to main content</a>

<!-- v-main must get the id: -->
<v-main id="main-content">
```

```css
/* In App.vue <style scoped>: */
.skip-link {
  position: absolute;
  top: -100%;
  left: 0;
  padding: 8px 16px;
  background: rgb(var(--v-theme-primary));
  color: white;
  z-index: 9999;
  border-radius: 0 0 4px 0;
  text-decoration: none;
  font-weight: 600;
}
.skip-link:focus {
  top: 0;
}
```

**Important note:** The target element must be focusable or contain a focusable element. `<v-main>` renders as `<main>` which is not natively focusable. The skip link should target the first interactive element inside the wizard content area. The decision says: "Target: first interactive element in the current wizard step (e.g., Gene Symbol combobox on Step 1)." The simplest reliable approach is to give `v-main` a `tabindex="-1"` so the skip link focus lands there, then keyboard navigation continues normally from that point.

Alternative approach: target `#wizard-content` if WizardStepper gets that ID. The `data-testid="wizard-content"` already exists on `<v-stepper-window>` — adding `id="wizard-content"` to this element and targeting it is an option, but the `<main>` element with `tabindex="-1"` on the Vuetify `v-main` is simpler and more semantically correct.

### Pattern 3: Footer Labels on Desktop
**What:** Show text labels alongside icons for footer buttons at `sm+` breakpoint.
**When to use:** Currently all footer buttons in `footer-secondary` row are icon-only; labels improve discoverability on desktop.
**Example:**
```html
<!-- Current pattern in AppFooter.vue: -->
<v-btn icon variant="text" size="small">
  <v-icon size="small">mdi-database</v-icon>
</v-btn>

<!-- Updated pattern: remove 'icon' prop, add text label: -->
<v-btn variant="text" size="small">
  <v-icon size="small" start>mdi-database</v-icon>
  <span class="d-none d-sm-inline">Data</span>
</v-btn>
```

**Note:** The `icon` prop on `v-btn` forces circular/square appearance and disables text rendering. It must be removed to add labels. The `d-none d-sm-inline` classes use Vuetify's built-in display breakpoint utilities to hide text on xs.

The existing footer already has the correct breakpoint structure: the `footer-secondary` row is `d-none d-sm-flex`, so all buttons in that row are already desktop-only. The primary row (GitHub, version, Documentation, Disclaimer) also appears on mobile — those need separate consideration.

### Pattern 4: Step Transition Loading Indicator
**What:** `v-progress-linear` with `indeterminate` placed at the top of the wizard content area, shown when `isLoading` is true.
**When to use:** Async data loading between wizard steps (Step 1 → Step 3 gnomAD fetch).
**Example:**
```html
<!-- Source: Vuetify 3 docs pattern -->

<!-- In WizardStepper.vue, inside v-stepper, before v-stepper-window: -->
<v-progress-linear
  v-if="isLoading"
  indeterminate
  color="primary"
  height="3"
/>
```

**Placement note:** The `isLoading` ref is already available in `WizardStepper.vue` via `useCarrierFrequency()`. The progress bar should go between `<v-stepper-header>` and `<v-stepper-window>` for the most natural position — at the top of the step content area.

### Anti-Patterns to Avoid
- **Overriding theme colors with CSS:** Don't add `.v-btn { background-color: teal !important }`. Use the theme system exclusively.
- **Using `icon` prop when adding text labels:** The `icon` prop on `v-btn` must be removed when adding text content — it restricts button layout to icon-only.
- **Targeting non-focusable elements with skip links:** A skip link pointing to a `div` with no `tabindex` will silently fail in many browsers (focus moves but keyboard doesn't land correctly). Use `tabindex="-1"` on the target.
- **Applying teal to semantically-colored elements:** Filter chips with `color="success"` (ClinVar P/LP), `color="warning"` (conflicting), and `color="warning"` (ClinVar stars slider) use semantic colors intentionally — these must NOT be changed to primary or secondary.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Theme color variables | Custom CSS `--app-primary` vars | Vuetify's built-in `createVuetify` theme | Vuetify already generates `--v-theme-primary` etc., components consume them automatically |
| Skip link visibility | JavaScript focus event handler | CSS `position: absolute; top: -100%` + `:focus { top: 0 }` | Pure CSS is simpler, more accessible, and doesn't require Vue reactive state |
| Dark mode color detection | Manual media query listener | Vuetify's existing `useTheme()` composable (already used in project) | Already implemented in `useAppTheme` composable |
| Breakpoint-conditional labels | JavaScript window.innerWidth check | Vuetify display classes `d-none d-sm-inline` | Vuetify's built-in responsive utilities handle this at CSS level |

**Key insight:** All problems in this phase have existing framework-level solutions. Vuetify's theme system, display utilities, and progress components handle everything — no custom logic needed.

## Common Pitfalls

### Pitfall 1: Warm Gray Secondary Color in Dark Theme
**What goes wrong:** Adding `secondary: '#a09588'` to the dark theme definition causes warm gray on dark backgrounds to fail contrast checks (warm gray `#a09588` on dark surfaces like `#121212` has low contrast for text).
**Why it happens:** The warm gray is used for decorative/passive elements (chips, switches), not for text on backgrounds. But Vuetify uses the secondary color for chip text/backgrounds, which can create contrast problems in dark mode.
**How to avoid:** In dark mode, secondary chips should typically use teal instead of warm gray. The decision says dark theme primary is `#4DB6AC` — chips that were `color="primary"` in the wrong category may already be handled by just keeping the existing dark theme definition (which doesn't define secondary, so it defaults to Vuetify's default gray).
**Warning signs:** If secondary-colored chips look washed out or unreadable in dark theme, adjust the dark theme `secondary` value or leave it as Vuetify default.

### Pitfall 2: `bg-color="primary"` on v-tabs in StepFrequency.vue
**What goes wrong:** The tabs in `StepFrequency.vue` use `bg-color="primary"` (line 34), which sets the entire tab bar background to the primary color. After switching to teal, the gnomAD/Literature/Default tabs will have a teal background. This is a CTA-appropriate use (active navigation), so the teal should be correct — but it's worth verifying visually.
**Why it happens:** `bg-color` sets background color; this is intentional theming of the tab bar.
**How to avoid:** Accept this as correct (navigation tabs are interactive CTAs). No change needed.
**Warning signs:** None — this is the desired behavior.

### Pitfall 3: Seed Content in index.html Uses Hardcoded Hex Values
**What goes wrong:** The `index.html` contains an inline `<style>` block with `.seed-header { background: #a09588 }` and `.seed-cta { background: #a09588 }` plus a `.seed-cta:hover { background: #8a7e73 }`. These render before Vue mounts (SEO/crawlers see them). If not updated, the static seed content will still show warm gray CTAs while the live app shows teal.
**Why it happens:** The seed content is decoupled from the Vuetify theme — it's plain HTML/CSS.
**How to avoid:** In task 22-01, update both `vite.config.ts` manifest `theme_color` AND `index.html` seed CSS. Update `.seed-header` background, `.seed-cta` background, and `.seed-cta:hover` background to the new teal values.
**Warning signs:** Mismatch between the SEO seed content color and the live app color — visible on a hard reload before Vue hydrates.

The exact seed values to use:
- `.seed-header { background: #117A7F }` (was `#a09588`)
- `.seed-cta { background: #117A7F }` (was `#a09588`)
- `.seed-cta:hover { background: #0D5F63 }` (was `#8a7e73`, the hover dark)

### Pitfall 4: v-stepper-item Color is Inherited from Theme, Not Explicit
**What goes wrong:** `WizardStepper.vue` has NO explicit `color` prop on `v-stepper-item`. This means stepper step colors come from the Vuetify theme `primary` color automatically. After the theme change, active steps will automatically turn teal — no code change needed. However, this means there's no explicit "color" attribute to audit in WizardStepper.
**Why it happens:** Vuetify's stepper uses `primary` color by default for active/complete steps.
**How to avoid:** No action needed in WizardStepper for the color change. The implicit primary color inheritance is correct and desired.
**Warning signs:** None.

### Pitfall 5: AppBar Logo Uses `--v-theme-primary` in CSS
**What goes wrong:** `AppBar.vue` line 141 has `.app-logo:hover { color: rgb(var(--v-theme-primary)) }`. This CSS variable reference will automatically pick up the new teal color after the theme change. This is the desired behavior — the logo hover color turns teal. But it's important to know this is an automatic change that doesn't require explicit code modification.
**Why it happens:** CSS variable references in `:deep()` and scoped styles resolve at runtime from the Vuetify theme.
**How to avoid:** No action needed — this is correct behavior. Verify visually in testing.
**Warning signs:** None.

### Pitfall 6: `icon` Prop Must Be Removed for Footer Labels
**What goes wrong:** Adding a text label `<span>` inside a `<v-btn icon>` has no visual effect — the `icon` prop forces the button into a circular icon-only layout and Vuetify ignores child text nodes in this mode.
**Why it happens:** The `icon` prop is a visual constraint, not just a styling hint.
**How to avoid:** Remove `icon` from buttons that need labels. The button loses its circular shape, which is acceptable for the labeled footer state on desktop.
**Warning signs:** Label text appears to be missing even after adding the span.

## Code Examples

Verified patterns from official sources:

### Complete Theme Configuration (22-01)
```typescript
// Source: Vuetify 3 theming docs, verified via w3tutorials.net article
// File: src/main.ts

const vuetify = createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        dark: false,
        colors: {
          primary: '#117A7F',    // Teal CTA (was #a09588)
          secondary: '#a09588',  // Warm gray brand (was #424242)
          surface: '#FFFFFF',
          background: '#FAFAFA',
        }
      },
      dark: {
        dark: true,
        colors: {
          primary: '#4DB6AC',    // Material Teal 300 (was #BDBDBD)
          secondary: '#757575',  // Keep existing dark secondary
        }
      }
    }
  }
})
```

### Skip-to-Content Link (22-03)
```html
<!-- Source: Vue.js official accessibility guide -->
<!-- File: src/App.vue -->
<!-- Add BEFORE <DisclaimerBanner> (first element in <v-app>) -->

<a href="#main-content" class="skip-link">Skip to main content</a>
<DisclaimerBanner />
<AppBar ... />
<v-main id="main-content" tabindex="-1">
  ...
</v-main>
```

```css
/* In App.vue <style scoped> */
.skip-link {
  position: absolute;
  top: -100%;
  left: 0;
  padding: 8px 16px;
  background: rgb(var(--v-theme-primary));
  color: white;
  z-index: 9999;
  text-decoration: none;
  font-weight: 600;
}
.skip-link:focus {
  top: 0;
}
```

### Step Transition Loading Indicator (22-03)
```html
<!-- Source: Vuetify 3 v-progress-linear component docs -->
<!-- File: src/components/wizard/WizardStepper.vue -->
<!-- Add between <v-stepper-header> and <v-stepper-window> -->

<v-progress-linear
  v-if="isLoading"
  indeterminate
  color="primary"
  height="3"
/>
```

### Color="primary" Audit Map (22-02)

Complete inventory of all 24 `color="primary"` / `bg-color="primary"` bindings and their recommended disposition:

| File | Line | Element | Context | Action |
|------|------|---------|---------|--------|
| App.vue | 27 | v-progress-circular | Loading shared calculation | **Keep primary** (functional loading) |
| App.vue | 58 | v-snackbar | PWA update notification | **Keep primary** (app action CTA) |
| FilterChips.vue | 8 | v-chip | LoF HC filter chip | **Change to secondary** (passive indicator, not CTA) |
| DisclaimerBanner.vue | 57 | v-btn | "I Understand" CTA | **Keep primary** (action button) |
| DataSourcesDialog.vue | 58 | v-chip | Selected gnomAD version | **Change to secondary** (informational, not CTA) |
| TemplateEditor.vue | 53 | v-chip | Variable chips in editor | **Change to secondary** (decorative/informational) |
| AboutDialog.vue | 36 | v-icon | DNA decorative icon | **Change to secondary** (decorative) |
| HistoryPanel.vue | 71 | v-icon | DNA icon in history list | **Change to secondary** (decorative) |
| SettingsDialog.vue | 389 | v-btn (Install) | PWA install button | **Keep primary** (CTA action) |
| SettingsDialog.vue | 435 | v-switch | LoF HC filter switch | **Change to secondary** (secondary brand — matches FilterPanel lofHc switch color) |
| SettingsDialog.vue | 503 | v-btn-toggle | Language selector (DE/EN) | **Keep primary** (active selection state) |
| SettingsDialog.vue | 577 | v-btn | "Save" button | **Keep primary** (CTA action) |
| VariantModal.vue | 100 | v-btn | "Close" button | **Keep primary** (dialog action) |
| VariablePicker.vue | 36 | v-chip | Variable name chips | **Change to secondary** (decorative/informational) |
| FilterPanel.vue | 26 | v-switch | LoF HC filter switch | **Keep primary** OR change to secondary — NOTE: FilterPanel already uses secondary for Missense switch and success for ClinVar switch; LoF HC is the "main" filter so primary is appropriate, but per context decisions passive indicators use secondary |
| FrequencyResults.vue | 116 | v-progress-circular | Loading variant data | **Keep primary** (functional loading) |
| StepFrequency.vue | 34 | v-tabs bg-color | Tab bar background | **Keep primary** (navigation state) |
| StepFrequency.vue | 60 | v-progress-circular | gnomAD loading spinner | **Keep primary** (functional loading) |
| StepFrequency.vue | 158 | v-btn | "Continue" CTA | **Keep primary** (CTA action) |
| StepGene.vue | 42 | v-btn | "Continue" CTA | **Keep primary** (CTA action) |
| StepResults.vue | 229 | v-btn (text) | "View all variants" | **Keep primary** (action) |
| StepResults.vue | 332 | v-btn (outlined) | "Start Over" | **Keep primary** (action) |
| TextOutput.vue | 70 | v-btn-toggle | Perspective selector | **Keep primary** (active selection state) |
| StepStatus.vue | 81 | v-btn | "Continue" CTA | **Keep primary** (CTA action) |

**Summary:** 15 keep primary, 7 change to secondary, 2 borderline (FilterPanel LoF switch, SettingsDialog LoF switch — the context decisions say LoF uses primary in FilterChips.vue as "passive indicator" so both switches should change to secondary for consistency).

**FilterPanel.vue line 26 revised decision:** Change to `secondary` — the LoF HC chip in FilterChips.vue uses `color="primary"` currently but per context decisions, passive indicators/filter chips use secondary. The LoF switch in FilterPanel should match the LoF chip color.

### Desktop Footer Labels Pattern (22-03)

Current icon-only button structure to change:
```html
<!-- CURRENT (icon-only): -->
<v-btn icon variant="text" size="small" aria-label="View data sources">
  <v-icon size="small">mdi-database</v-icon>
</v-btn>

<!-- UPDATED (icon + label on sm+): -->
<v-btn variant="text" size="small" aria-label="View data sources">
  <v-icon size="small" start>mdi-database</v-icon>
  <span class="d-none d-sm-inline">Data</span>
</v-btn>
```

Affected footer secondary buttons and their labels:
| Button | Icon | Label |
|--------|------|-------|
| DataSourcesDialog | mdi-database | Data |
| MethodologyDialog | mdi-function-variant | Methods |
| FaqDialog | mdi-help-circle-outline | FAQ |
| AboutDialog | mdi-information-outline | About |
| Log Viewer | mdi-console | Logs |
| Documentation (primary row) | mdi-book-open-outline | Docs |

Note: GitHub button and Disclaimer button in primary row are NOT listed in the context decisions for labels; the context says "Applies to: GitHub, version, disclaimer, data sources, methodology, FAQ, about, logs." But GitHub is a link with just an icon and no natural short label — per context, it does get a label. Version is already a text `<a>` element.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Vuetify v2 theme via `$vuetify.theme.themes` | Vuetify v3 `createVuetify({ theme: {...} })` | Vuetify 3.0 | All theme config is at setup time in main.ts |
| Skip links via JavaScript show/hide | CSS position off-screen + `:focus` reveal | WCAG 2.1+ standard | Simpler, no reactive state needed |
| Vuetify v2 `color` prop as class name | Vuetify v3 `color` prop resolved via CSS vars | Vuetify 3.0 | CSS custom property `--v-theme-primary` is the delivery mechanism |

**Deprecated/outdated:**
- `--v-primary-base`: Vuetify v2 CSS variable naming. Vuetify v3 uses `--v-theme-primary`. The project's AppBar.vue already correctly uses `--v-theme-primary` (line 141).

## Open Questions

1. **FilterPanel.vue LoF HC switch color**
   - What we know: It currently uses `color="primary"` (line 26); FilterChips.vue also uses `color="primary"` for the LoF HC chip. The context decisions say filter chips are "passive indicators" that should use secondary.
   - What's unclear: Whether the LoF switch (which is the main/recommended filter) should be visually distinguished from Missense (secondary) and ClinVar (success). Both the switch and the chip should match.
   - Recommendation: Change both to `secondary` (consistent with the context rule). The semantic color distinction (primary = CTA, secondary = passive brand) is more important than making LoF HC visually primary.

2. **v-main tabindex=-1 Vuetify compatibility**
   - What we know: The Vue.js guide recommends `tabindex="-1"` on the skip link target for reliable focus behavior.
   - What's unclear: Whether Vuetify's `<v-main>` component supports the `tabindex` prop and passes it through to the underlying `<main>` element.
   - Recommendation: Test this. If `tabindex` doesn't pass through on `v-main`, add a wrapping `<div id="main-content" tabindex="-1">` inside `v-main` instead.

3. **Dark theme secondary color**
   - What we know: Current dark theme doesn't define `secondary` (uses Vuetify default `#757575`). The context only says dark theme `primary` changes to `#4DB6AC`.
   - What's unclear: Whether warm gray `#a09588` should also be added as dark theme secondary.
   - Recommendation: Per context decisions, warm gray is the brand secondary. Add `secondary: '#a09588'` to both light and dark theme definitions. In dark mode, warm gray chips on dark surfaces should check for contrast — but since these are small decorative chips with text, visual verification is sufficient.

## Sources

### Primary (HIGH confidence)
- Vuetify 3 theme docs (verified pattern) — `createVuetify({ theme: { themes: { light: { colors: {} } } } })`
- Vue.js official accessibility guide (vuejs.org) — skip link HTML and CSS pattern
- Direct codebase audit — all 24 `color="primary"` locations verified by reading actual files

### Secondary (MEDIUM confidence)
- w3tutorials.net Vuetify theming article — confirmed `createVuetify` config pattern and CSS variable naming (`--v-theme-primary`)
- WebSearch results for Vuetify 3 stepper color — confirmed stepper uses `primary` by default with no explicit color prop needed

### Tertiary (LOW confidence)
- WebSearch results for skip link WCAG patterns — multiple sources agree on CSS approach; verified against Vue.js official guide (upgraded to MEDIUM-HIGH)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages already in project, no new dependencies
- Architecture: HIGH — all Vuetify 3 patterns are well-understood from codebase reading + documentation
- Pitfalls: HIGH — pitfalls derived directly from reading actual codebase; seed HTML pitfall is a factual observation
- Audit map: HIGH — derived from direct file reading of all 24 occurrences

**Research date:** 2026-02-23
**Valid until:** 2026-06-23 (stable Vuetify 3.x API, WCAG patterns do not change frequently)
