# Pitfalls Research: v1.1 Features

**Project:** gnomAD Carrier Frequency Calculator
**Researched:** 2026-01-19
**Confidence:** MEDIUM-HIGH (verified with official documentation, GitHub issues, and codebase analysis)

---

## Summary

**Top 5 Critical Pitfalls to Avoid in v1.1:**

1. **ClinGen uses GraphQL, not REST** - Planning for REST API will fail; must use GraphQL or static CSV downloads
2. **ClinVar "conflicting" filter excludes valid pathogenic variants** - Current logic may reject well-established variants with outlier submissions
3. **Template XSS risk if allowing custom HTML** - User-editable templates require DOMPurify before any v-html usage
4. **ARIA live regions break with Vue reactivity** - Conditional rendering destroys screen reader tracking
5. **Meta tags render too late for social sharing** - Requires @unhead/vue setup for proper SEO

---

## ClinGen API Integration

### Pitfall 1: ClinGen Uses GraphQL, Not REST
**What goes wrong:** Teams plan ClinGen integration assuming a REST API, but ClinGen uses GraphQL exclusively via their GeneGraph API.

**Why it happens:** Many clinical genomics APIs (including NCBI) use REST. ClinGen chose GraphQL due to the complex, hierarchical nature of gene-disease validity data (over 100,000 individual evidence items).

**Consequences:**
- Wasted sprint planning integration that won't work
- Need to redesign API layer for GraphQL or use static file downloads

**Warning Signs:**
- Cannot find REST endpoint documentation
- Planning `fetch('/api/gene-validity')` style calls

**Prevention Strategy:**
- Use ClinGen's GeneGraph GraphQL API (same technology as gnomAD integration already exists)
- OR download static CSV files from ClinGen website for offline lookup
- Consider caching - gene validity data changes infrequently (monthly updates)

**Phase:** Data Enhancement

