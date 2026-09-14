import type { IndexPatientStatus } from "../types/frequency.js";

/**
 * Calculate recurrence risk based on carrier frequency, index patient status, and penetrance.
 *
 * SPEC-02 / Clinically authoritative Mendelian inheritance contract:
 * - Heterozygous carrier index: carrierFrequency * 0.25 * penetrance
 * - Affected index (homozygous, compound_het_confirmed, compound_het_assumed): carrierFrequency * 0.5 * penetrance
 * - Unknown / null index status or out-of-range inputs: returns null
 * - Penetrance is strictly bounded to [0.0, 1.0]
 * - Carrier frequency must be in [0.0, 1.0]
 *
 * @param carrierFrequency - Carrier frequency fraction in range [0, 1], or null
 * @param indexStatus - Clinical status of index patient
 * @param penetrance - Disease penetrance fraction in range [0, 1], default 1.0
 * @returns Recurrence risk fraction in range [0, 1], or null if inputs are invalid or incomplete
 */
export function calculateRecurrenceRisk(
  carrierFrequency: number | null,
  indexStatus?: IndexPatientStatus | null,
  penetrance: number = 1.0,
): number | null {
  if (carrierFrequency === null || !Number.isFinite(carrierFrequency)) {
    return null;
  }
  if (carrierFrequency < 0 || carrierFrequency > 1) {
    return null;
  }
  if (!Number.isFinite(penetrance) || penetrance < 0 || penetrance > 1) {
    return null;
  }
  if (!indexStatus) {
    return null;
  }

  switch (indexStatus) {
    case "homozygous":
    case "compound_het_confirmed":
    case "compound_het_assumed":
      return carrierFrequency * 0.5 * penetrance;
    case "heterozygous":
      return carrierFrequency * 0.25 * penetrance;
    default:
      return null;
  }
}
