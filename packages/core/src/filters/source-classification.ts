// Source classification pure function for variant evidence attribution
// SRC-01: Classifies included variants by their evidence source
// SRC-05: Does NOT modify shouldIncludeVariantConfigurable or the filter pipeline

import type { GnomadVariant, ClinVarVariant, FilterConfig } from "../types/index.js";
import {
  isHighConfidenceLoF,
  isPathogenicClinVarWithThreshold,
  hasConflictingClassification,
} from "./variant-filters.js";
import {
  meetsConflictingThreshold,
  type ClinVarSubmission,
} from "../queries/index.js";

/**
 * Evidence source category for an included variant.
 * Reflects why the variant was included in the carrier frequency calculation.
 */
export type SourceCategory = "clinvar_only" | "plof_only" | "both";

/**
 * Classify a variant's evidence source as ClinVar-only, pLoF-only, or both.
 *
 * Mirrors the same logic as shouldIncludeVariantConfigurable so source attribution
 * matches inclusion reason. Missense variants with LC LoF + ClinVar are 'clinvar_only'
 * because pLoF counts only for HC LoF (Pitfall 5 in RESEARCH.md).
 *
 * @param variant - gnomAD variant to classify
 * @param clinvarVariants - Array of ClinVar variants for cross-reference
 * @param filterConfig - Filter configuration to determine ClinVar thresholds
 * @param submissionsMap - Optional map of variant_id to submissions for conflicting resolution
 */
export function classifyVariantSource(
  variant: GnomadVariant,
  clinvarVariants: ClinVarVariant[],
  filterConfig: FilterConfig,
  submissionsMap?: Map<string, ClinVarSubmission[]>,
): SourceCategory {
  // Determine pLoF source: only HC LoF on canonical transcript counts
  const isLoF = variant.transcript_consequence
    ? isHighConfidenceLoF(variant.transcript_consequence)
    : false;

  // Find ClinVar match for this variant
  const clinvarMatch = clinvarVariants.find(
    (cv) => cv.variant_id === variant.variant_id,
  );

  // Check standard P/LP ClinVar evidence (non-conflicting, meets star threshold)
  const hasStandardClinvar =
    clinvarMatch !== undefined &&
    isPathogenicClinVarWithThreshold(clinvarMatch, filterConfig.clinvarStarThreshold);

  // Check conflicting classification ClinVar evidence
  // Accept variant as ClinVar source if:
  // - filterConfig.clinvarIncludeConflicting is enabled
  // - variant has conflicting classification
  // - submissions meet the conflicting threshold
  const hasConflictingClinvar =
    filterConfig.clinvarEnabled &&
    filterConfig.clinvarIncludeConflicting &&
    clinvarMatch !== undefined &&
    hasConflictingClassification(clinvarMatch) &&
    submissionsMap !== undefined &&
    submissionsMap.has(variant.variant_id) &&
    meetsConflictingThreshold(
      submissionsMap.get(variant.variant_id)!,
      filterConfig.clinvarConflictingThreshold,
    );

  const isClinvar = hasStandardClinvar || hasConflictingClinvar;

  if (isLoF && isClinvar) return "both";
  if (isLoF) return "plof_only";
  return "clinvar_only";
}

/**
 * Human-readable label for a source category.
 */
export function sourceCategoryLabel(category: SourceCategory): string {
  switch (category) {
    case "clinvar_only":
      return "ClinVar";
    case "plof_only":
      return "pLoF";
    case "both":
      return "Both";
  }
}

/**
 * Vuetify color for a source category chip.
 * clinvar_only → 'blue', plof_only → 'deep-purple', both → 'green'
 */
export function sourceCategoryColor(category: SourceCategory): string {
  switch (category) {
    case "clinvar_only":
      return "blue";
    case "plof_only":
      return "deep-purple";
    case "both":
      return "green";
  }
}