**Sources:**
- [ClinGen Gene-Disease Validity](https://clinicalgenome.org/curation-activities/gene-disease-validity/)
- [ClinGen Data Platforms Paper](https://pmc.ncbi.nlm.nih.gov/articles/PMC12001867/)

---

### Pitfall 2: ClinGen Rate Limiting Without Exponential Backoff
**What goes wrong:** ClinGen/external API calls fail intermittently; users see errors during busy periods.

**Why it happens:** No retry logic, no caching, aggressive parallel requests.

**Consequences:** Failed gene lookups, poor UX, potential IP blocking.

**Warning Signs:**
- HTTP 429 errors in console
- Intermittent failures that resolve on manual retry

**Prevention Strategy:**
- Implement exponential backoff with jitter for 429 responses
- Cache gene validity data locally (data changes monthly, not daily)
- Respect `Retry-After` headers
- Consider pre-fetching common genes at app startup

**Phase:** Data Enhancement

**Sources:**
- [API Rate Limiting Best Practices 2025](https://zuplo.com/learning-center/10-best-practices-for-api-rate-limiting-in-2025)

---

## Variant Filtering Edge Cases

### Pitfall 3: Overly Aggressive "Conflicting" Exclusion (CRITICAL)
**What goes wrong:** Current filter in `variant-filters.ts` excludes valid pathogenic variants:

```typescript
// Current (line 27-29 in variant-filters.ts):
const isPathogenic =
  (sig.includes('pathogenic') || sig.includes('likely_pathogenic')) &&
  !sig.includes('conflicting');
```

This rejects well-established pathogenic variants that have even one outlier submission.

**Why it happens:** ClinVar marks ANY disagreement as "conflicting" even when 16/17 submissions say "Pathogenic" and 1 says "VUS".

**Real Example:** HFE c.845G>A (hereditary hemochromatosis) - 16 Pathogenic submissions, 1 VUS = "Conflicting interpretations"

**Consequences:** False negatives - known pathogenic variants excluded, understating carrier frequency.

**Warning Signs:**
- Well-known disease genes showing unexpectedly low variant counts
- Users reporting missing variants they expect to see

**Prevention Strategy:**
```typescript
function isPathogenicClinVar(variant: ClinVarVariant): boolean {
  const sig = variant.clinical_significance.toLowerCase();

  // Accept non-conflicting pathogenic
  if ((sig.includes('pathogenic') || sig.includes('likely_pathogenic')) &&
      !sig.includes('conflicting')) {
    return variant.gold_stars >= 1;
  }

  // For conflicting: require high review status (3+ stars = expert panel)
  if (sig.includes('conflicting') && variant.gold_stars >= 3) {
    return true;
  }

  return false;
}
```

**Phase:** Quality/Polish - refine after core features work

**Sources:**
- [ClinVar Classification Representation](https://www.ncbi.nlm.nih.gov/clinvar/docs/clinsig/)
- [Simple ClinVar Tool](https://simple-clinvar.broadinstitute.org/)
- [Conflicting Variant Study](https://pmc.ncbi.nlm.nih.gov/articles/PMC11355203/)

---

### Pitfall 4: Zero Qualifying Variants Not Clearly Communicated
**What goes wrong:** Gene has data but no LoF HC or ClinVar pathogenic variants; user doesn't understand why default frequency is used.

**Why it happens:** Many genes have only missense variants, benign variants, or VUS.

**Current Handling (good):**
```typescript
// useCarrierFrequency.ts line 112-114
const usingDefault = computed(() =>
  hasData.value && pathogenicVariants.value.length === 0
);
```

**Warning Signs:**
- Users confused why certain genes show default 1% frequency
- Support questions about "missing" variant data

**Prevention Strategy:**
- Ensure UI prominently displays reason when using default
- Add tooltip: "No qualifying variants found (LoF HC or ClinVar P/LP with review). Using population default."
- Consider showing what WAS found: "12 variants found, 0 met pathogenicity criteria"
- Link to filtering criteria documentation

**Phase:** UX Enhancement

---

### Pitfall 5: Genes Without ClinVar Data
**What goes wrong:** Gene exists in gnomAD but has no ClinVar entries; filtering relies only on LOFTEE LoF HC.

**Why it happens:** ClinVar coverage is incomplete, especially for recently characterized disease genes.

**Consequences:** Valid disease genes may return zero variants and fall back to default frequency.

**Warning Signs:**
- `clinvarVariants.value` is empty array
- Users asking about newly characterized disease genes

**Prevention Strategy:**
- Check for empty ClinVar response explicitly
- Display different message: "No ClinVar data available for this gene" vs "No pathogenic variants found"
- Consider LoF-only mode with separate confidence indicator
- Link to ClinVar for users to check manually

**Phase:** Data Enhancement

---

## SEO and Accessibility

### Pitfall 6: Meta Tags Render After JavaScript Load
**What goes wrong:** Social sharing previews show blank or default title/description.

**Why it happens:** SPAs render meta tags client-side; social preview bots don't wait for JavaScript.

**Current State in `index.html`:**
```html
<title>gnomAD Carrier Frequency Calculator</title>
<!-- No meta description (Lighthouse finding) -->
```

**Warning Signs:**
- Blank previews when sharing link on Slack/Twitter/LinkedIn
- Lighthouse SEO audit failures for missing description

**Prevention Strategy:**
1. Add static meta tags in `index.html` for the main landing page:
```html
<meta name="description" content="Calculate carrier frequencies for autosomal recessive conditions using gnomAD data. Generate German clinical documentation for genetic counseling.">
<meta property="og:title" content="gnomAD Carrier Frequency Calculator">
<meta property="og:description" content="Calculate carrier frequencies using gnomAD population data">
```

2. Use `@unhead/vue` for dynamic management (note: `@vueuse/head` has been sunset):
```typescript
// main.ts
import { createHead } from '@unhead/vue/client';
const head = createHead();
app.use(head);
```

3. For full SSR support, consider prerendering the index page.

**Phase:** SEO/Accessibility - early priority for discoverability

**Sources:**
- [Unhead Vue Installation](https://unhead.unjs.io/docs/vue/head/guides/get-started/installation/)
- [@vueuse/head Sunset Notice](https://github.com/vueuse/head)

---

### Pitfall 7: Vuetify Default Contrast Ratios Fail WCAG
**What goes wrong:** Default Vuetify 3 theme colors don't meet WCAG 4.5:1 contrast ratio.

**Known Issues:**
- Tooltip text: 3.70:1 light mode, 3.07:1 dark mode (needs 4.5:1)
- Placeholder text often fails contrast
- Some disabled states are too faint

**Warning Signs:**
- Lighthouse accessibility audit contrast warnings (known issue in project)
- Users with visual impairments report difficulty reading

**Prevention Strategy:**
1. Override Vuetify SASS variables:
```scss
// src/styles/settings.scss
$tooltip-background-color: #333;
$tooltip-text-color: #fff;
```

2. Create custom theme with passing colors:
```typescript
// vuetify.ts
const lightTheme = {
  colors: {
    primary: '#1867C0',  // Verify 4.5:1 on white
    secondary: '#5CBBF6',
    // ... test each color
  }
}
```

3. Test with browser DevTools accessibility tree
4. Consider using AAA contrast (7:1) for critical information like frequencies

**Phase:** SEO/Accessibility - address known Lighthouse issues

**Sources:**
- [Vuetify Tooltip Contrast Issue #17998](https://github.com/vuetifyjs/vuetify/issues/17998)

---

### Pitfall 8: ARIA Live Regions Break with Vue Reactivity (CRITICAL)
**What goes wrong:** Screen reader announcements don't fire when content changes.

**Why it happens:** Vue's reactive DOM management unmounts and remounts elements; screen readers lose tracking of `aria-live` regions when elements are destroyed.

**The Core Issue:**
```vue
<!-- This BREAKS screen readers -->
<div v-if="showResult" aria-live="polite">
  Carrier frequency: {{ frequency }}
</div>

<!-- When showResult becomes true, this is a NEW element -->
<!-- Screen reader doesn't track it as a live region -->
```

**Consequences:** Blind users miss important updates (calculation results, errors, status changes).

**Warning Signs:**
- `v-if` on elements containing aria-live
- Conditionally rendered result messages
- Screen reader testing shows missed announcements

**Prevention Strategy:**
1. Keep aria-live regions **always mounted**:
```vue
<!-- This WORKS -->
<div aria-live="polite">
  <span v-if="showResult">Carrier frequency: {{ frequency }}</span>
</div>
```

2. Use dedicated announcer service:
```typescript
import { useAnnouncer } from '@vue-a11y/announcer';

const { polite } = useAnnouncer();

// Announce calculation complete
polite('Carrier frequency calculated: 1 in 25');
```

3. Use `aria-live="polite"` for 90% of updates; `assertive` only for critical errors.

**Phase:** SEO/Accessibility - implement announcer service

**Sources:**
- [Fixing aria-live in Vue](https://dev.to/dkoppenhagen/when-your-live-region-isnt-live-fixing-aria-live-in-angular-react-and-vue-1g0j)
- [MDN ARIA Live Regions](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Guides/Live_regions)

---

### Pitfall 9: Non-Sequential Heading Order
**What goes wrong:** Headings skip levels (h1 -> h3) or are used for styling rather than structure.

**Current State:** Known Lighthouse issue - heading order not sequential.

**Consequences:** Screen reader users lose document structure context.

**Warning Signs:**
- Lighthouse heading order warning
- `<h3>` without preceding `<h2>`
- Using heading elements for visual styling

**Prevention Strategy:**
- Audit heading hierarchy: exactly one h1, h2 follows h1, h3 follows h2
- Use Vuetify typography classes (`text-h3`, etc.) for visual styling, not heading elements
- Create heading hierarchy map for each wizard step

**Phase:** SEO/Accessibility - straightforward fix

---

## Build Optimization

### Pitfall 10: Bundle Size from Full Library Imports
**What goes wrong:** Bundle size bloats from importing entire libraries.

**Why it happens:** Convenience imports or tree-shaking not configured properly.

**Warning Signs:**
- Build output > 500KB
- Slow initial page load
- Large vendor chunk

**Prevention Strategy:**
1. Use ES module versions: `lodash-es` instead of `lodash`
2. Import specific functions: `import { debounce } from 'lodash-es'`
3. Analyze bundle:
```typescript
// vite.config.ts
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    vue(),
    visualizer({ open: true, gzipSize: true }),
  ],
});
```

4. Vuetify 3 has built-in tree-shaking (already configured correctly)
5. Consider `build.target: 'esnext'` for modern browsers only

**Phase:** Build Optimization - profile before optimizing

**Sources:**
- [Vite Performance Guide](https://vite.dev/guide/performance)

---

### Pitfall 11: CSS Purge Removing Dynamic Classes
**What goes wrong:** PurgeCSS removes styles only applied via dynamic class names.

**Why it happens:** Static analysis can't detect `:class="{ 'text-error': hasError }"`.

**Warning Signs:**
- Styles work in dev but break in production
- Dynamic Vuetify classes missing

**Prevention Strategy:**
- Do NOT add PurgeCSS with Vuetify (it's already optimized)
- If you must purge, safelist all dynamic patterns
- Test production build thoroughly: `bun run build && bun run preview`

**Phase:** Build Optimization

---

### Pitfall 12: PWA Service Worker Caching Issues
**What goes wrong:** Users see old version after deployment; refresh doesn't help.

**Known vite-plugin-pwa Issues:**
- `updateServiceWorker()` sometimes fails with multiple tabs
- Route interception can break navigation
- Blank screen on new version deployment

**Warning Signs:**
- Users reporting "stuck" old version
- Console shows service worker "waiting"

**Prevention Strategy:**
- For a clinical tool, consider whether PWA/offline is actually needed
- If implementing:
  - Use `prompt` strategy with clear update UI
  - Handle multi-tab scenarios carefully
  - Test deployment workflow extensively

**Phase:** Future phase - PWA is optional for this tool

**Sources:**
- [vite-plugin-pwa Issues #583](https://github.com/vite-pwa/vite-plugin-pwa/issues/583)

---

## Template Editing Security

### Pitfall 13: XSS via Custom Template Content (CRITICAL)
**What goes wrong:** User-editable templates contain malicious scripts that execute when rendered.

**Why it happens:** If templates are rendered with `v-html` and users can edit them, any HTML/JS executes.

**Current Code (`template-renderer.ts`):**
```typescript
export function renderTemplate(template: string, context: Partial<TemplateContext>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key) => {
    const value = context[key as keyof TemplateContext];
    if (value === undefined || value === null) {
      console.warn(`Template variable "${key}" is undefined`);
      return '';
    }
    return String(value);
  });
}
```

**Current Risk Assessment:**
- LOW risk currently - templates are text, not HTML
- HIGH risk if v-html or custom templates are added

**Warning Signs:**
- Using `v-html` to render user-editable content
- `innerHTML` assignment with template output
- `customSections` in templateStore containing HTML

**Prevention Strategy:**
1. **Preferred:** Keep templates as text-only (no HTML)

2. **If HTML needed:** Use `vue-dompurify-html`:
```typescript
// main.ts
import VueDOMPurifyHTML from 'vue-dompurify-html';
app.use(VueDOMPurifyHTML);

// Component - use v-dompurify-html instead of v-html
<div v-dompurify-html="renderedTemplate"></div>
```

3. **Validate template content:**
```typescript
function validateTemplate(template: string): boolean {
  const hasHtmlTags = /<[^>]+>/g.test(template);
  const hasJsUrl = /javascript:/i.test(template);
  return !hasHtmlTags && !hasJsUrl;
}
```

**Phase:** Template Customization - security review BEFORE allowing user input

**Sources:**
- [Vue.js Security Guide](https://vuejs.org/guide/best-practices/security)
- [vue-dompurify-html](https://github.com/LeSuisse/vue-dompurify-html)

---

### Pitfall 14: Template Variable Injection
**What goes wrong:** Context values contain malicious content that gets rendered.

**Why it happens:** Data from external APIs (gnomAD, ClinGen) could theoretically contain unexpected content.

**Current Mitigation:** `String(value)` converts but doesn't sanitize.

**Prevention Strategy:**
- Validate all context values before template rendering:
```typescript
function sanitizeContext(context: Partial<TemplateContext>): Partial<TemplateContext> {
  return {
    ...context,
    gene: context.gene?.replace(/[^A-Z0-9-]/gi, '') ?? '',
    // Validate numbers are actually numbers
    carrierFrequencyPercent: Number.isFinite(context.carrierFrequencyPercent)
      ? context.carrierFrequencyPercent
      : undefined,
  };
}
```
- Gene names: validate pattern `/^[A-Z][A-Z0-9-]+$/`

**Phase:** Template Customization

---

### Pitfall 15: Pinia localStorage with Clinical Data
**What goes wrong:** User preferences accidentally include clinical or patient-identifiable data.

**Current State (`useTemplateStore.ts`):**
```typescript
persist: {
  key: 'carrier-freq-templates',
  storage: localStorage,
}
```

**Current Risk:** LOW - only stores language, gender style, section preferences.

**Future Risk:** MEDIUM if custom templates include patient-specific information.

**Warning Signs:**
- Storing anything patient-identifiable
- Storing calculation results
- Shared computers in clinical settings

**Prevention Strategy:**
- Audit what's persisted - only UI preferences should persist
- Never persist: patient names, MRNs, clinical notes, calculation results
- Add clear "Clear all local data" option in settings
- Document in privacy policy what's stored locally

**Phase:** Security review for any feature adding persistence

**Sources:**
- [Pinia Persistence Security](https://www.vuemastery.com/blog/refresh-proof-your-pinia-stores/)

---

## Phase-Specific Warning Summary

| Phase | Pitfall | Priority |
|-------|---------|----------|
| Data Enhancement | ClinGen GraphQL not REST (#1) | CRITICAL |
| Data Enhancement | Rate limiting (#2) | HIGH |
| Data Enhancement | No ClinVar data handling (#5) | MEDIUM |
| Quality/Polish | Conflicting variant exclusion (#3) | HIGH |
| Quality/Polish | Zero variants UX (#4) | MEDIUM |
| SEO/Accessibility | Meta tags (#6) | HIGH |
| SEO/Accessibility | Contrast ratios (#7) | HIGH |
| SEO/Accessibility | ARIA live regions (#8) | CRITICAL |
| SEO/Accessibility | Heading order (#9) | MEDIUM |
| Build Optimization | Bundle size (#10) | MEDIUM |
| Build Optimization | CSS purge (#11) | LOW |
| Template Customization | XSS prevention (#13) | CRITICAL |
| Template Customization | Input validation (#14) | HIGH |
| Template Customization | localStorage data (#15) | MEDIUM |

---

## Quick Reference: Implementation Checklist

Before implementing each v1.1 feature, verify:

**ClinGen Integration:**
- [ ] Using GraphQL API OR static CSV download (NOT REST)
- [ ] Exponential backoff with jitter for rate limiting
- [ ] Caching layer for gene validity data
- [ ] Clear error messages for API failures

**Variant Filtering:**
- [ ] Consider conflicting variants with high review status
- [ ] Clear UI explanation when using default frequency
- [ ] Distinguish "no ClinVar data" from "no pathogenic variants"

**SEO/Accessibility:**
- [ ] Static meta description in index.html
- [ ] @unhead/vue installed (not deprecated @vueuse/head)
- [ ] Vuetify color overrides for WCAG contrast
- [ ] ARIA live regions always mounted (not conditionally rendered)
- [ ] Heading hierarchy verified (h1 -> h2 -> h3)

**Template Editing:**
- [ ] Templates validated before storage
- [ ] vue-dompurify-html if ANY HTML rendering
- [ ] Context values sanitized before rendering
- [ ] No patient data in localStorage

---

## Sources

### Official Documentation
- [Vue.js Security](https://vuejs.org/guide/best-practices/security)
- [Vue.js Accessibility](https://vuejs.org/guide/best-practices/accessibility)
- [Vite Performance](https://vite.dev/guide/performance)
- [Unhead Vue](https://unhead.unjs.io/docs/vue/head/guides/get-started/installation/)
- [ClinVar Classifications](https://www.ncbi.nlm.nih.gov/clinvar/docs/clinsig/)
- [ClinGen Gene-Disease Validity](https://clinicalgenome.org/curation-activities/gene-disease-validity/)

### GitHub Issues
- [Vuetify Tooltip Contrast #17998](https://github.com/vuetifyjs/vuetify/issues/17998)
- [vite-plugin-pwa #583](https://github.com/vite-pwa/vite-plugin-pwa/issues/583)
- [@vueuse/head Sunset](https://github.com/vueuse/head)

### Community Resources
- [ARIA Live Regions in Vue](https://dev.to/dkoppenhagen/when-your-live-region-isnt-live-fixing-aria-live-in-angular-react-and-vue-1g0j)
- [MDN ARIA Live Regions](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Guides/Live_regions)
- [Simple ClinVar](https://simple-clinvar.broadinstitute.org/)
- [vue-dompurify-html](https://github.com/LeSuisse/vue-dompurify-html)
