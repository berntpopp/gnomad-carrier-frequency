# UI/UX Audit: gnomAD Carrier Frequency Calculator

**Date**: 2026-02-23
**URL**: https://gnomad-carrier-frequency.kidney-genetics.org/
**Version**: v1.2.0
**Tested viewports**: 1440x900 (desktop), 390x844 (mobile)
**Tool**: Playwright CLI (Chromium)
**Methodology**: Evaluated against Nielsen's 10 Usability Heuristics, modern UX checklist criteria, and UX audit best practices.

---

## Category Ratings

### 1. Visual Design & Aesthetics — 6/10

**Strengths:**
- Clean, minimal layout with generous whitespace
- Warm rose-gray brand color (`#a09588`) is unique and professional
- Consistent use of Vuetify Material Design components
- Dark mode is well-implemented with proper contrast

**Weaknesses:**
- **The primary/accent color is too muted.** The `#a09588` warm gray makes CTAs (CONTINUE button) look *disabled* even when they're active. This is the single biggest UX issue on the site. A first-time user may not realize the button is clickable.
- Stepper circles use the same muted color, reducing visual hierarchy
- No hero illustration or visual warmth on landing — the page feels like a raw form
- Footer icons are cryptic (icon-only with no labels on desktop) — the `fx`, stacked-cards, and image icons are not self-explanatory
- The "Toggle theme" tooltip appears as a floating pill in dark mode (visible in screenshot) — looks like a UI bug

**Recommendations:**
- **Change primary CTA color** to a more saturated, accessible color (e.g., `#5C8A4D` green or `#2962FF` blue) while keeping the warm gray as a secondary/brand accent
- Add a subtle hero graphic or gene/DNA motif to Step 1 to establish context
- Add text labels under footer icons (at least on desktop)
- Fix the floating "Toggle theme" tooltip rendering

---

### 2. Information Architecture & Navigation — 8/10

**Strengths:**
- 4-step wizard is an excellent pattern for this workflow — clear linear progression
- Step labels with subtitles ("Search and select", "Carrier or affected", etc.) guide the user well
- Completed steps show checkmarks, making progress clear
- Back/Continue navigation is consistent across all steps

