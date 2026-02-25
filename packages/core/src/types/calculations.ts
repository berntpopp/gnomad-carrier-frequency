/**
 * Configuration for carrier frequency calculation methods.
 *
 * Controls which mathematical formulas are used when computing
 * carrier frequency and disease prevalence from gnomAD allele data.
 */
export interface CalcConfig {
  /** true = HWE 2pq formula (default), false = simplified 2 * SumAF */
  useHWEFormula: boolean;
  /** true = VCR/GCR homozygote exclusion (default), false = allele-sum */
  useHomExclusion: boolean;
  /** Penetrance fraction 0–1, default 1.0 (fully penetrant) */
  penetrance: number;
}

/**
 * Factory defaults for CalcConfig.
 * Use HWE formula with homozygote exclusion and full penetrance.
 */
export const FACTORY_CALC_DEFAULTS: CalcConfig = {
  useHWEFormula: true,
  useHomExclusion: true,
  penetrance: 1.0,
};

/**
 * Result of a complete carrier frequency calculation run.
 */
export interface CalcResult {
  /** Carrier frequency as a fraction (0–1) */
  carrierFrequency: number;
  /** Genetic disease prevalence (q^2) */
  geneticPrevalence: number;
  /** Bayesian prevalence = geneticPrevalence * penetrance */
  bayesianPrevalence: number;
  /** Which carrier frequency formula was used */
  formula: "hwe" | "simplified";
  /** Whether homozygote exclusion (VCR/GCR) was applied */
  homExclusion: boolean;
}
