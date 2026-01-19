# Phase 6: App Shell (Navigation + Branding) - Research

**Researched:** 2026-01-19
**Domain:** Vuetify 3 app shell, branding, favicon
**Confidence:** HIGH

## Summary

This phase implements professional app shell branding with logo, favicon, and settings dialog access. The current codebase already has `AppBar.vue` and `AppFooter.vue` components from Phase 5 that need enhancement.

The standard approach uses Vuetify 3's `v-app-bar` with density and elevation props for compact styling, `v-dialog` with `v-tabs` for settings modal, and modern favicon practices (SVG with dark mode support + PNG fallback). The color palette will use warm neutral tones inspired by RequiForm (`#a09588` primary, `#424242` secondary).

**Primary recommendation:** Enhance existing AppBar/AppFooter components with branding, add settings dialog shell, create favicon assets with dark mode support.

## Standard Stack

The established libraries/tools for this domain:

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| vuetify | ^3.8.1 | UI framework | Already in project, provides v-app-bar, v-dialog, v-tabs |
| @mdi/font | ^7.4.47 | Material Design Icons | Already in project, provides settings/github/theme icons |
| @vueuse/core | ^12.7.0 | Vue composables | Already in project, useDark for theme persistence |

### Supporting (No new dependencies needed)
| Tool | Purpose | When to Use |
|------|---------|-------------|
| SVG | Favicon format | Primary favicon with dark mode CSS support |
| PNG | Favicon fallback | 16x16, 32x32, 180x180 for legacy/iOS |
| ICO | Favicon fallback | Optional for maximum compatibility |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| SVG favicon | ICO only | Loses dark mode support, larger file |
| v-dialog | v-navigation-drawer | Drawer better for frequent access, dialog better for modal settings |
| v-tabs in dialog | v-expansion-panels | Tabs better for organized settings with few categories |

**Installation:**
No new dependencies required. All components available in existing Vuetify 3 installation.

## Architecture Patterns

### Current Project Structure (Assets Addition)
```
public/
  favicon.svg          # NEW: Primary favicon with dark mode CSS
  favicon.png          # NEW: 32x32 PNG fallback
  apple-touch-icon.png # NEW: 180x180 for iOS
src/
  components/
    AppBar.vue         # MODIFY: Add logo, settings button
    AppFooter.vue      # MODIFY: Add GitHub/gnomAD icons
    SettingsDialog.vue # NEW: Modal settings shell
```

### Pattern 1: Compact App Bar with Branding
**What:** App bar with text logo, density="compact", elevation 2
**When to use:** Single-page apps with minimal navigation
**Example:**
```vue
<!-- Source: Vuetify 3 docs + project context -->
<v-app-bar
  density="compact"
  :elevation="2"
>
  <v-app-bar-title class="text-body-1 font-weight-bold">
    gCFCalc
  </v-app-bar-title>

  <v-spacer />

  <v-btn icon variant="text" @click="toggleTheme">
    <v-icon>{{ themeIcon }}</v-icon>
    <v-tooltip activator="parent" location="bottom">
      {{ tooltipText }}
    </v-tooltip>
  </v-btn>

  <v-btn icon variant="text" @click="openSettings">
    <v-icon>mdi-cog</v-icon>
    <v-tooltip activator="parent" location="bottom">
      Settings
    </v-tooltip>
  </v-btn>
</v-app-bar>
```

### Pattern 2: Settings Dialog with Tabs
**What:** Modal dialog with tabbed organization for settings
**When to use:** Settings that don't need frequent access, organized by category
**Example:**
```vue
<!-- Source: Vuetify 3 docs + WebSearch patterns -->
<v-dialog v-model="showSettings" max-width="600" persistent>
  <v-card>
    <v-card-title class="d-flex align-center">
      <span>Settings</span>
      <v-spacer />
      <v-btn icon variant="text" @click="closeSettings">
        <v-icon>mdi-close</v-icon>
      </v-btn>
    </v-card-title>

    <v-tabs v-model="activeTab">
      <v-tab value="general">General</v-tab>
      <v-tab value="filters">Filters</v-tab>
      <v-tab value="templates">Templates</v-tab>
    </v-tabs>

    <v-card-text>
      <v-tabs-window v-model="activeTab">
        <v-tabs-window-item value="general">
          <!-- General settings content -->
        </v-tabs-window-item>
        <v-tabs-window-item value="filters">
          <!-- Filter settings content -->
        </v-tabs-window-item>
        <v-tabs-window-item value="templates">
          <!-- Template settings content -->
        </v-tabs-window-item>
      </v-tabs-window>
    </v-card-text>

    <v-card-actions>
      <v-spacer />
      <v-btn variant="text" @click="cancelSettings">Cancel</v-btn>
      <v-btn color="primary" @click="saveSettings">Save</v-btn>
    </v-card-actions>
  </v-card>
</v-dialog>
```

