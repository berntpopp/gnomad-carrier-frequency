# Phase 3: German Text - Context

**Gathered:** 2026-01-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Generate German (and English) clinical documentation text based on calculation results. Users can configure text templates, select perspective, toggle sections, and copy output. Builds on existing wizard state and calculation results from Phases 1-2.

</domain>

<decisions>
## Implementation Decisions

### Template Architecture
- Config-driven text system with JSON templates as source of truth
- Initially German + English languages, designed for easy expansion
- Templates use variable interpolation: `{{gene}}`, `{{carrierFrequency}}`, etc.
- Extended variable set: gene, carrierFrequency, recurrenceRisk, source, perspective, indexStatus, populationName, founderEffect, pmid, ratio, percentage
- Users can customize templates via in-app editor OR direct JSON editing
- Custom templates stored in Pinia state, persisted to localStorage

### Language Selection
- Browser language detection as default
- Manual override in settings page, persisted
- UI: settings page language selector (not inline dropdown/tabs)

### Perspective System
- 3 perspectives: affected patient, healthy carrier, family member
- Affected patient: recurrence risk focus ("offspring risk of being affected")
- Carrier: includes optional toggle for partner testing recommendation
- Family member: generic phrasing that works for any relative relationship
- Perspective selection in results step UI

### Text Sections (Comprehensive)
- Gene introduction
- Inheritance pattern
- Carrier frequency with source
- Recurrence risk calculation
- Population context (global + founder effect populations)
- Founder effect note (if applicable)
- Source citation details
- Recommendation

### Section Configuration
- Checkboxes to enable/disable each section individually
- Live preview updates immediately as user toggles options

### Tone and Style
- Third-person, generalized clinical German (not addressing Sie/Du directly)
- Example reference: "Die Eltern des Patienten sind mit großer Wahrscheinlichkeit jeweils heterozygote Anlageträger..."
- Full clinical terminology: Heterozygotenfrequenz, compound heterozygot, Anlageträger
- Gender-inclusive language configurable: asterisk (*), colon (:), slash (/), or traditional
- English text mirrors German style: third-person, clinical, generalized

### Source Attribution
- gnomAD: inline with URL and date accessed (current date default)
  - Format: "(gnomAD v4, https://gnomad.broadinstitute.org, abgerufen am 19.01.2026)"
- Literature: Author et al. + PMID format
  - Format: "(Jávorszky et al. 2017, PMID: 28002029)"
- Default assumption: explicit phrasing
  - "Bei einer angenommenen Heterozygotenfrequenz von..."

### Claude's Discretion
- Exact JSON template structure
- Variable naming conventions
- Settings page layout
- Template editor UX details
- How to handle missing variables gracefully

</decisions>

<specifics>
## Specific Ideas

Reference text provided by user (target style):
> "Die Eltern des Patienten sind mit großer Wahrscheinlichkeit jeweils heterozygote Anlageträger. Formalgenetisch sind 25% der Geschwister des Patienten ebenfalls compound heterozygote Anlageträger und betroffen. Nachkommen des Patienten erben eine der hier nachgewiesenen Varianten zu 100% und sind somit gesicherte Anlageträger*innen einer Juvenilen Nephronophthise. Bei einer geschätzten Heterozygotenfrequenz von 1:200 (Jávorszky et al. 2017, PMID: 28002029) läge das Risiko für eine NPHP1-assoziierte Erkrankung bei Nachkommen des Patienten bei etwa 0,25% (1/400). Auch weitere Verwandte haben ggf. ein erhöhtes Risiko selbst Anlageträger zu sein und dadurch Nachkommen mit einer NPHP1-assoziierten Erkrankung zu haben. Familienangehörigen kann eine Untersuchung auf die hier nachgewiesene Variante angeboten werden."

Key patterns from reference:
- Third-person throughout ("des Patienten", not "Ihr/Sie")
- Gender-inclusive (Anlageträger*innen)
- Inline citation format (Author et al. year, PMID: xxx)
- Risk expressed as both percentage and ratio (0,25% / 1/400)
- Ends with recommendation for family testing

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-german-text*
*Context gathered: 2026-01-19*
