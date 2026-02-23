/**
 * Gene constraint data from gnomAD gnomad_constraint object
 */
export interface GeneConstraint {
  pLI: number | null; // Probability of LoF intolerance
  loeuf: number | null; // oe_lof_upper - LOEUF metric
  oeLof: number | null; // oe_lof - observed/expected ratio
  oeLofLower: number | null; // Lower confidence bound
  expLof: number | null; // Expected LoF variants
  obsLof: number | null; // Observed LoF variants
  lofZ: number | null; // Z-score for LoF
  flags: string[] | null; // Quality flags
}

/**
 * Interpretation of constraint score
 */
export type ConstraintInterpretation =
  | 'constrained'
  | 'intermediate'
  | 'tolerant'
  | 'unknown';

/**
 * pLI interpretation result
 */
export interface PliInterpretation {
  label: string;
  color: string;
}

/**
 * LOEUF interpretation result
 */
export interface LoeufInterpretation {
  level: ConstraintInterpretation;
  label: string;
  color: string;
}

/**
 * Get LOEUF interpretation based on gnomAD version
 * v4 uses different thresholds than v2/v3
 */
export function getLoeufInterpretation(
  loeuf: number | null,
  gnomadVersion: string
): LoeufInterpretation {
  if (loeuf === null) {
    return { level: 'unknown', label: 'N/A', color: 'grey' };
  }

  // v4 has higher thresholds due to larger sample size
  const isV4 = gnomadVersion.startsWith('4');
  const constrainedThreshold = isV4 ? 0.6 : 0.35;
  const tolerantThreshold = isV4 ? 1.5 : 1.0;

  if (loeuf < constrainedThreshold) {
    return { level: 'constrained', label: 'LoF intolerant', color: 'error' };
  }
  if (loeuf > tolerantThreshold) {
    return { level: 'tolerant', label: 'LoF tolerant', color: 'success' };
  }
  return { level: 'intermediate', label: 'Intermediate', color: 'warning' };
}

/**
 * Get pLI interpretation
 */
export function getPliInterpretation(pLI: number | null): PliInterpretation {
  if (pLI === null) {
    return { label: 'N/A', color: 'grey' };
  }
  if (pLI >= 0.9) {
    return { label: 'LoF intolerant (>=0.9)', color: 'error' };
  }
  if (pLI <= 0.1) {
    return { label: 'LoF tolerant (<=0.1)', color: 'success' };
  }
  return { label: 'Intermediate', color: 'warning' };
}
