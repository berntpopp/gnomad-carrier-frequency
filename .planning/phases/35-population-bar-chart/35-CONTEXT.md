# Phase 35: Population Bar Chart - Context

**Gathered:** 2026-02-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Horizontal bar chart visualization comparing carrier frequencies across populations in the results step. Users can visually identify population-level differences and founder effects, download the chart for publication use. Chart creation, export, and in-app display only — no new data sources or calculation changes.

</domain>

<decisions>
## Implementation Decisions

### Chart layout & labeling
- Bars sorted by frequency descending (highest carrier frequency at top)
- Values displayed at end of bar (inline, right of bar tip)
- Values match the active display format from the format selector (ratio, percentage, scientific, per-100k)
- Global frequency shown as vertical dashed line spanning chart height, with "Global: [value]" label

### Founder effect styling
- Founder effect populations use a distinct accent bar color (different from normal population bars)
- No visible legend — founder effect explained via tooltip only (hover/tap)
- Populations with zero carrier frequency are hidden (not shown as empty bars)
- Color scheme: researcher should investigate colorblind-friendly, print-safe scientific color palettes that work with the app's existing Vuetify theme (light + dark modes)

### Interaction & responsiveness
- Tooltip on hover/tap showing: population name, carrier frequency, allele count, alleles screened, founder effect indicator if applicable
- Tabbed view: "Chart | Table" toggle replaces the current standalone population table — user sees one at a time
- Mobile: compact labels (abbreviated population codes like "ASJ", "NFE") with shorter bars to fit screen width
- Chart updates in real time with animated transitions when quality exclusions change

### SVG export & publication
- Publication-ready export differs from screen appearance: white background, black/dark gray text, grayscale-friendly colors, no interactive elements
- Exported SVG includes title ("GENE — Carrier Frequency by Population") and footer ("Source: gnomAD vX.X.X", "Generated: YYYY-MM-DD")
- Two download options: SVG (vector, publication) and PNG (2x retina resolution for presentations)
- SVG is self-contained (no external font dependencies)

### Claude's Discretion
- Exact bar height/spacing proportions
- Tooltip implementation approach (native SVG title vs Vuetify tooltip vs custom)
- Tab component choice (Vuetify tabs vs custom)
- Animation/transition timing for reactive updates
- PNG canvas rendering approach
- Exact abbreviated population labels for mobile

</decisions>

<specifics>
## Specific Ideas

- Color scheme must be researched: colorblind-friendly (deuteranopia, protanopia safe), print-safe (B&W distinguishable), and consistent with the app's Vuetify Material Design color system. Researcher should look at established scientific visualization palettes (e.g., ColorBrewer, Okabe-Ito).
- Publication SVG should look like a figure you'd paste into a genetics journal paper
- Tab toggle between Chart and Table keeps the results step clean without vertical bloat

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 35-population-bar-chart*
*Context gathered: 2026-02-26*
