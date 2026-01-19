# Phase 3: German Text - Research

**Researched:** 2026-01-19
**Domain:** Template-based clinical text generation with clipboard integration
**Confidence:** HIGH

## Summary

Phase 3 implements a config-driven text generation system for German (and English) clinical documentation. The system uses JSON templates with variable interpolation (`{{variable}}`), perspective-based text variants, and toggleable sections. Users can customize templates via an in-app editor, with custom templates persisted to localStorage via Pinia.

Key architectural decisions from CONTEXT.md constrain the implementation:
- Config-driven templates as source of truth
- Third-person, generalized clinical German (not addressing Sie/Du directly)
- Three perspectives: affected patient, healthy carrier, family member
- VueUse's `useClipboard` for copy functionality (already installed in project)
- Pinia state with localStorage persistence for custom templates

**Primary recommendation:** Use a simple custom template renderer (avoid adding micromustache/handlebars dependencies) since the template syntax is constrained to variable interpolation only. Leverage existing VueUse installation for clipboard. Add Pinia + pinia-plugin-persistedstate for template customization persistence.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @vueuse/core | ^12.7.0 | useClipboard composable | Already installed; standard Vue clipboard solution |
| pinia | ^2.2.x | State management | Vue 3 official state manager; needed for template persistence |
| pinia-plugin-persistedstate | ^4.x | localStorage sync | Standard Pinia persistence plugin |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none) | - | Template rendering | Custom implementation - see rationale below |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom renderer | micromustache | Adds dependency for simple `{{var}}` replacement; overkill for our use case |
| Custom renderer | Handlebars | Much heavier; we have no logic/conditionals in templates |
| localStorage direct | Pinia persistence | Pinia provides reactivity + type safety + dev tools |

**Installation:**
```bash
npm install pinia pinia-plugin-persistedstate
```

**Why no template library:**
- Template syntax is strictly `{{variableName}}` - no conditionals, loops, or helpers
- A 10-line replace function is simpler and more auditable than adding a dependency
- Templates are developer/user-controlled (not arbitrary input), so security concerns are minimal

## Architecture Patterns

### Recommended Project Structure
```
src/
├── config/
│   └── templates/           # Default template JSON files
│       ├── de.json          # German default templates
│       └── en.json          # English default templates
├── stores/
│   └── useTemplateStore.ts  # Pinia store for template customization
├── composables/
│   └── useTextGenerator.ts  # Text generation composable
├── components/
│   └── wizard/
│       └── StepResults.vue  # Extended with text output section
│       └── TextOutput.vue   # (optional) Extracted text display component
└── utils/
    └── template-renderer.ts # Simple {{variable}} interpolation
```

### Pattern 1: Config-Driven Templates

**What:** Templates stored as JSON with structure for perspectives and sections
**When to use:** When users need to customize text but structure is fixed
**Example:**
```typescript
// src/config/templates/de.json
{
  "language": "de",
  "perspectives": {
    "affected": {
      "label": "Betroffener Patient",
      "sections": {
        "inheritance": {
          "label": "Vererbungsmuster",
          "template": "Die Eltern des Patienten sind mit großer Wahrscheinlichkeit jeweils heterozygote Anlageträger."
        },
        "recurrenceRisk": {
          "label": "Wiederholungsrisiko",
          "template": "Bei einer geschätzten Heterozygotenfrequenz von {{carrierFrequency}} {{source}} läge das Risiko für eine {{gene}}-assoziierte Erkrankung bei Nachkommen des Patienten bei etwa {{recurrenceRiskPercent}} ({{recurrenceRiskRatio}})."
        }
      }
    }
  }
}
```

### Pattern 2: Simple Template Renderer

**What:** Pure function that replaces `{{variable}}` with values from context object
**When to use:** For all template interpolation in this phase
**Example:**
```typescript
// src/utils/template-renderer.ts
export interface TemplateContext {
  gene: string;
  carrierFrequency: string;
  recurrenceRiskPercent: string;
  recurrenceRiskRatio: string;
  source: string;
  populationName?: string;
  pmid?: string;
  // ... other variables
}

export function renderTemplate(template: string, context: TemplateContext): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const value = context[key as keyof TemplateContext];
    return value !== undefined ? String(value) : match; // Keep placeholder if undefined
  });
}
```

### Pattern 3: Pinia Store with Persistence

**What:** Centralized store for template customizations with localStorage sync
**When to use:** For user-modified templates that should survive page refresh
**Example:**
```typescript
// src/stores/useTemplateStore.ts
import { defineStore } from 'pinia';
import defaultDe from '@/config/templates/de.json';
import defaultEn from '@/config/templates/en.json';

export const useTemplateStore = defineStore('templates', {
  state: () => ({
    language: 'de' as 'de' | 'en',
    customTemplates: {} as Record<string, Record<string, string>>, // Override specific sections
    genderStyle: '*' as '*' | ':' | '/' | 'traditional',
  }),

  getters: {
    currentTemplates: (state) => {
      const defaults = state.language === 'de' ? defaultDe : defaultEn;
      // Merge custom templates over defaults
      return mergeTemplates(defaults, state.customTemplates);
    },
  },

  persist: true, // pinia-plugin-persistedstate
});
```

