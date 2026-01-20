# Phase 14: Mobile Optimization - Research

**Researched:** 2026-01-20
**Domain:** Mobile-responsive UI, Vuetify 3, Touch Accessibility
**Confidence:** HIGH

## Summary

This phase focuses on making the gnomAD Carrier Frequency Calculator fully usable on mobile phones (viewports < 600px). The current implementation has several identified pain points: the variant table is nearly unreadable on mobile (scored 3/10), the results table hides columns (scored 5/10), and the settings dialog with templates tab uses fixed widths that overflow on small screens.

Vuetify 3 provides robust mobile support through its `useDisplay` composable, built-in breakpoint system, and responsive grid props. The primary strategies for mobile optimization in this project are: (1) making dialogs fullscreen on mobile, (2) implementing horizontal scroll with visual indicators for data tables, (3) using alt-labels or vertical orientation for the stepper, and (4) ensuring all touch targets meet 44x44px minimum.

**Primary recommendation:** Use Vuetify's `useDisplay` composable throughout all components to conditionally apply mobile-specific layouts, leverage the responsive grid system with breakpoint props, and implement a horizontal scroll pattern with frozen first column for data tables.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vuetify 3 | ^3.8.1 | UI framework with responsive utilities | Already in use, provides `useDisplay`, breakpoints, responsive props |
| Vue 3 | ^3.5.24 | Framework | Already in use |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @vueuse/core | ^12.7.0 | `useMediaQuery` fallback | Complex breakpoint logic beyond Vuetify's built-in |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom CSS media queries | Vuetify breakpoint classes (d-none, d-sm-flex) | Vuetify classes are declarative and consistent |
| Third-party responsive table library | Native horizontal scroll + CSS | Less overhead, better Vuetify integration |
| Card view pattern for tables | Horizontal scroll with frozen column | Cards work for simple data, scroll preserves sortability |

**No new dependencies required** - Vuetify 3 provides everything needed for mobile optimization.

## Architecture Patterns

### Recommended Approach

#### 1. useDisplay Composable Pattern
Every component that needs responsive behavior should use Vuetify's `useDisplay`:

```typescript
// Source: Vuetify Display & Platform documentation
import { useDisplay } from 'vuetify'

const { mobile, smAndDown, mdAndDown } = useDisplay()

// Reactive mobile detection
const isSmallScreen = computed(() => smAndDown.value)
```

#### 2. Fullscreen Dialog Pattern
Dialogs should switch to fullscreen on mobile for better usability:

```vue
<!-- Source: Vuetify Dialog documentation -->
<v-dialog :fullscreen="mobile">
  <!-- content -->
</v-dialog>
```

#### 3. Responsive Grid with Breakpoint Props
Use Vuetify's grid system with breakpoint-specific column widths:

```vue
<v-row>
  <v-col cols="12" sm="6" md="4">
    <!-- Takes full width on mobile, half on tablet, third on desktop -->
  </v-col>
</v-row>
```

#### 4. Conditional Content Rendering
Hide non-essential content on mobile using display utility classes:

```vue
<span class="d-none d-sm-inline">Extended Label</span>
<span class="d-sm-none">Short</span>
```

### Component-Specific Patterns

#### Stepper (WizardStepper.vue)
The v-stepper has limited native mobile support. Options:
1. Use `alt-labels` prop to stack labels below icons
2. Use vertical stepper on mobile (requires conditional rendering)
3. Collapse to show only current step on mobile

Recommended: Use `alt-labels` and ensure step titles are concise.

```vue
<v-stepper :alt-labels="mobile">
  <!-- steps with short titles -->
</v-stepper>
```

#### Data Tables (VariantTable.vue, FrequencyResults.vue)
For tables with many columns:
1. Wrap in scrollable container
2. Freeze first column (ID column)
3. Add visual scroll indicator (gradient or shadow)

```css
/* Horizontal scroll pattern */
.table-wrapper {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

/* Frozen first column */
.v-data-table :deep(td:first-child),
.v-data-table :deep(th:first-child) {
  position: sticky;
  left: 0;
  z-index: 1;
  background: inherit;
}

/* Scroll indicator shadow */
.table-wrapper::after {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  width: 24px;
  height: 100%;
  background: linear-gradient(to left, rgba(0,0,0,0.1), transparent);
  pointer-events: none;
}
```

#### Settings Dialog (SettingsDialog.vue)
Currently uses dynamic width (600px/900px). Must adapt for mobile:

```vue
<v-dialog
  :fullscreen="smAndDown"
  :max-width="smAndDown ? undefined : (activeTab === 'templates' ? 900 : 600)"
>
```

#### TextOutput.vue
The header row with multiple controls needs to stack on mobile:

```vue
<v-card-title class="d-flex flex-column flex-sm-row">
  <!-- Controls stack vertically on mobile -->
</v-card-title>
```