**Weaknesses:**
- Step labels are abbreviated ("Freq" instead of "Frequency") — there's room for the full word
- No way to click completed stepper items to jump back (or if there is, there's no visual affordance)
- The title "gnomAD Carrier Frequency Calculator" repeats on every step — this wastes vertical space, especially on mobile where it takes up ~25% of above-the-fold
- No breadcrumb or "current gene" context shown after Step 1 — if you're on Step 3, you can't confirm which gene you selected without going back

**Recommendations:**
- Use full step labels: "Gene", "Status", "Frequency", "Results"
- Add a persistent context chip (e.g., "CFTR | gnomAD v4.1") below the stepper after gene selection
- Make completed stepper items clickable to navigate back
- Consider collapsing the page title on Steps 2-4 to save vertical space

---

### 3. User Flow & Task Completion — 8.5/10

**Strengths:**
- The 4-step flow is logical and mirrors a genetic counselor's actual workflow
- Autocomplete gene search with Ensembl IDs is excellent for disambiguation
- ClinGen validation immediately after gene selection adds clinical confidence
- Gene Constraint card provides useful context without blocking progress
- Three frequency source options (gnomAD, Literature, Default) cover all real-world scenarios
- Results page is comprehensive: summary + population table + clinical text + export

**Weaknesses:**
- Step 2 (Status) pre-selects nothing — the user *must* click even if the most common option (Heterozygous carrier) is obvious. Pre-selecting the most common option would reduce clicks
- Step 3 auto-calculates gnomAD frequency but the user still must click CONTINUE — this feels like an unnecessary gate when the data is already ready
- On Step 4, the clinical text section is below the fold — many users may not scroll to discover it

**Recommendations:**
- Consider pre-selecting "Heterozygous carrier" as default (most common clinical scenario)
- Add a visual anchor or "scroll for clinical text" indicator on Step 4
- Consider auto-advancing from Step 3 when gnomAD data loads successfully (with a brief delay for review)

---

### 4. Responsiveness & Mobile Experience — 7/10

**Strengths:**
- Mobile stepper switches to numbered circles only (no labels) — appropriate density
- Touch targets meet 44px minimum on buttons
- Footer collapses to a 3-dot overflow menu on mobile
- Drawers go full-width on mobile
- Tables scroll horizontally with sticky first column

**Weaknesses:**
- **The page title takes too much space on mobile** — "gnomAD Carrier Frequency Calculator" wraps to 3 lines and consumes 25%+ of the viewport before any interactive content
- On mobile Step 4 (Results), the page is extremely long (scrolling through population table + all clinical text sections) — the user has to scroll through ~8+ screens of content
- The "Genderster..." select on mobile is truncated — label is unreadable
- Section toggle chips in TextOutput wrap chaotically on mobile — hard to scan
- Mobile Step 2: Back and Continue buttons are side-by-side with very different visual weights

**Recommendations:**
- On mobile, shrink the title to "gCFCalc" or hide it entirely (the AppBar logo already says "gCFCalc")
- Consider collapsible sections on mobile Step 4 (population table collapsed by default, clinical text collapsed)
- Use full labels or abbreviations that don't truncate for select dropdowns on mobile
- Make section toggle chips scroll horizontally in a single row on mobile

---

### 5. Color & Contrast — 6.5/10

**Strengths:**
- ClinGen validation uses semantic colors well (green=validated, yellow=warning, blue=info)
- Filter chips use distinct colors per category (primary/secondary/success/warning)
- Population table Global row is visually distinguished with bold + gray background
- Dark mode has good contrast overall

**Weaknesses:**
- **Primary button color fails to communicate "clickable"** — the muted `#a09588` against `#FAFAFA` background doesn't create enough contrast for CTAs
- Disabled vs. enabled state of CONTINUE button is almost indistinguishable — both look like muted brown/gray
- The "Gene Not in ClinGen" info alert uses blue text on light blue background — adequate but could use stronger visual weight for this important clinical note
- Some outlined section toggle chips (inactive) have very low contrast in light mode

**Recommendations:**
- Establish a clear active CTA color distinct from the brand warm-gray
- Increase contrast between disabled and enabled button states (e.g., enabled = saturated color, disabled = 30% opacity)
- Consider using a different visual treatment for inactive section chips (e.g., subtle fill instead of outline-only)

---

### 6. Typography & Readability — 7.5/10

**Strengths:**
- Good hierarchy: h4 for page title, h6 for section titles, body-2 for descriptions
- Monospace for ratio values in the table (1:17, 1:35) — appropriate for numeric data
- Clinical text output uses pre-wrap with inherited font — reads like actual letter text
- Population names and numeric data are clearly separated in the table

**Weaknesses:**
- No custom font loaded — falls back to Roboto/system fonts. For a medical tool, a more authoritative serif or medical-specific font could add credibility
- The subtitle text under radio options in Step 2 is `text-caption` size — quite small, may be hard to read
- Clinical text in the preview area is dense with no paragraph breaks — a wall of text
- "Based on 605 qualifying variant(s)" uses a generic font size with no visual emphasis

**Recommendations:**
- Consider adding line spacing or paragraph breaks in the clinical text preview
- Slightly increase subtitle font size in Step 2 radio options
- Use a subtle background or left-border on key metrics (carrier frequency, recurrence risk) to make them scannable

---

### 7. Feedback & System Status — 8.5/10

**Strengths:**
- Loading states are excellent: skeleton loaders for gene constraint, spinners for variant loading, progress indicators for ClinVar submissions
- Success/error alerts are semantically colored and clearly worded
- "App ready for offline use" snackbar with CLOSE action is appropriate
- ClinGen check shows inline loading state with spinner
- Gene autocomplete has built-in loading indicator
- Screen reader announcements via VueAnnouncer for step changes, loading, errors, calculations

**Weaknesses:**
- No progress indication when transitioning between steps (Step 2 to Step 3 has a delay for API call — no transition indicator visible)
- "COPY LINK" button feedback ("Link copied!") is only text-based — a subtle animation or toast would be more noticeable
- PWA "App ready for offline" snackbar appears during first interaction, potentially distracting from the disclaimer modal

**Recommendations:**
- Add a brief transition animation or top-bar progress indicator between wizard steps
- Use a toast/snackbar for "Link copied" confirmation instead of inline text swap
- Delay the PWA notification until after disclaimer dismissal

---

### 8. Accessibility — 8/10

**Strengths:**
- VueAnnouncer with dedicated `useAppAnnouncer` composable for screen reader live regions — above average for this type of app
- `aria-label` on all icon buttons, dialogs, and interactive elements
- `.sr-only` class for visually hidden but screen reader accessible content
- `aria-live="polite"` on offline fallback alerts
- `role="status"` on network indicator
- Focus trap in Settings dialog
- Star ratings have `aria-label` with "X out of 4 review stars"
- `data-testid` attributes throughout for testing

**Weaknesses:**
- No skip-to-content link
- Stepper keyboard navigation unclear — can users Tab through steps?
- Color alone used to distinguish some filter chips (LoF HC = primary, Missense = secondary) — may not be sufficient for color-blind users
- Population table rows are clickable but have no `role="button"` or keyboard accessibility indicated
- No visible focus outlines observed in screenshots (Vuetify may handle this, but worth verifying)

**Recommendations:**
- Add a skip-to-main-content link
- Ensure filter chips have text labels (they do) but also consider adding pattern or icon differentiation for color-blind users
- Add `role="button"` and keyboard handlers to clickable population table rows
- Test with screen reader (NVDA/VoiceOver) to verify stepper navigation

---

### 9. Error Handling & Edge Cases — 7.5/10

**Strengths:**
- Gene search handles errors inline with `v-autocomplete` error messages
- API failures show tonal error alerts with Retry button below stepper
- ClinGen unavailability shown as warning (graceful degradation)
- Offline state: disables gene search, shows offline indicator chip + fallback alert
- No-variant scenario handled with "using default frequency" info alert

**Weaknesses:**
- Template import errors use native `alert()` — breaks the visual language of the app
- Template reset uses native `confirm()` — same issue
- Cache clear failure is silently logged to console — user gets no feedback
- No empty state guidance if the user reaches Step 4 with unusual data (edge case)

**Recommendations:**
- Replace native `alert()`/`confirm()` with Vuetify dialogs for consistency
- Show a snackbar or alert for cache clear failures
- Add graceful error boundaries at the component level

---

### 10. First-Time User Experience & Onboarding — 5.5/10

**Strengths:**
- Disclaimer modal is an appropriate first gate for a clinical tool
- Step labels and descriptions give basic guidance
- Tooltips (info icons) explain technical concepts throughout

**Weaknesses:**
- **No onboarding or guided tour for first-time users** — a genetic counselor opening this for the first time sees a form with no context about what the tool does or why they'd use it
- The disclaimer modal is text-heavy and clinical — it doesn't welcome the user or explain value
- No example or "try it" flow to demonstrate the output before committing
- The app name "gCFCalc" is not self-explanatory in the AppBar
- Footer links to "Data Sources", "Methodology", "FAQ", "About" are icon-only — a first-time user won't discover them

**Recommendations:**
- Add a brief onboarding overlay or welcome card for first-time users (1-2 sentences + "Try with CFTR" quick-start button)
- Add a sample/demo mode that shows pre-loaded results for a common gene
- Make footer links text-based or add an "Info" section to Step 1
- Consider a "What is this?" expandable section on the landing state

---

### 11. Content & Microcopy — 8/10

**Strengths:**
- Clinical terminology is accurate and appropriate for the target audience (genetic counselors)
- Step descriptions are concise: "Search for a gene symbol to calculate carrier frequency"
- Radio option subtitles in Step 2 explain each option clearly
- ClinGen validation messages are well-worded with appropriate caveats
- German clinical text templates are professionally written

**Weaknesses:**
- "Select Gene" heading could be more action-oriented: "Which gene are you evaluating?"
- "Index Patient Status" may confuse non-specialist users — "index patient" is jargon
- "Frequency Source" is vague — "Where does the frequency data come from?" would be clearer
- No contextual help for what "LOEUF" or "pLI" means in the Gene Constraint card (info icon exists but requires hover)

**Recommendations:**
- Use slightly more conversational headings to reduce cognitive load
- Add inline definitions for LOEUF/pLI that don't require hover (e.g., small text below the value)
- Consider adding a "Why this matters" sentence to the Gene Constraint card

---

### 12. Performance & Perceived Speed — 8/10

**Strengths:**
- PWA with service worker caching for gnomAD and ClinGen APIs (NetworkFirst, 24h TTL)
- Skeleton loaders prevent layout shift during data loading
- Gene autocomplete has 300ms debounce — responsive without over-querying
- App is pre-cacheable for offline use
- Vite build for optimal bundling

**Weaknesses:**
- Step 2 to Step 3 transition involves an API call with no visible loading indicator on the stepper itself
- Full MDI icon font loaded — only a subset is used, could be tree-shaken
- No lazy loading observed for the Settings dialog or other heavy components

**Recommendations:**
- Add loading state on stepper line/connector during API transitions
- Switch to `@mdi/js` for tree-shakeable icons (significant bundle size reduction)
- Lazy-load Settings dialog, History drawer, and Log viewer

---

## Summary Scorecard

| Category | Score | Weight |
|---|---|---|
| Visual Design & Aesthetics | 6.0/10 | High |
| Information Architecture | 8.0/10 | High |
| User Flow & Task Completion | 8.5/10 | Critical |
| Responsiveness & Mobile | 7.0/10 | High |
| Color & Contrast | 6.5/10 | High |
| Typography & Readability | 7.5/10 | Medium |
| Feedback & System Status | 8.5/10 | Medium |
| Accessibility | 8.0/10 | High |
| Error Handling | 7.5/10 | Medium |
| First-Time UX & Onboarding | 5.5/10 | High |
| Content & Microcopy | 8.0/10 | Medium |
| Performance & Perceived Speed | 8.0/10 | Medium |

### **Overall Weighted Score: 7.3/10**

---

## Top 5 Priority Recommendations

### 1. Fix the CTA color (Critical)
The muted `#a09588` primary makes CONTINUE buttons look disabled. Switch to a saturated, accessible color for action buttons. This is the single highest-impact change.

### 2. Add first-time onboarding (High)
A brief welcome card, "Try with CFTR" button, or guided tooltip tour would dramatically improve first-time user activation.

### 3. Reduce mobile title footprint (High)
The full title wastes 25% of mobile viewport. Collapse or hide it since "gCFCalc" is already in the AppBar.

### 4. Add persistent gene context (Medium)
Show a small chip ("CFTR | gnomAD v4.1") below the stepper on Steps 2-4 so users always know what they're calculating.

### 5. Replace native dialogs (Medium)
Swap `alert()`/`confirm()` for Vuetify dialogs to maintain visual consistency throughout the app.

---

## Sources
- [UX Design Audit Checklist (Nielsen's Heuristics)](https://www.eleken.co/blog-posts/a-checklist-for-ux-design-audit-based-on-jakob-nielsens-10-usability-heuristics)
- [Website UI/UX Checklist 2026](https://www.pixlogix.com/checklist-for-website-ui-ux/)
- [UX Audit Checklist: Step-by-Step Evaluation](https://cleverx.com/blog/ux-audit-checklist-step-by-step-evaluation-template)
- [UX Checklist for Interface Designers 2025](https://www.designrush.com/agency/ui-ux-design/trends/ux-checklist)
- [Rating Scales in UX Research](https://www.interaction-design.org/literature/article/rating-scales-for-ux-research)
