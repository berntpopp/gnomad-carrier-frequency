# Pitfalls Research: SEO & UX Polish (v1.4)

**Project:** gnomAD Carrier Frequency Calculator
**Researched:** 2026-02-23
**Confidence:** HIGH (verified with codebase analysis, official documentation, and multiple community sources)

---

## Summary

**Top 7 Pitfalls to Avoid in v1.4:**

1. **Service worker precaches stale `index.html` with old static content** - Adding SEO static HTML inside `<div id="app">` will be precached by Workbox; users with existing SW will not see updated content until they accept the PWA update prompt
2. **Changing Vuetify primary color cascades to 40+ component bindings** - The `color="primary"` prop is used in 40+ places; a saturated new color may clash with non-CTA uses (chips, cards, links)
3. **OG image uses relative path AND SVG format** - Double failure: relative `./og-image.svg` is unresolvable by social crawlers AND SVG is not rendered by any major platform
4. **VitePress sitemap overwrites SPA sitemap in merged deploy artifact** - Both builds output `sitemap.xml`; the `cp -r docs/.vitepress/dist dist/docs` merge step does not combine them
5. **Structured data version number hardcoded** - `softwareVersion: "1.2.0"` in index.html JSON-LD is already stale (project is v1.3.0); will remain wrong after every release
6. **Onboarding overlay blocks the disclaimer modal** - PWA "App ready" snackbar already competes with disclaimer; adding a tour overlay creates a triple-modal first-run experience
7. **`navigateFallback: 'index.html'` serves SPA shell to Googlebot** - Workbox navigation fallback returns the cached SPA HTML for all routes, which may interfere with crawling of `/docs/` subpaths if denylist regex fails

---

## Critical Pitfalls

Mistakes that directly break SEO indexing, cause visual regressions across the app, or create stuck-state bugs for users.

---

### Pitfall 1: Service Worker Precaches Stale `index.html` After Static Content Is Added

**What goes wrong:** You add rich static HTML inside `<div id="app">` for SEO. Workbox precaches `index.html` with a content hash. Existing users who have the old service worker installed continue seeing the old (empty) `index.html` from their SW cache. The `registerType: 'prompt'` setting means users must explicitly click "Update" in the PWA notification to get the new content. Users who dismiss the prompt or never see it remain stuck on the old version indefinitely.

**Why it happens:** The current Workbox config uses `globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}']` which precaches all HTML files. With `navigateFallback: 'index.html'`, the service worker intercepts all navigation requests and returns the cached `index.html`. The `registerType: 'prompt'` means the new service worker waits in the `waiting` state until the user explicitly activates it.

**Consequences:**
- Existing PWA users see the old empty `<div id="app">` even after deployment
- The SEO static content only helps new visitors and search crawlers (who do not run service workers)
- Users who dismissed the update prompt have no easy way to trigger it again (1-hour polling interval)
- If the static HTML includes navigation links to `/docs/`, those links appear only for new users

**Warning signs:**
- After deployment, test in a browser where the PWA was previously installed
- Check Application tab in DevTools for "waiting" service worker state
- `curl` returns new HTML but browser shows old content

**Prevention:**
1. Consider changing `registerType` from `'prompt'` to `'autoUpdate'` for this release, since the SEO changes are purely additive and do not disrupt user state
2. If keeping `'prompt'`, ensure the update notification UI is prominent and persistent (not easily dismissed)
3. Test the SW update flow explicitly: install old version, deploy new version, verify the update prompt appears
4. Add `skipWaiting()` in the service worker for critical HTML changes (the `vite-plugin-pwa` `registerType: 'autoUpdate'` does this automatically)
5. Verify that `cleanupOutdatedCaches: true` actually purges the old `index.html` precache entry when the new SW activates

**Detection:** After deploying the SEO HTML changes, open the site in a browser that previously had the PWA installed. If the static HTML does not appear, the SW cache is serving stale content.

**Phase to address:** SEO Indexing phase (must be considered when adding static HTML to `index.html`)

**Confidence:** HIGH - Verified via codebase analysis of `vite.config.ts` (line 27: `registerType: 'prompt'`) and `usePwaUpdate.ts`