### Pattern 4: Composable for Text Generation

**What:** Vue composable that combines template store, wizard state, and calculation results
**When to use:** As the primary interface for components to get generated text
**Example:**
```typescript
// src/composables/useTextGenerator.ts
export function useTextGenerator() {
  const templateStore = useTemplateStore();

  const generateText = (
    perspective: Perspective,
    enabledSections: string[],
    context: TemplateContext
  ): string => {
    const templates = templateStore.currentTemplates;
    const sections = templates.perspectives[perspective].sections;

    return enabledSections
      .filter(key => sections[key])
      .map(key => renderTemplate(sections[key].template, context))
      .join('\n\n');
  };

  return { generateText, ... };
}
```

### Anti-Patterns to Avoid
- **v-html for user templates:** Templates are plain text, no HTML allowed. Use text interpolation only.
- **Hardcoded German text in components:** All text must come from template config files.
- **Direct localStorage access:** Use Pinia store for reactivity and type safety.
- **Complex template logic:** Keep templates as pure text with variables. Any logic belongs in the renderer or composable.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Clipboard access | Navigator API wrapper | VueUse `useClipboard` | Handles browser quirks, fallbacks, copied state |
| State persistence | localStorage watcher | pinia-plugin-persistedstate | Automatic sync, handles serialization |
| Browser language detection | navigator.language parsing | `navigator.language.split('-')[0]` | Simple enough native API |

**Key insight:** VueUse is already installed in the project, so clipboard functionality requires zero additional dependencies.

## Common Pitfalls

### Pitfall 1: German Number Formatting
**What goes wrong:** Displaying "0.25%" instead of "0,25%" in German text
**Why it happens:** JavaScript's `toFixed()` uses US locale by default
**How to avoid:** Use `toLocaleString('de-DE')` for German number formatting
**Warning signs:** Periods in percentages in German output
```typescript
// Wrong
const percent = (risk * 100).toFixed(2) + '%';

// Right
const percent = (risk * 100).toLocaleString('de-DE', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
}) + '%';
```

### Pitfall 2: Source Attribution Format Inconsistency
**What goes wrong:** Mixing citation formats between gnomAD, literature, and default
**Why it happens:** Each source type needs different formatting
**How to avoid:** Create a dedicated `formatSource()` function with explicit handling per type
**Warning signs:** Missing PMIDs, wrong date formats, inconsistent parentheses
```typescript
// gnomAD: "(gnomAD v4, https://gnomad.broadinstitute.org, abgerufen am 19.01.2026)"
// Literature: "(Jávorszky et al. 2017, PMID: 28002029)"
// Default: "Bei einer angenommenen Heterozygotenfrequenz von..."
```

### Pitfall 3: Clipboard API Security Context
**What goes wrong:** Copy fails silently in non-HTTPS environments
**Why it happens:** Clipboard API requires secure context
**How to avoid:** VueUse's `useClipboard` with `legacy: true` option provides execCommand fallback
**Warning signs:** Copy button appears to work but nothing in clipboard

### Pitfall 4: Template Variable Missing Gracefully
**What goes wrong:** Rendering shows `{{undefined}}` or crashes
**Why it happens:** Context object missing expected property
**How to avoid:** Template renderer should keep placeholder or use empty string for undefined
**Warning signs:** Raw `{{variableName}}` appearing in output

### Pitfall 5: Gender-Inclusive Language Consistency
**What goes wrong:** Mixing Anlagetrager*innen with Anlagetragerinnen and Anlagetrager
**Why it happens:** Templates written at different times with different conventions
**How to avoid:** Use placeholder like `{{genderSuffix}}` in templates, resolve based on user setting
**Warning signs:** Inconsistent asterisks/colons throughout generated text

## Code Examples

Verified patterns from official sources and project conventions:

### VueUse useClipboard (from VueUse docs)
```typescript
// Source: https://vueuse.org/core/useclipboard/
import { useClipboard } from '@vueuse/core';

const { copy, copied, isSupported } = useClipboard({
  legacy: true,     // Fallback to execCommand if needed
  copiedDuring: 2000, // Show "copied" state for 2 seconds
});

// In template:
// <v-btn @click="copy(generatedText)" :color="copied ? 'success' : 'primary'">
//   {{ copied ? 'Kopiert!' : 'Text kopieren' }}
// </v-btn>
```

### Pinia Store with Persistence (from Pinia docs)
```typescript
// Source: https://pinia.vuejs.org/, https://prazdevs.github.io/pinia-plugin-persistedstate/
import { defineStore } from 'pinia';

export const useTemplateStore = defineStore('templates', {
  state: () => ({
    language: 'de' as 'de' | 'en',
    genderStyle: '*' as '*' | ':' | '/' | 'traditional',
    customSections: {} as Record<string, string>,
  }),
  persist: {
    key: 'carrier-freq-templates',
    storage: localStorage,
  },
});
```

