# Phase 21: SEO Foundation - Context

**Gathered:** 2026-02-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Make the site visible to Google and social media platforms. Static HTML seed content in `index.html` so crawlers see meaningful text before JavaScript executes. Meta tags, OG image, sitemaps, structured data, and cross-linking between the app and VitePress docs site. No new user-facing features — this phase is about discoverability infrastructure.

</domain>

<decisions>
## Implementation Decisions

### Static HTML seed content
- Accessible expert tone — accurate medical content but approachable, like a knowledgeable colleague explaining the tool
- Content emphasis: balanced — both what the tool does (carrier frequency calculation, recurrence risk, gnomAD data) AND who it's for and why (genetic counselors, clinical letters, time-saving)
- Include a mini-FAQ section (3-5 questions) in the static HTML — improves chances of Google featured snippets
- Content is **visible to users** as a styled landing page while JavaScript loads — Vue replaces it on mount. Not hidden/noscript-only.
- Must meet the 500+ words requirement from success criteria

### Social preview cards
- OG image style: stylized screenshot of the calculator in action — shows the actual product
- OG title: tool name only — "gnomAD Carrier Frequency Calculator"
- OG description: Claude's discretion to craft compelling description
- Image creation: static 1200x630 PNG file committed to repo — no build-time generation
- Same OG image shared between app and docs site — consistent branding, one file to maintain

### Structured data
- Schema type: `WebApplication` with `applicationCategory: "HealthApplication"` — signals medical domain without triggering Google's stricter YMYL review standards (avoid `MedicalWebPage` for the calculator)
- FAQPage structured data: 8-10 comprehensive questions covering methodology, limitations, privacy, and core concepts
- FAQ language: bilingual (English + German) — captures German-language search queries, matches the clinical text output language
- No BreadcrumbList for now — site is small enough that breadcrumbs don't add meaningful value yet

### Cross-linking
- App → Docs: link in existing footer bar AND a navigation link in the static HTML seed (visible before Vue mounts)
- Docs → App: both inline text links in content ("Try calculating carrier frequency for CFTR →") AND prominent CTA buttons at bottom of educational pages
- Deep-linking: docs CTAs should deep-link to specific wizard state when relevant (e.g., "Try with CFTR" pre-fills gene search) — reduces friction
- Static HTML navigation: full mini-nav header with links to Calculator, Docs, FAQ, About — gives crawlers and early visitors full navigation structure

### Claude's Discretion
- OG description wording
- Exact static HTML layout and styling
- FAQ question/answer content within the scope decisions above
- Static HTML CSS approach (inline vs separate)
- Sitemap structure details
- robots.txt configuration

</decisions>

<specifics>
## Specific Ideas

- Static HTML should feel like a real landing page, not a loading placeholder — users see useful content while JS loads
- FAQ should cover questions a genetic counselor might Google: "how to calculate carrier frequency from gnomAD", "recurrence risk calculator for autosomal recessive"
- German FAQ items should target queries a German-speaking clinician would search for
- OG image should show the calculator in a recognizable state (e.g., results step with carrier frequency displayed)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 21-seo-foundation*
*Context gathered: 2026-02-23*