### Pattern 3: Footer with Icon Links
**What:** Footer with icon buttons for external links
**When to use:** Attribution, source code, external resources
**Example:**
```vue
<!-- Source: Project context + MDI icons -->
<v-footer app class="text-caption text-medium-emphasis justify-center">
  <v-btn
    icon
    variant="text"
    size="small"
    href="https://github.com/berntpopp/gnomad-carrier-frequency"
    target="_blank"
    rel="noopener noreferrer"
  >
    <v-icon size="small">mdi-github</v-icon>
    <v-tooltip activator="parent" location="top">
      Source code on GitHub
    </v-tooltip>
  </v-btn>

  <span class="mx-2">|</span>

  <a :href="releasesUrl" target="_blank" rel="noopener noreferrer"
     class="text-decoration-none text-inherit">
    v{{ version }}
  </a>

  <span class="mx-2">|</span>

  <v-btn
    icon
    variant="text"
    size="small"
    href="https://gnomad.broadinstitute.org/"
    target="_blank"
    rel="noopener noreferrer"
  >
    <v-icon size="small">mdi-database</v-icon>
    <v-tooltip activator="parent" location="top">
      gnomAD database
    </v-tooltip>
  </v-btn>
</v-footer>
```

### Anti-Patterns to Avoid
- **Over-customizing v-app-bar height:** Use density prop values (compact/comfortable/default), not custom height
- **v-tab-item instead of v-tabs-window-item:** Vuetify 3 renamed these components
- **Dense prop on v-app-bar:** Vuetify 3 uses density="compact" instead
- **Flat + elevation together:** Use flat OR elevation, not both (flat sets elevation to 0)

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Dark mode favicon | Separate icons + JS toggle | SVG with CSS @media query | Browser handles automatically |
| Theme persistence | Custom localStorage logic | @vueuse/core useDark | Handles system preference, storage |
| Modal positioning | Custom CSS | v-dialog component | Handles overlay, centering, escape key |
| Tab state | Custom v-if blocks | v-tabs + v-tabs-window | Built-in transitions, a11y |
| Sticky app bar | CSS position: sticky | v-app-bar in v-app | Layout system handles automatically |

**Key insight:** Vuetify's app layout system (`v-app`, `v-app-bar`, `v-main`, `v-footer`) handles fixed positioning, scroll behavior, and z-indexing automatically when components have the `app` prop.

## Common Pitfalls

### Pitfall 1: v-tabs Slider Not Showing in v-dialog
**What goes wrong:** Tabs slider is hidden until you click a tab when dialog opens
**Why it happens:** Known Vuetify bug where slider doesn't render until first interaction
**How to avoid:** Set a default `v-model` value on `v-tabs` before dialog opens
**Warning signs:** Tabs appear without underline indicator on first open

### Pitfall 2: Dialog Not Centered with Navigation Drawer
**What goes wrong:** Dialog appears off-center when navigation drawer is present
**Why it happens:** Dialog centers relative to viewport, not available space
**How to avoid:** Not applicable for this project (no navigation drawer), but if added later, may need CSS adjustment
**Warning signs:** Dialog visually shifts when drawer opens/closes

### Pitfall 3: Favicon Not Updating After Change
**What goes wrong:** Old favicon shows despite updating files
**Why it happens:** Browser caches favicons aggressively
**How to avoid:** Clear cache during development, or add version query string
**Warning signs:** Old icon persists after deployment

### Pitfall 4: Using Deprecated Vuetify 2 Props
**What goes wrong:** Props like `dense`, `short`, `src` don't work
**Why it happens:** Vuetify 3 renamed/changed these props
**How to avoid:** Use `density="compact"`, `density="comfortable"`, `image` instead
**Warning signs:** Props have no effect, TypeScript errors

### Pitfall 5: Settings Dialog Closes Without Saving
**What goes wrong:** User makes changes, clicks outside dialog, changes lost
**Why it happens:** Default v-dialog closes on outside click
**How to avoid:** Use `persistent` prop on v-dialog to require explicit close
**Warning signs:** User reports losing settings unexpectedly

## Code Examples

Verified patterns from official sources:

### SVG Favicon with Dark Mode Support
```svg
<!-- Source: https://owenconti.com/posts/supporting-dark-mode-with-svg-favicons/ -->
<!-- public/favicon.svg -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <style>
    text {
      fill: #424242;
      font-family: system-ui, -apple-system, sans-serif;
      font-weight: bold;
      font-size: 10px;
    }
    @media (prefers-color-scheme: dark) {
      text {
        fill: #E0E0E0;
      }
    }
  </style>
  <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle">gCFC</text>
</svg>
```

### HTML Favicon References
```html
<!-- Source: https://evilmartians.com/chronicles/how-to-favicon-in-2021-six-files-that-fit-most-needs -->
<!-- index.html -->
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon.png" type="image/png" sizes="32x32">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
```