### Anti-Patterns to Avoid
- **Fixed pixel widths without max-width constraints:** Use `max-width: 100%` or responsive widths
- **Horizontal overflow on body:** Always contain horizontal scroll within specific components
- **Small touch targets:** Never use buttons/controls smaller than 44x44px
- **Hiding critical information:** Use horizontal scroll instead of hiding columns
- **Relying solely on hover states:** Mobile has no hover; use tap interactions

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Mobile detection | Custom window resize listener | `useDisplay` from Vuetify | Reactive, SSR-safe, debounced |
| Responsive columns | Manual CSS media queries | Vuetify grid breakpoint props (cols, sm, md) | Consistent with design system |
| Fullscreen dialogs | Manual fullscreen CSS | `v-dialog :fullscreen` prop | Handles safe areas, transitions |
| Touch-friendly buttons | Custom sizing | Vuetify size props + density | Maintains design consistency |
| Conditional visibility | v-if with manual breakpoint | Vuetify display classes (d-none, d-sm-flex) | Zero JS overhead |

**Key insight:** Vuetify has invested heavily in mobile support. Using native Vuetify patterns ensures consistency and reduces maintenance.

## Common Pitfalls

### Pitfall 1: Using v-if with useDisplay for Layout Changes
**What goes wrong:** Causes hydration mismatches in SSR and layout shift on first render
**Why it happens:** Server renders without knowing viewport size
**How to avoid:** Use CSS display classes for simple show/hide, reserve v-if for complex content
**Warning signs:** Console warnings about hydration mismatch, content flashing on load

### Pitfall 2: Fixed Width Dialogs Overflowing Mobile
**What goes wrong:** Dialog extends beyond viewport, horizontal scroll on entire page
**Why it happens:** max-width: 600px works on desktop but not 320px phone
**How to avoid:** Always use `:fullscreen="smAndDown"` or percentage-based widths with vw units
**Warning signs:** Dialog content cut off, need to scroll horizontally to see buttons

### Pitfall 3: Stepper Steps Disappearing
**What goes wrong:** On narrow screens, step text overflows and pushes other steps off-screen
**Why it happens:** v-stepper-header doesn't wrap or truncate by default
**How to avoid:** Use `alt-labels`, short step titles, or switch to vertical stepper on mobile
**Warning signs:** Steps 3 and 4 not visible on phone

### Pitfall 4: Data Table Touch Targets Too Small
**What goes wrong:** Users can't tap checkboxes, expand buttons, or links accurately
**Why it happens:** `density="compact"` reduces touch target size below 44px
**How to avoid:** Use `density="comfortable"` on mobile, or increase padding on interactive elements
**Warning signs:** Users mis-tap, high error rate on mobile

### Pitfall 5: Navigation Drawer Covering Content
**What goes wrong:** LogViewerPanel with fixed 450px width covers entire mobile screen
**Why it happens:** width prop doesn't adapt to screen size
**How to avoid:** Use percentage width or make fullscreen on mobile: `:width="smAndDown ? '100%' : 450"`
**Warning signs:** Close button not visible, can't see underlying content

### Pitfall 6: Slider Labels Overlapping
**What goes wrong:** ClinVar star slider tick labels overlap on small screens
**Why it happens:** Fixed tick positions don't scale with smaller slider
**How to avoid:** Hide tick labels on mobile using display classes or simplify to just min/max
**Warning signs:** "0 1 2 3 4" becomes unreadable mess

## Code Examples

Verified patterns from official sources:

### useDisplay for Mobile Detection
```typescript
// Source: Vuetify 3 Display & Platform API
import { useDisplay } from 'vuetify'
import { computed } from 'vue'

// In setup
const { smAndDown, mdAndDown, mobile, width } = useDisplay()

// mobile is true when viewport < 1280px (configurable)
// smAndDown is true when viewport < 960px
const isMobileLayout = computed(() => smAndDown.value)
```

### Responsive Dialog
```vue
<!-- Source: Vuetify 3 useDisplay documentation example -->
<template>
  <v-dialog :fullscreen="mobile" :max-width="mobile ? undefined : 600">
    <v-card>
      <v-card-title>Settings</v-card-title>
      <v-card-text>...</v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { useDisplay } from 'vuetify'
const { mobile } = useDisplay()
</script>
```

### Horizontal Scrolling Table Wrapper
```vue
<!-- Source: Community best practice, verified pattern -->
<template>
  <div class="table-container" :class="{ 'has-scroll': needsScroll }">
    <v-data-table
      :headers="headers"
      :items="items"
      density="comfortable"
      class="elevation-0"
    />
  </div>
</template>

<style scoped>
.table-container {
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  position: relative;
}

/* Scroll indicator gradient */
.table-container.has-scroll::after {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 24px;
  background: linear-gradient(to left, rgba(0,0,0,0.08), transparent);
  pointer-events: none;
}
</style>
```

### Conditional Column Display
```typescript
// Source: Verified Vuetify pattern
const headers = computed(() => {
  const baseHeaders = [
    { title: '', key: 'include', sortable: false, width: '48px' },
    { title: 'Variant ID', key: 'variant_id', sortable: true },
    { title: 'Consequence', key: 'consequence', sortable: true },
    { title: 'Allele Freq', key: 'alleleFrequency', sortable: true },
  ]

  // Add additional columns only on larger screens
  if (!smAndDown.value) {
    baseHeaders.push(
      { title: 'Carrier Freq', key: 'carrierFrequency', sortable: true },
      { title: 'Ratio', key: 'ratio', sortable: true },
    )
  }

  return baseHeaders
})
```