### Main.ts Pinia Setup
```typescript
// Add to existing src/main.ts
import { createPinia } from 'pinia';
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate';

const pinia = createPinia();
pinia.use(piniaPluginPersistedstate);

app.use(pinia);
```

### German Date Formatting
```typescript
// For gnomAD source citation: "abgerufen am 19.01.2026"
const formatGermanDate = (date: Date = new Date()): string => {
  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};
```

### Template Renderer with Missing Variable Handling
```typescript
export function renderTemplate(
  template: string,
  context: Record<string, string | number | undefined>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const value = context[key];
    if (value === undefined || value === null) {
      console.warn(`Template variable "${key}" is undefined`);
      return ''; // Or return match to keep placeholder visible
    }
    return String(value);
  });
}
```

## German Clinical Terminology Reference

Key German medical genetics terms for template content:

| German Term | English | Usage Context |
|-------------|---------|---------------|
| Heterozygotenfrequenz | Carrier frequency | Main metric being reported |
| Anlagetrager/in | Carrier | Person carrying one pathogenic allele |
| Wiederholungsrisiko | Recurrence risk | Risk for offspring/siblings |
| autosomal rezessiv | Autosomal recessive | Inheritance pattern |
| compound heterozygot | Compound heterozygous | Two different pathogenic alleles |
| pathogene Variante | Pathogenic variant | Disease-causing mutation |
| Nachkommen | Offspring | Children of index patient |
| Geschwister | Siblings | Brothers/sisters |
| Verwandte | Relatives | Extended family |

### Reference Clinical Text (from CONTEXT.md)
```
"Die Eltern des Patienten sind mit gro\u00dfer Wahrscheinlichkeit jeweils
heterozygote Anlagetragter. Formalgenetisch sind 25% der Geschwister des
Patienten ebenfalls compound heterozygote Anlagetragter und betroffen.
Nachkommen des Patienten erben eine der hier nachgewiesenen Varianten zu
100% und sind somit gesicherte Anlagetragter*innen einer Juvenilen
Nephronophthise. Bei einer geschatzten Heterozygotenfrequenz von 1:200
(Javorszky et al. 2017, PMID: 28002029) lage das Risiko fur eine
NPHP1-assoziierte Erkrankung bei Nachkommen des Patienten bei etwa 0,25%
(1/400)."
```

**Key patterns:**
- Third-person throughout ("des Patienten", not "Ihr/Sie")
- Gender-inclusive suffix (*innen)
- Inline citation format (Author et al. year, PMID: xxx)
- Risk expressed as both percentage and ratio (0,25% / 1/400)
- German decimal separator (0,25% not 0.25%)

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Vuex | Pinia | Vue 3.0 (2020) | Simpler API, better TS support |
| execCommand('copy') | Clipboard API | ~2019 | Async, more reliable, but needs secure context |
| Custom persistence | pinia-plugin-persistedstate | 2022 | Standardized, less boilerplate |

**Current in Vue ecosystem:**
- VueUse `useClipboard` is the standard clipboard solution
- Pinia is the official Vue 3 state management library
- pinia-plugin-persistedstate is the de-facto persistence plugin

## Open Questions

Things that couldn't be fully resolved:

1. **Template Editor UX**
   - What we know: User can edit templates via in-app editor OR direct JSON
   - What's unclear: Exact UX for in-app editor (modal? dedicated page? inline?)
   - Recommendation: Start with Settings page approach (per CONTEXT.md), iterate based on usage

2. **Section Toggle Persistence**
   - What we know: Checkboxes toggle sections on/off with live preview
   - What's unclear: Should enabled/disabled sections persist per-session or per-perspective?
   - Recommendation: Persist in Pinia store alongside template customizations

3. **Founder Effect Population Text**
   - What we know: Some populations show elevated frequency
   - What's unclear: How to phrase founder effect in clinical text
   - Recommendation: Include optional section noting elevated frequency in specific populations

## Sources

### Primary (HIGH confidence)
- VueUse useClipboard documentation - https://vueuse.org/core/useclipboard/
- Pinia official documentation - https://pinia.vuejs.org/
- pinia-plugin-persistedstate - https://prazdevs.github.io/pinia-plugin-persistedstate/
- MDN Clipboard API - https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText

### Secondary (MEDIUM confidence)
- DocCheck Flexikon: Wiederholungsrisiko - German medical terminology reference
- University of Munster: Autosomal recessive inheritance - Clinical text examples

### Tertiary (LOW confidence)
- (none - all findings verified with official sources)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - VueUse already installed, Pinia is Vue 3 standard
- Architecture: HIGH - Patterns follow existing project conventions
- Template syntax: HIGH - Simple interpolation, no complex requirements
- German terminology: MEDIUM - Based on reference text and medical resources
- Pitfalls: HIGH - Common issues documented in official sources

**Research date:** 2026-01-19
**Valid until:** 2026-02-19 (stable domain, 30-day validity)
