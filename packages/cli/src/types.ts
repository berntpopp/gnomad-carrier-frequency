import type { GnomadVersion } from "@gnomad-cf/core/config";
import type { PopulationFrequency } from "@gnomad-cf/core/types";
import type { FilterConfig, CalcConfig } from "@gnomad-cf/core/types";

export interface VariantDetail {
  variant_id: string;
  consequence: string;
  alleleFrequency: number;
  clinvarSignificance: string | null;
  ac_hom: number;
}

export interface QueryResult {
  gene: string;
  version: GnomadVersion;
  variantCount: number;
  populations: PopulationFrequency[];
  globalCarrierFrequency: number | null;
  globalAlleleCount: number;
  globalAlleleNumber: number;
  globalSumAF: number;
  geneticPrevalence: number | null;
  bayesianPrevalence: number | null;
  formula: "hwe" | "simplified";
  homExclusionActive: boolean;
  penetrance: number;
  variants?: VariantDetail[];
}

export interface QueryOptions {
  version: GnomadVersion;
  filterConfig: FilterConfig;
  calcConfig: CalcConfig;
  population?: string; // Optional: filter to single population
}
