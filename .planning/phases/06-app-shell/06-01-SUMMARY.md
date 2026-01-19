---
phase: 06-app-shell
plan: 01
subsystem: branding
tags: [favicon, theme, vuetify, dark-mode, svg]

dependency_graph:
  requires: [05-01, 05-02]
  provides: [favicon-assets, requiform-theme-colors]
  affects: [06-02]

tech_stack:
  added: []
  patterns: [svg-favicon-dark-mode, css-prefers-color-scheme]

key_files:
  created:
    - public/favicon.svg
    - public/favicon.png
    - public/apple-touch-icon.png
  modified:
    - src/main.ts
    - index.html

decisions:
  - id: favicon-svg-primary
    description: "Use SVG as primary favicon with CSS dark mode"
    rationale: "Modern browsers support SVG favicons with embedded CSS media queries"
  - id: requiform-colors
    description: "Adopt #a09588 (muted taupe) as primary color"
    rationale: "LaborBerlin/RequiForm-inspired palette for professional clinical appearance"

metrics:
  duration: ~16 minutes
  completed: 2026-01-19
---

# Phase 6 Plan 01: Favicon and Theme Colors Summary

**One-liner:** Custom gCFC SVG favicon with dark mode CSS media query and Vuetify theme updated to RequiForm-inspired muted taupe palette

## What Was Done

### Task 1: Create Favicon Assets with Dark Mode Support

Created three favicon files in `public/`:

1. **favicon.svg** - Primary favicon with CSS dark mode:
   - SVG with 32x32 viewBox
   - Text "gCFC" centered using dominant-baseline and text-anchor
   - Light mode: #424242 (dark gray)
   - Dark mode: #E0E0E0 (light gray) via `@media (prefers-color-scheme: dark)`
   - Font: system-ui, bold, 10px

2. **favicon.png** - 32x32 PNG fallback:
   - Generated via ImageMagick convert from SVG
   - Dark text on transparent background
   - For older browsers that don't support SVG favicons

3. **apple-touch-icon.png** - 180x180 iOS touch icon:
   - Generated with #FAFAFA light background
   - Larger text for visibility at iOS home screen size
   - Centered gCFC text

**Commit:** 19a25cb

### Task 2: Update Theme Colors and Favicon References

**src/main.ts** - Vuetify theme configuration:
- Light theme primary: `#a09588` (RequiForm muted taupe)
- Light theme secondary: `#424242` (dark gray)
- Light theme surface: `#FFFFFF`
- Light theme background: `#FAFAFA`
- Dark theme primary: `#BDBDBD` (lighter for visibility)
- Dark theme secondary: `#757575` (medium gray)

**index.html** - Favicon link elements:
- Removed vite.svg reference
- Added SVG favicon (primary, modern browsers)
- Added PNG favicon (32x32 fallback)
- Added apple-touch-icon (iOS home screen)

**Commit:** 3727ebf

## Key Technical Details

### SVG Favicon with Dark Mode

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <style>
    text { fill: #424242; }
    @media (prefers-color-scheme: dark) {
      text { fill: #E0E0E0; }
    }
  </style>
  <text x="16" y="16" font-family="system-ui, sans-serif" font-size="10"
        font-weight="bold" text-anchor="middle" dominant-baseline="central">gCFC</text>
</svg>
```

This pattern:
- Uses CSS `@media (prefers-color-scheme: dark)` inside SVG
- Browser automatically switches favicon color based on system theme
- No JavaScript required for theme-aware favicon

### Favicon Link Order

```html
<link rel="icon" href="./favicon.svg" type="image/svg+xml" />
<link rel="icon" href="./favicon.png" type="image/png" sizes="32x32" />
<link rel="apple-touch-icon" href="./apple-touch-icon.png" />
```

Order matters:
1. SVG first - modern browsers prefer this
2. PNG fallback - older browsers skip SVG, use this
3. Apple touch icon - iOS-specific, separate declaration

## Deviations from Plan

None - plan executed exactly as written.

## Files Changed

| File | Change | Lines |
|------|--------|-------|
| public/favicon.svg | New file - SVG with dark mode CSS | +13 |
| public/favicon.png | New file - 32x32 PNG fallback | binary |
| public/apple-touch-icon.png | New file - 180x180 iOS icon | binary |
| src/main.ts | Updated Vuetify theme colors | +4/-2 |
| index.html | Updated favicon link elements | +3/-1 |

## Verification Results

- `npm run typecheck` - passed
- `npm run build` - succeeded (2m 21s)
- Favicon files in dist: favicon.svg, favicon.png, apple-touch-icon.png
- index.html contains all favicon link elements

## Requirements Coverage

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| SHELL-01 | Done | Custom gCFC favicon in public/ |
| SHELL-02 | Done | SVG favicon adapts via CSS prefers-color-scheme |
| SHELL-03 | Done | Theme colors updated to RequiForm palette |

## Next Phase Readiness

Plan 06-01 complete. Plan 06-02 (App Shell UI) can proceed:
- Favicon establishes visual brand identity
- Theme colors provide consistent RequiForm-inspired palette
- Build verified, ready for UI component updates

No blockers or concerns identified.