**Sources:**
- [Workbox index.html cached in bad state - Issue #1528](https://github.com/GoogleChrome/workbox/issues/1528)
- [The Day a Service Worker Held My Entire Site Hostage](https://dev.to/bradleymatera/the-day-a-service-worker-held-my-entire-site-hostage-21d3)
- [Service Workers That Don't Surprise You](https://dev.to/crisiscoresystems/service-workers-that-dont-surprise-you-deterministic-caching-for-offline-first-pwas-5480)

---

### Pitfall 2: Changing Vuetify Primary Color Cascades to 40+ Component Bindings

**What goes wrong:** The UX audit recommends changing the primary color from `#a09588` (muted warm gray) to a more saturated CTA color. You update the Vuetify theme `primary` value in `main.ts`. Immediately, 40+ components that use `color="primary"` change appearance, including many that are NOT CTAs: filter chips, section toggle chips, links, card headers, progress indicators, and informational elements.

**Why it happens:** The codebase uses `color="primary"` as a catch-all for "branded color" across very different component types:
- **CTA buttons:** `StepGene.vue`, `StepStatus.vue`, `StepFrequency.vue`, `StepResults.vue` (CONTINUE buttons)
- **Non-CTA uses:** `FilterChips.vue` (category chips), `TextOutput.vue` (section toggle chips), `SettingsDialog.vue` (switches, selects), `FrequencyResults.vue` (expansion panel), `AppBar.vue` (CSS variable reference), `HistoryPanel.vue` (background tint)
- **Dark mode separately:** `main.ts` line 44 sets dark primary to `#BDBDBD`, which also needs updating

A saturated blue or green CTA color applied to all 40+ bindings will make the app look garish. Filter chips, toggle switches, and informational badges should not all be bright blue.

**Consequences:**
- Filter chips look like clickable CTAs when they are toggles
- Section toggle chips in TextOutput compete visually with the actual "Copy" and "Export" buttons
- HistoryPanel's `rgba(var(--v-theme-primary), 0.08)` background tint becomes a visible colored wash
- AppBar title color changes from subtle brand color to saturated accent
- Dark mode primary (`#BDBDBD`) also needs updating or it will be inconsistent

**Warning signs:**
- After changing primary color, open every step of the wizard and check visual hierarchy
- Filter chips in Step 3 should NOT look like primary action buttons
- The AppBar brand text should not be the same saturated color as CTAs

**Prevention:**
1. **Do NOT simply change the primary color.** Instead, introduce a secondary color strategy:
   - Keep `primary: '#a09588'` (or slight refinement) for brand/non-CTA uses
   - Add a new custom color (e.g., `'cta': '#2E7D32'` or `'action': '#1565C0'`) to the Vuetify theme
   - Update ONLY the CTA buttons (CONTINUE, BACK, Copy, Export) to use `color="cta"`
   - Leave chips, switches, and informational elements on `color="primary"`
2. **Alternatively**, change primary but audit and re-bind all 40+ usages:
   - Move non-CTA uses to `color="secondary"` or a new named color
   - This is more work but results in cleaner semantic color usage
3. **Test both themes:** light AND dark. The dark theme has its own primary definition that must be updated in parallel.
4. **Check CSS variable references:** `AppBar.vue` line 140 uses `rgb(var(--v-theme-primary))` directly in CSS, and `HistoryPanel.vue` line 165 and `VariablePicker.vue` line 110 use `rgba(var(--v-theme-primary), 0.08)` for background tints.

**Detection:** Visual regression testing. Screenshot every wizard step + settings dialog + history panel before and after color change.

**Phase to address:** UX Polish phase (color change task)

**Confidence:** HIGH - Verified by grep showing 40+ `color="primary"` bindings across codebase

---

### Pitfall 3: OG Image Has Two Simultaneous Failures (Relative Path + SVG Format)

**What goes wrong:** The current `og:image` meta tag has two independent problems that must both be fixed:
1. **Relative URL:** `content="./og-image.svg"` - Social platform crawlers resolve this relative to nothing since they fetch the URL without browser context
2. **SVG format:** Even with an absolute URL, Facebook, LinkedIn, Twitter/X, Slack, and Discord do not render SVG images in link previews

Fixing only one problem leaves the other. Fixing only the URL (making it absolute) still shows a blank preview because SVG is unsupported. Fixing only the format (converting to PNG) but leaving the relative path still results in a broken image.

**Why it happens:** The SVG was likely chosen because it already existed as the favicon source and scales perfectly. The relative path works in `<img>` tags in the browser context but OG crawlers do not have that context.

**Consequences:**
- Every social share (Twitter/X, LinkedIn, Slack, Discord, Facebook) shows a text-only link with no image preview
- Academic and clinical genetics communities that share the tool see unprofessional link previews
- Reduced click-through rate from social shares

**Warning signs:**
- Test with [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
- Test with [Twitter Card Validator](https://cards-dev.twitter.com/validator)
- Check that the `og:image` URL is resolvable from outside your domain

**Prevention:**
1. Generate a PNG (1200x630px) OG image at build time or as a static asset
2. Use absolute HTTPS URL: `content="https://gnomad-carrier-frequency.kidney-genetics.org/og-image.png"`
3. Update BOTH `og:image` AND `twitter:image` meta tags (lines 15 and 24 of `index.html`)
4. Add `og:image:type` meta tag: `content="image/png"`
5. Verify with social platform debugging tools after deployment

**Phase to address:** SEO Indexing phase (immediate fix, prerequisite for social sharing)

**Confidence:** HIGH - Verified from codebase (`index.html` lines 15, 24) and OG protocol specification

**Sources:**
- [Open Graph Protocol - og:image requirements](https://ogp.me/)
- [Relative vs Absolute URL for OG Image](https://veonr.com/blog/relative-vs-absolute-og-image-video-urls)

---

### Pitfall 4: VitePress Sitemap Conflicts with SPA Sitemap in Merged Deploy

**What goes wrong:** The SEO plan calls for adding VitePress `sitemap` config to auto-generate a sitemap for docs pages. The SPA also needs its own `public/sitemap.xml` for the root app URL. The deploy workflow (`deploy.yml` line 44) runs `cp -r docs/.vitepress/dist dist/docs`, which places the VitePress output under `dist/docs/`. If VitePress generates a `sitemap.xml` at its root, it ends up at `dist/docs/sitemap.xml`. Meanwhile, the SPA's `public/sitemap.xml` is at `dist/sitemap.xml`. These are two separate sitemaps with no cross-reference.

**Why it happens:** VitePress and the Vite SPA are separate build processes that produce separate output directories. The deploy workflow merges them by copying, not by combining their outputs. Neither build process knows about the other's sitemap.

**Consequences:**
- `robots.txt` can only reference one `Sitemap:` URL (by convention). If it points to `/sitemap.xml`, the docs pages are not in it. If it points to `/docs/sitemap.xml`, the SPA root URL is not in it.
- Google discovers either the SPA URLs or the docs URLs, but not both, unless a sitemap index is used
- VitePress sitemap URLs will use the VitePress `base: '/docs/'` prefix, so the generated URLs should be correct, but the sitemap file itself lives at `/docs/sitemap.xml` which is non-standard

**Warning signs:**
- After build, check if both `dist/sitemap.xml` and `dist/docs/sitemap.xml` exist
- Check `robots.txt` to see which sitemap URL is referenced
- Submit both sitemaps to Google Search Console and verify both are discovered

**Prevention:**
1. **Use a sitemap index file** at `/sitemap.xml` that references both sub-sitemaps:
   ```xml
   <?xml version="1.0" encoding="UTF-8"?>
   <sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
     <sitemap>
       <loc>https://gnomad-carrier-frequency.kidney-genetics.org/sitemap-app.xml</loc>
     </sitemap>
     <sitemap>
       <loc>https://gnomad-carrier-frequency.kidney-genetics.org/docs/sitemap.xml</loc>
     </sitemap>
   </sitemapindex>
   ```
2. Rename the SPA sitemap to `sitemap-app.xml` to avoid collision
3. Update `robots.txt` to reference the index: `Sitemap: https://gnomad-carrier-frequency.kidney-genetics.org/sitemap.xml`
4. In VitePress config, set `sitemap.hostname` to the full domain so generated URLs are absolute
5. Add a post-build step in the deploy workflow that creates the sitemap index after both builds complete

**Phase to address:** SEO Indexing phase (sitemap creation task)

**Confidence:** HIGH - Verified from `deploy.yml` merge step and VitePress config (no sitemap configured yet)

**Sources:**
- [VitePress Sitemap Generation](https://vitepress.dev/guide/sitemap-generation)
- [Sitemaps XML Format - Sitemap Index](https://www.sitemaps.org/protocol.html)

---

### Pitfall 5: `navigateFallback` May Interfere with Docs Crawling

**What goes wrong:** The Workbox config sets `navigateFallback: 'index.html'` with `navigateFallbackDenylist: [/^\/docs/]`. This correctly excludes `/docs/` paths from the SPA navigation fallback. However, if the regex is not precise enough, edge cases can slip through (e.g., a URL path that contains "docs" but does not start with `/docs/`). More importantly, Googlebot does not run service workers on first visit to a domain, so this is primarily a user-facing concern, not an SEO concern.

**Why it happens:** Service workers are only activated after the first page visit. Google's crawler visits with a clean context each time (no prior service worker registration). The real risk is for **returning users** who navigate from the SPA to `/docs/` pages: if the denylist regex fails, the SW returns the SPA shell instead of letting the navigation through to the VitePress-rendered docs.

**Consequences:**
- Returning users who click an in-app link to `/docs/` might see the SPA shell instead of VitePress content (if regex fails)
- This is NOT a direct SEO problem since Googlebot does not use service workers
- But it IS a UX problem if the cross-linking from SPA to docs is broken for PWA users

**Warning signs:**
- After adding cross-links from SPA to `/docs/`, test navigation in a browser where the PWA is installed
- Open DevTools Network tab and verify that `/docs/` requests bypass the service worker
- Check that the regex `^\/docs` correctly matches all docs paths

**Prevention:**
1. The current regex `/^\/docs/` is correct and should match all paths starting with `/docs`
2. Add explicit tests: navigate to `/docs/`, `/docs/guide/`, `/docs/reference/methodology` with PWA installed
3. Consider adding `/sitemap.xml` and `/robots.txt` to the denylist so these files are always fetched fresh from the server:
   ```js
   navigateFallbackDenylist: [/^\/docs/, /\/sitemap.*\.xml$/, /\/robots\.txt$/]
   ```
4. For the SPA-to-docs cross-link, use full page navigation (not router push), since docs are a separate app

**Phase to address:** SEO Indexing phase (when adding cross-links and sitemap)

**Confidence:** MEDIUM - The denylist regex appears correct, but edge cases need testing with actual PWA installation

---

## Moderate Pitfalls

Mistakes that cause visual inconsistency, SEO ineffectiveness, or technical debt.

---

### Pitfall 6: Structured Data Contains Stale Version and Missing Required Fields

**What goes wrong:** The JSON-LD structured data in `index.html` has `softwareVersion: "1.2.0"` but the project is already at v1.3.0 (per `package.json`). This version number must be manually updated on every release. Additionally, the structured data mixes `WebApplication` and `FAQPage` types in a single `@graph`, which is valid but can confuse Google's Rich Results Test if not structured carefully.

**Why it happens:** The version number in the HTML template is not connected to the build system. Unlike `import.meta.env.VITE_APP_VERSION` (defined in `vite.config.ts` line 107), the `index.html` JSON-LD is raw HTML that Vite does not process for variable substitution.

**Consequences:**
- Stale version number in structured data is a trust signal issue (Google may see inconsistency with actual app version)
- Manual updates are forgotten, accumulating staleness over releases
- If Google's structured data parser encounters issues with the `@graph` array, neither the `WebApplication` nor the `FAQPage` rich results may appear

**Warning signs:**
- After a release, check if `softwareVersion` in `index.html` matches `package.json` version
- Run [Google Rich Results Test](https://search.google.com/test/rich-results) to verify both schema types are recognized
- Check for "missing field" warnings in the Schema.org validator

**Prevention:**
1. **Automate version injection** using a Vite plugin or build script that replaces `softwareVersion` in `index.html` at build time, using the same `pkg.version` source as `VITE_APP_VERSION`
2. Alternatively, move the structured data to a Vue component's `<script>` that can use `import.meta.env.VITE_APP_VERSION`
3. Validate structured data with [Schema Markup Validator](https://validator.schema.org/) after each change
4. Ensure `dateModified` is also updated (currently hardcoded as `"2026-02-01"` in the SEO report's recommended schema)

**Phase to address:** SEO On-Page Optimization phase

**Confidence:** HIGH - Verified: `package.json` shows `"version": "1.3.0"`, `index.html` JSON-LD shows `"softwareVersion": "1.2.0"`

**Sources:**
- [Common JSON-LD Schema Issues and Solutions](https://zeo.org/resources/blog/most-common-json-ld-schema-issues-and-solutions)
- [Fixing Common Structured Data Errors](https://salt.agency/blog/fixing-common-json-ld-structured-data-issues-in-google-search-console/)

---

### Pitfall 7: Onboarding Overlay Competes with Existing First-Run Modals

**What goes wrong:** The app already has two first-run experiences: a **disclaimer modal** (clinical tool, must-accept) and a **PWA "App ready for offline use" snackbar**. Adding an onboarding tour or welcome overlay creates a triple-modal situation. The user's first experience becomes: dismiss disclaimer -> dismiss PWA notification -> navigate through onboarding tour. This is hostile UX, especially for genetic counselors who just want to use the tool.

**Why it happens:** Each feature (disclaimer, PWA notification, onboarding) is developed independently. The disclaimer is legally required. The PWA notification is technically generated. The onboarding is a UX improvement. Nobody tests the combined first-run flow.

**Consequences:**
- First-time user faces 3+ modal/overlay interactions before seeing the actual tool
- Users may perceive the app as cumbersome rather than welcoming
- On mobile, overlapping modals create z-index and scroll-lock conflicts
- Onboarding tour targeting specific DOM elements may fail if the disclaimer modal is still covering them

**Warning signs:**
- Test the complete first-time flow in an incognito window
- Count the number of modals/overlays/snackbars the user must interact with before reaching Step 1
- Check if the onboarding tour tries to highlight elements that are behind the disclaimer modal

**Prevention:**
1. **Sequence the first-run experiences:**
   - Step A: Disclaimer modal (required, blocks everything)
   - Step B: After disclaimer is accepted, show onboarding (if first visit)
   - Step C: PWA notification appears AFTER onboarding completes (delay by 5+ seconds)
2. **Use localStorage flags** to gate each experience: `disclaimer-accepted`, `onboarding-completed`, `pwa-notification-shown`
3. **Keep onboarding minimal:** A single welcome card with a "Try with CFTR" quick-start button is better than a multi-step tour for this app. Genetic counselors are domain experts; they do not need UI hand-holding.
4. **Do NOT use a third-party tour library** unless the app becomes significantly more complex. A simple first-visit card component is lighter weight, more maintainable, and avoids the known pitfalls of tour libraries (mobile scroll issues, stale element targeting, z-index battles with Vuetify dialogs).

**Phase to address:** UX Polish phase (onboarding task)

**Confidence:** HIGH - Verified from codebase: disclaimer exists as modal, PWA snackbar exists in `usePwaUpdate.ts`, UI/UX audit confirms both

**Sources:**
- [5 Best Vue.js Product Tour Libraries](https://www.chameleon.io/blog/vuejs-product-tours)
- [4 Best Vue Onboarding Libraries 2026](https://userguiding.com/blog/vue-tour)

---

### Pitfall 8: Static HTML Inside `<div id="app">` May Flash Before Vue Mounts (FOUC)

**What goes wrong:** Adding static HTML seed content inside `<div id="app">` for SEO creates a brief Flash of Unstyled Content (FOUC). The user sees raw, unstyled HTML (headings, paragraphs, lists) for 100-500ms before Vue mounts and replaces it with the actual app. This looks like the page is broken or loading incorrectly.

**Why it happens:** Vue's `createApp(App).mount('#app')` replaces all innerHTML of the mount target. Until the JavaScript bundle loads, parses, and executes, the static HTML is visible. On slow connections or devices, this can last several seconds. The static HTML has no Vuetify styling since Vuetify CSS is loaded via JS.

**Consequences:**
- Users see a flash of plain HTML before the styled app appears
- On slow connections (common in clinical settings with hospital firewalls), this can last 2-5 seconds
- Returning PWA users do not see this (SW serves cached assets), so the problem is only visible to new users and search engines
- If the static content includes navigation links, users might click them during the FOUC window

**Warning signs:**
- Test on slow 3G network throttling in DevTools
- Record a performance trace and look for a paint before the Vue app mounts
- Check if the static content is visually jarring against the Vuetify-styled app

**Prevention:**
1. **Style the static HTML to match the app's visual feel:**
   ```html
   <style>
     #app > main { font-family: Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 24px; }
     #app > main h1 { font-size: 1.5rem; color: #424242; }
   </style>
   ```
2. **Add a CSS transition** that fades out the static content when Vue takes over (though Vue's mount replaces it instantly, so this is tricky)
3. **Keep the static content minimal** but sufficient for SEO: H1, 2-3 paragraphs, a feature list. Do not replicate the entire app UI.
4. **Add `<noscript>` separately** for users with JS disabled, providing a clear message
5. **Consider the loading skeleton pattern:** Make the static HTML look like a loading skeleton rather than finished content, so the transition to the real app feels natural

**Phase to address:** SEO Indexing phase (static HTML insertion task)

**Confidence:** MEDIUM - This is a known pattern in SPA SEO. The severity depends on the user's connection speed and the app's bundle size.

---

### Pitfall 9: Canonical URL and Base Path Mismatch

**What goes wrong:** The app uses `base: '/'` in Vite config (line 109), the VitePress docs use `base: '/docs/'`, and the site is served from a custom domain. The canonical URL must match exactly what users and Google see. If the canonical URL in `index.html` does not match the actual deployed URL (including trailing slash), Google may treat them as different pages or ignore the canonical signal.

**Why it happens:** GitHub Pages historically served at `username.github.io/repo-name/` with a base path, but this project uses a custom domain (`gnomad-carrier-frequency.kidney-genetics.org`) with root base. The OG URL is already set to the correct domain (line 18 of `index.html`). However, adding a canonical URL introduces a new place where this must be kept in sync.

**Consequences:**
- If canonical URL is `https://gnomad-carrier-frequency.kidney-genetics.org` (no trailing slash) but Google indexes `https://gnomad-carrier-frequency.kidney-genetics.org/` (with trailing slash), the canonical signal is weakened
- If the domain or deployment changes, canonical URLs in `index.html` become stale
- VitePress docs canonical URLs must use `/docs/` prefix, not the VitePress-relative paths

**Warning signs:**
- Check Google Search Console for "Duplicate without user-selected canonical" coverage issues
- Verify canonical URL includes trailing slash to match the actual URL
- Check that the OG URL and canonical URL match exactly

**Prevention:**
1. Use consistent trailing slash: `https://gnomad-carrier-frequency.kidney-genetics.org/`
2. Ensure `og:url` and `<link rel="canonical">` have identical values
3. Configure VitePress with `sitemap.hostname: 'https://gnomad-carrier-frequency.kidney-genetics.org'` so docs sitemaps use the correct domain
4. Add a CI check that verifies canonical URLs in built HTML match the deployment domain

**Phase to address:** SEO Indexing phase (canonical URL task)

**Confidence:** HIGH - Verified from codebase: `base: '/'`, OG URL uses correct domain

---

### Pitfall 10: Native `alert()`/`confirm()` Replacement Breaks Existing Error Handling Logic

**What goes wrong:** The app uses native `alert()` in `SettingsDialog.vue` (lines 788, 791) for template import errors and `confirm()` in `SettingsDialog.vue` (line 801) for template reset and `LogViewer.vue` (line 234) for log clearing. Replacing these with Vuetify `v-dialog` components changes the control flow from synchronous to asynchronous. The `confirm()` calls are used in `if (confirm(...))` patterns which are synchronous. A Vuetify dialog requires async/await or Promise-based flow.

**Why it happens:** Native `alert()` and `confirm()` are synchronous and blocking. They pause JavaScript execution until the user responds. Vuetify dialogs are asynchronous components that show/hide reactively. The calling code must be refactored from `if (confirm(msg)) { doThing() }` to an async pattern with a dialog state variable.

**Consequences:**
- If you simply replace `confirm()` with a `v-dialog` without changing the control flow, the action will execute immediately without waiting for user confirmation
- The template reset and log clear actions will run unconditionally
- You need to introduce dialog state refs, confirmation callbacks, and potentially a shared confirmation dialog composable

**Warning signs:**
- After replacing `confirm()`, test the template reset and log clear flows
- Verify that the destructive action only happens when the user clicks "Confirm" in the dialog
- Check that the dialog can be cancelled without triggering the action

**Prevention:**
1. Create a reusable `useConfirmDialog()` composable that returns a Promise:
   ```typescript
   const { confirm } = useConfirmDialog()
   if (await confirm('Reset all templates to defaults?')) {
     templateStore.resetTemplates()
   }
   ```
2. Replace all 4 native dialog calls at once (do not partially migrate)
3. Ensure the confirmation dialog inherits the current theme (light/dark)
4. Test keyboard navigation (Enter to confirm, Escape to cancel) for accessibility

**Phase to address:** UX Polish phase (dialog replacement task)

**Confidence:** HIGH - Verified from codebase: 4 native dialog calls identified with exact line numbers

---

## Minor Pitfalls

Mistakes that cause inconvenience or small quality issues but are fixable.

---

### Pitfall 11: `manifest.json` Theme Color Not Updated When Primary Changes

**What goes wrong:** The PWA manifest in `vite.config.ts` (line 33) sets `theme_color: '#a09588'`. If the primary color changes for the UX polish, the manifest theme color and the HTML meta theme-color become inconsistent. Android Chrome uses `theme_color` for the status bar and task switcher; a mismatch between the app's visible primary color and the browser chrome looks like a bug.

**Why it happens:** The theme color is set in the Vite config, not derived from the Vuetify theme. These are independent systems.

**Prevention:**
1. When changing primary/CTA colors, audit all color definitions: Vuetify theme (light AND dark), PWA manifest `theme_color`, `<meta name="theme-color">` if present, and any hardcoded color values
2. If the brand color (#a09588 or refinement) stays as the "identity" color, keep the manifest aligned to that, not to the new CTA color

**Phase to address:** UX Polish phase (color change task, same PR)

**Confidence:** HIGH - Verified from `vite.config.ts` line 33

---

### Pitfall 12: Footer Icon Labels Break Mobile Overflow Menu

**What goes wrong:** Adding text labels to footer icons (recommended by UX audit) works on desktop but the footer already collapses to a 3-dot overflow menu on mobile. If labels are added as always-visible text, the mobile layout may break. If labels are added only as tooltips, they do not help discoverability.

**Why it happens:** The footer has a responsive breakpoint that switches from icon row to overflow menu. Adding text to icons changes the space requirements and may push the breakpoint or cause wrapping.

**Prevention:**
1. Add labels only on desktop (using Vuetify's `d-none d-sm-inline` display utility)
2. On mobile, keep icon-only in the overflow menu but use descriptive menu item text
3. Test at multiple viewport widths (especially 360px, 390px, 768px)

**Phase to address:** UX Polish phase (footer improvement task)

**Confidence:** MEDIUM - UX audit mentions the responsive footer behavior, but specific breakpoint code was not verified

---

### Pitfall 13: SEO Title Change May Confuse Existing (Limited) Brand Recognition

**What goes wrong:** The SEO report recommends changing the title from "gnomAD Carrier Frequency Calculator" to "Carrier Frequency Calculator -- gnomAD Population Data | gCFCalc". While better for SEO, if anyone has bookmarked or referenced the original title, the change creates a minor brand discontinuity.

**Why it happens:** SEO optimization favors leading with the target keyword. But this project is in a niche academic/clinical domain where the "gnomAD" prefix signals legitimacy to the target audience.

**Prevention:**
1. The change is correct for SEO purposes -- proceed with it
2. But consider a compromise that keeps "gnomAD" prominent: "gnomAD Carrier Frequency Calculator | gCFCalc" (moves target keyword to `<h1>` in static HTML instead)
3. Use `<h1>` in the static HTML seed for the keyword-leading version, keep `<title>` more brand-focused
4. The OG title can differ from the page title to optimize for different contexts

**Phase to address:** SEO On-Page Optimization phase

**Confidence:** LOW - This is a judgment call about brand vs. keyword priority; no definitive answer

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Static HTML seed content | SW precaches stale HTML (Pitfall 1) | Consider `autoUpdate` or ensure update prompt is tested |
| Static HTML seed content | FOUC flash before Vue mounts (Pitfall 8) | Add minimal inline styles matching app aesthetic |
| Sitemap creation | VitePress + SPA sitemap collision (Pitfall 4) | Use sitemap index file, not single sitemap |
| OG image fix | Relative path AND SVG format (Pitfall 3) | Fix BOTH: absolute HTTPS URL + PNG format |
| Structured data | Stale version number (Pitfall 6) | Automate injection from package.json at build time |
| Canonical URL | Trailing slash mismatch (Pitfall 9) | Match exactly with OG URL including trailing slash |
| Primary color change | 40+ component cascade (Pitfall 2) | Introduce CTA-specific color, keep primary for brand |
| Onboarding | Triple-modal first run (Pitfall 7) | Sequence: disclaimer -> onboarding -> PWA notify |
| Native dialog replacement | Sync-to-async control flow (Pitfall 10) | Create `useConfirmDialog` composable, migrate all 4 calls |
| Footer labels | Mobile overflow menu break (Pitfall 12) | Desktop-only labels, test responsive breakpoints |
| PWA manifest | Theme color mismatch (Pitfall 11) | Audit all color definitions in same PR as color change |
| `navigateFallback` | Docs cross-links broken for PWA users (Pitfall 5) | Test with installed PWA, verify denylist regex |

---

## Integration Risk Summary

The highest-risk integration point is the **service worker + SEO content** interaction. The current SW config (`registerType: 'prompt'`, `navigateFallback: 'index.html'`, `globPatterns` including `*.html`) means that:

1. **New static HTML in `index.html` will be precached** by the service worker
2. **Existing users will not see the new content** until they accept the PWA update
3. **The navigation fallback ensures all routes return the SPA shell**, which is correct for the app but must be verified to NOT interfere with `/docs/` cross-links

The recommended approach is to:
- Change `registerType` to `'autoUpdate'` for this specific release (since SEO changes are additive, not breaking)
- OR implement a more prominent update notification UI that ensures users update promptly
- Test the full SW lifecycle: install old version -> deploy new version -> verify content updates

The second highest risk is the **color change cascade**. With 40+ `color="primary"` bindings, a naive primary color change will affect the entire app. The mitigation is straightforward (add a named CTA color instead of changing primary) but requires discipline to implement correctly.

---

## Sources

- [Workbox stale index.html caching - Issue #1528](https://github.com/GoogleChrome/workbox/issues/1528)
- [Workbox stale index.html - Issue #2299](https://github.com/GoogleChrome/workbox/issues/2299)
- [Service Worker holds site hostage](https://dev.to/bradleymatera/the-day-a-service-worker-held-my-entire-site-hostage-21d3)
- [Service Workers and SEO](https://www.sara-taher.com/service-workers-seo/)
- [PWA partial rendering issues with service workers](https://searchengineland.com/pwa-how-to-avoid-partial-rendering-issues-with-service-workers-317631)
- [SEO for Vue SPAs](https://nuxtseo.com/learn-seo/vue/spa)
- [Vue SPA SEO Prerendering](https://nuxtseo.com/learn-seo/vue/spa/prerendering)
- [OG Protocol Specification](https://ogp.me/)
- [Relative vs Absolute OG Image URLs](https://veonr.com/blog/relative-vs-absolute-og-image-video-urls)
- [VitePress Sitemap Generation](https://vitepress.dev/guide/sitemap-generation)
- [Common JSON-LD Schema Issues](https://zeo.org/resources/blog/most-common-json-ld-schema-issues-and-solutions)
- [Fixing Structured Data Errors](https://salt.agency/blog/fixing-common-json-ld-structured-data-issues-in-google-search-console/)
- [Vue 3 Onboarding Libraries](https://www.chameleon.io/blog/vuejs-product-tours)
- [Vuetify 3 Theme Documentation](https://vuetifyjs.com/en/features/theme/)
- [Vuetify Disabled Button Color Issues](https://github.com/vuetifyjs/vuetify/issues/15147)
- [Open Graph Tags Complete Guide 2026](https://share-preview.com/blog/og-tags-complete-guide.html)
