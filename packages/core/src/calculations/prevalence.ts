/**
 * Disease prevalence calculation functions.
 *
 * Genetic prevalence under Hardy-Weinberg: q^2 where q = sum of pathogenic AFs.
 * IMPORTANT: prevalence is always derived from raw q = SumAF, never from
 * the carrier frequency (2pq), to avoid compounding approximation errors.
 *
 * Bayesian prevalence adjusts genetic prevalence by penetrance to account for
 * incomplete expressivity or reduced penetrance.
 */

/**
 * Calculate genetic disease prevalence (q^2) from pathogenic allele frequencies.
 *
 * Formula: prevalence = q^2 where q = sum(pathogenic AFs)
 *
 * Under Hardy-Weinberg Equilibrium, the frequency of affected individuals
 * (homozygous or compound heterozygous) is q^2.
 *
 * IMPORTANT: Always compute from raw q = SumAF, NOT from carrier frequency.
 *
 * @param pathogenicAFs - Array of pathogenic allele frequencies (one per variant)
 * @returns Genetic prevalence in range [0, 1]
 */
export function calculateGeneticPrevalence(pathogenicAFs: number[]): number {
  if (pathogenicAFs.length === 0) return 0;
  const q = pathogenicAFs.reduce((sum, af) => sum + af, 0);
  return q * q;
}

/**
 * Calculate Bayesian prevalence by scaling genetic prevalence by penetrance.
 *
 * Formula: bayesianPrevalence = geneticPrevalence * penetrance
 *
 * Penetrance of 1.0 means all genetically affected individuals express disease.
 * Penetrance < 1.0 reduces the expected clinical prevalence accordingly.
 *
 * @param geneticPrevalence - Genetic prevalence (q^2) from calculateGeneticPrevalence
 * @param penetrance - Fraction 0–1 representing disease penetrance
 * @returns Bayesian prevalence in range [0, 1]
 */
export function calculateBayesianPrevalence(
  geneticPrevalence: number,
  penetrance: number,
): number {
  return geneticPrevalence * penetrance;
}

/**
 * Format a prevalence value as a ratio and percentage string.
 *
 * @param prevalence - Prevalence fraction, or null/0 if not detected
 * @returns Object with `ratio` (e.g. "1:1,890") and `percent` (e.g. "0.0529%")
 */
export function formatPrevalence(prevalence: number | null): {
  ratio: string;
  percent: string;
} {
  if (prevalence === null || prevalence === 0) {
    return { ratio: "Not detected", percent: "Not detected" };
  }
  const ratio = `1:${Math.round(1 / prevalence).toLocaleString("en-US")}`;
  const percent = `${(prevalence * 100).toFixed(4)}%`;
  return { ratio, percent };
}