### Vuetify Theme Colors (Update)
```typescript
// Source: Vuetify 3 theme docs + RequiForm branding config
// src/main.ts - modify vuetify theme
const vuetify = createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        dark: false,
        colors: {
          primary: '#a09588',    // RequiForm muted taupe
          secondary: '#424242',  // Dark gray
          surface: '#FFFFFF',
          background: '#FAFAFA',
        }
      },
      dark: {
        dark: true,
        colors: {
          primary: '#BDBDBD',    // RequiForm dark mode primary
          secondary: '#757575',  // RequiForm dark mode secondary
        }
      }
    }
  }
})
```

### MDI Icon Names Reference
```typescript
// Source: https://pictogrammers.com/library/mdi/
// Verified icon names in @mdi/font

// Settings/gear icon
'mdi-cog'              // Codepoint F0493

// Theme toggle icons (already in use)
'mdi-weather-sunny'    // Light mode indicator
'mdi-weather-night'    // Dark mode indicator

// Footer icons
'mdi-github'           // Codepoint F02A4
'mdi-database'         // For gnomAD attribution
'mdi-open-in-new'      // External link indicator (optional)

// Dialog close
'mdi-close'            // Codepoint F0156
```

### App Bar Density Values
```typescript
// Source: Vuetify 3 density docs
// density prop values and resulting heights:

// density="default"    -> 64px height
// density="comfortable" -> 56px height (replaces 'short' prop)
// density="compact"    -> 48px height (replaces 'dense' prop)

// For compact 48px app bar as specified in context:
<v-app-bar density="compact" :elevation="2">
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| ICO-only favicon | SVG + PNG fallback | 2021+ | Dark mode support, scalability |
| v-tab-item | v-tabs-window-item | Vuetify 3.0 | Component renamed |
| dense prop | density="compact" | Vuetify 3.0 | String-based density values |
| short prop | density="comfortable" | Vuetify 3.0 | String-based density values |
| src prop | image prop | Vuetify 3.0 | Renamed for clarity |

**Deprecated/outdated:**
- `v-tabs-items` / `v-tab-item`: Use `v-tabs-window` / `v-tabs-window-item` in Vuetify 3
- favicon.ico as sole favicon: Modern approach uses SVG primary + fallbacks
- Multiple favicon sizes via plugin: Minimal approach (SVG + 32px PNG + 180px iOS) covers 99%+ browsers

## Open Questions

Things that couldn't be fully resolved:

1. **Exact RequiForm Footer Color**
   - What we know: RequiForm uses `#E5AA94` (peach) for footer background
   - What's unclear: Whether this should apply to gCFCalc or use a more neutral tone
   - Recommendation: Keep footer neutral (default surface color) since app doesn't need strong footer branding

2. **Settings Dialog Tab Names**
   - What we know: Context mentions "General, Filters, Templates etc."
   - What's unclear: Exact tabs depend on what settings exist (future phases)
   - Recommendation: Create dialog shell with placeholder tabs; actual content added in later phases

3. **Mobile Responsive Behavior**
   - What we know: Context says "Claude's discretion" for responsive behavior
   - What's unclear: Whether to collapse settings gear into menu on mobile
   - Recommendation: Keep simple - buttons remain visible at all breakpoints, dialog becomes full-width on mobile

## Sources

### Primary (HIGH confidence)
- [Vuetify App Bars Documentation](https://vuetifyjs.com/en/components/app-bars/) - density, elevation props
- [Vuetify Dialog Documentation](https://vuetifyjs.com/en/components/dialogs/) - width, persistent props
- [Vuetify Theme Documentation](https://vuetifyjs.com/en/features/theme/) - custom colors
- [MDI Icons - Pictogrammers](https://pictogrammers.com/library/mdi/) - icon names verification

### Secondary (MEDIUM confidence)
- [How to Favicon in 2025 - Evil Martians](https://evilmartians.com/chronicles/how-to-favicon-in-2021-six-files-that-fit-most-needs) - minimal favicon strategy
- [SVG Favicon Dark Mode - Owen Conti](https://owenconti.com/posts/supporting-dark-mode-with-svg-favicons/) - prefers-color-scheme in SVG
- [Vuetify Tabs in Dialog GitHub Discussion](https://github.com/vuetifyjs/vuetify/issues/1978) - known slider issue

### Tertiary (LOW confidence)
- WebSearch results for Vuetify 3 API details (verified against existing codebase patterns)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using existing project dependencies
- Architecture: HIGH - Patterns verified against Vuetify 3 docs
- Pitfalls: MEDIUM - Based on GitHub issues and community reports
- Favicon: HIGH - Verified against multiple 2025 best practices guides

**Research date:** 2026-01-19
**Valid until:** 2026-02-19 (30 days - stable Vuetify 3.x patterns)
