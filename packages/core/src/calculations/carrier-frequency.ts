/**
 * Carrier frequency calculation functions.
 *
 * Two formulas are provided:
 *   - HWE (Hardy-Weinberg Equilibrium): 2pq where q = sum(AFs), p = 1 - q
 *   - Simplified: 2 * sum(AFs)
 *
 * HWE is the clinically correct default. Simplified is an approximation
 * that overestimates slightly (useful for comparison or legacy compatibility).
 *
 * Reference: Hardy-Weinberg equilibrium principle.
 * For small q (< ~0.01) the two formulas converge because 2pq ≈ 2q when p ≈ 1.
 */

/**
 * Calculate carrier frequency using the Hardy-Weinberg Equilibrium formula.
 *
 * Formula: 2pq where q = sum(pathogenic AFs), p = 1 - q
 *
 * @param pathogenicAFs - Array of pathogenic allele frequencies (one per variant)
 * @returns Carrier frequency in range [0, 1]
 */
export function calculateHWECarrierFrequency(pathogenicAFs: number[]): number {
  if (pathogenicAFs.length === 0) return 0;
  const q = pathogenicAFs.reduce((sum, af) => sum + af, 0);
  const p = 1 - q;
  return 2 * p * q;
}

/**
 * Calculate carrier frequency using the simplified 2 * sum(AF) formula.
 *
 * This is a first-order approximation of HWE that overestimates slightly.
 * For small q (disease allele frequency), 2pq ≈ 2q because p ≈ 1.
 *
 * @param pathogenicAFs - Array of pathogenic allele frequencies (one per variant)
 * @returns Carrier frequency in range [0, 1]
 */
export function calculateSimplifiedCarrierFrequency(
  pathogenicAFs: number[],
): number {
  if (pathogenicAFs.length === 0) return 0;
  const sumAF = pathogenicAFs.reduce((sum, af) => sum + af, 0);
  return 2 * sumAF;
}