### Touch-Friendly Button Sizing
```vue
<!-- Source: WCAG 2.5.8 / Material Design guidelines -->
<v-btn
  :size="smAndDown ? 'default' : 'small'"
  :min-height="44"
  :min-width="44"
>
  Action
</v-btn>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `$vuetify.breakpoint` (Options API) | `useDisplay()` composable | Vuetify 3 (2022) | Better TypeScript, SSR support |
| Bootstrap-style 12-column only | Vuetify 12-column with flex utilities | Vuetify 3 | More layout flexibility |
| Fixed 44px touch targets (AAA) | 24px minimum (AA), 48px recommended | WCAG 2.2 (2023) | 24px is level AA, 44px is AAA |
| Device-specific CSS | Viewport-based responsive | 2020+ | Works across device form factors |

**Deprecated/outdated:**
- `this.$vuetify.breakpoint` - use `useDisplay()` composable in Vuetify 3
- `v-if="$vuetify.breakpoint.smAndDown"` - use display utility classes when possible

## Open Questions

Things that couldn't be fully resolved:

1. **Vertical Stepper on Mobile**
   - What we know: Vuetify 3 has a separate v-vertical-stepper component
   - What's unclear: Whether switching between horizontal/vertical causes state issues
   - Recommendation: Test with alt-labels first, only switch to vertical if needed

2. **Frozen Column z-index with Vuetify Themes**
   - What we know: Sticky positioning works with proper z-index
   - What's unclear: How Vuetify's dark mode affects frozen column background
   - Recommendation: Use CSS variable for background color to inherit from theme

3. **v-data-table Mobile View**
   - What we know: Vuetify doesn't have built-in card view for tables
   - What's unclear: Whether a future Vuetify version will add this feature
   - Recommendation: Implement horizontal scroll pattern now, revisit if Vuetify adds card view

## Sources

### Primary (HIGH confidence)
- Vuetify 3 Display & Platform documentation - useDisplay composable, breakpoint values
- Vuetify 3 Dialog component API - fullscreen prop, responsive behavior
- WCAG 2.1/2.2 Success Criterion 2.5.5 and 2.5.8 - touch target sizing (44x44 AAA, 24x24 AA)

### Secondary (MEDIUM confidence)
- [Vuetify GitHub issues on mobile stepper](https://github.com/vuetifyjs/vuetify/issues/18842) - vertical stepper feature request
- [Vuetify GitHub issues on data table mobile](https://github.com/vuetifyjs/vuetify/issues/14441) - horizontal scroll feature request
- [Medium: Responsive Web Apps with Vuetify](https://medium.com/@claus.straube/responsive-web-apps-with-vuetify-80bd3959165f) - best practices
- [LogRocket: Accessible touch target sizes](https://blog.logrocket.com/ux-design/all-accessible-touch-target-sizes/) - platform comparison

### Tertiary (LOW confidence)
- [MoldStud: Responsive Tables in VuetifyJs](https://moldstud.com/articles/p-responsive-tables-in-vuetifyjs-how-to-display-data-effectively) - community patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Vuetify 3 is already in use, patterns well-documented
- Architecture patterns: HIGH - Based on official Vuetify documentation
- Pitfalls: MEDIUM - Based on GitHub issues and community experience, not all verified

**Research date:** 2026-01-20
**Valid until:** 2026-02-20 (30 days - Vuetify 3 is stable)

## Component-by-Component Assessment

Based on code review, here are the specific mobile issues and solutions:

| Component | Current Issue | Solution | Priority |
|-----------|---------------|----------|----------|
| VariantTable.vue | 10 columns don't fit, 3/10 usability | Horizontal scroll, frozen ID column, hide columns | HIGH |
| StepResults.vue | Results table columns hidden | Horizontal scroll, prioritize key columns | HIGH |
| SettingsDialog.vue | Fixed 600/900px width overflows | Fullscreen on mobile | HIGH |
| WizardStepper.vue | Step titles may overflow | alt-labels prop, shorter titles | MEDIUM |
| TextOutput.vue | Header controls overflow | Stack vertically on mobile | MEDIUM |
| LogViewerPanel.vue | Fixed 450px width | 100% width on mobile | MEDIUM |
| FilterPanel.vue | Slider tick labels may overlap | Hide ticks on mobile | LOW |
| VariantModal.vue | Already uses fullscreen on mobile | Verify proper implementation | VERIFY |

## Breakpoint Reference

Vuetify 3 default breakpoints:
- **xs**: 0-599px (phones)
- **sm**: 600-959px (tablets)
- **md**: 960-1279px (small laptops)
- **lg**: 1280-1919px (desktops)
- **xl**: 1920-2559px (large desktops)
- **xxl**: 2560px+ (ultra-wide)

For this project, primary focus is **xs** (< 600px) per MOB-01.
