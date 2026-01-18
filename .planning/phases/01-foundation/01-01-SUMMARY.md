---
phase: 01-foundation
plan: 01
subsystem: configuration
tags: [config, gnomad, typescript, json]
dependency_graph:
  requires: []
  provides: [config-types, gnomad-versions, app-settings, config-loader]
  affects: [01-03, 01-04, 01-05]
tech_stack:
  added: []
  patterns: [json-config, type-safe-loader, version-polymorphism]
key_files:
  created:
    - src/config/types.ts
    - src/config/gnomad.json
    - src/config/settings.json
    - src/config/index.ts
  modified: []
decisions:
  - key: multi-version-support
    choice: v4 default, v3/v2 available
    rationale: gnomAD v4 has most samples, but legacy support needed
  - key: population-per-version
    choice: version-specific population arrays
    rationale: v4 has mid, v3 has ami, v2 has oth - incompatible
  - key: config-in-json
    choice: JSON files + TypeScript loader
    rationale: JSON is human-readable, TS provides type safety
metrics:
  duration: ~6 minutes
  completed: 2026-01-18
---

# Phase 01 Plan 01: Config System Summary

Type-safe centralized configuration for gnomAD API versions and application settings. All thresholds, endpoints, and population codes live in JSON - no hardcoded values in application code.

## What Was Built

### Core Artifacts

1. **src/config/types.ts** - TypeScript type definitions
   - `GnomadVersion`: Union type 'v4' | 'v3' | 'v2'
   - `PopulationConfig`: Population code, label, description
   - `GnomadVersionConfig`: Per-version API config (endpoint, dataset, genome, populations)
   - `GnomadConfig`: Multi-version container with default
   - `AppSettings`: Thresholds and UI behavior settings
   - `Config`: Combined gnomad + settings

2. **src/config/gnomad.json** - gnomAD API configuration
   - v4: gnomad_r4, GRCh38, 8 populations including 'mid'
   - v3: gnomad_r3, GRCh38, 8 populations including 'ami' (Amish)
   - v2: gnomad_r2_1, GRCh37, 8 populations including 'oth'
   - Default version: v4

3. **src/config/settings.json** - Application settings
   - founderEffectMultiplier: 5 (population > 5x global = founder effect)
   - lowSampleSizeThreshold: 1000 (AN below this = warning)
   - defaultCarrierFrequency: 0.01 (1:100 fallback)
   - debounceMs: 300, minSearchChars: 2, maxAutocompleteResults: 10
   - frequencyDecimalPlaces: 2

4. **src/config/index.ts** - Type-safe config loader
   - `config`: Unified config object
   - `getGnomadVersion(version?)`: Get version-specific config
   - `getPopulationCodes(version?)`: Get population codes array
   - `getPopulationLabel(code, version?)`: Get display label
   - `getPopulations(version?)`: Get full population configs
   - `getPopulationLabels(version?)`: Get code -> label map
   - `getApiEndpoint(version?)`: Get API URL
   - `getDatasetId(version?)`: Get dataset ID
   - `getReferenceGenome(version?)`: Get genome build
   - `getAvailableVersions()`: Get ['v4', 'v3', 'v2']

### Usage Pattern

```typescript
import { config, getGnomadVersion, getPopulationCodes } from '@/config';

// Access settings
const debounce = config.settings.debounceMs; // 300
const threshold = config.settings.founderEffectMultiplier; // 5

// Get version-specific config
const v4 = getGnomadVersion(); // Default v4
const v2 = getGnomadVersion('v2');

// Access population data
const codes = getPopulationCodes('v4'); // ['afr', 'amr', 'asj', ...]
```

## Verification Results

All 8 verification criteria passed:
1. TypeScript compiles without errors
2. `config.settings.founderEffectMultiplier` returns 5
3. `config.settings.debounceMs` returns 300
4. `getGnomadVersion()` returns v4 config
5. `getGnomadVersion('v2').referenceGenome` returns 'GRCh37'
6. `getPopulationCodes('v4')` includes 'mid'
7. `getPopulationCodes('v2')` includes 'oth' (not 'mid')
8. All 3 gnomAD versions accessible and type-safe

## Deviations from Plan

None - plan executed exactly as written.

## Commits

| Hash | Message |
|------|---------|
| ee1151b | feat(01-01): add gnomAD version configuration and types |
| b7cb3f5 | feat(01-01): add settings config and type-safe loader |

## Next Phase Readiness

**Ready for:**
- 01-02: Project setup (parallel - already executed)
- 01-03: Types, calculation functions, GraphQL client (depends on config)

**No blockers identified.**
